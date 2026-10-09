"""
AGENT 1: RECON — The Scanner
Responsibilities:
  - Clone the GitHub repo
  - Run Semgrep for SAST (static analysis)
  - Run pip-audit / safety for dependency CVEs
  - Cross-reference findings with NVD CVE database
  - Output: structured list of vulnerabilities with severity, file, line, CVE ID
"""
import asyncio
import json
import os
import subprocess
import tempfile
import shutil
import re
from pathlib import Path
from typing import Optional

import httpx
from git import Repo

from core.config import settings
from core.redis_client import publish_event


NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
NVD_KEYWORD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={keyword}&resultsPerPage=5"

SEMGREP_RULES = [
    "p/python",
    "p/javascript",
    "p/java",
    "p/owasp-top-ten",
    "p/security-audit",
    "p/sql-injection",
    "p/xss",
    "p/secrets",
]


async def emit(scan_id: str, message: str, data: dict = None, level: str = "info"):
    """Push a log event to the frontend via Redis pub/sub."""
    await publish_event(scan_id, {
        "agent": "scanner",
        "level": level,
        "message": message,
        "data": data or {},
    })


async def clone_repo(repo_url: str, scan_id: str) -> str:
    """Clone the repo into a temp directory, return path."""
    tmp_dir = tempfile.mkdtemp(prefix=f"vasuki_{scan_id}_")
    await emit(scan_id, f"📥 Cloning repository: {repo_url}")
    
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: Repo.clone_from(repo_url, tmp_dir, depth=1)
    )
    await emit(scan_id, f"✅ Repository cloned to {tmp_dir}")
    return tmp_dir


async def run_semgrep(repo_path: str, scan_id: str) -> list[dict]:
    """Run semgrep on the repo and return structured findings."""
    await emit(scan_id, "🔍 Running Semgrep SAST analysis...")
    
    rules = ",".join(SEMGREP_RULES)
    cmd = [
        "semgrep", "scan",
        "--config", "auto",
        "--json",
        "--quiet",
        "--timeout", "120",
        repo_path,
    ]
    
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    )
    
    findings = []
    try:
        data = json.loads(result.stdout)
        raw_results = data.get("results", [])
        
        for r in raw_results:
            findings.append({
                "id": r.get("check_id", "unknown"),
                "file": r.get("path", ""),
                "line_start": r.get("start", {}).get("line", 0),
                "line_end": r.get("end", {}).get("line", 0),
                "severity": r.get("extra", {}).get("severity", "WARNING").upper(),
                "message": r.get("extra", {}).get("message", ""),
                "code_snippet": r.get("extra", {}).get("lines", ""),
                "cve_id": None,  # Will be enriched below
                "fix_suggestion": r.get("extra", {}).get("fix", ""),
                "category": _extract_category(r.get("check_id", "")),
            })
        
        await emit(scan_id, f"✅ Semgrep found {len(findings)} issues", {"count": len(findings)})
    except (json.JSONDecodeError, KeyError) as e:
        await emit(scan_id, f"⚠️ Semgrep parse error: {e}", level="warning")
    
    return findings


async def run_dependency_scan(repo_path: str, scan_id: str) -> list[dict]:
    """Scan Python deps via pip-audit, JS via npm audit."""
    dep_vulns = []
    
    # Python: pip-audit
    req_files = list(Path(repo_path).rglob("requirements*.txt"))
    if req_files:
        await emit(scan_id, "🔍 Scanning Python dependencies with pip-audit...")
        cmd = ["pip-audit", "--requirement", str(req_files[0]), "--format", "json", "--disable-pip"]
        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            )
            data = json.loads(result.stdout or "[]")
            for vuln in (data if isinstance(data, list) else []):
                dep_vulns.append({
                    "id": f"dep-{vuln.get('name', 'unknown')}",
                    "file": str(req_files[0]),
                    "line_start": 0,
                    "line_end": 0,
                    "severity": "HIGH",
                    "message": f"Vulnerable dependency: {vuln.get('name')} {vuln.get('version')} — {vuln.get('description', '')}",
                    "code_snippet": f"{vuln.get('name')}=={vuln.get('version')}",
                    "cve_id": vuln.get("aliases", [None])[0],
                    "fix_suggestion": f"Upgrade to {vuln.get('fix_versions', ['latest'])[0] if vuln.get('fix_versions') else 'latest'}",
                    "category": "dependency",
                })
        except Exception as e:
            await emit(scan_id, f"⚠️ pip-audit failed: {e}", level="warning")
    
    # JS: npm audit
    if (Path(repo_path) / "package.json").exists():
        await emit(scan_id, "🔍 Scanning JS dependencies with npm audit...")
        cmd = ["npm", "audit", "--json"]
        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(
                None,
                lambda: subprocess.run(cmd, capture_output=True, text=True, cwd=repo_path, timeout=120)
            )
            data = json.loads(result.stdout or "{}")
            for vuln_name, vuln_data in data.get("vulnerabilities", {}).items():
                dep_vulns.append({
                    "id": f"npm-{vuln_name}",
                    "file": "package.json",
                    "line_start": 0,
                    "line_end": 0,
                    "severity": vuln_data.get("severity", "moderate").upper(),
                    "message": f"Vulnerable JS package: {vuln_name} — {vuln_data.get('title', '')}",
                    "code_snippet": vuln_name,
                    "cve_id": vuln_data.get("cves", [None])[0],
                    "fix_suggestion": f"npm audit fix",
                    "category": "dependency",
                })
        except Exception as e:
            await emit(scan_id, f"⚠️ npm audit failed: {e}", level="warning")
    
    return dep_vulns


async def enrich_with_nvd(findings: list[dict], scan_id: str) -> list[dict]:
    """Try to match findings to real CVE IDs via NVD API."""
    await emit(scan_id, "🔗 Cross-referencing with NVD CVE database...")
    
    enriched = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for finding in findings:
            if finding.get("cve_id"):
                enriched.append(finding)
                continue
            
            # Search NVD by vulnerability category keyword
            keyword = _vuln_to_nvd_keyword(finding.get("category", ""), finding.get("message", ""))
            if not keyword:
                enriched.append(finding)
                continue
            
            try:
                resp = await client.get(
                    NVD_API_URL,
                    params={"keywordSearch": keyword, "resultsPerPage": 1},
                    headers={"User-Agent": "VASUKI-Security-Agent/1.0"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    vulns = data.get("vulnerabilities", [])
                    if vulns:
                        cve = vulns[0].get("cve", {})
                        finding["cve_id"] = cve.get("id", "")
                        finding["cvss_score"] = _extract_cvss(cve)
                        finding["nvd_description"] = _extract_nvd_desc(cve)
            except Exception:
                pass
            
            enriched.append(finding)
            await asyncio.sleep(0.6)  # NVD rate limit: 5 req/s unauthenticated
    
    return enriched


async def calculate_blast_radius(repo_path: str, findings: list[dict], scan_id: str) -> list[str]:
    """Identify all files potentially affected by the vulnerabilities."""
    await emit(scan_id, "💥 Calculating blast radius...")
    
    affected_files = set()
    root = Path(repo_path)
    for f in findings:
        file_path = f.get("file")
        if file_path:
            affected_files.add(file_path)
            vuln_module = Path(file_path).stem
            try:
                for p in root.rglob("*"):
                    if p.is_file() and p.suffix in (".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".html"):
                        try:
                            content = p.read_text(encoding="utf-8", errors="ignore")
                            if vuln_module in content:
                                rel = str(p.relative_to(root)).replace("\\", "/")
                                affected_files.add(rel)
                        except Exception:
                            pass
            except Exception:
                pass
    
    blast = sorted(list(affected_files))
    await emit(scan_id, f"💥 Blast radius: {len(blast)} files affected", {"files": blast})
    return blast


# ── Main Agent Entry Point ──────────────────────────────────────

async def run_scanner(repo_url: str, scan_id: str) -> dict:
    """
    Full scanner agent execution.
    Returns: { vulnerabilities, blast_radius, repo_path }
    """
    repo_path = None
    try:
        repo_path = await clone_repo(repo_url, scan_id)
        
        # Run all scans in parallel
        semgrep_task = asyncio.create_task(run_semgrep(repo_path, scan_id))
        dep_task     = asyncio.create_task(run_dependency_scan(repo_path, scan_id))
        
        semgrep_findings, dep_findings = await asyncio.gather(semgrep_task, dep_task)
        
        all_findings = semgrep_findings + dep_findings
        
        # Enrich with NVD (sequential due to rate limits)
        enriched = await enrich_with_nvd(all_findings, scan_id)
        
        # Sort by severity
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "WARNING": 3, "LOW": 4, "INFO": 5}
        enriched.sort(key=lambda x: severity_order.get(x.get("severity", "LOW"), 99))
        
        blast_radius = await calculate_blast_radius(repo_path, enriched, scan_id)
        
        await emit(
            scan_id,
            f"🎯 Scanner complete: {len(enriched)} vulnerabilities found",
            {"total": len(enriched), "critical": sum(1 for v in enriched if v.get("severity") == "CRITICAL")},
        )
        
        return {
            "vulnerabilities": enriched,
            "blast_radius": blast_radius,
            "repo_path": repo_path,
        }
    
    except Exception as e:
        await emit(scan_id, f"❌ Scanner failed: {str(e)}", level="error")
        if repo_path and os.path.exists(repo_path):
            shutil.rmtree(repo_path, ignore_errors=True)
        raise


# ── Helpers ─────────────────────────────────────────────

def _extract_category(check_id: str) -> str:
    if "sql" in check_id.lower(): return "sql-injection"
    if "xss" in check_id.lower(): return "xss"
    if "secret" in check_id.lower() or "password" in check_id.lower(): return "secret-exposure"
    if "path" in check_id.lower() or "traversal" in check_id.lower(): return "path-traversal"
    if "command" in check_id.lower() or "exec" in check_id.lower(): return "command-injection"
    if "ssrf" in check_id.lower(): return "ssrf"
    if "crypto" in check_id.lower(): return "weak-crypto"
    return "general"


def _vuln_to_nvd_keyword(category: str, message: str) -> str:
    mapping = {
        "sql-injection": "SQL injection",
        "xss": "cross-site scripting XSS",
        "secret-exposure": "sensitive data exposure credentials",
        "path-traversal": "path traversal directory traversal",
        "command-injection": "OS command injection",
        "ssrf": "SSRF server-side request forgery",
        "weak-crypto": "weak cryptography",
        "dependency": "",
    }
    return mapping.get(category, "")


def _extract_cvss(cve: dict) -> float:
    try:
        metrics = cve.get("metrics", {})
        for key in ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]:
            if key in metrics and metrics[key]:
                return metrics[key][0]["cvssData"]["baseScore"]
    except Exception:
        pass
    return 0.0


def _extract_nvd_desc(cve: dict) -> str:
    try:
        descs = cve.get("descriptions", [])
        for d in descs:
            if d.get("lang") == "en":
                return d.get("value", "")
    except Exception:
        pass
    return ""
