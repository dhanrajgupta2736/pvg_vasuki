import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ── Functional Tests ───────────────────────────────────────────

def test_login_valid(client):
    res = client.post("/api/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    assert res.get_json()["status"] == "success"


def test_login_invalid(client):
    res = client.post("/api/login", json={"username": "admin", "password": "wrong"})
    assert res.status_code == 401


def test_profile_lookup(client):
    res = client.get("/api/profile/1")
    assert res.status_code == 200
    assert res.get_json()["username"] == "admin"


def test_nonexistent_profile(client):
    res = client.get("/api/profile/999")
    assert res.status_code == 404


# ── Security Exploit Regression Tests ─────────────────────────
# These tests simulate real adversary payloads to prove vulnerabilities are blocked!

def test_sqli_auth_bypass_blocked(client):
    """
    CWE-89: Verify that SQL injection authentication bypass attempts fail.
    On vulnerable code, 'admin' OR '1'='1' succeeds (returns 200).
    On securely patched code, it MUST be treated as a literal string and return 401.
    """
    malicious_payload = "admin' OR '1'='1' --"
    res = client.post("/api/login", json={"username": malicious_payload, "password": "any_password"})
    assert res.status_code == 401, "SECURITY REGRESSION: SQL injection authentication bypass succeeded!"


def test_path_traversal_exploit_blocked(client):
    """
    CWE-22: Verify that directory traversal attacks attempting to escape the uploads root fail.
    On vulnerable code, relative path traversal reads outside directories.
    On securely patched code, it MUST return 400 or 404.
    """
    res = client.get("/api/documents?file=../app.py")
    assert res.status_code in (400, 404), "SECURITY REGRESSION: Path traversal escaped root directory and read source file!"
