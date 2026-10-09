"""Run measured real GitHub scans; publish one hero PR on the final run."""
import argparse
import json
import time
from pathlib import Path
import httpx

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:18000')
parser.add_argument('--runs',type=int,default=5)
parser.add_argument('--publish-final',action='store_true')
args=parser.parse_args()
records=[]
output=Path(__file__).resolve().parents[1]/'.run/rehearsal.json'
with httpx.Client(base_url=args.url,timeout=30) as client:
    for i in range(args.runs):
        started=time.monotonic()
        response=client.post('/api/analysis/orchestrated',json={
            'repo_url':'https://github.com/dhanrajgupta2736/vasuki-security-lab',
            'publish_pr':args.publish_final and i==args.runs-1})
        response.raise_for_status()
        scan_id=response.json()['scan_id']
        print(json.dumps({'run':i+1,'scan_id':scan_id}),flush=True)
        last_connection_notice=0
        while time.monotonic()-started<900:
            try:
                job=client.get('/api/analysis/'+scan_id)
            except httpx.TransportError as exc:
                if time.monotonic()-last_connection_notice>30:
                    print('Polling connection interrupted: '+type(exc).__name__+'; retrying the same scan',flush=True)
                    last_connection_notice=time.monotonic()
                time.sleep(3)
                continue
            job.raise_for_status()
            job=job.json()
            if job['status'] in {'completed','blocked','failed'}:
                break
            time.sleep(3)
        evidence=job.get('test_results') or {}
        result={'run':i+1,'scan_id':scan_id,'status':job['status'],'seconds':round(time.monotonic()-started,1),
            'backend_seconds':evidence.get('elapsed_seconds'),
            'before_passed':evidence.get('original_tests',{}).get('passed'),
            'after_passed':evidence.get('patched_tests',{}).get('passed'),
            'test_total':evidence.get('patched_tests',{}).get('total'),
            'runner':evidence.get('patched_tests',{}).get('runner'),
            'regression_free':evidence.get('regression_free'),'score':evidence.get('verification_score'),
            'models':list({p['model_used'] for p in job.get('patches',[])}),'pr_url':job['pr_url'],
            'error':job['error_message']}
        records.append(result)
        output.write_text(json.dumps(records,indent=2))
        print(json.dumps(result),flush=True)
        if result['status']!='completed' or result['regression_free'] is not True:
            raise SystemExit('Rehearsal stopped: investigate the actual failed gate before continuing')
