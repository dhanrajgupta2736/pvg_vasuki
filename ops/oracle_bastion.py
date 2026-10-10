"""Create a temporary, laptop-IP-restricted OCI managed SSH session."""
import argparse
import json
from pathlib import Path
import httpx
import oci
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--renew',action='store_true',help='Create a fresh three-hour managed SSH session')
args=parser.parse_args()
state_file=ROOT/'.run'/'bastion.json'
key_file=ROOT/'.run'/'oci-session'
state_file.parent.mkdir(exist_ok=True)
config=oci.config.from_file()
kwargs={'timeout':(10,25),'retry_strategy':oci.retry.NoneRetryStrategy()}
compute=oci.core.ComputeClient(config,**kwargs)
network=oci.core.VirtualNetworkClient(config,**kwargs)
client=oci.bastion.BastionClient(config,**kwargs)
vm='ocid1.instance.oc1.ap-mumbai-1.anrg6ljryagy35ac3ynsfptam2iqymfcwoi3wlzj34zjww4vupq3o2hpv6pa'

if not key_file.exists():
    key=ed25519.Ed25519PrivateKey.generate()
    key_file.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.OpenSSH,serialization.NoEncryption()))
    key_file.with_suffix('.pub').write_bytes(key.public_key().public_bytes(serialization.Encoding.OpenSSH,serialization.PublicFormat.OpenSSH))

instance=compute.get_instance(vm).data
plugins=instance.agent_config.plugins_config
if any(p.name=='Bastion' and p.desired_state!='ENABLED' for p in plugins):
    plugins=[oci.core.models.InstanceAgentPluginConfigDetails(name=p.name,desired_state='ENABLED' if p.name=='Bastion' else p.desired_state) for p in plugins]
    compute.update_instance(vm,oci.core.models.UpdateInstanceDetails(agent_config=oci.core.models.UpdateInstanceAgentConfigDetails(
        is_monitoring_disabled=instance.agent_config.is_monitoring_disabled,
        is_management_disabled=instance.agent_config.is_management_disabled,
        are_all_plugins_disabled=False,plugins_config=plugins)))
    print('Bastion plugin enabled; other plugin settings preserved')

state=json.loads(state_file.read_text()) if state_file.exists() else {}
if not state.get('bastion_id'):
    vnic_attachment=compute.list_vnic_attachments(instance.compartment_id,instance_id=vm).data[0]
    vnic=network.get_vnic(vnic_attachment.vnic_id).data
    ip=httpx.get('https://api.ipify.org',timeout=15).text.strip()
    import ipaddress
    ipaddress.ip_address(ip)
    bastion=client.create_bastion(oci.bastion.models.CreateBastionDetails(
        bastion_type='STANDARD',name='vasukiprototype',compartment_id=instance.compartment_id,
        target_subnet_id=vnic.subnet_id,client_cidr_block_allow_list=[ip+'/32'],max_session_ttl_in_seconds=10800)).data
    state={'bastion_id':bastion.id,'private_ip':vnic.private_ip,'instance_id':vm,'key_path':str(key_file)}
    state_file.write_text(json.dumps(state,indent=2))

bastion=client.get_bastion(state['bastion_id']).data
print(json.dumps({'bastion_state':bastion.lifecycle_state}))
if bastion.lifecycle_state=='ACTIVE':
    if state.get('session_id'):
        previous=client.get_session(state['session_id']).data
        if args.renew or previous.lifecycle_state in {'DELETED','FAILED','DELETING'}:
            state.pop('session_id')
    if not state.get('session_id'):
        plugin_client=oci.compute_instance_agent.PluginClient(config,**kwargs)
        plugin=next(p for p in plugin_client.list_instance_agent_plugins(instance.compartment_id,vm).data if p.name=='Bastion')
        if plugin.status!='RUNNING':
            print(json.dumps({'plugin_state':plugin.status,'last_update':str(plugin.time_last_updated_utc)}))
            raise SystemExit(0)
        session=client.create_session(oci.bastion.models.CreateSessionDetails(
            bastion_id=bastion.id,display_name='vasuki-prototype-deployment',key_type='PUB',
            key_details=oci.bastion.models.PublicKeyDetails(public_key_content=key_file.with_suffix('.pub').read_text()),
            session_ttl_in_seconds=10800,
            target_resource_details=oci.bastion.models.CreateManagedSshSessionTargetResourceDetails(
                target_resource_operating_system_user_name='ubuntu',target_resource_id=vm,
                target_resource_private_ip_address=state['private_ip'],target_resource_port=22))).data
        state['session_id']=session.id
        state_file.write_text(json.dumps(state,indent=2))
    session=client.get_session(state['session_id']).data
    print(json.dumps({'session_state':session.lifecycle_state,'expires_after_seconds':session.session_ttl_in_seconds,'ssh_metadata':session.ssh_metadata,
        'message':session.lifecycle_details}))
