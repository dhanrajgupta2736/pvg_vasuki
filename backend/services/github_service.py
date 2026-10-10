"""Publish verified branches using transient credentials; fork when required."""
import asyncio
import base64
import os
import subprocess
import httpx
from git import Repo
from core.config import settings
from core.redis_client import publish_event
from services.repository import parse_github_url

_heads={}
_parse_repo_info=parse_github_url

async def emit(scan_id,message,data=None,level='info'):
    await publish_event(scan_id,{'agent':'github','level':level,'message':message,'data':data or {}})

def headers():
    return {'Authorization':f'Bearer {settings.GITHUB_TOKEN}','Accept':'application/vnd.github+json',
            'X-GitHub-Api-Version':'2022-11-28'}

async def push_branch(repo_path,branch_name,repo_url,scan_id):
    if not settings.GITHUB_TOKEN:
        await emit(scan_id,'GitHub token not configured; verified patch is available for download',level='error')
        return False
    owner,name=parse_github_url(repo_url)
    target_owner=owner
    async with httpx.AsyncClient(timeout=30) as client:
        response=await client.get(f'https://api.github.com/repos/{owner}/{name}',headers=headers())
        if response.status_code!=200:
            return False
        if not response.json().get('permissions',{}).get('push'):
            fork=await client.post(f'https://api.github.com/repos/{owner}/{name}/forks',headers=headers(),json={})
            if fork.status_code not in (200,201,202):
                await emit(scan_id,f'Fork creation failed ({fork.status_code})',level='error')
                return False
            target_owner=fork.json()['owner']['login']
            for _ in range(20):
                check=await client.get(f'https://api.github.com/repos/{target_owner}/{name}/git/refs/heads',headers=headers())
                if check.status_code==200:
                    break
                await asyncio.sleep(1)
            await emit(scan_id,f'Publishing verified branch to fork {target_owner}/{name}')
    def push():
        auth=base64.b64encode(f'x-access-token:{settings.GITHUB_TOKEN}'.encode()).decode()
        env={**os.environ,'GIT_CONFIG_COUNT':'1','GIT_CONFIG_KEY_0':'http.https://github.com/.extraheader',
            'GIT_CONFIG_VALUE_0':f'AUTHORIZATION: basic {auth}','GIT_TERMINAL_PROMPT':'0'}
        result=subprocess.run(['git','push',f'https://github.com/{target_owner}/{name}.git',f'{branch_name}:{branch_name}'],
            cwd=repo_path,env=env,capture_output=True,text=True,timeout=60)
        if result.returncode:
            raise RuntimeError('Git branch push failed')
    try:
        await asyncio.to_thread(push)
        _heads[scan_id]=f'{target_owner}:{branch_name}'
        await emit(scan_id,f'Verified branch pushed to {target_owner}/{name}',{'branch':branch_name})
        return True
    except Exception as exc:
        await emit(scan_id,f'Branch push failed: {type(exc).__name__}',level='error')
        return False

async def create_pull_request(repo_url,branch_name,pr_description,vulnerabilities,confidence_score,scan_id,base_branch='main'):
    owner,name=parse_github_url(repo_url)
    if not settings.GITHUB_TOKEN:
        return {}
    async with httpx.AsyncClient(timeout=30) as client:
        response=await client.post(f'https://api.github.com/repos/{owner}/{name}/pulls',headers=headers(),json={
            'title':f'fix(security): VASUKI verified patch for {len(vulnerabilities)} findings',
            'body':pr_description,'head':_heads.get(scan_id,branch_name),'base':base_branch,'draft':True})
        if response.status_code!=201:
            await emit(scan_id,f'Draft PR creation failed ({response.status_code})',level='error')
            return {}
        pr=response.json()
        await emit(scan_id,f"Draft PR #{pr['number']} created",{'pr_url':pr['html_url'],'pr_number':pr['number']})
        return {'pr_url':pr['html_url'],'pr_number':pr['number']}
