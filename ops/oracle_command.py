"""Run a saved script through OCI's enabled Run Command agent (no SSH key)."""
import argparse
import json
import time
from pathlib import Path
import oci

parser = argparse.ArgumentParser()
parser.add_argument('--script')
parser.add_argument('--command-id')
parser.add_argument('--instance-id',default='ocid1.instance.oc1.ap-mumbai-1.anrg6ljryagy35ac3ynsfptam2iqymfcwoi3wlzj34zjww4vupq3o2hpv6pa')
args = parser.parse_args()
config = oci.config.from_file()
client = oci.compute_instance_agent.ComputeInstanceAgentClient(config,timeout=(10,25),retry_strategy=oci.retry.NoneRetryStrategy())
if args.script:
    m = oci.compute_instance_agent.models
    response = client.create_instance_agent_command(m.CreateInstanceAgentCommandDetails(
        compartment_id=config['tenancy'],display_name='vasuki-prototype-operation',execution_time_out_in_seconds=1800,
        target=m.InstanceAgentCommandTarget(instance_id=args.instance_id),
        content=m.InstanceAgentCommandContent(source=m.InstanceAgentCommandSourceViaTextDetails(text=Path(args.script).read_text()),
            output=m.InstanceAgentCommandOutputViaTextDetails())))
    command_id = response.data.id
    Path('.run').mkdir(exist_ok=True)
    Path('.run/oracle-command-id.txt').write_text(command_id)
    print(json.dumps({'command_id':command_id}),flush=True)
else:
    command_id = args.command_id or Path('.run/oracle-command-id.txt').read_text().strip()
    execution = client.get_instance_agent_command_execution(command_id,args.instance_id).data
    print(json.dumps(oci.util.to_dict(execution),indent=2))
