"""Repository validation, artifact paths, and credential redaction."""
import re
from pathlib import Path
from urllib.parse import urlparse
from uuid import UUID
from core.config import settings

def parse_github_url(url):
    parsed = urlparse(url.strip())
    if parsed.scheme != 'https' or parsed.hostname != 'github.com' or parsed.username or parsed.port:
        raise ValueError('Use an HTTPS GitHub repository URL: https://github.com/owner/repo')
    parts = parsed.path.strip('/').removesuffix('.git').split('/')
    if len(parts) != 2 or not all(re.fullmatch(r'[A-Za-z0-9_.-]+', p) and p not in {'.', '..'} for p in parts):
        raise ValueError('Enter a repository URL with exactly owner/repo')
    if parsed.query or parsed.fragment:
        raise ValueError('Repository URLs cannot include query strings or fragments')
    return parts[0], parts[1]

def scan_directory(scan_id):
    UUID(scan_id)
    root = Path(settings.ARTIFACTS_DIR).resolve() / scan_id
    root.mkdir(parents=True, exist_ok=True)
    return root

def repo_file(root, relative):
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or '.git' in path.relative_to(root).parts:
        raise ValueError('Path must stay inside the repository')
    return path

def redact(message):
    text = str(message)
    for token in [settings.GITHUB_TOKEN, settings.GROQ_API_KEY, settings.AWS_SECRET_ACCESS_KEY]:
        if token:
            text = text.replace(token, '[redacted]')
    return re.sub(r'https://[^/@\s]+@github.com', 'https://github.com', text)
