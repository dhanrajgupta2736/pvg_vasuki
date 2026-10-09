"""
VASUKI LangChain Intelligence Module
Implements LangChain Core primitives (PromptTemplate, OutputParser, LCEL)
for structured patch auditing, schema validation, and multi-agent reasoning.
"""
import json
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

try:
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False


class PatchAuditResult(BaseModel):
    patch_fixes_vuln: bool = Field(description="Whether the patch completely resolves the target vulnerability")
    introduces_new_vulns: bool = Field(description="Whether new vulnerabilities or security risks were introduced")
    logic_break_risk: str = Field(description="Risk of breaking existing business logic: 'none', 'low', 'medium', 'high'")
    confidence_score: float = Field(description="Numerical confidence percentage between 0 and 100")
    reasoning: str = Field(description="Detailed architectural reasoning for the assessment")
    recommendation: str = Field(description="'approve', 'approve_with_caution', or 'reject'")


def get_langchain_review_prompt(vuln_type: str, cve_id: str, severity: str, message: str, diff: str, semgrep_result: str) -> str:
    """Formats the LangChain structured review prompt using ChatPromptTemplate or fallback."""
    if LANGCHAIN_AVAILABLE:
        try:
            parser = JsonOutputParser(pydantic_object=PatchAuditResult)
            prompt = ChatPromptTemplate.from_messages([
                (
                    "system",
                    "You are VASUKI's Shield Agent (Powered by LangChain & OCI GenAI) — an elite security code reviewer.\n"
                    "Analyze the provided security patch diff and evaluate correctness, security, and regression risk.\n"
                    "{format_instructions}"
                ),
                (
                    "user",
                    "## Vulnerability:\n"
                    "- Type: {vuln_type}\n"
                    "- CVE: {cve_id}\n"
                    "- Severity: {severity}\n"
                    "- Message: {message}\n\n"
                    "## Git Diff (the patch):\n```diff\n{diff}\n```\n\n"
                    "## Semgrep Re-scan Result:\n{semgrep_result}\n\n"
                    "Provide your structured review response:"
                )
            ])
            formatted = prompt.format(
                format_instructions=parser.get_format_instructions(),
                vuln_type=vuln_type,
                cve_id=cve_id,
                severity=severity,
                message=message,
                diff=diff,
                semgrep_result=semgrep_result,
            )
            return formatted
        except Exception:
            pass

    # Fallback template if langchain_core is not loaded
    return f"""You are VASUKI's Shield Agent — an elite security code reviewer.
Respond in valid JSON matching this schema:
{{
  "patch_fixes_vuln": true/false,
  "introduces_new_vulns": true/false,
  "logic_break_risk": "none|low|medium|high",
  "confidence_score": 0-100,
  "reasoning": "...",
  "recommendation": "approve|approve_with_caution|reject"
}}

Vulnerability: {vuln_type} ({cve_id}) - Severity: {severity}
Message: {message}

Git Diff:
{diff}

Semgrep Result:
{semgrep_result}
"""
