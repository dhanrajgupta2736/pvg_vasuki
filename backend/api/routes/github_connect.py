"""GitHub user-connect: list repos for an authenticated GitHub user."""
import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

GH_API = "https://api.github.com"
_UA = {"User-Agent": "VASUKI/1.0"}


class TokenPayload(BaseModel):
    token: str


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
