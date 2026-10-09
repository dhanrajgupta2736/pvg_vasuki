"""Export an actual successful run as offline, clearly labelled evidence."""
import argparse
import json
from pathlib import Path
import httpx

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:18000')
parser.add_argument('--scan-id')
args=parser.parse_args()
records=json.loads((root/'.run/rehearsal.json').read_text())
scan_id=args.scan_id or next(r['scan_id'] for r in reversed(records) if r.get('pr_url'))
output=root/'docs/demo'
output.mkdir(parents=True,exist_ok=True)
with httpx.Client(base_url=args.url,timeout=30) as client:
    def get(path):
        response=client.get(path)
        response.raise_for_status()
        return response
    report=get('/api/analysis/'+scan_id).json()
    if report['status']!='completed' or report['test_results'].get('regression_free') is not True:
        raise SystemExit('Only verified completed runs can become the demo fallback')
    events=get('/api/analysis/'+scan_id+'/events').json()
    patch=get('/api/reports/'+scan_id+'/patch').text
    for name,data in [('run.json',report),('events.json',events),('rehearsals.json',records)]:
        (output/name).write_text(json.dumps(data,indent=2),encoding='utf-8')
    (output/'verified.patch').write_text(patch,encoding='utf-8',newline='\n')
    (output/'pull-request.md').write_text(report['test_results']['pr_description'],encoding='utf-8')

template=r'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VASUKI · Recorded demo evidence</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f1e9;color:#181d19;font:16px system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:35px 28px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid;padding-bottom:20px}.logo{font-weight:900;font-size:28px}.label{background:#ffe15b;padding:8px 14px;font-size:12px;font-weight:800;letter-spacing:1px}h1{font-size:clamp(34px,5vw,66px);line-height:1.08;margin:36px 0 12px}p{color:#626a62;line-height:1.7}a{color:#2358e7}.metrics{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d7d7ce;margin:30px 0}.metrics div{padding:23px;border-right:1px solid #d7d7ce}.metrics strong{display:block;font-size:36px;margin-top:8px}.metrics small{font-size:11px;letter-spacing:1px}.banner{padding:20px;background:#e5efdf;border:1px solid #b5cdaa}.tabs{display:flex;gap:10px;margin:28px 0 0;border-bottom:1px solid #ccc}.tabs button{border:0;border-bottom:3px solid transparent;background:none;padding:18px 10px;font:inherit;cursor:pointer}.tabs button.active{border-color:#2358e7;color:#2358e7}.panel{display:none;background:#fffdf7;padding:22px;overflow:auto}.panel.active{display:block}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:13px 8px;border-bottom:1px solid #e5e5dc}.pass{color:#21724c;font-weight:700}.fail{color:#b24532;font-weight:700}pre{font:13px/1.7 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.event{display:grid;grid-template-columns:90px 110px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid #e5e5dc;font-size:13px}.event b{text-transform:uppercase}.finding{border-bottom:1px solid #ddd;padding:15px 0}.check{padding:10px 0}.footer{font:12px monospace;margin-top:24px}@media(max-width:700px){.metrics{grid-template-columns:repeat(2,1fr)}.tabs{overflow:auto}.event{grid-template-columns:70px 1fr}.event span:last-child{grid-column:1/-1}main{padding:20px 14px}}
</style><main><header><span class="logo">VASUKI</span><span class="label">RECORDED RUN · OFFLINE EVIDENCE</span></header><h1>Find it. Fix it.<br>Prove it.</h1><p>This page contains saved results from an executed Oracle pipeline run. It works offline and does not start a new scan.</p><div class="banner" id="outcome"></div><div class="metrics" id="metrics"></div><div class="tabs"><button class="active" data-tab="tests">Test comparison</button><button data-tab="patch">Verified diff</button><button data-tab="findings">Source findings</button><button data-tab="review">Validation checks</button><button data-tab="events">Agent timeline</button></div><section class="panel active" id="tests"></section><section class="panel" id="patch"><pre></pre></section><section class="panel" id="findings"></section><section class="panel" id="review"></section><section class="panel" id="events"></section><p class="footer" id="identity"></p><p><a href="run.json">Full recorded run</a> · <a href="verified.patch">Download patch</a> · <a href="rehearsals.json">Measured rehearsals</a> · <a href="feedback-loop.json">Earlier rejection and repair evidence</a></p></main>
<script>
const report=__REPORT__,events=__EVENTS__,patch=__PATCH__,evidence=report.test_results;
function element(tag,text,className){const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e}
const outcome=document.getElementById('outcome');outcome.append(element('strong',evidence.patched_tests.passed+' tests passed · '+evidence.security_tests_count+' security checks · '+evidence.regressions.length+' regressions · '+evidence.patched_tests.runner));if(report.pr_url){const a=element('a','Open the real draft PR');a.href=report.pr_url;a.target='_blank';a.rel='noreferrer';a.style.marginLeft='20px';outcome.append(a)}
for(const [label,value] of [['SOURCE FINDINGS',report.vulnerabilities.length],['PATCHES',report.patches.length],['TESTS PASSING',evidence.patched_tests.passed+'/'+evidence.patched_tests.total],['VALIDATION SCORE',evidence.verification_score+'/100']]){const d=element('div','');d.append(element('small',label),element('strong',value));document.getElementById('metrics').append(d)}
const table=element('table',''),head=element('tr','');for(const title of ['Unchanged test','Kind','Before','After'])head.append(element('th',title));table.append(head);const after=new Map(evidence.patched_tests.cases.map(c=>[c.id,c]));for(const before of evidence.original_tests.cases){const current=after.get(before.id);const row=element('tr','');row.append(element('td',before.name),element('td',before.security?'Security exploit':'Functional'),element('td',before.status,before.status==='passed'?'pass':'fail'),element('td',current?.status||'missing',current?.status==='passed'?'pass':'fail'));table.append(row)}document.getElementById('tests').append(table);
document.querySelector('#patch pre').textContent=patch;
for(const f of report.vulnerabilities){const d=element('div','', 'finding');d.append(element('strong',f.cwe_id+' · '+f.category),element('p',f.message),element('pre',f.file+':'+f.line_start+'\n'+f.code_snippet));document.getElementById('findings').append(d)}
for(const [name,passed] of Object.entries(evidence.verification_checks))document.getElementById('review').append(element('div',(passed?'✓ ':'× ')+name.replaceAll('_',' '),'check '+(passed?'pass':'fail')));document.getElementById('review').append(element('p','Five executed checks, 20 points each. This score is not a probability of security.'));
for(const ev of events){const d=element('div','', 'event');d.append(element('span',new Date(ev.timestamp).toLocaleTimeString()),element('b',ev.agent),element('span',ev.message));document.getElementById('events').append(d)}
document.getElementById('identity').textContent='Scan '+report.scan_id+' · '+evidence.elapsed_seconds+' seconds · '+report.repo_url+' · '+evidence.patch_sha;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button,.panel').forEach(e=>e.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.tab).classList.add('active')});
</script></html>'''
for placeholder,data in [('__REPORT__',report),('__EVENTS__',events),('__PATCH__',patch)]:
    template=template.replace(placeholder,json.dumps(data).replace('<','\\u003c'))
(output/'offline.html').write_text(template,encoding='utf-8')
print(json.dumps({'scan_id':scan_id,'pr_url':report['pr_url'],'offline_report':str(output/'offline.html')}))
