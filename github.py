"""Small, token-safe GitHub REST client for the MVP."""

import os
from typing import Any

import httpx
from fastapi import HTTPException


GITHUB_API = os.environ.get("GITHUB_API", "https://api.github.com").rstrip("/")
GITHUB_API_VERSION = os.environ.get("GITHUB_API_VERSION", "2022-11-28")
_token: str | None = os.environ.get("GITHUB_PAT") or None
_repo_cache: dict[int, dict[str, Any]] = {}


def token_configured() -> bool:
    return bool(_token)


def set_token(token: str) -> None:
    global _token
    _token = token


def clear_token() -> None:
    global _token, _repo_cache
    _token = None
    _repo_cache = {}


def _headers(accept: str = "application/vnd.github+json", token: str | None = None) -> dict[str, str]:
    active_token = token or _token
    if not active_token:
        raise HTTPException(status_code=401, detail="Connect a GitHub token before using GitHub data")
    return {
        "Authorization": f"Bearer {active_token}",
        "Accept": accept,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "devops-pipeline-agent",
    }


async def request(method: str, path: str, *, token: str | None = None, accept: str = "application/vnd.github+json", **kwargs: Any) -> httpx.Response:
    try:
        async with httpx.AsyncClient(timeout=35, follow_redirects=True) as client:
            response = await client.request(
                method,
                f"{GITHUB_API}{path}",
                headers=_headers(accept=accept, token=token),
                **kwargs,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"GitHub is unavailable: {type(exc).__name__}") from exc

    if response.status_code >= 400:
        try:
            detail = response.json().get("message", "GitHub request failed")
        except Exception:
            detail = "GitHub request failed"
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response


async def validate_token(token: str) -> dict[str, Any]:
    response = await request("GET", "/user", token=token)
    return response.json()


def cache_repositories(repositories: list[dict[str, Any]]) -> None:
    _repo_cache.clear()
    for repository in repositories:
        _repo_cache[int(repository["id"])] = repository


def cached_repository(repository_id: int) -> dict[str, Any] | None:
    return _repo_cache.get(repository_id)


async def list_repositories() -> list[dict[str, Any]]:
    response = await request(
        "GET",
        "/user/repos",
        params={"per_page": 100, "sort": "updated", "affiliation": "owner,collaborator,organization_member"},
    )
    repositories = response.json()
    cache_repositories(repositories)
    return repositories


async def resolve_repository(repository_id: int) -> dict[str, Any]:
    repository = cached_repository(repository_id)
    if repository:
        return repository
    repositories = await list_repositories()
    repository = next((item for item in repositories if int(item["id"]) == repository_id), None)
    if not repository:
        raise HTTPException(status_code=404, detail="Repository is not available to the connected GitHub account")
    return repository


def repository_path(repository: dict[str, Any], suffix: str) -> str:
    return f"/repos/{repository['owner']['login']}/{repository['name']}{suffix}"


async def repository_tree(repository: dict[str, Any]) -> dict[str, Any]:
    ref = repository.get("default_branch") or "HEAD"
    response = await request("GET", repository_path(repository, f"/git/trees/{ref}"), params={"recursive": "1"})
    return response.json()

async def repository_commit(repository: dict[str, Any]) -> str | None:
    ref = repository.get("default_branch") or "HEAD"
    response = await request("GET", repository_path(repository, f"/commits/{ref}"))
    return response.json().get("sha")


async def repository_file(repository: dict[str, Any], path: str, ref: str | None = None) -> str:
    response = await request(
        "GET",
        repository_path(repository, f"/contents/{path}"),
        accept="application/vnd.github.raw+json",
        params={"ref": ref or repository.get("default_branch") or "HEAD"},
    )
    return response.text


async def workflows(repository: dict[str, Any]) -> list[dict[str, Any]]:
    response = await request("GET", repository_path(repository, "/actions/workflows"), params={"per_page": 100})
    return response.json().get("workflows", [])


async def dispatch(repository: dict[str, Any], workflow_id: int, ref: str, inputs: dict[str, str]) -> int:
    response = await request(
        "POST",
        repository_path(repository, f"/actions/workflows/{workflow_id}/dispatches"),
        json={"ref": ref, "inputs": inputs},
    )
    return response.status_code


async def runs(repository: dict[str, Any], per_page: int = 20) -> list[dict[str, Any]]:
    response = await request(
        "GET",
        repository_path(repository, "/actions/runs"),
        params={"per_page": per_page},
    )
    return response.json().get("workflow_runs", [])


async def run(repository: dict[str, Any], run_id: int) -> dict[str, Any]:
    response = await request("GET", repository_path(repository, f"/actions/runs/{run_id}"))
    return response.json()


async def jobs(repository: dict[str, Any], run_id: int) -> list[dict[str, Any]]:
    response = await request("GET", repository_path(repository, f"/actions/runs/{run_id}/jobs"), params={"per_page": 100})
    return response.json().get("jobs", [])


async def logs(repository: dict[str, Any], run_id: int) -> bytes:
    response = await request("GET", repository_path(repository, f"/actions/runs/{run_id}/logs"), accept="application/vnd.github+json")
    return response.content