"""
FastAPI Routes — Analysis endpoints
POST /api/analysis/       → Start a new scan
GET  /api/analysis/{id}   → Get scan status
GET  /api/analysis/       → List all scans
"""
import asyncio
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.scan_job import ScanJob, ScanStatus
from services.pipeline_orchestrator import run_full_pipeline

router = APIRouter()


class AnalysisRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = "main"


class AnalysisResponse(BaseModel):
    scan_id: str
    status: str
    message: str


@router.post("/", response_model=AnalysisResponse)
async def start_analysis(
    req: AnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start a new VASUKI vulnerability scan pipeline."""
    
    # Validate it's a GitHub URL
    if "github.com" not in req.repo_url:
        raise HTTPException(400, "Only GitHub repositories are supported")
    
    # Create scan job
    job = ScanJob(
        repo_url=req.repo_url,
        branch=req.branch,
        status=ScanStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    scan_id = str(job.id)
    
    # Run pipeline in background
    branch_name = req.branch or "main"
    background_tasks.add_task(_run_pipeline_task, scan_id, req.repo_url, branch_name)
    
    return AnalysisResponse(
        scan_id=scan_id,
        status="pending",
        message=f"VASUKI pipeline started for {req.repo_url} on branch {branch_name}",
    )


async def _run_pipeline_task(scan_id: str, repo_url: str, branch: str = "main"):
    """Background task wrapper for the pipeline."""
    await run_full_pipeline(scan_id, repo_url, branch)


@router.get("/{scan_id}")
async def get_scan_status(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Get full scan job status and results."""
    result = await db.execute(select(ScanJob).where(ScanJob.id == scan_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(404, f"Scan {scan_id} not found")
    
    return {
        "scan_id":          str(job.id),
        "repo_url":         job.repo_url,
        "status":           job.status,
        "agents": {
            "scanner":  job.agent_scanner,
            "patcher":  job.agent_patcher,
            "reviewer": job.agent_reviewer,
            "tester":   job.agent_tester,
        },
        "vulnerabilities":   job.vulnerabilities,
        "patches":           job.patches,
        "review_notes":      job.review_notes,
        "test_results":      job.test_results,
        "confidence_score":  job.confidence_score,
        "blast_radius":      job.blast_radius,
        "pr_url":            job.pr_url,
        "pr_number":         job.pr_number,
        "error_message":     job.error_message,
        "created_at":        job.created_at.isoformat() if job.created_at else None,
        "completed_at":      job.completed_at.isoformat() if job.completed_at else None,
    }


@router.get("/")
async def list_scans(db: AsyncSession = Depends(get_db), limit: int = 20):
    """List recent scans."""
    result = await db.execute(
        select(ScanJob).order_by(ScanJob.created_at.desc()).limit(limit)
    )
    jobs = result.scalars().all()
    
    return [
        {
            "scan_id":         str(j.id),
            "repo_url":        j.repo_url,
            "status":          j.status,
            "confidence_score": j.confidence_score,
            "vuln_count":      len(j.vulnerabilities or []),
            "pr_url":          j.pr_url,
            "created_at":      j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]
