"""
Mux Video service — thin wrapper around Mux's REST API.

Why httpx instead of `mux-python`:
    The official SDK is an auto-generated OpenAPI client with a heavy
    dependency footprint (urllib3 1.x pinning, dataclasses-json, etc.).
    We need maybe six endpoints. A ~150-line service has fewer moving
    parts and keeps requirements.txt small.

What this covers:
    - Create an asset from a remote URL (what the seed script uses)
    - Get an asset's current state + playback_id
    - Poll an asset until it becomes `ready`
    - Delete an asset (for cleanup during re-seeds)
    - Signed playback URL generation (scaffolded; implement when we flip
      movies from `public` playback policy to `signed` for per-viewer access)

All network failures raise `MuxError`; callers decide whether to retry.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

MUX_API_BASE = "https://api.mux.com"


class MuxError(RuntimeError):
    """Wraps non-2xx responses + transport failures from Mux."""

    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass
class MuxAsset:
    """Minimal projection of a Mux asset row."""

    asset_id: str
    status: str  # "preparing" | "ready" | "errored"
    playback_id: Optional[str]
    duration_seconds: Optional[float]
    errors: Optional[dict]


def _auth() -> tuple[str, str]:
    token_id = settings.MUX_TOKEN_ID
    token_secret = settings.MUX_TOKEN_SECRET
    if not token_id or not token_secret:
        raise MuxError(
            "Mux credentials missing (set MUX_TOKEN_ID + MUX_TOKEN_SECRET)",
        )
    return token_id, token_secret


def _asset_from_api_row(row: dict) -> MuxAsset:
    playback_ids = row.get("playback_ids") or []
    playback_id = playback_ids[0]["id"] if playback_ids else None
    return MuxAsset(
        asset_id=row["id"],
        status=row.get("status", "unknown"),
        playback_id=playback_id,
        duration_seconds=row.get("duration"),
        errors=row.get("errors"),
    )


async def create_asset_from_url(
    source_url: str,
    *,
    playback_policy: str = "public",
    video_quality: str = "basic",
    passthrough: Optional[str] = None,
) -> MuxAsset:
    """Kick off a Mux asset ingest from a publicly reachable URL.

    Args:
        source_url: HTTP(S) URL Mux's ingester can fetch (MP4, HLS, etc.).
        playback_policy: "public" (URL-based playback) or "signed" (JWT).
            Start with public for the seed catalog; flip to signed once
            the per-viewer token flow lands.
        video_quality: "basic" ($0.003/min stored, 1080p cap) or "plus"
            ($0.011/min, 4K cap). Basic is plenty for kid cartoons.
        passthrough: Arbitrary string echoed on webhooks. We stash our
            own `kidspace_movies.id` here so the `video.asset.ready`
            handler can flip the row to approved without a lookup table.

    Returns:
        A `MuxAsset` in the `preparing` state. Poll with `get_asset` or
        wait with `wait_until_ready`.
    """
    token_id, token_secret = _auth()
    body: dict[str, Any] = {
        "inputs": [{"url": source_url}],
        "playback_policies": [playback_policy],
        "video_quality": video_quality,
    }
    if passthrough:
        body["passthrough"] = passthrough

    try:
        async with httpx.AsyncClient(timeout=30.0, auth=(token_id, token_secret)) as c:
            resp = await c.post(f"{MUX_API_BASE}/video/v1/assets", json=body)
    except httpx.HTTPError as exc:
        raise MuxError(f"Mux create asset failed: {exc}") from exc

    if resp.status_code >= 400:
        raise MuxError(
            f"Mux create asset returned {resp.status_code}: {resp.text[:400]}",
            status_code=resp.status_code,
        )
    return _asset_from_api_row(resp.json()["data"])


async def get_asset(asset_id: str) -> MuxAsset:
    """Fetch current state of an asset. Raises MuxError on 404/non-2xx."""
    token_id, token_secret = _auth()
    try:
        async with httpx.AsyncClient(timeout=15.0, auth=(token_id, token_secret)) as c:
            resp = await c.get(f"{MUX_API_BASE}/video/v1/assets/{asset_id}")
    except httpx.HTTPError as exc:
        raise MuxError(f"Mux get asset failed: {exc}") from exc

    if resp.status_code >= 400:
        raise MuxError(
            f"Mux get asset {asset_id} returned {resp.status_code}: {resp.text[:400]}",
            status_code=resp.status_code,
        )
    return _asset_from_api_row(resp.json()["data"])


async def wait_until_ready(
    asset_id: str,
    *,
    timeout_seconds: float = 300.0,
    poll_interval: float = 5.0,
) -> MuxAsset:
    """Block (via asyncio.sleep) until the asset is `ready` or errored.

    Mux ingest is typically 30s–2min for short cartoons. Default 5-min
    timeout leaves headroom for a flaky ingest while still aborting if
    something's genuinely wrong.
    """
    deadline = asyncio.get_event_loop().time() + timeout_seconds
    while True:
        asset = await get_asset(asset_id)
        if asset.status == "ready":
            return asset
        if asset.status == "errored":
            raise MuxError(
                f"Mux asset {asset_id} errored: {asset.errors}",
            )
        if asyncio.get_event_loop().time() >= deadline:
            raise MuxError(
                f"Mux asset {asset_id} not ready after {timeout_seconds}s "
                f"(status={asset.status})",
            )
        await asyncio.sleep(poll_interval)


async def delete_asset(asset_id: str) -> None:
    """Best-effort delete. 404 is treated as success (already gone)."""
    token_id, token_secret = _auth()
    try:
        async with httpx.AsyncClient(timeout=15.0, auth=(token_id, token_secret)) as c:
            resp = await c.delete(f"{MUX_API_BASE}/video/v1/assets/{asset_id}")
    except httpx.HTTPError as exc:
        logger.warning("Mux delete asset %s transport error: %s", asset_id, exc)
        return
    if resp.status_code in (200, 204, 404):
        return
    logger.warning(
        "Mux delete asset %s returned %s: %s",
        asset_id,
        resp.status_code,
        resp.text[:200],
    )


# ---------------------------------------------------------------------------
# Signed playback URL — scaffold. Not used by the public seed catalog.
# ---------------------------------------------------------------------------

def signed_playback_url(
    playback_id: str,
    *,
    expires_in_seconds: int = 60 * 60,
    viewer_id: Optional[str] = None,
) -> str:  # pragma: no cover — fill in when flipping to signed policy
    """Placeholder for signed playback URLs.

    When we switch to `playback_policy="signed"`, generate a JWT with
    Mux's signing key, sub=playback_id, aud="v" (video), exp=now+TTL.
    See https://docs.mux.com/guides/video/secure-video-playback.
    """
    raise NotImplementedError(
        "Signed playback not wired yet — see docstring."
    )
