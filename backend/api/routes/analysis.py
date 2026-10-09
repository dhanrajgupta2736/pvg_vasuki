"""Scan submission, a real bundled demo, and durable scan state."""
from fastapi import APIRouter,HTTPException,BackgroundTasks,Depends,Query
from pydantic import BaseModel,Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.scan_job import ScanJob,ScanStatus
from services.pipeline_orchestrator import run_full_pipeline
from services.repository import parse_github_url,repo_file,scan_directory
import json
from datetime import datetime, timezone
import httpx
from core.config import settings


router=APIRouter()

class AnalysisRequest(BaseModel):
    repo_url:str
    branch:str|None=None
    project_path:str=Field(default='',max_length=200)
    publish_pr:bool=True

async def _submit(db,tasks,url,branch=None,project_path='',bundled=False,publish_pr=True):
    job=ScanJob(repo_url=url,branch=branch or '',status=ScanStatus.PENDING)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    tasks.add_task(run_full_pipeline,str(job.id),url,branch,project_path,bundled,publish_pr)
    return {'scan_id':str(job.id),'status':'pending','message':'Pipeline queued'}

@router.post('/')
async def start_analysis(req:AnalysisRequest,background_tasks:BackgroundTasks,db:AsyncSession=Depends(get_db)):
    try:
        owner,name=parse_github_url(req.repo_url)
        repo_file('/repository',req.project_path or '.')
        if req.branch and (req.branch.startswith('-') or any(c in req.branch for c in ' \n\r~^:?*[\\')):
            raise ValueError('Invalid branch name')
    except ValueError as exc:
        raise HTTPException(400,str(exc)) from None
    return await _submit(db,background_tasks,f'https://github.com/{owner}/{name}',req.branch,req.project_path,False,req.publish_pr)

@router.post('/demo')
async def run_bundled_demo(background_tasks:BackgroundTasks,db:AsyncSession=Depends(get_db)):
    return await _submit(db,background_tasks,'bundled://flask-security-lab',bundled=True,publish_pr=False)

@router.post('/orchestrated')
async def start_orchestrated(req:AnalysisRequest):
    if not settings.N8N_WEBHOOK_URL:
        raise HTTPException(503,'n8n workflow is not configured')
    try:
        parse_github_url(req.repo_url)
        async with httpx.AsyncClient(timeout=30) as client:
            response=await client.post(settings.N8N_WEBHOOK_URL,json=req.model_dump(),
                headers={'X-Vasuki-Secret':settings.N8N_WEBHOOK_SECRET})
        if response.status_code!=200:
            raise HTTPException(502,'n8n webhook did not accept the run; check the published workflow')
        result=response.json()
        if not isinstance(result,dict) or not result.get('scan_id'):
            raise HTTPException(502,'n8n returned no scan ID')
        return result
    except httpx.HTTPError:
        raise HTTPException(502,'Cannot reach the n8n workflow') from None
    except ValueError as exc:
        raise HTTPException(400,str(exc)) from None

@router.get('/')
async def list_scans(db:AsyncSession=Depends(get_db),limit:int=Query(default=20,ge=1,le=100)):
    result=await db.execute(select(ScanJob).order_by(ScanJob.created_at.desc()).limit(limit))
    return [{'scan_id':j.id,'repo_url':j.repo_url,'status':j.status,'confidence_score':j.confidence_score,
             'vuln_count':len(j.vulnerabilities or []),'pr_url':j.pr_url,'created_at':j.created_at.isoformat()} for j in result.scalars()]

@router.get('/{scan_id}')
async def get_scan_status(scan_id:str,db:AsyncSession=Depends(get_db)):
    job=await db.get(ScanJob,scan_id)
    if not job:
        raise HTTPException(404,'Scan not found')
    return {'scan_id':job.id,'repo_url':job.repo_url,'branch':job.branch,'status':job.status,
        'server_time':datetime.now(timezone.utc).isoformat(),
        'agents':{a:getattr(job,'agent_'+a) for a in ['scanner','patcher','reviewer','tester']},
        'vulnerabilities':job.vulnerabilities,'patches':job.patches,'review_notes':job.review_notes,
        'test_results':job.test_results,'confidence_score':job.confidence_score,'blast_radius':job.blast_radius,
        'pr_url':job.pr_url,'pr_number':job.pr_number,'error_message':job.error_message,
        'created_at':job.created_at.isoformat(),'completed_at':job.completed_at.isoformat() if job.completed_at else None}

@router.get('/{scan_id}/events')
async def scan_events(scan_id:str,db:AsyncSession=Depends(get_db)):
    if not await db.get(ScanJob,scan_id):
        raise HTTPException(404,'Scan not found')
    path=scan_directory(scan_id)/'events.jsonl'
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines()] if path.exists() else []
