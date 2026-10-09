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
