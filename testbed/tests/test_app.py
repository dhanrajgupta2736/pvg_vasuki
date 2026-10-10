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
    client.post("/api/login", json={"username": "admin", "password": "admin123"})
    res = client.get("/api/profile/1")
    assert res.status_code == 200
    assert res.get_json()["username"] == "admin"


def test_nonexistent_profile(client):
    client.post("/api/login", json={"username": "admin", "password": "admin123"})
    res = client.get("/api/profile/999")
    assert res.status_code in (403, 404)


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
    On securely patched code, it MUST deny access with 400, 403, or 404.
    """
    res = client.get("/api/documents?file=../app.py")
    assert res.status_code in (400, 403, 404), "SECURITY REGRESSION: Path traversal escaped root directory and read source file!"


def test_idor_anonymous_access_blocked(client):
    res = client.get("/api/profile/1")
    assert res.status_code == 401


def test_idor_cross_user_access_blocked(client):
    client.post("/api/login", json={"username": "alice", "password": "alice_secret"})
    res = client.get("/api/profile/1")
    assert res.status_code == 403


def test_owner_profile_access_preserved(client):
    client.post("/api/login", json={"username": "alice", "password": "alice_secret"})
    res = client.get("/api/profile/2")
    assert res.status_code == 200
    assert res.get_json()["username"] == "alice"


def test_path_traversal_absolute_path_blocked(client):
    target = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app.py"))
    res = client.get("/api/documents", query_string={"file": target})
    assert res.status_code in (400, 403, 404)


def test_document_read_preserved(client):
    from app import UPLOAD_DIR
    path = os.path.join(UPLOAD_DIR, "hello.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("hello judge")
    res = client.get("/api/documents", query_string={"file": "hello.txt"})
    assert res.status_code == 200
    assert res.get_json()["content"] == "hello judge"
