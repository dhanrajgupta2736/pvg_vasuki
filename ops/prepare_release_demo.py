"""Create a deliberately vulnerable older release in the owned demo repository."""
import json
import sys
from pathlib import Path
import httpx

root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'backend'))
from core.config import settings

files={
    'setup.py':'''"""Build hook verifies repository code executes without network interfaces."""
import os
from pathlib import Path
from setuptools import setup

if Path('/sys/class/net').is_dir():
    assert {path.name for path in Path('/sys/class/net').iterdir()} == {'lo'}, 'Repository code executed with network access'
    assert os.geteuid() != 0, 'Repository code executed as root'
    print('Verified offline repository installation and build: loopback only, non-root user')

setup()
''',
    'pyproject.toml':'''[build-system]
requires = ["setuptools>=61", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "vasuki-security-lab"
version = "0.1.0"
description = "Intentionally vulnerable VASUKI release demonstration"
dependencies = ["flask>=3.1", "jinja2>=3.1"]

[tool.setuptools]
py-modules = ["app", "templating"]
''',
    'requirements.txt':'flask==3.1.3\npytest==9.1.1\nJinja2==3.1.5\n',
    'templating.py':'''"""Older release feature: users may render templates inside a Jinja sandbox."""
from jinja2.sandbox import SandboxedEnvironment

def render_template(source, value):
    return SandboxedEnvironment().from_string(source).render(value=value)
''',
    'tests/test_templates.py':'''"""Harmless attribute-disclosure proof for CVE-2025-27516; no code execution.

Reference: https://github.com/pallets/jinja/security/advisories/GHSA-cpwx-vrp4-4pq7
The vulnerable attr filter obtains plain str.format and bypasses sandbox lookup.
"""
from templating import render_template

def test_template_normal_rendering():
    assert render_template("Hello {{ value }}", "judge") == "Hello judge"

def test_security_template_attr_filter_cannot_disclose_private_class():
    payload = '{{ "a{0.__class__}b" | attr("format")(value) }}'
    assert render_template(payload, 42) == "ab"
''',
}

with httpx.Client(base_url='https://api.github.com',timeout=30,headers={
    'Authorization':'Bearer '+settings.GITHUB_TOKEN,'Accept':'application/vnd.github+json'}) as client:
    prefix='/repos/dhanrajgupta2736/vasuki-security-lab'
    branch='release/v0.1'
    existing=client.get(prefix+'/git/ref/heads/'+branch)
    if existing.status_code==200:
        setup=client.get(prefix+'/contents/setup.py',params={'ref':branch})
        if setup.status_code==404:
            import base64
            added=client.put(prefix+'/contents/setup.py',json={
                'message':'testbed: verify offline non-root repository installation and builds',
                'branch':branch,'content':base64.b64encode(files['setup.py'].encode()).decode()})
            added.raise_for_status()
            print(json.dumps({'branch':branch,'sha':added.json()['commit']['sha'],'offline_build_hook_added':True}))
            raise SystemExit(0)
        setup.raise_for_status()
        print(json.dumps({'branch':branch,'sha':existing.json()['object']['sha'],'existing':True}))
        raise SystemExit(0)
    if existing.status_code!=404:
        existing.raise_for_status()
    base=client.get(prefix+'/git/ref/heads/main');base.raise_for_status()
    base_sha=base.json()['object']['sha']
    commit=client.get(prefix+'/git/commits/'+base_sha);commit.raise_for_status()
    tree=client.post(prefix+'/git/trees',json={'base_tree':commit.json()['tree']['sha'],
        'tree':[{'path':path,'mode':'100644','type':'blob','content':content} for path,content in files.items()]})
    tree.raise_for_status()
    revision=client.post(prefix+'/git/commits',json={'message':'testbed: preserve an older packaged release with a known Jinja advisory',
        'tree':tree.json()['sha'],'parents':[base_sha]})
    revision.raise_for_status()
    ref=client.post(prefix+'/git/refs',json={'ref':'refs/heads/'+branch,'sha':revision.json()['sha']})
    ref.raise_for_status()
    result={'branch':branch,'sha':revision.json()['sha'],'base_sha':base_sha,'existing':False}
    (root/'.run/release-demo.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))
