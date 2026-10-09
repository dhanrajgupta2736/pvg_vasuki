"""Reports route — download full scan report as JSON"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
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
