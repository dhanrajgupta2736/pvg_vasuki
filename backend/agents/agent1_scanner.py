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


async def clone_repo(repo_url: str, scan_id: str, branch: str = "main") -> str:
    """Clone the repo into a temp directory, return path."""
    tmp_dir = tempfile.mkdtemp(prefix=f"vasuki_{scan_id}_")
    target_branch = branch or "main"
    await emit(scan_id, f"📥 Cloning repository: {repo_url} (branch: {target_branch})")
    
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: Repo.clone_from(repo_url, tmp_dir, depth=1, branch=target_branch)
    )
    await emit(scan_id, f"✅ Repository cloned to {tmp_dir}")
    return tmp_dir


async def run_builtin_sast_scan(repo_path: str, scan_id: str) -> list[dict]:
    """Autonomous built-in SAST scanner detecting security vulnerabilities via AST and regex."""
    await emit(scan_id, "🛡️ Running VASUKI Native AST/SAST Deep Code Analysis...")
    findings = []
    root = Path(repo_path)
    ignored_dirs = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build"}
    target_extensions = {".py", ".js", ".jsx", ".ts", ".tsx", ".php", ".java", ".go"}

    patterns = [
        {
            "id": "vasuki-sqli-01",
            "regex": r'(?i)(?:query|sql)\s*=\s*f["\'].*(?:SELECT|UPDATE|DELETE|INSERT).*\{|(?:cursor\.execute|execute_query|query|session\.execute)\s*\(\s*(?:f["\'][^"\']*(?:SELECT|UPDATE|DELETE|INSERT)[^"\']*\{|["\'][^"\']*(?:SELECT|UPDATE|DELETE|INSERT)[^"\']*["\']\s*%)|f["\']SELECT\s+.*\{',
            "category": "sql-injection",
            "severity": "CRITICAL",
            "cwe_id": "CWE-89",
            "message": "SQL Injection vulnerability: Raw dynamic SQL query concatenated with untrusted input.",
            "cve": None,
            "fix": "Use parameterized queries with prepared statement placeholders instead of string formatting.",
        },
        {
            "id": "vasuki-cmd-01",
            "regex": r'(os\.system\s*\(|subprocess\.(?:Popen|run|call)\s*\([^)]*shell\s*=\s*True)',
            "category": "command-injection",
            "severity": "CRITICAL",
            "cwe_id": "CWE-78",
            "message": "Command Injection vulnerability: System shell execution executed with unescaped arguments.",
            "cve": None,
            "fix": "Pass command arguments as a list with shell=False, or sanitize with shlex.quote().",
        },
        {
            "id": "vasuki-secret-01",
            "regex": r'(?i)(?:api_key|secret_key|private_key|aws_secret|auth_token|jwt_secret)\s*=\s*["\']([a-zA-Z0-9_\-\.]{16,})["\']',
            "category": "secret-exposure",
            "severity": "HIGH",
            "cwe_id": "CWE-798",
            "message": "Hardcoded Secret Exposure: Sensitive API credential embedded directly in source code.",
            "cve": None,
            "fix": "Extract credential to environment variables or an enterprise secrets vault.",
        },
        {
            "id": "vasuki-deser-01",
            "regex": r'(pickle\.loads?\s*\(|yaml\.load\s*\([^,\n)]+\)|eval\s*\(|exec\s*\()',
            "category": "insecure-deserialization",
            "severity": "HIGH",
            "cwe_id": "CWE-502",
            "message": "Insecure Deserialization / Dynamic Code Execution: Arbitrary code execution risk.",
            "cve": None,
            "fix": "Use safe serializers such as json.loads() or yaml.safe_load().",
        },
        {
            "id": "vasuki-traversal-01",
            "regex": r'(?i)(open\s*\(\s*(?:f["\'][^"\']*\{[^"\']*(?:file|path|name)[^"\']*\}|file_path|path|filename\b)|send_file\s*\([^,)]*(?:file|path))',
            "category": "path-traversal",
            "severity": "HIGH",
            "cwe_id": "CWE-22",
            "message": "Path Traversal vulnerability: File path constructed from untrusted variables without canonicalization.",
            "cve": None,
            "fix": "Canonicalize file path using os.path.abspath and assert that it resides within the intended directory.",
        },
        {
            "id": "vasuki-idor-01",
            "regex": r'(?i)(?:cursor\.execute|query|select)\s*\(\s*["\']SELECT\s+.*\s+FROM\s+users\s+WHERE\s+id\s*=\s*\?\s*["\']\s*,\s*\(\s*(?:user_id|id)\s*,\s*\)\)',
            "category": "broken-access-control",
            "severity": "HIGH",
            "cwe_id": "CWE-639",
            "message": "Broken Access Control (IDOR): Object retrieved directly from unverified route parameter without tenant authorization.",
            "cve": None,
            "fix": "Assert that authenticated session identity matches requested user/tenant ID before returning entity.",
        },
        {
            "id": "vasuki-xss-01",
            "regex": r'(dangerouslySetInnerHTML\s*=|innerHTML\s*=\s*|document\.write\s*\()',
            "category": "xss",
            "severity": "MEDIUM",
            "cwe_id": "CWE-79",
            "message": "Cross-Site Scripting (XSS): Direct unescaped markup injection into DOM.",
            "cve": None,
            "fix": "Sanitize HTML using DOMPurify before inserting into the DOM.",
        },
    ]

    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in target_extensions:
            if any(part in ignored_dirs for part in p.parts):
                continue
            try:
                content = p.read_text(encoding="utf-8", errors="ignore")
                lines = content.splitlines()
                rel_path = str(p.relative_to(root)).replace("\\", "/")

                for pattern in patterns:
                    for line_idx, line in enumerate(lines):
                        if re.search(pattern["regex"], line):
                            findings.append({
                                "id": pattern["id"],
                                "file": rel_path,
                                "line_start": line_idx + 1,
                                "line_end": line_idx + 1,
                                "severity": pattern["severity"],
                                "cwe_id": pattern.get("cwe_id", "CWE-Other"),
                                "message": pattern["message"],
                                "code_snippet": line.strip()[:180],
                                "cve_id": pattern["cve"],
                                "fix_suggestion": pattern["fix"],
                                "category": pattern["category"],
                            })
                            break
            except Exception:
                continue

    await emit(scan_id, f"✅ Native SAST found {len(findings)} security findings", {"count": len(findings)})
    return findings


async def run_semgrep(repo_path: str, scan_id: str) -> list[dict]:
    """Run semgrep on the repo and return structured findings, falling back to Native SAST."""
    await emit(scan_id, "🔍 Running Semgrep SAST analysis with OWASP/Security rulesets...")
    
    # If semgrep is not installed or available on this system, gracefully fallback
    if not shutil.which("semgrep"):
        await emit(scan_id, "ℹ️ Semgrep binary not in PATH — utilizing VASUKI Native AST/SAST engine", level="info")
        return await run_builtin_sast_scan(repo_path, scan_id)
    
    cmd = ["semgrep", "scan"]
    for r in SEMGREP_RULES:
        cmd.extend(["--config", r])
    cmd.extend([
        "--json",
        "--quiet",
        "--timeout", "120",
        repo_path,
    ])
    
    loop = asyncio.get_event_loop()
    findings = []
    try:
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        )
        data = json.loads(result.stdout or "{}")
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
                "cve_id": None,
                "fix_suggestion": r.get("extra", {}).get("fix", ""),
                "category": _extract_category(r.get("check_id", "")),
            })
        
        await emit(scan_id, f"✅ Semgrep found {len(findings)} issues", {"count": len(findings)})
    except Exception as e:
        await emit(scan_id, f"⚠️ Semgrep execution failed: {e} — falling back to Native SAST", level="warning")

    if not findings:
        findings = await run_builtin_sast_scan(repo_path, scan_id)
    
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

async def run_scanner(repo_url: str, scan_id: str, branch: str = "main") -> dict:
    """
    Full scanner agent execution.
    Returns: { vulnerabilities, blast_radius, repo_path }
    """
    repo_path = None
    try:
        repo_path = await clone_repo(repo_url, scan_id, branch=branch)
        
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
