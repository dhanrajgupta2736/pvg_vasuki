"""GitHub user-connect: list repos and OAuth authorize for GitHub users."""
import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from core.config import settings

router = APIRouter()

GH_API = "https://api.github.com"
_UA = {"User-Agent": "VASUKI/1.0"}


class TokenPayload(BaseModel):
    token: str


class OAuthExchangePayload(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


@router.get("/oauth/config")
async def get_oauth_config():
    """Return whether GitHub OAuth is configured and the public Client ID."""
    return {
        "client_id": settings.GITHUB_CLIENT_ID or "",
        "configured": bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET),
    }


@router.get("/oauth/login")
async def oauth_login(redirect_uri: Optional[str] = Query(None), state: Optional[str] = Query("")):
    """Initiate GitHub OAuth flow by redirecting to GitHub."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(400, "GitHub OAuth is not configured on the backend (missing GITHUB_CLIENT_ID)")
    
    cb = redirect_uri or settings.GITHUB_OAUTH_REDIRECT_URI or f"{settings.FRONTEND_URL.rstrip('/')}/"
    gh_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=repo,read:user"
        f"&redirect_uri={cb}"
    )
    if state:
        gh_auth_url += f"&state={state}"
    return RedirectResponse(gh_auth_url)


@router.post("/oauth/exchange")
async def oauth_exchange(payload: OAuthExchangePayload):
    """Exchange OAuth code for GitHub access token."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            400,
            "GitHub OAuth is not configured on backend. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env"
        )

    data = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": payload.code,
    }
    if payload.redirect_uri:
        data["redirect_uri"] = payload.redirect_uri

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json", **_UA},
            data=data,
        )
        if resp.status_code != 200:
            raise HTTPException(502, f"GitHub OAuth exchange failed: {resp.text}")

        res_data = resp.json()
        if "error" in res_data:
            raise HTTPException(400, res_data.get("error_description", res_data["error"]))

        token = res_data.get("access_token")
        if not token:
            raise HTTPException(400, "No access token returned by GitHub")

        # Fetch user info
        user_resp = await client.get(
            f"{GH_API}/user",
            headers={**_UA, "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        )
        user = user_resp.json() if user_resp.status_code == 200 else None

        return {
            "token": token,
            "token_type": res_data.get("token_type", "bearer"),
            "scope": res_data.get("scope", ""),
            "user": {
                "login": user["login"],
                "avatar_url": user.get("avatar_url", ""),
                "name": user.get("name", user["login"]),
                "public_repos": user.get("public_repos", 0),
                "total_private_repos": user.get("total_private_repos", 0),
            } if user and "login" in user else None,
        }


@router.get("/oauth/callback")
async def oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
):
    """Direct OAuth redirect callback from GitHub to backend."""
    frontend_url = (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    if error:
        err_msg = error_description or error
        return RedirectResponse(f"{frontend_url}/?gh_error={err_msg}")

    if not code:
        return RedirectResponse(f"{frontend_url}/?gh_error=No_code_received_from_GitHub")

    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        return RedirectResponse(f"{frontend_url}/?gh_error=GitHub_OAuth_not_configured_on_backend")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json", **_UA},
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
        )
        res_data = resp.json() if resp.status_code == 200 else {}
        token = res_data.get("access_token")
        if not token:
            err_msg = res_data.get("error_description", "Token exchange failed")
            return RedirectResponse(f"{frontend_url}/?gh_error={err_msg}")

        return RedirectResponse(f"{frontend_url}/?gh_token={token}")



@router.post("/repos")
async def list_user_repos(payload: TokenPayload, page: int = Query(1, ge=1), per_page: int = Query(30, ge=1, le=100)):
    """Return the authenticated user's repos (paginated, sorted by recent push)."""
    headers = {**_UA, "Authorization": f"Bearer {payload.token}", "Accept": "application/vnd.github+json"}
    async with httpx.AsyncClient(timeout=15) as client:
        # Fetch user info
        user_resp = await client.get(f"{GH_API}/user", headers=headers)
        if user_resp.status_code == 401:
            raise HTTPException(401, "Invalid or expired GitHub token")
        if user_resp.status_code != 200:
            raise HTTPException(user_resp.status_code, "GitHub API error")
        user = user_resp.json()

        # Fetch repos
        repos_resp = await client.get(
            f"{GH_API}/user/repos",
            headers=headers,
            params={"sort": "pushed", "direction": "desc", "per_page": per_page, "page": page, "type": "all"},
        )
        if repos_resp.status_code == 401:
            raise HTTPException(401, "Invalid or expired GitHub token")
        if repos_resp.status_code != 200:
            raise HTTPException(repos_resp.status_code, "Could not fetch repositories")
        repos = repos_resp.json()

    return {
        "user": {
            "login": user["login"],
            "avatar_url": user.get("avatar_url", ""),
            "name": user.get("name", user["login"]),
            "public_repos": user.get("public_repos", 0),
            "total_private_repos": user.get("total_private_repos", 0),
        },
        "repos": [
            {
                "full_name": r["full_name"],
                "html_url": r["html_url"],
                "description": r.get("description") or "",
                "language": r.get("language") or "",
                "default_branch": r.get("default_branch", "main"),
                "private": r.get("private", False),
                "stargazers_count": r.get("stargazers_count", 0),
                "pushed_at": r.get("pushed_at", ""),
                "fork": r.get("fork", False),
            }
            for r in repos
        ],
        "page": page,
        "per_page": per_page,
    }


@router.post("/branches")
async def list_repo_branches(payload: TokenPayload, owner: str = Query(...), repo: str = Query(...)):
    """Return branches for a specific repo."""
    headers = {**_UA, "Authorization": f"Bearer {payload.token}", "Accept": "application/vnd.github+json"}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{GH_API}/repos/{owner}/{repo}/branches", headers=headers, params={"per_page": 100})
        if resp.status_code == 401:
            raise HTTPException(401, "Invalid or expired GitHub token")
        if resp.status_code == 404:
            raise HTTPException(404, f"Repository {owner}/{repo} not found")
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, "Could not fetch branches")
        branches = resp.json()
    return {"branches": [{"name": b["name"]} for b in branches]}
