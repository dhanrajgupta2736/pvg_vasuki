"""SHIELD: verify final source against the same rules used at intake."""
import ast
from pathlib import Path
from core.redis_client import publish_event
from agents.agent1_scanner import run_semgrep, run_dependency_scan
from services.security_engine import source_files

async def run_reviewer(patches,vulnerabilities,scan_id,repo_path,project_root=None,bundled=False):
    project_root = Path(project_root or repo_path).resolve()
    await publish_event(scan_id,{'agent':'reviewer','level':'info','message':'Re-scanning final patched source with the intake rules','data':{}})
    syntax_errors = []
    for path in source_files(project_root):
        try:
            ast.parse(path.read_text(encoding='utf-8'))
        except SyntaxError as exc:
            syntax_errors.append(f'{path.relative_to(project_root)}:{exc.lineno}')
    remaining = await run_semgrep(str(project_root),scan_id)
    if not bundled:
        remaining.extend(await run_dependency_scan(str(project_root),scan_id))
    prefix = project_root.relative_to(Path(repo_path).resolve())
    for finding in remaining:
        finding['file'] = (prefix/finding['file']).as_posix()
    before_keys = {(v['file'],v['category'],v.get('rule_id')) for v in vulnerabilities}
    after_keys = {(v['file'],v['category'],v.get('rule_id')) for v in remaining}
    new_findings = [v for v in remaining if (v['file'],v['category'],v.get('rule_id')) not in before_keys]
    reviews = []
    for patch in patches:
        unresolved = any(v['file']==patch['file'] and v['category']==patch['category'] for v in remaining)
        approved = not unresolved and not syntax_errors and not new_findings
        reviews.append({'patch_id':patch['vulnerability_id'],'file':patch['file'],'patch_fixes_vuln':not unresolved,
            'introduces_new_vulns':bool(new_findings),'confidence_score':100 if approved else 0,
            'recommendation':'approve' if approved else 'reject','logic_break_risk':'pending-test-verification',
            'reasoning':'Target rule no longer matches; syntax passes. Runtime proof is required.' if approved else 'Target remains or source validation failed.',
            'semgrep_result':'Re-scan passed' if approved else 'Re-scan failed'})
    notes = {'individual_reviews':reviews,'summary':{'approved':sum(r['recommendation']=='approve' for r in reviews),
        'rejected':sum(r['recommendation']=='reject' for r in reviews),'total_reviewed':len(reviews)},
        'remaining_findings':remaining,'new_findings':new_findings,'syntax_errors':syntax_errors,
        'all_findings_resolved':not remaining and not syntax_errors}
    # Percentage of original rule instances cleared, explicitly not a merge probability.
    score = round(100*len(before_keys-after_keys)/max(len(before_keys),1),1)
    return {'review_notes':notes,'confidence_score':score}
