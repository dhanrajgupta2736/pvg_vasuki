"""Behavioral gates: do not publish lost tests, fake success, or regressed patches."""
import shutil
import asyncio
import subprocess
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from agents.agent4_tester import compare_tests, parse_junit
from agents.agent2_patcher import validate_candidate, write_source
from services.repository import parse_github_url, repo_file
from services.security_engine import analyze_repo, repair_supported

@pytest.mark.parametrize('url', [
    'http://github.com/owner/repo', 'https://github.com.evil.test/owner/repo',
    'https://github.com@localhost/owner/repo', 'https://github.com/owner/repo/tree/main',
    'https://github.com/owner/repo?x=1', 'https://github.com/owner/..',
])
def test_intake_rejects_unsafe_urls(url):
    with pytest.raises(ValueError):
        parse_github_url(url)

def test_canonical_github_url():
    assert parse_github_url('https://github.com/owner/repo.git') == ('owner', 'repo')

def test_patch_path_cannot_escape_repo(tmp_path):
    for name in ['../app.py', '.git/config']:
        with pytest.raises(ValueError):
            repo_file(tmp_path, name)

def case(name, status, security=False):
    return {'id': name, 'name': name, 'status': status, 'security': security}

@pytest.mark.parametrize('after', [
    {'cases': [], 'success': True},
    {'cases': [case('functional', 'passed')], 'success': True},
    {'cases': [case('functional', 'failed'), case('security', 'passed', True)], 'success': True},
    {'cases': [case('functional', 'passed'), case('security', 'passed', True)], 'success': False},
])
def test_publication_blocks_missing_regressed_or_failed_execution(after):
    before = {'cases': [case('functional', 'passed'), case('security', 'failed', True)], 'runner': 'docker'}
    assert compare_tests(before, after)['regression_free'] is False

def test_security_fix_preserves_original_behavior():
    before = {'cases': [case('functional', 'passed'), case('security', 'failed', True)], 'runner': 'docker'}
    after = {'cases': [case('functional', 'passed'), case('security', 'passed', True)], 'success': True}
    result = compare_tests(before, after)
    assert result['regression_free'] is True
    assert result['fixed_tests'] == ['security']
    assert result['security_tests_passed'] is True

def test_candidate_cannot_delete_routes():
    with pytest.raises(ValueError):
        validate_candidate('def login():\n    return 1\n', 'x = 1\n', Path('app.py'))

def test_candidate_cannot_rewrite_unrelated_source():
    original = '\n'.join(f'value_{i} = {i}' for i in range(100))
    replacement = '\n'.join(f'value_{i} = {i+1}' for i in range(100))
    with pytest.raises(ValueError,match='surgical limit'):
        validate_candidate(original,replacement,Path('app.py'))

def test_patch_preserves_git_line_endings(tmp_path):
    file=tmp_path/'app.py'
    file.write_bytes(b'def login():\r\n    return 1\r\n')
    write_source(file,'def login():\n    return 2\n')
    assert file.read_bytes()==b'def login():\r\n    return 2\r\n'

def test_reviewer_feedback_recovers_invalid_model_without_fake_attribution(tmp_path,monkeypatch):
    from agents import agent2_patcher as patcher
    file=tmp_path/'app.py'
    source=(Path(__file__).resolve().parents[2]/'testbed/app.py').read_text()
    for category in ['sql-injection','broken-access-control']:
        source=repair_supported(source,category)
    file.write_text(source)
    remaining=analyze_repo(tmp_path)
    assert [f['category'] for f in remaining]==['path-traversal']
    async def invalid_model(*args,**kwargs):
        return 'This is not a source file.'
    async def record_only(*args,**kwargs):
        pass
    monkeypatch.setattr(patcher,'call_llm',invalid_model)
    monkeypatch.setattr(patcher,'emit',record_only)
    patches=[{'file':'app.py','category':'path-traversal','model_used':'earlier-model'}]
    assert asyncio.run(patcher.repair_review_findings(tmp_path,patches,{'remaining_findings':remaining},'test'))
    assert not analyze_repo(tmp_path)
    assert patches[0]['model_used']=='native-ast-repair'

def test_real_exploits_fail_before_and_pass_after_repairs(tmp_path):
    fixture = Path(__file__).resolve().parents[2] / 'testbed'
    shutil.copytree(fixture, tmp_path / 'lab', ignore=shutil.ignore_patterns('__pycache__', '.pytest_cache', 'uploads', '*.db'))
    lab = tmp_path / 'lab'
    before = subprocess.run([sys.executable, '-m', 'pytest', '-q', '--junitxml=before.xml'], cwd=lab, capture_output=True)
    baseline = parse_junit(lab / 'before.xml')
    assert before.returncode == 1
    assert baseline['passed'] == 6 and baseline['failed'] == 5
    findings = analyze_repo(lab)
    assert {v['category'] for v in findings} == {'sql-injection', 'path-traversal', 'broken-access-control'}
    source = (lab / 'app.py').read_text()
    for category in ['sql-injection', 'path-traversal', 'broken-access-control']:
        source = repair_supported(source, category)
        assert source is not None
    (lab / 'app.py').write_text(source)
    assert not analyze_repo(lab)
    after = subprocess.run([sys.executable, '-m', 'pytest', '-q', '--junitxml=after.xml'], cwd=lab, capture_output=True)
    patched = parse_junit(lab / 'after.xml')
    assert after.returncode == 0, after.stdout.decode(errors='replace')
    assert patched['passed'] == 11
    assert compare_tests({**baseline, 'runner': 'trusted-test'}, {**patched, 'success': True})['regression_free']
