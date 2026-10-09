"""Use the OCI managed SSH session for deployment or a local presentation tunnel."""
import argparse
import json
import subprocess
import time
from pathlib import Path

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--command')
parser.add_argument('--upload')
parser.add_argument('--remote-path')
parser.add_argument('--tunnel',action='store_true')
parser.add_argument('--via-bastion',action='store_true')
parser.add_argument('--local-port',type=int,default=18000)
args=parser.parse_args()
state=json.loads((root/'.run/bastion.json').read_text())
key=(root/'.run/oci-session').as_posix()
known=(root/'.run/known-hosts').as_posix()
session=state['session_id']
host='host.bastion.ap-mumbai-1.oci.oraclecloud.com'
proxy=f'ssh -4 -i "{key}" -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="{known}" -W %h:%p -p 22 {session}@{host}'
options=['-4','-i',key,'-o','BatchMode=yes','-o','ConnectTimeout=20','-o','StrictHostKeyChecking=accept-new',
    '-o',f'UserKnownHostsFile={known}','-o','ServerAliveInterval=30']
options.extend(['-o','ServerAliveCountMax=6'])
if args.via_bastion:
    options.extend(['-o',f'ProxyCommand={proxy}'])
target='ubuntu@'+(state['private_ip'] if args.via_bastion else state.get('public_ip','137.23.45.222'))
if args.upload:
    if not args.remote_path:
        parser.error('--remote-path is required for uploads')
    result=subprocess.run(['scp',*options,str(Path(args.upload).resolve()),target+':'+args.remote_path],timeout=180)
elif args.tunnel:
    print(f'Oracle dashboard: http://127.0.0.1:{args.local_port}; n8n: http://127.0.0.1:15678',flush=True)
    for attempt in range(6):
        result=subprocess.run(['ssh',*options,'-o','ExitOnForwardFailure=yes','-N','-L',f'{args.local_port}:127.0.0.1:8000',
            '-L','15678:127.0.0.1:5678',target])
        if result.returncode==0:
            break
        print(f'Tunnel disconnected; reconnect attempt {attempt+1}/6',flush=True)
        time.sleep(3)
else:
    result=subprocess.run(['ssh',*options,target,args.command or 'id; free -m; sudo -n docker ps'],timeout=90)
raise SystemExit(result.returncode)
