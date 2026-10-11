"""Tests for GitHub OAuth connect routes."""
import sys
import unittest
from pathlib import Path
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.routes.github_connect import router as github_router
from core.config import settings

app = FastAPI()
app.include_router(github_router, prefix="/api/github")


class TestGitHubOAuth(unittest.IsolatedAsyncioTestCase):

    async def test_oauth_config_endpoint(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/github/oauth/config")
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn("client_id", data)
            self.assertIn("configured", data)
            self.assertIsInstance(data["configured"], bool)

    async def test_oauth_login_without_credentials(self):
        original_client_id = settings.GITHUB_CLIENT_ID
        try:
            settings.GITHUB_CLIENT_ID = ""
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/api/github/oauth/login")
                self.assertEqual(resp.status_code, 400)
        finally:
            settings.GITHUB_CLIENT_ID = original_client_id

    async def test_oauth_login_with_credentials(self):
        original_client_id = settings.GITHUB_CLIENT_ID
        try:
            settings.GITHUB_CLIENT_ID = "test_client_id_123"
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as client:
                resp = await client.get("/api/github/oauth/login?redirect_uri=http://localhost:5173/")
                self.assertIn(resp.status_code, (302, 307))
                self.assertIn("github.com/login/oauth/authorize", resp.headers["location"])
                self.assertIn("client_id=test_client_id_123", resp.headers["location"])
        finally:
            settings.GITHUB_CLIENT_ID = original_client_id

    async def test_oauth_callback_with_error(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as client:
            resp = await client.get("/api/github/oauth/callback?error=access_denied&error_description=The+user+cancelled")
            self.assertIn(resp.status_code, (302, 307))
            self.assertIn("gh_error=", resp.headers["location"])


if __name__ == "__main__":
    unittest.main()
