"""Publish the intentionally vulnerable, test-only hackathon demonstration lab."""
import base64
import json
import sys
from pathlib import Path
import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from core.config import settings

README = '''# VASUKI Security Lab

An intentionally vulnerable Flask codebase for demonstrating an autonomous
security patch pipeline. **Use as a local test fixture only.**

The baseline contains three real flaws:
- CWE-89: SQL injection in login.
- CWE-22: directory traversal in document reads.
- CWE-639: missing authorization in user profile access.

Eleven automated tests cover normal logins, authorized profile and document
access, and five exploit checks. The vulnerable baseline is expected to have
6 passing tests and 5 failing security tests. A correct patch produces 11 passes
without deleting or modifying tests.

```sh
python -m pip install -r requirements.txt
python -m pytest -q
```

Submit this repository's URL to VASUKI, leave the branch and project directory
blank, and enable draft PR publication. The pipeline clones the actual default
branch, records baseline tests, patches source, repeats source checks, executes
the unchanged suite in Docker, and publishes only after all gates pass.

The vulnerabilities are deliberately present on `main` for repeated demos.
Inspect the generated draft pull requests for fixes and executed evidence.
'''

def main():
    if not settings.GITHUB_TOKEN:
        raise SystemExit('GitHub credentials are not configured')
    with httpx.Client(base_url='https://api.github.com', timeout=30,
                      headers={'Authorization': 'Bearer ' + settings.GITHUB_TOKEN,
                               'Accept': 'application/vnd.github+json'}) as client:
        user = client.get('/user')
        user.raise_for_status()
        owner = user.json()['login']
        name = 'vasuki-security-lab'
        metadata = client.get(f'/repos/{owner}/{name}')
        if metadata.status_code == 404:
            metadata = client.post('/user/repos', json={'name': name,
                'description': 'Intentionally vulnerable Flask test fixture for VASUKI security patch demos',
                'private': False, 'auto_init': False})
        metadata.raise_for_status()
        # Do not overwrite a pre-existing repository or reset its branches.
        existing = client.get(f'/repos/{owner}/{name}/branches')
        existing.raise_for_status()
        if existing.json():
            print(json.dumps({'repo_url': metadata.json()['html_url'], 'created': False}))
            return
        files = {'README.md': README,
                 '.gitignore': '__pycache__/\n.pytest_cache/\n*.db\n.env\nuploads/\n.vasuki-results.xml\n'}
        for relative in ['app.py', 'requirements.txt', 'tests/test_app.py']:
            files[relative] = (ROOT / 'testbed' / relative).read_text(encoding='utf-8')
        # GitHub's Git Data API rejects empty repositories. Initialize through Git.
        from git import Repo, Actor
        checkout = ROOT / '.run' / 'demo-source'
        checkout.mkdir(parents=True, exist_ok=True)
        repo = Repo.init(checkout, initial_branch='main')
        for path, content in files.items():
            destination = checkout / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content.replace('\r\n','\n').encode('utf-8'))
        repo.index.add(list(files))
        actor = Actor('VASUKI Demo', 'vasuki-bot@users.noreply.github.com')
        commit = repo.index.commit('Add intentionally vulnerable lab and unchanged regression suite', author=actor, committer=actor)
        auth = base64.b64encode(('x-access-token:' + settings.GITHUB_TOKEN).encode()).decode()
        with repo.git.custom_environment(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
                GIT_CONFIG_VALUE_0='AUTHORIZATION: basic ' + auth, GIT_TERMINAL_PROMPT='0'):
            repo.git.push(f'https://github.com/{owner}/{name}.git', 'main:main')
        print(json.dumps({'repo_url': metadata.json()['html_url'], 'base_sha': commit.hexsha, 'created': True}))

if __name__ == '__main__':
    main()
