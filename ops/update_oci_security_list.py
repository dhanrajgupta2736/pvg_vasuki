import oci

config = oci.config.from_file('~/.oci/config', 'DEFAULT')
vcn_client = oci.core.VirtualNetworkClient(config)

sl_id = 'ocid1.securitylist.oc1.ap-mumbai-1.aaaaaaaagonzddfhbnp3md5jjsgw6ispnaiiyaswbgoqonl4mte5vwwu2zvq'
sl = vcn_client.get_security_list(sl_id).data

existing_rules = sl.ingress_security_rules
ports_present = set()
for r in existing_rules:
    if r.tcp_options and r.tcp_options.destination_port_range:
        ports_present.add((r.tcp_options.destination_port_range.min, r.tcp_options.destination_port_range.max))

print("Current open TCP port ranges:", ports_present)

new_rules = list(existing_rules)

# Add 443 (HTTPS) if not present
if (443, 443) not in ports_present:
    new_rules.append(oci.core.models.IngressSecurityRule(
        protocol="6", # TCP
        source="0.0.0.0/0",
        tcp_options=oci.core.models.TcpOptions(
            destination_port_range=oci.core.models.PortRange(min=443, max=443)
        ),
        description="Allow HTTPS"
    ))
    print("Adding port 443")

# Add 8000 (VASUKI API) if not present
if (8000, 8000) not in ports_present:
    new_rules.append(oci.core.models.IngressSecurityRule(
        protocol="6", # TCP
        source="0.0.0.0/0",
        tcp_options=oci.core.models.TcpOptions(
            destination_port_range=oci.core.models.PortRange(min=8000, max=8000)
        ),
        description="Allow VASUKI Backend API"
    ))
    print("Adding port 8000")

update_details = oci.core.models.UpdateSecurityListDetails(
    ingress_security_rules=new_rules
)

updated_sl = vcn_client.update_security_list(sl_id, update_details).data
print("Security List successfully updated! Total ingress rules:", len(updated_sl.ingress_security_rules))
