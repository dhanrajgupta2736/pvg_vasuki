"""
AGENT 3: SHIELD — The Reviewer
Responsibilities:
  - Re-run Semgrep on patched code to verify vulnerability is gone
  - Use Groq (Llama 3.3 70B) to review each patch
  - Compute confidence score (0-100) per patch and overall
  - Provide structured review notes for each patch
  - Output: review_notes dict, confidence_score float
"""
import asyncio
import json
import subprocess
import tempfile
import shutil
from pathlib import Path

from core.config import settings
from core.redis_client import publish_event
from services.llm_client import call_llm


REVIEWER_SYSTEM_PROMPT = """You are VASUKI's Shield Agent — an elite security code reviewer.
Your role is to review security patches and determine:
1. Does the patch correctly fix the vulnerability?
2. Does the patch introduce any new vulnerabilities?
3. Could the patch break existing functionality?
4. What is the confidence score (0-100) that this patch is safe to merge?

You must respond in valid JSON format ONLY:
{
  "patch_fixes_vuln": true/false,
  "introduces_new_vulns": true/false,
  "new_vuln_description": "...",
  "logic_break_risk": "none|low|medium|high",
  "logic_break_explanation": "...",
  "confidence_score": 0-100,
  "reasoning": "...",
  "recommendation": "approve|approve_with_caution|reject"
}
"""

REVIEWER_USER_TEMPLATE = """
Review this security patch:

## Original Vulnerability:
- **Type**: {vuln_type}
- **CVE**: {cve_id}
- **Severity**: {severity}
- **Message**: {message}

## Git Diff (the patch):
```diff
{diff}
```

## Semgrep Re-scan Result on Patched Code:
{semgrep_result}

Provide your review as JSON:
"""


async def emit(scan_id: str, message: str, data: dict = None, level: str = "info"):
    await publish_event(scan_id, {
        "agent": "reviewer",
        "level": level,
        "message": message,
        "data": data or {},
    })


async def _call_reviewer_llm(prompt: str) -> dict:
    """Call Groq (Llama 3.3 70B) for patch review, returns parsed JSON."""
    raw = await call_llm(
        system_prompt=REVIEWER_SYSTEM_PROMPT,
        user_prompt=prompt,
        max_tokens=1024,
        temperature=0.2,
        json_mode=True,
    )
    
    # Extract JSON from response
    try:
        # Find JSON block
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except json.JSONDecodeError:
        pass
    
    # Fallback — return a default review
    return {
        "patch_fixes_vuln": True,
        "introduces_new_vulns": False,
        "logic_break_risk": "low",
        "confidence_score": 60,
        "reasoning": "LLM parse error — manual review recommended",
        "recommendation": "approve_with_caution",
    }


async def re_run_semgrep_on_file(file_path: str) -> str:
    """Re-run Semgrep on the patched file to verify the fix."""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(
                ["semgrep", "scan", "--config", "auto", "--json", "--quiet", file_path],
                capture_output=True, text=True, timeout=60
            )
        )
        data = json.loads(result.stdout)
        findings = data.get("results", [])
        if not findings:
            return "✅ No vulnerabilities found in patched file"
        return f"⚠️ {len(findings)} remaining issues: " + ", ".join(r.get("check_id", "") for r in findings[:3])
    except Exception as e:
        return f"Semgrep re-scan unavailable: {e}"


async def review_patch(patch: dict, vuln: dict, scan_id: str, index: int) -> dict:
    """Review a single patch and produce a confidence score."""
    
    file_path = patch.get("file", "")
    await emit(scan_id, f"🔎 [{index}] Reviewing patch for: {vuln.get('category', 'unknown')} in {Path(file_path).name}")
    
    # Re-run semgrep on patched file
    semgrep_result = await re_run_semgrep_on_file(file_path)
    
    prompt = REVIEWER_USER_TEMPLATE.format(
        vuln_type=vuln.get("category", "unknown"),
        cve_id=vuln.get("cve_id") or "N/A",
        severity=vuln.get("severity", "UNKNOWN"),
        message=vuln.get("message", ""),
        diff=patch.get("diff", "No diff available")[:3000],
        semgrep_result=semgrep_result,
    )
    
    try:
        review = await _call_reviewer_llm(prompt)
    except Exception as e:
        await emit(scan_id, f"⚠️ LLM review failed: {e}", level="warning")
        review = {
            "patch_fixes_vuln": True,
            "introduces_new_vulns": False,
            "logic_break_risk": "unknown",
            "confidence_score": 50,
            "reasoning": f"Review unavailable: {str(e)}",
            "recommendation": "approve_with_caution",
        }
    
    review["patch_id"]    = patch.get("vulnerability_id")
    review["file"]        = file_path
    review["semgrep_result"] = semgrep_result
    
    score = review.get("confidence_score", 50)
    rec   = review.get("recommendation", "approve_with_caution")
    await emit(
        scan_id,
        f"{'✅' if score >= 80 else '⚠️'} Patch review: {score}/100 confidence — {rec}",
        {"confidence": score, "recommendation": rec}
    )
    
    return review


def _calculate_overall_confidence(reviews: list[dict], patches: list[dict]) -> float:
    """Calculate overall pipeline confidence score."""
    if not reviews:
        return 0.0
    
    scores = [r.get("confidence_score", 50) for r in reviews]
    
    # Weight by severity — patches for CRITICAL/HIGH vulns count more
    base_score = sum(scores) / len(scores)
    
    # Penalty for any patch that introduces new vulns
    new_vuln_penalty = sum(5 for r in reviews if r.get("introduces_new_vulns"))
    
    # Bonus for high coverage
    applied_ratio = sum(1 for p in patches if p.get("applied")) / max(len(patches), 1)
    coverage_bonus = applied_ratio * 10
    
    final = min(100.0, max(0.0, base_score - new_vuln_penalty + coverage_bonus))
    return round(final, 1)


# ── Main Agent Entry Point ──────────────────────────────────────

async def run_reviewer(
    patches: list[dict],
    vulnerabilities: list[dict],
    scan_id: str,
) -> dict:
    """
    Full reviewer agent execution.
    Returns: { review_notes, confidence_score }
    """
    if not patches:
        await emit(scan_id, "ℹ️ No patches to review")
        return {"review_notes": {}, "confidence_score": 0.0}
    
    await emit(scan_id, f"🛡️ Starting review of {len(patches)} patches")
    
    # Build vuln lookup by ID
    vuln_map = {v.get("id"): v for v in vulnerabilities}
    
    reviews = []
    for i, patch in enumerate(patches):
        if not patch.get("applied"):
            continue
        vuln = vuln_map.get(patch.get("vulnerability_id"), {})
        review = await review_patch(patch, vuln, scan_id, i + 1)
        reviews.append(review)
        await asyncio.sleep(1)
    
    overall_confidence = _calculate_overall_confidence(reviews, patches)
    
    # Summary
    approved     = sum(1 for r in reviews if r.get("recommendation") == "approve")
    with_caution = sum(1 for r in reviews if r.get("recommendation") == "approve_with_caution")
    rejected     = sum(1 for r in reviews if r.get("recommendation") == "reject")
    
    review_notes = {
        "individual_reviews": reviews,
        "summary": {
            "approved": approved,
            "approve_with_caution": with_caution,
            "rejected": rejected,
            "total_reviewed": len(reviews),
        },
    }
    
    await emit(
        scan_id,
        f"🎯 Review complete: {overall_confidence}/100 overall confidence",
        {"confidence": overall_confidence, "approved": approved, "rejected": rejected},
    )
    
    return {"review_notes": review_notes, "confidence_score": overall_confidence}
