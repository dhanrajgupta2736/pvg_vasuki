"""Reports route — download full scan report as JSON"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from services.repository import scan_directory
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.scan_job import ScanJob

router = APIRouter()


@router.get("/{scan_id}/full")
async def get_full_report(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).where(ScanJob.id == scan_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Report not found")
    
    return JSONResponse(content={
        "scan_id":          str(job.id),
        "repo_url":         job.repo_url,
        "status":           job.status,
        "confidence_score": job.confidence_score,
        "vulnerabilities":  job.vulnerabilities,
        "patches":          job.patches,
        "review_notes":     job.review_notes,
        "test_results":     job.test_results,
        "blast_radius":     job.blast_radius,
        "pr_url":           job.pr_url,
        "pr_number":        job.pr_number,
        "created_at":       job.created_at.isoformat() if job.created_at else None,
        "completed_at":     job.completed_at.isoformat() if job.completed_at else None,
    })


@router.get('/{scan_id}/patch')
async def get_patch(scan_id: str, db: AsyncSession = Depends(get_db)):
    if not await db.get(ScanJob, scan_id):
        raise HTTPException(404, 'Scan not found')
    path = scan_directory(scan_id) / 'patch.diff'
    if not path.exists():
        raise HTTPException(404, 'No patch generated yet')
    return FileResponse(path, filename=f'vasuki-{scan_id[:8]}.diff', media_type='text/x-diff')


@router.get('/{scan_id}/evidence')
async def get_evidence(scan_id: str, db: AsyncSession = Depends(get_db)):
    if not await db.get(ScanJob, scan_id):
        raise HTTPException(404, 'Scan not found')
    path = scan_directory(scan_id) / 'evidence.json'
    if not path.exists():
        raise HTTPException(404, 'Evidence is available after the run finishes')
    return FileResponse(path, filename=f'vasuki-{scan_id[:8]}-evidence.json', media_type='application/json')
