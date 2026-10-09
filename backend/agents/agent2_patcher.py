"""
AGENT 2: FORGE — The Patcher
Responsibilities:
  - Take vulnerabilities from Agent 1
  - Use Groq (Llama 3.3 70B) to generate precise code patches
  - Apply patches to cloned repo via git
  - Create a new branch for the patched code
  - Output: list of patches with before/after diffs
"""
import asyncio
import json
import subprocess
from pathlib import Path
from typing import Optional

from git import Repo, InvalidGitRepositoryError

from core.config import settings
from core.redis_client import publish_event
from services.llm_client import call_llm


PATCH_SYSTEM_PROMPT = """You are VASUKI's Forge Agent — an elite security patch engineer.
Your job is to write minimal, surgical code patches that fix security vulnerabilities 
without breaking existing functionality.

Rules:
1. Output ONLY the patched file content — no explanation, no markdown fences
2. Make the smallest possible change to fix the vulnerability
3. Preserve all existing comments, docstrings, and code style
4. Do NOT introduce new dependencies unless absolutely necessary
5. If the vulnerability requires a library update, note it in a comment: # VASUKI: Updated <lib> to <version>
6. The patch must be syntactically correct and immediately usable
"""

PATCH_USER_TEMPLATE = """
## Vulnerability to Fix:
- **Type**: {vuln_type}
- **CVE**: {cve_id}
- **Severity**: {severity}
- **File**: {file_path}
- **Lines**: {line_start}-{line_end}
- **Issue**: {message}

## Vulnerable Code (context around lines {line_start}-{line_end}):
```
{code_context}
```

## Full File Content:
```
{full_file_content}
```

Write the complete fixed file content with the vulnerability patched:
"""


async def emit(scan_id: str, message: str, data: dict = None, level: str = "info"):
    await publish_event(scan_id, {
        "agent": "patcher",
        "level": level,
        "message": message,
        "data": data or {},
    })


async def _call_llm(prompt: str, scan_id: str) -> str:
    """Call Groq (Llama 3.3 70B) for patch generation, with Bedrock fallback."""
    return await call_llm(
        system_prompt=PATCH_SYSTEM_PROMPT,
        user_prompt=prompt,
        max_tokens=4096,
        temperature=0.1,
    )


def _read_file_with_context(file_path: str, line_start: int, line_end: int) -> tuple[str, str]:
    """Read file content and extract context around vulnerable lines."""
    try:
        content = Path(file_path).read_text(encoding="utf-8", errors="replace")
        lines = content.splitlines()
        
        # Context window: 10 lines before and after
        ctx_start = max(0, line_start - 10)
        ctx_end   = min(len(lines), line_end + 10)
        context   = "\n".join(lines[ctx_start:ctx_end])
        
        return content, context
    except Exception:
        return "", ""


def _apply_patch_to_file(file_path: str, patched_content: str) -> bool:
    """Write patched content back to file."""
    try:
        Path(file_path).write_text(patched_content, encoding="utf-8")
        return True
    except Exception:
        return False


async def create_patch_branch(repo_path: str, scan_id: str) -> str:
    """Create a new git branch for the patches."""
    branch_name = f"vasuki/security-patch-{scan_id[:8]}"
    try:
        repo = Repo(repo_path)
        repo.git.checkout("-b", branch_name)
        await emit(scan_id, f"🌿 Created patch branch: {branch_name}")
    except Exception as e:
        await emit(scan_id, f"⚠️ Branch creation warning: {e}", level="warning")
    return branch_name


async def commit_patches(repo_path: str, vuln_summary: str, scan_id: str):
    """Stage and commit all patched files."""
    try:
        repo = Repo(repo_path)
        with repo.config_writer() as git_config:
            git_config.set_value("user", "name", "VASUKI Security Sentinel")
            git_config.set_value("user", "email", "vasuki-bot@users.noreply.github.com")
        repo.git.add("-A")
        repo.git.commit(
            "-m",
            f"fix(security): VASUKI auto-patch — {vuln_summary}\n\n"
            f"Scan ID: {scan_id}\n"
            f"Agent: VASUKI Forge (Llama 3.3 70B via OCI Gen AI)\n"
            f"Automated security patch — verify before merging."
        )
        await emit(scan_id, "✅ Patches committed to branch")
    except Exception as e:
        await emit(scan_id, f"⚠️ Commit warning: {e}", level="warning")


async def patch_vulnerability(
    vuln: dict,
    repo_path: str,
    scan_id: str,
    patch_index: int,
) -> Optional[dict]:
    """Generate and apply a patch for a single vulnerability."""
    
    file_path = vuln.get("file", "")
    target_path = Path(file_path) if Path(file_path).is_absolute() else (Path(repo_path) / file_path)
    if not target_path.exists():
        await emit(scan_id, f"⚠️ File not found in repo, skipping: {file_path}", level="warning")
        return None
    file_path = str(target_path)
    
    # Skip dependency files (handled separately)
    if vuln.get("category") == "dependency":
        return await _patch_dependency(vuln, repo_path, scan_id)
    
    await emit(scan_id, f"🔧 [{patch_index}] Patching: {vuln.get('category')} in {Path(file_path).name}")
    
    full_content, context = _read_file_with_context(
        file_path, vuln.get("line_start", 0), vuln.get("line_end", 0)
    )
    
    if not full_content:
        return None
    
    prompt = PATCH_USER_TEMPLATE.format(
        vuln_type=vuln.get("category", "unknown"),
        cve_id=vuln.get("cve_id") or "N/A",
        severity=vuln.get("severity", "UNKNOWN"),
        file_path=file_path,
        line_start=vuln.get("line_start", 0),
        line_end=vuln.get("line_end", 0),
        message=vuln.get("message", ""),
        code_context=context,
        full_file_content=full_content[:8000],  # Limit to 8k chars
    )
    
    try:
        patched_content = await _call_llm(prompt, scan_id)
        # Clean up markdown fences if model adds them
        patched_content = _strip_code_fences(patched_content)
    except Exception as e:
        await emit(scan_id, f"❌ LLM failed for {file_path}: {e}", level="error")
        return None
    
    # Compute diff
    original_lines = full_content.splitlines(keepends=True)
    patched_lines  = patched_content.splitlines(keepends=True)
    import difflib
    diff = "".join(difflib.unified_diff(
        original_lines, patched_lines,
        fromfile=f"a/{Path(file_path).name}",
        tofile=f"b/{Path(file_path).name}",
        lineterm="",
    ))
    
    # Apply patch
    success = _apply_patch_to_file(file_path, patched_content)
    
    if success:
        await emit(scan_id, f"✅ Patched: {Path(file_path).name}", {"file": file_path, "diff_lines": len(diff.splitlines())})
        return {
            "vulnerability_id": vuln.get("id"),
            "file": file_path,
            "category": vuln.get("category"),
            "cve_id": vuln.get("cve_id"),
            "severity": vuln.get("severity"),
            "diff": diff,
            "applied": True,
            "model_used": "groq/llama-3.3-70b-versatile",
        }
    else:
        await emit(scan_id, f"❌ Failed to write patch for {file_path}", level="error")
        return None


async def _patch_dependency(vuln: dict, repo_path: str, scan_id: str) -> dict:
    """Handle dependency vulnerability patches (upgrade pinned version)."""
    await emit(scan_id, f"📦 Patching dependency: {vuln.get('code_snippet', '')}")
    return {
        "vulnerability_id": vuln.get("id"),
        "file": vuln.get("file", ""),
        "category": "dependency",
        "cve_id": vuln.get("cve_id"),
        "severity": vuln.get("severity"),
        "diff": f"# Upgrade required: {vuln.get('fix_suggestion', 'update to latest')}",
        "applied": False,
        "note": vuln.get("fix_suggestion", "Manual upgrade required"),
        "model_used": "rule-based",
    }


# ── Main Agent Entry Point ──────────────────────────────────────

async def run_patcher(
    vulnerabilities: list[dict],
    repo_path: str,
    scan_id: str,
) -> dict:
    """
    Full patcher agent execution.
    Returns: { patches, branch_name }
    """
    if not vulnerabilities:
        await emit(scan_id, "ℹ️ No vulnerabilities to patch")
        return {"patches": [], "branch_name": ""}
    
    await emit(scan_id, f"⚡ Starting patch generation for {len(vulnerabilities)} vulnerabilities")
    
    branch_name = await create_patch_branch(repo_path, scan_id)
    
    # Patch vulnerabilities — process top 10 by severity (hackathon scope)
    top_vulns = vulnerabilities[:10]
    patches = []
    
    for i, vuln in enumerate(top_vulns):
        patch = await patch_vulnerability(vuln, repo_path, scan_id, i + 1)
        if patch:
            patches.append(patch)
        await asyncio.sleep(1)  # Brief pause between LLM calls
    
    # Commit all patches
    if patches:
        applied = [p for p in patches if p.get("applied")]
        summary = f"{len(applied)} security patches — SQL injection, XSS, secrets"
        await commit_patches(repo_path, summary, scan_id)
    
    await emit(
        scan_id,
        f"🎯 Patcher complete: {len(patches)} patches generated, {sum(1 for p in patches if p.get('applied'))} applied",
        {"total_patches": len(patches)},
    )
    
    return {"patches": patches, "branch_name": branch_name}


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences that LLMs sometimes add."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove first line (```python or ```) and last line (```)
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        text = "\n".join(lines)
    return text
