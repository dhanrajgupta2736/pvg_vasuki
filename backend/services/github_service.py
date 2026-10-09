"""
GitHub Integration — PR Creation
Creates a real GitHub Pull Request with patch evidence
"""
import asyncio
from pathlib import Path
from typing import Optional

import httpx
from git import Repo

from core.config import settings
from core.redis_client import publish_event


async def emit(scan_id: str, message: str, data: dict = None, level: str = "info"):
    await publish_event(scan_id, {
        "agent": "github",
        "level": level,
        "message": message,
        "data": data or {},
    })


def _parse_repo_info(repo_url: str) -> tuple[str, str]:
    """Extract owner and repo name from GitHub URL."""
    # Handle https://github.com/owner/repo and git@github.com:owner/repo
    url = repo_url.rstrip("/").rstrip(".git")
    parts = url.replace("git@github.com:", "github.com/").split("github.com/")
    if len(parts) < 2:
        raise ValueError(f"Cannot parse GitHub URL: {repo_url}")
    owner_repo = parts[1].split("/")
    return owner_repo[0], owner_repo[1]


async def push_branch(repo_path: str, branch_name: str, repo_url: str, scan_id: str) -> bool:
    """Push the patch branch to GitHub."""
    await emit(scan_id, f"📤 Pushing branch {branch_name} to GitHub...")
    
    loop = asyncio.get_event_loop()
    try:
        def _push():
            repo = Repo(repo_path)
            # Add token to remote URL
            authed_url = repo_url.replace(
                "https://github.com/",
                f"https://{settings.GITHUB_TOKEN}@github.com/"
            )
            origin = repo.remote("origin")
            origin.set_url(authed_url)
            origin.push(branch_name)
        
        await loop.run_in_executor(None, _push)
        await emit(scan_id, f"✅ Branch pushed: {branch_name}")
        return True
    except Exception as e:
        await emit(scan_id, f"❌ Push failed: {e}", level="error")
        return False


async def create_pull_request(
    repo_url: str,
    branch_name: str,
    pr_description: str,
    vulnerabilities: list[dict],
    confidence_score: float,
    scan_id: str,
) -> dict:
    """Create a GitHub PR via REST API."""
    
    if not settings.GITHUB_TOKEN:
        await emit(scan_id, "⚠️ No GitHub token — skipping PR creation", level="warning")
        return {"pr_url": "", "pr_number": 0}
    
    try:
        owner, repo = _parse_repo_info(repo_url)
    except ValueError as e:
        await emit(scan_id, f"❌ {e}", level="error")
        return {"pr_url": "", "pr_number": 0}
    
    await emit(scan_id, f"🔀 Creating Pull Request on {owner}/{repo}...")
    
    # Build PR title
    critical_count = sum(1 for v in vulnerabilities if v.get("severity") == "CRITICAL")
    high_count     = sum(1 for v in vulnerabilities if v.get("severity") == "HIGH")
    title = f"🛡️ [VASUKI] Security Patch — {len(vulnerabilities)} vulns ({critical_count} critical, {high_count} high) | Confidence: {confidence_score:.0f}%"
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers={
                "Authorization": f"token {settings.GITHUB_TOKEN}",
                "Accept": "application/vnd.github.v3+json",
            },
            json={
                "title": title,
                "body": pr_description,
                "head": branch_name,
                "base": "main",
                "draft": True,  # Start as draft — requires human review
            },
            timeout=30.0,
        )
        
        if resp.status_code in (200, 201):
            data = resp.json()
            pr_url    = data.get("html_url", "")
            pr_number = data.get("number", 0)
            
            await emit(
                scan_id,
                f"✅ PR created: #{pr_number}",
                {"pr_url": pr_url, "pr_number": pr_number},
            )
            
            # Add labels
            await client.post(
                f"https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/labels",
                headers={"Authorization": f"token {settings.GITHUB_TOKEN}"},
                json={"labels": ["security", "vasuki-auto-patch", "needs-review"]},
                timeout=10.0,
            )
            
            return {"pr_url": pr_url, "pr_number": pr_number}
        else:
            await emit(scan_id, f"⚠️ PR creation returned {resp.status_code}: {resp.text[:200]}", level="warning")
            return {"pr_url": "", "pr_number": 0}
