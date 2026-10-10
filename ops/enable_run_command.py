"""Grant only this prototype VM access to its own command executions."""
import oci
config=oci.config.from_file()
identity=oci.identity.IdentityClient(config,timeout=(10,30),retry_strategy=oci.retry.NoneRetryStrategy())
instance_id='ocid1.instance.oc1.ap-mumbai-1.anrg6ljryagy35ac3ynsfptam2iqymfcwoi3wlzj34zjww4vupq3o2hpv6pa'
name='vasuki-prototype-run-command'
groups=identity.list_dynamic_groups(config['tenancy']).data
if not any(g.name==name for g in groups):
    identity.create_dynamic_group(oci.identity.models.CreateDynamicGroupDetails(compartment_id=config['tenancy'],
        name=name,description='Run Command for the single VASUKI prototype VM',matching_rule=f"ALL {{instance.id = '{instance_id}'}}"))
policies=identity.list_policies(config['tenancy']).data
if not any(p.name==name for p in policies):
    identity.create_policy(oci.identity.models.CreatePolicyDetails(compartment_id=config['tenancy'],name=name,
        description='This VM may receive and update only its own command executions',statements=[
        f'Allow dynamic-group {name} to use instance-agent-command-execution-family in tenancy where request.instance.id=target.instance.id']))
print('Scoped Run Command permission configured for the prototype VM')
