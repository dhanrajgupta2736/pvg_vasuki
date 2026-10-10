"""Generate the executable n8n intake and result-tracking workflow."""
import json
from pathlib import Path

def node(name, kind, version, position, parameters, **extra):
    return {'id': name.lower().replace(' ', '-'), 'name': name,
        'type': 'n8n-nodes-base.' + kind, 'typeVersion': version,
        'position': position, 'parameters': parameters, **extra}

workflow = {'id': 'vasukiPrototype01', 'name': 'VASUKI · Autonomous security patch pipeline',
    'active': False, 'settings': {'executionOrder': 'v1', 'executionTimeout': 1800},
    'nodes': [
        node('Repository intake', 'webhook', 2, [0, 0], {'httpMethod': 'POST',
            'path': 'vasuki-security-trigger', 'responseMode': 'responseNode', 'options': {}},
            webhookId='1c975faa-49e1-4614-a2bd-7926059419f3'),
        node('Submit to VASUKI', 'httpRequest', 4.2, [240, 0], {'method': 'POST',
            'url': 'http://api:8000/api/analysis/', 'sendBody': True, 'specifyBody': 'json',
            'jsonBody': '={{ JSON.stringify($json.body) }}', 'options': {'timeout': 30000}}),
        node('Return scan ID', 'respondToWebhook', 1.4, [480, 0], {
            'respondWith': 'json', 'responseBody': '={{ JSON.stringify($json) }}', 'options': {}}),
        node('Wait for agents', 'wait', 1.1, [720, 0], {'amount': 10, 'unit': 'seconds'}),
        node('Read real results', 'httpRequest', 4.2, [960, 0], {'url': "={{ 'http://api:8000/api/analysis/' + $('Submit to VASUKI').first().json.scan_id }}", 'options': {}}),
        node('Terminal outcome', 'if', 2.2, [1200, 0], {'conditions': {'options': {
            'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict', 'version': 2},
            'conditions': [{'id': 'terminal-check', 'leftValue': "={{ ['completed', 'blocked', 'failed'].includes($json.status) }}",
                'rightValue': '', 'operator': {'type': 'boolean', 'operation': 'true', 'singleValue': True}}],
            'combinator': 'and'}, 'options': {}}),
        node('Retain outcome and PR evidence', 'noOp', 1, [1460, -80], {}),
    ], 'connections': {}}

def connect(source, target, index=0):
    main = workflow['connections'].setdefault(source, {'main': []})['main']
    while len(main) <= index:
        main.append([])
    main[index].append({'node': target, 'type': 'main', 'index': 0})

for source, target in zip(['Repository intake', 'Submit to VASUKI', 'Return scan ID', 'Wait for agents', 'Read real results'],
                          ['Submit to VASUKI', 'Return scan ID', 'Wait for agents', 'Read real results', 'Terminal outcome']):
    connect(source, target)
connect('Terminal outcome', 'Retain outcome and PR evidence')
connect('Terminal outcome', 'Wait for agents', 1)
(Path(__file__).resolve().parents[1] / 'vasuki_n8n_soar_workflow.json').write_text(json.dumps(workflow, indent=2), encoding='utf-8')
print('n8n workflow generated')
