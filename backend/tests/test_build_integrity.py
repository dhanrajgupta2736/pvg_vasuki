"""Publication must depend on real builds, complete audits and unchanged tests."""
import asyncio
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
import pytest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from services.project_validation import test_manifest as manifest, compare_manifests, python_plan, compile_sources, VerificationUnavailable, requirement_file
from agents.agent4_tester import compare_tests
from agents import agent1_scanner as scanner, agent2_patcher as patcher

def evidence(cases):
    return {'cases':cases,'success':True,'runner':'docker','build':{'success':True},'test_inputs':{'unchanged':True}}

@pytest.mark.parametrize('mutation',['duplicate','skip','build','integrity','unrecorded'])
def test_ambiguous_or_unverified_test_results_block(mutation):
    baseline=evidence([{'id':'functional','status':'passed'},{'id':'security','status':'failed','security':True}])
    patched=evidence([{'id':'functional','status':'passed'},{'id':'security','status':'passed','security':True}])
    if mutation=='duplicate': patched['cases'].append(patched['cases'][0].copy())
    if mutation=='skip': patched['cases'][1]['status']='skipped'
    if mutation=='build': patched['build']['success']=False
    if mutation=='integrity': patched['test_inputs']['unchanged']=False
    if mutation=='unrecorded': patched.pop('build')
    assert compare_tests(baseline,patched)['regression_free'] is False

def test_all_red_baseline_cannot_establish_non_regression():
    baseline=evidence([{'id':'only_test','status':'failed'}])
    patched=evidence([{'id':'only_test','status':'passed'}])
    assert compare_tests(baseline,patched)['regression_free'] is False

def test_manifest_allows_dependency_changes_but_protects_test_configuration(tmp_path):
    file=tmp_path/'pyproject.toml'
    file.write_text('[project]\nname="lab"\nversion="0.1"\ndependencies=["jinja2==3.1.4"]\n[tool.pytest.ini_options]\ntestpaths=["tests"]\n')
    before=manifest(tmp_path)
    file.write_text(file.read_text().replace('3.1.4','3.1.6'))
    assert compare_manifests(before,manifest(tmp_path))['unchanged']
    file.write_text(file.read_text().replace('testpaths=["tests"]','testpaths=["empty"]'))
    assert compare_manifests(before,manifest(tmp_path))['changed_test_inputs']==['pyproject.toml']

def test_manifest_protects_fixtures_and_conftest(tmp_path):
    tests=tmp_path/'tests'
    tests.mkdir()
    helper=tests/'fixture.json'
    helper.write_text('{"authorized":false}')
    before=manifest(tmp_path)
    helper.write_text('{"authorized":true}')
    assert not compare_manifests(before,manifest(tmp_path))['unchanged']
    (tmp_path/'conftest.py').write_text('collect_ignore=["tests"]')
    assert 'conftest.py' in compare_manifests(before,manifest(tmp_path))['changed_test_inputs']

def test_packaged_python_has_real_wheel_build_plan(tmp_path):
    (tmp_path/'pyproject.toml').write_text('[build-system]\nrequires=["setuptools>=61","wheel"]\nbuild-backend="setuptools.build_meta"\n[project]\nname="lab"\nversion="0.1"\n')
    (tmp_path/'test_api.py').write_text('def test_works(): pass\n')
    plan=python_plan(tmp_path,'python:3.11-slim')
    assert plan['has_tests'] and plan['packaged']
    assert plan['build_kind']=='python-wheel'
    assert plan['build_command'][1:4]==['-I','/tmp/vasuki-controller.py','wheel']
    assert '-I' in plan['install_commands'][0]
    assert '--only-binary=:all:' in plan['install_commands'][0]
    assert '/tmp/repo' not in plan['install_commands'][0]
    assert '--no-index' in plan['offline_install_commands'][0]
    assert '--no-deps' in plan['offline_install_commands'][0]

@pytest.mark.parametrize('requirement',['-r ../../private.txt','./malicious-package','example @ https://example.test/code.zip','--index-url https://example.test'])
def test_installer_rejects_repo_instructions_and_direct_urls(tmp_path,requirement):
    (tmp_path/'requirements.txt').write_text(requirement+'\n')
    with pytest.raises(VerificationUnavailable): requirement_file(tmp_path)

def test_source_compile_does_not_execute_repository_code(tmp_path):
    (tmp_path/'app.py').write_text('raise RuntimeError("must not execute")\n')
    compile_sources(tmp_path)
    (tmp_path/'app.py').write_text('def syntax_error(\n')
    with pytest.raises(SyntaxError): compile_sources(tmp_path)

@pytest.mark.parametrize('report',[
    SimpleNamespace(returncode=2,stdout='',stderr='network unavailable'),
    SimpleNamespace(returncode=0,stdout='not json',stderr=''),
    SimpleNamespace(returncode=0,stdout='{}',stderr=''),
    SimpleNamespace(returncode=0,stdout=json.dumps({'dependencies':[{'name':'x','skip_reason':'unknown'}]}),stderr=''),
])
def test_failed_dependency_audit_is_not_a_clean_scan(tmp_path,monkeypatch,report):
    (tmp_path/'requirements.txt').write_text('example==1.0\n')
    monkeypatch.setattr(scanner.shutil,'which',lambda _: 'pip-audit')
    monkeypatch.setattr(scanner.subprocess,'run',lambda *args,**kwargs: report)
    with pytest.raises(VerificationUnavailable): asyncio.run(scanner.run_dependency_scan(tmp_path,'test'))

def test_unparseable_source_blocks_scan(tmp_path):
    (tmp_path/'app.py').write_text('def invalid(\n')
    with pytest.raises(VerificationUnavailable): asyncio.run(scanner.run_builtin_sast_scan(str(tmp_path),'test'))

def test_advisory_aliases_do_not_count_one_cve_twice(tmp_path,monkeypatch):
    (tmp_path/'requirements.txt').write_text('Jinja2==3.1.5\n')
    report={'dependencies':[{'name':'jinja2','version':'3.1.5','vulns':[
        {'id':'GHSA-example','aliases':['CVE-2025-27516'],'fix_versions':['3.1.6']},
        {'id':'PYSEC-example','aliases':['CVE-2025-27516'],'fix_versions':['3.1.6']},
    ]}]}
    async def no_events(*args,**kwargs): pass
    monkeypatch.setattr(scanner,'emit',no_events)
    monkeypatch.setattr(scanner.shutil,'which',lambda _: 'pip-audit')
    monkeypatch.setattr(scanner.subprocess,'run',lambda *args,**kwargs: SimpleNamespace(returncode=1,stdout=json.dumps(report)))
    findings=asyncio.run(scanner.run_dependency_scan(tmp_path,'test'))
    assert len(findings)==1 and findings[0]['cve_id']=='CVE-2025-27516'
    assert findings[0]['advisory_ids']==['GHSA-example','PYSEC-example']

def test_multiple_advisories_never_downgrade_an_earlier_fix(tmp_path,monkeypatch):
    (tmp_path/'requirements.txt').write_text('example==1.0\n')
    async def no_events(*args,**kwargs): pass
    monkeypatch.setattr(patcher,'emit',no_events)
    vuln={'id':'advisory','file':'requirements.txt','category':'dependency','package':'example','version':'1.0','fix_versions':['3.0'],'severity':'HIGH'}
    assert asyncio.run(patcher.patch_vulnerability(vuln,tmp_path,'test'))
    assert asyncio.run(patcher.patch_vulnerability({**vuln,'fix_versions':['2.0']},tmp_path,'test')) is None
    assert (tmp_path/'requirements.txt').read_text()=='example==3.0\n'

def test_patcher_cannot_modify_test_collection(tmp_path):
    (tmp_path/'conftest.py').write_text('x=1\n')
    with pytest.raises(ValueError,match='test suite'):
        asyncio.run(patcher.patch_vulnerability({'file':'conftest.py'},tmp_path,'test'))
