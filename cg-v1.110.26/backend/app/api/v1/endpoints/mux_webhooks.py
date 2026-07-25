"""
Mux webhook receiver.

Why we want one:
  - `video.asset.ready` flips a just-ingested asset from "preparing" to
    "ready" on Mux's side. The seed script already polls until ready,
    but admin-uploaded content (future flow) will just create an asset
    and rely on the webhook to mark the KidSpaceMovie row `is_approved`
    + populate `mux_playback_id`.
  - `video.asset.errored` surfaces bad uploads so admins can retry.
  - `video.live_stream.*` events are ignored for now — CG doesn't live-
    stream.

Signature verification:
  Mux sends ``Mux-Signature: t=<unix_ts>,v1=<hex>``. The signed string
  is ``<unix_ts>.<raw_body>`` and the HMAC-SHA256 is keyed on the
  signing secret printed in the Mux dashboard when the webhook is
  created. Rejects out-of-tolerance timestamps (5 min) to block
  replay.

Setup
-----
1. Mux dashboard → Settings → Webhooks → "Create new webhook".
2. Target URL: ``https://<backend>/api/v1/webhooks/mux``.
3. Copy the signing secret (not the token) into
   ``settings.MUX_WEBHOOK_SECRET``.
4. Subscribe to at minimum: ``video.asset.ready``,
   ``video.asset.errored``. Optional: ``video.asset.deleted``.

Safe to skip the signing secret during early dev — when
``MUX_WEBHOOK_SECRET`` is unset we log a warning and accept the event
unauthenticated. Do NOT leave that on in production.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.kidspace_media import KidSpaceMovie
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)
router = APIRouter()


# Mux's documented replay-tolerance window. They recommend 300s.
SIGNATURE_TOLERANCE_SECONDS = 300


def _parse_signature_header(header: str) -> tuple[Optional[int], Optional[str]]:
    """Pull ``t`` and ``v1`` values out of ``t=...,v1=...``.

    Returns ``(timestamp, signature)`` or ``(None, None)`` if either
    piece is missing. Unknown keys are ignored so Mux can add future
    signature versions without breaking us.
    """
    ts: Optional[int] = None
    sig: Optional[str] = None
    for chunk in header.split(","):
        if "=" not in chunk:
            continue
        k, _, v = chunk.partition("=")
        k = k.strip()
        v = v.strip()
        if k == "t":
            try:
                ts = int(v)
            except ValueError:
                return None, None
        elif k == "v1":
            sig = v
    return ts, sig


def _verify_signature(payload: bytes, header: Optional[str], secret: str) -> bool:
    """Constant-time HMAC check on ``<ts>.<body>``."""
    if not header:
        return False
    ts, sig = _parse_signature_header(header)
    if ts is None or sig is None:
        return False
    if abs(time.time() - ts) > SIGNATURE_TOLERANCE_SECONDS:
        return False
    signed = f"{ts}.".encode() + payload
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


@router.post("/mux", status_code=status.HTTP_200_OK)
async def handle_mux_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Accept Mux webhook events and fold them into kidspace_movies.

    Must return 2xx quickly (Mux retries on non-2xx for 24h with
    exponential backoff). We do the DB write inline — the volume is
    tiny (one write per admin upload) — and always return 200 even on
    DB failures so Mux stops retrying. Errors are captured in Sentry.
    """
    raw = await request.body()
    secret = getattr(settings, "MUX_WEBHOOK_SECRET", None)

    if secret:
        if not _verify_signature(raw, request.headers.get("Mux-Signature"), secret):
            logger.warning("mux webhook: bad signature; dropping")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature",
            )
    elif settings.is_production:
        # Fail CLOSED in prod: an unsigned event could forge kidspace_movies
        # rows. Matches the SendGrid/Daily handlers. Set MUX_WEBHOOK_SECRET.
        logger.error("mux webhook: MUX_WEBHOOK_SECRET not set in production; rejecting")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook signature verification not configured",
        )
    else:
        logger.warning(
            "mux webhook: MUX_WEBHOOK_SECRET not set; accepting unsigned event (non-prod)"
        )

    try:
        event = json.loads(raw.decode() or "{}")
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON",
        )

    event_type = event.get("type", "unknown")
    data = event.get("data") or {}
    asset_id: Optional[str] = data.get("id") if isinstance(data, dict) else None

    # Single structured log line per event keeps Sentry/Render output clean.
    logger.info("mux webhook: type=%s asset=%s", event_type, asset_id)

    try:
        if event_type == "video.asset.ready":
            await _handle_asset_ready(db, data)
        elif event_type == "video.asset.errored":
            await _handle_asset_errored(db, data)
        elif event_type == "video.asset.deleted":
            await _handle_asset_deleted(db, data)
        else:
            # Ignore events we haven't wired yet (live stream, uploads, etc.).
            # Returning 200 stops Mux from retrying them forever.
            logger.debug("mux webhook: %s ignored", event_type)
    except Exception as exc:  # pragma: no cover — any failure is captured
        logger.exception("mux webhook handler failed for %s", event_type)
        capture_error(exc)

    return {"received": True, "type": event_type}


async def _handle_asset_ready(db: AsyncSession, data: dict) -> None:
    """Flip the matching KidSpaceMovie row to approved + store the
    playback id + duration. Matches on ``mux_asset_id`` first; falls
    back to ``passthrough`` (set by admin upload flows / seed scripts)
    to handle the race where the row was created before Mux handed us
    back the asset id.
    """
    asset_id = data.get("id")
    if not asset_id:
        return

    playback_ids = data.get("playback_ids") or []
    playback_id = (
        playback_ids[0]["id"]
        if playback_ids and isinstance(playback_ids[0], dict)
        else None
    )
    duration = data.get("duration")  # seconds, float
    passthrough = data.get("passthrough") or None

    res = await db.execute(
        select(KidSpaceMovie).where(KidSpaceMovie.mux_asset_id == asset_id)
    )
    row = res.scalar_one_or_none()

    if row is None and passthrough:
        # Secondary match: admin upload flows set passthrough="kidspace_movie:{id}".
        # Split once so unrelated passthroughs don't collide.
        if passthrough.startswith("kidspace_movie:"):
            movie_id = passthrough.split(":", 1)[1]
            res = await db.execute(
                select(KidSpaceMovie).where(KidSpaceMovie.id == movie_id)
            )
            row = res.scalar_one_or_none()

    if row is None:
        logger.info(
            "mux webhook: asset.ready for %s — no matching KidSpaceMovie row",
            asset_id,
        )
        return

    row.mux_asset_id = asset_id
    if playback_id:
        row.mux_playback_id = playback_id
    if row.playback_provider != "mux":
        row.playback_provider = "mux"
    if duration and not row.duration_minutes:
        row.duration_minutes = int(duration / 60) or 1
    row.is_approved = True
    row.is_visible = True
    await db.commit()
    logger.info(
        "mux webhook: approved movie id=%s playback=%s", row.id, playback_id
    )


async def _handle_asset_errored(db: AsyncSession, data: dict) -> None:
    """Flag any matching row as unapproved so kids don't see a broken
    player. Admins will see the row + the stored errors next time they
    open the media library."""
    asset_id = data.get("id")
    if not asset_id:
        return
    errors = data.get("errors")
    await db.execute(
        update(KidSpaceMovie)
        .where(KidSpaceMovie.mux_asset_id == asset_id)
        .values(is_approved=False, is_visible=False)
    )
    await db.commit()
    logger.warning(
        "mux webhook: asset.errored %s — row unapproved. errors=%s",
        asset_id,
        errors,
    )


async def _handle_asset_deleted(db: AsyncSession, data: dict) -> None:
    """If Mux drops an asset, mark the row hidden so we don't serve a
    dead playback id. Keep the row itself for audit."""
    asset_id = data.get("id")
    if not asset_id:
        return
    await db.execute(
        update(KidSpaceMovie)
        .where(KidSpaceMovie.mux_asset_id == asset_id)
        .values(is_visible=False, is_approved=False)
    )
    await db.commit()
    logger.info("mux webhook: asset.deleted %s — row hidden", asset_id)
