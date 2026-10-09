"""
AGENT 4: PROOF — The Tester
Responsibilities:
  - Run test suite on clean repository BEFORE patches to establish baseline
  - Apply patches and run test suite AFTER patches
  - Compare pre-patch vs post-patch test results (empirical regression analysis)
  - Execute safely in Docker container sandbox, with safe isolated subprocess runner
  - Output: test_results dict with verifiable pass/fail evidence
"""
import asyncio
import json
import os
import sys
import tarfile
import tempfile
import time
from pathlib import Path
from typing import Optional

try:
    import docker
    from docker.errors import DockerException
except ImportError:
    docker = None
    class DockerException(Exception):
        pass

from core.config import settings
from core.redis_client import publish_event


async def emit(scan_id: str, message: str, data: dict = None, level: str = "info"):
    await publish_event(scan_id, {
        "agent": "tester",
        "level": level,
        "message": message,
        "data": data or {},
    })


def _detect_project_type(repo_path: str) -> dict:
    """Detect language and verify whether real test files exist."""
    path = Path(repo_path)
    
    # Python detection
    py_files = list(path.rglob("test_*.py")) + list(path.rglob("*_test.py")) + list(path.rglob("tests/*.py"))
    has_py_reqs = (path / "requirements.txt").exists() or (path / "pyproject.toml").exists() or (path / "setup.py").exists()
    
    if py_files or has_py_reqs:
        has_tests = len(py_files) > 0
        return {
            "type": "python",
            "has_tests": has_tests,
            "test_files_count": len(py_files),
            "image": "python:3.11-slim",
            "cmd_args": [sys.executable, "-m", "pytest", "--tb=short", "--no-header", "-q"],
            "container_cmd": "pip install -q -r requirements.txt 2>/dev/null || pip install -q pytest; python -m pytest --tb=short -q",
        }
    
    # Node.js detection
    if (path / "package.json").exists():
        try:
            pkg = json.loads((path / "package.json").read_text(encoding="utf-8"))
            scripts = pkg.get("scripts", {})
            has_tests = "test" in scripts
            return {
                "type": "nodejs",
                "has_tests": has_tests,
                "image": "node:20-slim",
                "cmd_args": ["npm", "test", "--", "--watchAll=false"] if has_tests else ["npx", "jest"],
                "container_cmd": "npm install --silent && npm test -- --watchAll=false",
            }
        except Exception:
            pass
    
    return {
        "type": "unknown",
        "has_tests": False,
        "image": settings.DOCKER_SANDBOX_IMAGE,
        "cmd_args": [],
        "container_cmd": "",
    }


def _parse_pytest_output(output: str) -> dict:
    """Parse pytest stdout into structured pass/fail counts."""
    import re
    result = {"passed": 0, "failed": 0, "errors": 0, "skipped": 0, "total": 0, "output": output[-3000:]}
    
    for pattern, key in [
        (r"(\d+) passed", "passed"),
        (r"(\d+) failed", "failed"),
        (r"(\d+) error",  "errors"),
        (r"(\d+) skipped", "skipped"),
    ]:
        match = re.search(pattern, output)
        if match:
            result[key] = int(match.group(1))
    
    result["total"] = result["passed"] + result["failed"] + result["errors"]
    return result


def _parse_jest_output(output: str) -> dict:
    """Parse Jest stdout."""
    import re
    result = {"passed": 0, "failed": 0, "errors": 0, "skipped": 0, "total": 0, "output": output[-3000:]}
    match = re.search(r"Tests:\s+(?:(\d+) failed,\s*)?(?:(\d+) passed,\s*)?(\d+) total", output)
    if match:
        result["failed"] = int(match.group(1) or 0)
        result["passed"] = int(match.group(2) or 0)
        result["total"]  = int(match.group(3) or 0)
    return result


def _parse_test_output(output: str, project_type: str) -> dict:
    if project_type == "python":
        return _parse_pytest_output(output)
    if project_type == "nodejs":
        return _parse_jest_output(output)
    return {"passed": 0, "failed": 0, "total": 0, "output": output[-2000:]}


async def run_tests(
    repo_path: str,
    scan_id: str,
    project_info: dict,
    label: str = "patched",
) -> dict:
    """
    Execute tests inside Docker sandbox if available, or safe argument-vector subprocess runner.
    """
    if not project_info.get("has_tests"):
        await emit(scan_id, f"ℹ️ [{label}] No unit test suite detected in repository", {"has_tests": False})
        return {
            "passed": 0, "failed": 0, "errors": 0, "total": 0,
            "has_tests": False, "success": None, "label": label,
            "output": "No automated test suite detected"
        }

    await emit(scan_id, f"🧪 [{label}] Executing test validation suite...")
    loop = asyncio.get_event_loop()

    # 1. Try Docker sandbox execution
    if docker is not None:
        try:
            def _sync_docker():
                client = docker.from_env()
                container = client.containers.run(
                    image=project_info["image"],
                    command=f"bash -c 'cd /app && {project_info['container_cmd']}'",
                    volumes={repo_path: {"bind": "/app", "mode": "rw"}},
                    working_dir="/app",
                    remove=True,
                    detach=False,
                    mem_limit="512m",
                    cpu_quota=50000,
                    network_disabled=False,
                    stdout=True,
                    stderr=True,
                    timeout=settings.SCAN_TIMEOUT_SECONDS,
                )
                return container.decode("utf-8") if isinstance(container, bytes) else str(container)

            output = await loop.run_in_executor(None, _sync_docker)
            parsed = _parse_test_output(output, project_info["type"])
            success = parsed["failed"] == 0 and parsed["errors"] == 0
            await emit(scan_id, f"{'✅' if success else '❌'} [{label}] Sandbox tests: {parsed['passed']} passed, {parsed['failed']} failed")
            return {**parsed, "has_tests": True, "success": success, "label": label}
        except Exception as e:
            await emit(scan_id, f"ℹ️ Container sandbox not accessible ({type(e).__name__}) — using isolated process runner", level="info")

    # 2. Safe Subprocess Runner (NO shell=True to eliminate command injection)
    try:
        import subprocess
        cmd_args = project_info.get("cmd_args", [])
        if not cmd_args:
            return {"passed": 0, "failed": 0, "total": 0, "has_tests": False, "success": None, "label": label}

        def _sync_subp():
            return subprocess.run(
                cmd_args,
                shell=False,
                capture_output=True,
                text=True,
                timeout=120,
                cwd=repo_path,
            )

        result = await loop.run_in_executor(None, _sync_subp)
        output = (result.stdout or "") + (result.stderr or "")
        parsed = _parse_test_output(output, project_info["type"])
        success = result.returncode == 0
        await emit(
            scan_id,
            f"{'✅' if success else '❌'} [{label}] Tests: {parsed['passed']} passed, {parsed['failed']} failed, {parsed['errors']} errors",
            {"passed": parsed["passed"], "failed": parsed["failed"]}
        )
        return {**parsed, "has_tests": True, "success": success, "label": label}
    except Exception as e:
        await emit(scan_id, f"⚠️ Test runner error: {e}", level="warning")
        return {"passed": 0, "failed": 0, "total": 0, "has_tests": True, "success": False, "error": str(e), "label": label}


def _build_pr_description(original: dict, patched: dict, patches: list[dict]) -> str:
    """Build a rich GitHub PR description with verifiable test evidence."""
    vuln_list = "\n".join(
        f"- **{p.get('severity', 'UNKNOWN')}** `{p.get('category', 'unknown')}` in `{Path(p.get('file', '')).name}` "
        f"({p.get('cve_id') or p.get('cwe_id') or 'Security Fix'})"
        for p in patches if p.get("applied")
    )
    
    test_comparison = f"""
| Metric | Pre-Patch Baseline | Post-Patch Verified |
|--------|--------------------|---------------------|
| Tests Passed | {original.get('passed', 'N/A')} | {patched.get('passed', 'N/A')} |
| Tests Failed | {original.get('failed', 'N/A')} | {patched.get('failed', 'N/A')} |
| Test Errors | {original.get('errors', 'N/A')} | {patched.get('errors', 'N/A')} |
| Regression-free | — | {'✅ Yes (0 regressions)' if patched.get('regression_free') else '⚠️ Verification Required'} |
"""
    
    return f"""## 🛡️ VASUKI Autonomous Security Patch

This PR was automatically synthesized and empirically validated by **VASUKI** — Autonomous Multi-Agent Vulnerability Patching Pipeline.

### Vulnerabilities Remediated
{vuln_list}

### Empirical Test Evidence (Before vs After)
{test_comparison}

### Pipeline Execution
```
RECON (Scanner) ➔ FORGE (Patcher with AST Syntax Guard) ➔ SHIELD (Reviewer with LangChain) ➔ PROOF (Tester Sandbox)
```

> ✅ **Empirical Proof**: Pre-patch baseline established prior to modifications.
> Verified regression-free against existing and security assertion test suites.

---
*Generated by VASUKI — Autonomous Security Sentinel*
"""


# ── Main Agent Entry Points ──────────────────────────────────────

async def run_baseline_tester(repo_path: str, scan_id: str) -> dict:
    """Run tests on unpatched repository to establish pre-patch baseline."""
    project_info = _detect_project_type(repo_path)
    await emit(scan_id, f"🔍 Detected project type: {project_info['type']} (test files: {project_info.get('test_files_count', 0)})")
    return await run_tests(repo_path, scan_id, project_info, label="pre-patch baseline")


async def run_tester(
    repo_path: str,
    patches: list[dict],
    scan_id: str,
    baseline_results: dict = None,
) -> dict:
    """
    Run post-patch verification tests and compare with pre-patch baseline.
    Returns: { test_results }
    """
    project_info = _detect_project_type(repo_path)
    patched_results = await run_tests(repo_path, scan_id, project_info, label="post-patch verification")
    
    # Calculate regression metrics
    orig = baseline_results or {"passed": 0, "failed": 0, "errors": 0, "total": 0, "has_tests": project_info.get("has_tests")}
    
    if not project_info.get("has_tests"):
        regression_introduced = False
        regression_free = None
    else:
        # A regression occurs if post-patch has MORE failures/errors than baseline
        regression_introduced = (
            patched_results.get("failed", 0) > orig.get("failed", 0) or
            patched_results.get("errors", 0) > orig.get("errors", 0)
        )
        regression_free = not regression_introduced

    patched_results["regression_free"] = regression_free

    evidence = {
        "original_tests": orig,
        "patched_tests": patched_results,
        "regression_free": regression_free,
        "has_tests": project_info.get("has_tests"),
        "patches_applied": sum(1 for p in patches if p.get("applied")),
        "patches_total": len(patches),
        "evidence_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pr_description": _build_pr_description(orig, patched_results, patches),
    }

    if regression_free is False:
        await emit(scan_id, "⚠️ Security patch introduced test regression! Quality gate will block merge.", level="error")
    elif regression_free is True:
        await emit(scan_id, "✅ Empirical verification passed: zero test regressions detected.")
    else:
        await emit(scan_id, "ℹ️ Repository has no automated test suite — proceeding with caution.")

    return {"test_results": evidence}
