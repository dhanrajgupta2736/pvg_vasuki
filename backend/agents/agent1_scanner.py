"""RECON: clone a pinned branch, analyze source and audit advisories."""
import asyncio
import base64
import json
import os
import shutil
import subprocess
from pathlib import Path
import httpx
from git import Repo, Actor
from core.config import settings
from core.redis_client import publish_event
from services.repository import parse_github_url, scan_directory, repo_file
from services.security_engine import analyze_repo

async def emit(scan_id, message, data=None, level='info'):
    await publish_event(scan_id, {'agent':'scanner','message':message,'data':data or {},'level':level})

async def clone_repo(repo_url, scan_id, branch=None):
    owner, name = parse_github_url(repo_url)
    headers = {'Accept':'application/vnd.github+json'}
    if settings.GITHUB_TOKEN:
        headers['Authorization'] = f'Bearer {settings.GITHUB_TOKEN}'
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(f'https://api.github.com/repos/{owner}/{name}', headers=headers)
        if response.status_code != 200:
            raise ValueError(f'GitHub repository lookup failed ({response.status_code}); check URL and access')
        selected = branch or response.json()['default_branch']
    if selected.startswith('-') or any(c in selected for c in ' \n\r~^:?*[\\'):
        raise ValueError('Invalid branch name')
    path = scan_directory(scan_id) / 'repo'
    await emit(scan_id, f'Cloning {owner}/{name} at {selected}')
    env = {'GIT_TERMINAL_PROMPT':'0'}
    if settings.GITHUB_TOKEN:
        auth = base64.b64encode(f'x-access-token:{settings.GITHUB_TOKEN}'.encode()).decode()
        env.update({'GIT_CONFIG_COUNT':'1','GIT_CONFIG_KEY_0':'http.https://github.com/.extraheader',
                    'GIT_CONFIG_VALUE_0':f'AUTHORIZATION: basic {auth}'})
    result = await asyncio.to_thread(subprocess.run,
        ['git', 'clone', '--depth', '1', '--branch', selected, '--',
         f'https://github.com/{owner}/{name}.git', str(path)],
        env={**os.environ, **env}, capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise RuntimeError('Repository clone failed; check branch and GitHub access')
    size = sum(p.stat().st_size for p in path.rglob('*') if p.is_file() and not p.is_symlink())
    if size > settings.MAX_REPO_SIZE_MB * 1024 * 1024:
        raise ValueError('Repository exceeds configured maximum size')
    return str(path)

async def run_builtin_sast_scan(repo_path, scan_id):
    findings = await asyncio.to_thread(analyze_repo, repo_path)
    await emit(scan_id, f'Native AST analysis found {len(findings)} security findings', {'count':len(findings)})
    return findings

async def run_semgrep(repo_path, scan_id):
    native = await run_builtin_sast_scan(repo_path, scan_id)
    if settings.SCANNER_MODE != 'semgrep':
        return native
    if not shutil.which('semgrep'):
        raise RuntimeError('Semgrep mode selected but Semgrep is not installed')
    result = await asyncio.to_thread(subprocess.run,
        ['semgrep','scan','--config','p/security-audit','--json','--quiet',repo_path],
        capture_output=True, text=True, timeout=180)
    if result.returncode not in (0,1):
        raise RuntimeError('Semgrep failed; scan cannot be marked clean')
    data = json.loads(result.stdout)
    if data.get('errors'):
        raise RuntimeError('Semgrep reported analysis errors')
    for item in data.get('results', []):
        path = Path(item['path'])
        relative = path.relative_to(repo_path).as_posix() if path.is_absolute() else path.as_posix()
        rule = item['check_id']
        category = _extract_category(rule)
        if any(v['file'] == relative and v['category'] == category for v in native):
            continue
        extra = item.get('extra', {})
        native.append({'id':f"{rule}:{relative}:{item['start']['line']}",'rule_id':rule,'file':relative,
            'line_start':item['start']['line'],'line_end':item['end']['line'],
            'category':category,'severity':{'ERROR':'HIGH','WARNING':'MEDIUM','INFO':'LOW'}.get(extra.get('severity'),'MEDIUM'),
            'message':extra.get('message',''),'code_snippet':extra.get('lines',''),'cve_id':None,'source':'semgrep'})
    return native

async def run_dependency_scan(repo_path, scan_id):
    findings = []
    req = Path(repo_path) / 'requirements.txt'
    if req.exists():
        if not shutil.which('pip-audit'):
            await emit(scan_id, 'pip-audit unavailable: dependency audit not performed', level='warning')
            return []
        result = await asyncio.to_thread(subprocess.run,
            ['pip-audit','-r',str(req),'--format','json','--disable-pip','--no-deps'],
            capture_output=True, text=True, timeout=90)
        if result.returncode not in (0,1) or not result.stdout.strip():
            await emit(scan_id, 'Dependency audit failed; source findings remain available', level='warning')
            return []
        data = json.loads(result.stdout)
        for dep in data.get('dependencies', []):
            for vuln in dep.get('vulns', []):
                aliases = [a for a in vuln.get('aliases', []) if a.startswith('CVE-')]
                versions = vuln.get('fix_versions', [])
                findings.append({'id':f"dependency:{dep['name']}:{vuln['id']}",'rule_id':vuln['id'],
                    'file':'requirements.txt','line_start':0,'line_end':0,'severity':'HIGH','category':'dependency',
                    'package':dep['name'],'version':dep['version'],'fix_versions':versions,
                    'cve_id':aliases[0] if aliases else None,'message':vuln.get('description','Dependency advisory'),
                    'code_snippet':f"{dep['name']}=={dep['version']}",'source':'pip-audit',
                    'fix_suggestion':'Upgrade to ' + (versions[0] if versions else 'no known fix')})
    return findings

async def run_scanner(repo_url, scan_id, branch=None, project_path='', bundled=False):
    if bundled:
        destination = scan_directory(scan_id) / 'repo'
        source = Path(__file__).resolve().parents[2] / 'testbed'
        shutil.copytree(source, destination, ignore=shutil.ignore_patterns('__pycache__','.pytest_cache','uploads','*.xml'))
        repo = Repo.init(destination)
        repo.index.add([str(p.relative_to(destination)) for p in destination.rglob('*') if p.is_file() and '.git' not in p.parts])
        actor = Actor('VASUKI','demo@vasuki.local')
        repo.index.commit('testbed: intentionally vulnerable baseline',author=actor,committer=actor)
        repo_path = str(destination)
    else:
        repo_path = await clone_repo(repo_url, scan_id, branch)
    project_root = repo_file(repo_path, project_path or '.')
    if not project_root.is_dir():
        raise ValueError('Project directory does not exist in the selected repository')
    source_findings = await run_semgrep(str(project_root), scan_id)
    dep_findings = [] if bundled else await run_dependency_scan(str(project_root), scan_id)
    findings = source_findings + dep_findings
    prefix = project_root.relative_to(Path(repo_path).resolve())
    for item in findings:
        item['file'] = (prefix / item['file']).as_posix()
    findings.sort(key=lambda f: {'CRITICAL':0,'HIGH':1,'MEDIUM':2,'LOW':3}.get(f['severity'],4))
    repo = Repo(repo_path)
    await emit(scan_id, f'RECON complete: {len(findings)} findings at commit {repo.head.commit.hexsha[:8]}')
    return {'repo_path':repo_path,'project_root':str(project_root),'vulnerabilities':findings,
            'blast_radius':sorted({f['file'] for f in findings}),'base_sha':repo.head.commit.hexsha,
            'branch':repo.active_branch.name}

def _extract_category(rule):
    for word, category in [('sql','sql-injection'),('path','path-traversal'),('xss','xss'),('secret','secret-exposure'),('command','command-injection')]:
        if word in rule.lower():
            return category
    return 'general'
