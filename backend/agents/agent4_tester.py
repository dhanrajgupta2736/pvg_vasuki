"""PROOF: run an immutable repository snapshot and compare individual tests."""
import asyncio
import io
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from core.config import settings
from core.redis_client import publish_event
from services.repository import scan_directory, redact


async def emit(scan_id,message,data=None,level='info'):
    await publish_event(scan_id,{'agent':'tester','message':message,'data':data or {},'level':level})

def _detect_project_type(repo_path):
    root = Path(repo_path)
    py_tests = [p for p in root.rglob('test_*.py') if not any(x in p.parts for x in ['.venv','venv','node_modules','.git'])]
    if py_tests or (root/'requirements.txt').exists() or (root/'pyproject.toml').exists():
        return {'type':'python','has_tests':bool(py_tests),'image':settings.DOCKER_SANDBOX_IMAGE}
    if (root/'package.json').exists():
        data = json.loads((root/'package.json').read_text())
        return {'type':'nodejs','has_tests':'test' in data.get('scripts',{}),'image':'node:22-slim'}
    return {'type':'unknown','has_tests':False}

def parse_junit(path):
    root = ET.parse(path).getroot()
    cases = []
    for node in root.iter('testcase'):
        outcome = 'failed' if node.find('failure') is not None else 'error' if node.find('error') is not None else 'skipped' if node.find('skipped') is not None else 'passed'
        name = node.get('name','unknown')
        diagnostic = node.find('failure') if outcome == 'failed' else node.find('error')
        cases.append({'id':node.get('classname','')+'::'+name,'name':name,'status':outcome,
            'duration':float(node.get('time',0)), 'security':any(k in name.lower() for k in ['security','sqli','traversal','idor']),
            'message':(diagnostic.get('message','') if diagnostic is not None else '')[:1000]})
    return {**{key:sum(c['status']==value for c in cases) for key,value in [('passed','passed'),('failed','failed'),('errors','error'),('skipped','skipped')]},
            'total':len(cases),'cases':cases}

def _snapshot(root,destination):
    shutil.copytree(root,destination,symlinks=True,ignore=shutil.ignore_patterns('.git','.env','*.pem','*.key','.venv','venv','node_modules','__pycache__','.pytest_cache','.vasuki*'))

def _docker_run(snapshot,info,timeout):
    import docker
    client = docker.from_env(timeout=timeout+180)
    client.ping()
    container = None
    try:
        try:
            image=client.images.get(info['image'])
        except docker.errors.ImageNotFound:
            image=client.images.pull(info['image'])
        req=snapshot/'requirements.txt'
        req_hash=hashlib.sha256((req.read_text().strip()+'\n').encode()).hexdigest() if req.exists() else ''
        ready=bool(req_hash) and req_hash==image.labels.get('vasuki.requirements-sha256')
        container = client.containers.create(info['image'],command=['sleep',str(timeout+180)],
            user='1000:1000',mem_limit='512m',nano_cpus=500000000,pids_limit=128,
            cap_drop=['ALL'],security_opt=['no-new-privileges:true'],network_mode='none' if ready else 'bridge',
            environment={'HOME':'/tmp','PYTHONPATH':'/tmp/deps','PYTHONDONTWRITEBYTECODE':'1'},
            labels={'vasuki.sandbox':'true'})
        container.start()
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive,mode='w') as tar:
            def owner(item):
                item.uid=item.gid=1000
                item.uname=item.gname='runner'
                item.mode=0o755 if item.isdir() else 0o644
                return item
            tar.add(snapshot,arcname='repo',filter=owner)
        container.put_archive('/tmp',archive.getvalue())
        if info['type']=='python':
            install = ['sh','-c','python -m pip install --target /tmp/deps pytest ' + ('-r /tmp/repo/requirements.txt' if (snapshot/'requirements.txt').exists() else '/tmp/repo')]
            cmd = ['python','-m','pytest','--tb=short','-q','--junitxml=/tmp/vasuki-results.xml']
        else:
            install = ['npm','ci','--ignore-scripts'] if (snapshot/'package-lock.json').exists() else ['npm','install','--ignore-scripts']
            cmd = ['npm','test','--','--runInBand','--ci']
        if not ready:
            prep = container.exec_run(['timeout','120',*install],workdir='/tmp/repo')
            if prep.exit_code:
                raise RuntimeError('Dependency installation failed in sandbox: '+prep.output.decode(errors='replace')[-1000:])
        # Dependency downloads finish before tests. Tests have no network access.
        container.reload()
        for network in list(container.attrs.get('NetworkSettings',{}).get('Networks',{})):
            if network!='none':
                client.networks.get(network).disconnect(container)
        # exec has no wall-time limit; timeout command kills the test process group.
        run = container.exec_run(['timeout',str(timeout),*cmd],workdir='/tmp/repo')
        if info['type']=='python':
            try:
                chunks,_ = container.get_archive('/tmp/vasuki-results.xml')
                with tarfile.open(fileobj=io.BytesIO(b''.join(chunks))) as tar:
                    member = tar.getmembers()[0]
                    (snapshot/'.vasuki-results.xml').write_bytes(tar.extractfile(member).read())
            except Exception:
                pass
        return run.exit_code,run.output.decode(errors='replace')
    finally:
        if container is not None:
            container.remove(force=True)
        client.close()

async def run_tests(repo_path,scan_id,project_info=None,label='patched',trusted=False):
    info = project_info or _detect_project_type(repo_path)
    empty = {'passed':0,'failed':0,'errors':0,'skipped':0,'total':0,'cases':[],
             'has_tests':info['has_tests'],'success':False,'label':label,'runner':'unavailable'}
    if not info['has_tests']:
        return {**empty,'error':'No supported automated test suite found'}
    snapshot = scan_directory(scan_id)/('sandbox-'+label)
    _snapshot(Path(repo_path),snapshot)
    started = time.monotonic()
    await emit(scan_id,f'Running {label} test suite',{'label':label})
    try:
        if trusted:
            # Only the server-owned bundled testbed is allowed on the host.
            env = {'PATH':os.environ.get('PATH',''),'SYSTEMROOT':os.environ.get('SYSTEMROOT',''),
                   'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'}
            result = await asyncio.to_thread(subprocess.run,[sys.executable,'-m','pytest','--tb=short','-q',
                '--junitxml=.vasuki-results.xml'],cwd=snapshot,capture_output=True,text=True,
                timeout=settings.SCAN_TIMEOUT_SECONDS,env=env)
            exit_code,output,runner = result.returncode,result.stdout+result.stderr,'trusted-bundled-process'
        else:
            exit_code,output = await asyncio.wait_for(asyncio.to_thread(_docker_run,snapshot,info,settings.SCAN_TIMEOUT_SECONDS),
                settings.SCAN_TIMEOUT_SECONDS+180)
            runner = 'docker'
        report = snapshot/'.vasuki-results.xml'
        if not report.exists():
            return {**empty,'runner':runner,'exit_code':exit_code,'output':output[-6000:],
                    'error':'Test runner did not produce structured test evidence'}
        parsed = parse_junit(report)
        evidence = {**parsed,'success':exit_code==0 and parsed['failed']==0 and parsed['errors']==0 and parsed['passed']>0,
                    'has_tests':True,'label':label,'runner':runner,'exit_code':exit_code,'output':output[-12000:],
                    'duration_seconds':round(time.monotonic()-started,2)}
        await emit(scan_id,f"{label}: {parsed['passed']} passed, {parsed['failed']} failed, {parsed['errors']} errors",evidence)
        return evidence
    except Exception as exc:
        await emit(scan_id,f'Test execution unavailable: {type(exc).__name__}',level='error')
        return {**empty,'error':redact(exc),'duration_seconds':round(time.monotonic()-started,2)}

async def run_baseline_tester(repo_path,scan_id,trusted=False):
    return await run_tests(repo_path,scan_id,label='baseline',trusted=trusted)

def compare_tests(original,patched):
    before = {c['id']:c for c in original.get('cases',[])}
    after = {c['id']:c for c in patched.get('cases',[])}
    missing = sorted(set(before)-set(after))
    regressions = [key for key,case in before.items() if case['status']=='passed' and after.get(key,{}).get('status')!='passed']
    security = [c for c in after.values() if c.get('security')]
    fixed = [key for key,case in before.items() if case['status'] in {'failed','error'} and after.get(key,{}).get('status')=='passed']
    verified = (bool(before) and bool(after) and original.get('runner')!='unavailable' and patched.get('success') is True
                and not missing and not regressions)
    return {'regression_free':verified,'regressions':regressions,'missing_tests':missing,'fixed_tests':fixed,
            'security_tests_passed':bool(security) and all(c['status']=='passed' for c in security),
            'security_tests_count':len(security)}

async def run_tester(repo_path,patches,scan_id,baseline_results=None,trusted=False,attempt=1):
    patched = await run_tests(repo_path,scan_id,label='patched' if attempt==1 else f'patched-{attempt}',trusted=trusted)
    before = baseline_results or {}
    comparison = compare_tests(before,patched)
    return {'test_results':{'original_tests':before,'patched_tests':patched,**comparison,
                           'has_tests':patched.get('has_tests'),'patches_applied':len(patches)}}
