"""Server-owned project plans and test-input fingerprints (no repository execution)."""
import configparser
import hashlib
import json
import os
import sys
import tomllib
from pathlib import Path

def safe_requirement(value):
    from packaging.requirements import Requirement
    try:
        requirement=Requirement(value)
    except Exception:
        raise VerificationUnavailable('Unsupported dependency declaration; use package names and version constraints') from None
    if requirement.url:
        raise VerificationUnavailable('Direct dependency URLs and local paths are not supported by the isolated installer')
    return value

def requirement_file(root):
    path=Path(root)/'requirements.txt'
    if not path.exists():
        return []
    if path.is_symlink():
        raise VerificationUnavailable('Dependency files cannot be symlinks')
    result=[]
    for line in path.read_text(encoding='utf-8').splitlines():
        value=line.partition(' #')[0].strip()
        if value and not value.startswith('#'):
            result.append(safe_requirement(value))
    return result

IGNORED={'.git','.venv','venv','node_modules','__pycache__','.pytest_cache','dist','build','.tox','artifacts'}
TEST_DIRECTORIES={'tests','test','__tests__','spec','specs'}
TEST_CONFIGURATION={'pytest.ini','.pytest.ini','tox.ini','conftest.py','jest.config.js','jest.config.cjs','vitest.config.js','vitest.config.ts'}

class VerificationUnavailable(RuntimeError):
    """A required check was not completed; publication must be blocked."""

def project_files(root):
    root=Path(root)
    for directory,folders,files in os.walk(root,followlinks=False):
        folders[:]=sorted(f for f in folders if f not in IGNORED and not (Path(directory)/f).is_symlink())
        for name in sorted(files):
            yield Path(directory)/name

def protected_test_path(relative):
    path=Path(relative)
    name=path.name
    return (any(part in TEST_DIRECTORIES for part in path.parts) or name in TEST_CONFIGURATION
            or name.startswith('test_') or name.endswith('_test.py')
            or any(token in name for token in ('.test.','.spec.')))

def test_manifest(root):
    root=Path(root).resolve()
    files={}
    configuration={}
    for path in project_files(root):
        relative=path.relative_to(root).as_posix()
        if protected_test_path(relative):
            files[relative]='symlink:'+os.readlink(path) if path.is_symlink() else hashlib.sha256(path.read_bytes()).hexdigest()
        elif path.name=='pyproject.toml':
            if path.is_symlink(): raise VerificationUnavailable('Project configuration cannot be a symlink')
            data=tomllib.loads(path.read_text(encoding='utf-8'))
            configuration[relative]={'pytest':data.get('tool',{}).get('pytest')}
        elif path.name=='setup.cfg':
            if path.is_symlink(): raise VerificationUnavailable('Project configuration cannot be a symlink')
            parser=configparser.ConfigParser(interpolation=None)
            parser.read_string(path.read_text(encoding='utf-8'))
            configuration[relative]=dict(parser.items('tool:pytest')) if parser.has_section('tool:pytest') else {}
        elif path.name=='package.json':
            if path.is_symlink(): raise VerificationUnavailable('Project configuration cannot be a symlink')
            data=json.loads(path.read_text(encoding='utf-8'))
            configuration[relative]={'scripts':data.get('scripts',{}),'jest':data.get('jest')}
    return {'files':files,'configuration':configuration}

def compare_manifests(before,after):
    changed=[]
    for category in ('files','configuration'):
        left,right=before.get(category,{}),after.get(category,{})
        changed.extend(name for name in sorted(set(left)|set(right)) if left.get(name)!=right.get(name))
    return {'unchanged':not changed,'changed_test_inputs':sorted(set(changed))}

def python_plan(root,image):
    root=Path(root)
    tests=[p for p in project_files(root) if p.suffix=='.py' and (p.name.startswith('test_') or p.name.endswith('_test.py'))]
    project=root/'pyproject.toml'
    if project.is_symlink(): raise VerificationUnavailable('Project configuration cannot be a symlink')
    data=tomllib.loads(project.read_text(encoding='utf-8')) if project.exists() else {}
    packaged=bool(data.get('build-system') or data.get('project') or (root/'setup.py').exists())
    installs=[]
    requirements=root/'requirements.txt'
    declared=requirement_file(root)
    install=['python','-I','-m','pip','install','--only-binary=:all:','--target','/tmp/deps','pytest']
    if packaged:
        build_requirements=data.get('build-system',{}).get('requires',['setuptools>=61','wheel'])
        if not isinstance(build_requirements,list) or not all(isinstance(x,str) and not x.startswith('-') for x in build_requirements):
            raise VerificationUnavailable('Invalid Python build-system requirements')
        install.extend(['build',*(safe_requirement(value) for value in build_requirements)])
    install.extend(declared)
    offline=[]
    if packaged:
        dependencies=data.get('project',{}).get('dependencies',[])
        extras=data.get('project',{}).get('optional-dependencies',{})
        test_extra=next((key for key in ('test','tests','dev') if key in extras),None)
        install.extend(safe_requirement(value) for value in dependencies)
        if test_extra: install.extend(safe_requirement(value) for value in extras[test_extra])
        offline.append(['python','-I','-m','pip','install','--target','/tmp/deps','--no-index','--no-deps','--no-build-isolation','/tmp/repo'])
    installs.append(install)
    build=['python','-I','/tmp/vasuki-controller.py','wheel','/tmp/repo'] if packaged else ['python','-I','/tmp/vasuki-controller.py','compile','/tmp/repo']
    return {'type':'python','has_tests':bool(tests),'image':image,'packaged':packaged,
            'install_commands':installs,'offline_install_commands':offline,'build_command':build,'build_kind':'python-wheel' if packaged else 'python-source-compile',
            'test_command':['python','-m','pytest','--tb=short','-q','--junitxml=/tmp/vasuki-results.xml']}

def compile_sources(root):
    count=0
    root=Path(root)
    for path in project_files(root):
        relative=path.relative_to(root)
        if path.suffix!='.py' or path.is_symlink() or protected_test_path(relative) or 'fixtures' in relative.parts:
            continue
        compile(path.read_bytes(),relative.as_posix(),'exec')
        count+=1
    print(f'Syntax build passed for {count} Python source files')

def build_wheel(root):
    import runpy
    import zipfile
    # -I excludes repository modules that could shadow the build CLI.
    sys.path.insert(0,'/tmp/deps')
    sys.argv=['build','--no-isolation','--wheel','--outdir','/tmp/vasuki-dist',str(root)]
    try:
        runpy.run_module('build',run_name='__main__',alter_sys=True)
    except SystemExit as exc:
        if exc.code: raise
    wheels=list(Path('/tmp/vasuki-dist').glob('*.whl'))
    if not wheels: raise VerificationUnavailable('Build produced no wheel artifact')
    for wheel in wheels:
        if wheel.is_symlink(): raise VerificationUnavailable('Wheel artifact cannot be a symlink')
        with zipfile.ZipFile(wheel) as archive:
            names=archive.namelist()
            if archive.testzip() or not any(name.endswith('.dist-info/RECORD') for name in names):
                raise VerificationUnavailable('Build produced an invalid wheel artifact')
        print('Wheel artifact: '+wheel.name+' · sha256 '+hashlib.sha256(wheel.read_bytes()).hexdigest())

if __name__=='__main__':
    # This module is copied as a root-owned controller and invoked with -I,
    # preventing repository modules from replacing the fingerprint implementation.
    if sys.argv[1]=='manifest':
        print(json.dumps(test_manifest(sys.argv[2]),sort_keys=True))
    elif sys.argv[1]=='compile':
        compile_sources(sys.argv[2])
    elif sys.argv[1]=='wheel':
        build_wheel(sys.argv[2])
    else:
        raise SystemExit('Unknown validation operation')
