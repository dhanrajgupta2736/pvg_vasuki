"""
Pipeline Orchestrator — Runs all 4 agents in sequence
Called by Celery worker task
"""
import asyncio
import shutil
import time
from datetime import datetime
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from agents.agent1_scanner  import run_scanner
from agents.agent2_patcher  import run_patcher
from agents.agent3_reviewer import run_reviewer
from agents.agent4_tester   import run_tester
from services.github_service import push_branch, create_pull_request
from core.database import AsyncSessionLocal
from core.redis_client import publish_event, set_scan_state
from models.scan_job import ScanJob, ScanStatus, AgentStatus


async def emit_pipeline(scan_id: str, message: str, data: dict = None):
    await publish_event(scan_id, {
        "agent": "orchestrator",
        "level": "info",
        "message": message,
        "data": data or {},
    })


async def _update_job(scan_id: str, **kwargs):
    """Update scan job fields in DB."""
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(ScanJob).where(ScanJob.id == scan_id).values(**kwargs)
        )
        await db.commit()


async def run_full_pipeline(scan_id: str, repo_url: str):
    """
    Master orchestrator — runs all 4 agents in sequence.
    Updates DB and Redis at each stage.
    """
    start_time = time.time()
    repo_path  = None
    
    await emit_pipeline(scan_id, "🚀 VASUKI pipeline starting...", {"repo_url": repo_url})
    await set_scan_state(scan_id, {"status": "starting", "progress": 0})
    
    try:
        # ── AGENT 1: SCANNER ────────────────────────────────────
        await _update_job(scan_id, status=ScanStatus.SCANNING, agent_scanner=AgentStatus.RUNNING)
        await emit_pipeline(scan_id, "═══ AGENT 1: RECON (Scanner) ═══", {"progress": 10})
        await set_scan_state(scan_id, {"status": "scanning", "progress": 10, "active_agent": "scanner"})
        
        scanner_result = await run_scanner(repo_url, scan_id)
        repo_path      = scanner_result["repo_path"]
        vulnerabilities = scanner_result["vulnerabilities"]
        blast_radius    = scanner_result["blast_radius"]
        
        await _update_job(
            scan_id,
            agent_scanner=AgentStatus.DONE,
            vulnerabilities=vulnerabilities,
            blast_radius=blast_radius,
        )
        await set_scan_state(scan_id, {"status": "scanning", "progress": 25, "vulns_found": len(vulnerabilities)})
        
        if not vulnerabilities:
            await emit_pipeline(scan_id, "✅ No vulnerabilities found — repository is clean!")
            await _update_job(
                scan_id,
                status=ScanStatus.COMPLETED,
                confidence_score=100.0,
                completed_at=datetime.utcnow(),
            )
            return
        
        # ── AGENT 2: PATCHER ────────────────────────────────────
        await _update_job(scan_id, status=ScanStatus.PATCHING, agent_patcher=AgentStatus.RUNNING)
        await emit_pipeline(scan_id, "═══ AGENT 2: FORGE (Patcher) ═══", {"progress": 30})
        await set_scan_state(scan_id, {"status": "patching", "progress": 30, "active_agent": "patcher"})
        
        patcher_result = await run_patcher(vulnerabilities, repo_path, scan_id)
        patches     = patcher_result["patches"]
        branch_name = patcher_result["branch_name"]
        
        await _update_job(scan_id, agent_patcher=AgentStatus.DONE, patches=patches)
        await set_scan_state(scan_id, {"status": "patching", "progress": 55, "patches": len(patches)})
        
        # ── AGENT 3: REVIEWER ───────────────────────────────────
        await _update_job(scan_id, status=ScanStatus.REVIEWING, agent_reviewer=AgentStatus.RUNNING)
        await emit_pipeline(scan_id, "═══ AGENT 3: SHIELD (Reviewer) ═══", {"progress": 60})
        await set_scan_state(scan_id, {"status": "reviewing", "progress": 60, "active_agent": "reviewer"})
        
        reviewer_result  = await run_reviewer(patches, vulnerabilities, scan_id)
        review_notes     = reviewer_result["review_notes"]
        confidence_score = reviewer_result["confidence_score"]
        
        await _update_job(
            scan_id,
            agent_reviewer=AgentStatus.DONE,
            review_notes=review_notes,
            confidence_score=confidence_score,
        )
        await set_scan_state(scan_id, {"status": "reviewing", "progress": 75, "confidence": confidence_score})
        
        # ── AGENT 4: TESTER ─────────────────────────────────────
        await _update_job(scan_id, status=ScanStatus.TESTING, agent_tester=AgentStatus.RUNNING)
        await emit_pipeline(scan_id, "═══ AGENT 4: PROOF (Tester) ═══", {"progress": 80})
        await set_scan_state(scan_id, {"status": "testing", "progress": 80, "active_agent": "tester"})
        
        tester_result = await run_tester(repo_path, patches, scan_id)
        test_results  = tester_result["test_results"]
        
        await _update_job(scan_id, agent_tester=AgentStatus.DONE, test_results=test_results)
        await set_scan_state(scan_id, {"status": "testing", "progress": 90})
        
        # ── GITHUB PR ───────────────────────────────────────────
        await emit_pipeline(scan_id, "═══ CREATING GITHUB PR ═══", {"progress": 93})
        
        pr_description = test_results.get("pr_description", "VASUKI automated security patch")
        
        # Push branch
        pushed = await push_branch(repo_path, branch_name, repo_url, scan_id)
        
        pr_info = {"pr_url": "", "pr_number": 0}
        if pushed:
            pr_info = await create_pull_request(
                repo_url, branch_name, pr_description,
                vulnerabilities, confidence_score, scan_id,
            )
        
        # ── FINALIZE ────────────────────────────────────────────
        elapsed = round(time.time() - start_time, 1)
        
        await _update_job(
            scan_id,
            status=ScanStatus.COMPLETED,
            pr_url=pr_info.get("pr_url", ""),
            pr_number=pr_info.get("pr_number", 0),
            completed_at=datetime.utcnow(),
        )
        
        await set_scan_state(scan_id, {
            "status": "completed",
            "progress": 100,
            "pr_url": pr_info.get("pr_url", ""),
            "confidence": confidence_score,
        })
        
        await emit_pipeline(
            scan_id,
            f"🏆 VASUKI COMPLETE in {elapsed}s — {len(vulnerabilities)} vulns found, "
            f"{sum(1 for p in patches if p.get('applied'))} patched, "
            f"{confidence_score:.0f}% confidence",
            {
                "elapsed_seconds": elapsed,
                "vulnerabilities": len(vulnerabilities),
                "patches_applied": sum(1 for p in patches if p.get("applied")),
                "confidence_score": confidence_score,
                "pr_url": pr_info.get("pr_url", ""),
                "status": "completed",
            },
        )
    
    except Exception as e:
        await emit_pipeline(scan_id, f"💥 Pipeline failed: {str(e)}", {"error": str(e)})
        await _update_job(
            scan_id,
            status=ScanStatus.FAILED,
            error_message=str(e),
            agent_scanner=AgentStatus.ERROR,
        )
        await set_scan_state(scan_id, {"status": "failed", "error": str(e)})
        raise
    
    finally:
        # Cleanup temp repo
        if repo_path:
            import shutil, os
            if os.path.exists(repo_path):
                shutil.rmtree(repo_path, ignore_errors=True)
