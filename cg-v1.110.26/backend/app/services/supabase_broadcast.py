"""
Supabase Realtime HTTP broadcast helper.

Used to push live "refresh" nudges to clients that can't satisfy the
RLS policies for `postgres_changes` events — specifically the KidSpace
child client, which authenticates against CommonGround's own JWT layer
(not Supabase Auth), so its anon-scoped Supabase client never sees the
row payloads delivered by Postgres Changes.

By pushing to a named **broadcast channel** (no DB coupling, no RLS),
we can wake the kid's open chat screen and have it re-fetch through
the backend API — where ARIA / permission / ownership checks already
live.

Failures are always logged and swallowed: a missed broadcast never
blocks the underlying send.
"""

from __future__ import annotations

import logging
from typing import Any, Iterable, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _service_key() -> Optional[str]:
    """Return the service-role key used to authorize broadcast posts."""
    # Supabase allows broadcast from the service role; no project JWT
    # secret exchange is required. Fall through silently if misconfigured
    # — local dev without Supabase should not crash the send path.
    for attr in ("SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
        val = getattr(settings, attr, None)
        if val:
            return val
    return None


def _supabase_url() -> Optional[str]:
    return getattr(settings, "SUPABASE_URL", None) or None


async def broadcast_realtime(
    topic: str,
    event: str,
    payload: dict[str, Any],
    private: bool = False,
) -> bool:
    """
    Publish a single broadcast message to a Supabase Realtime channel.

    Args:
        topic:   channel name, e.g. "pcm:{child_id}".
        event:   event name the client filters on, e.g. "new_message".
        payload: arbitrary JSON the client receives. Keep it small; never
                 include raw message content — emit an id and let the
                 client fetch through the ARIA-gated API.
        private: set True if your project has enabled private channels
                 with channel-level auth. Defaults to public since we
                 don't carry sensitive content in the payload.

    Returns:
        True on HTTP 2xx from Supabase, False otherwise.
    """
    url = _supabase_url()
    key = _service_key()
    if not url or not key:
        logger.debug(
            "supabase_broadcast skipped (SUPABASE_URL or SERVICE_KEY missing)"
        )
        return False

    endpoint = f"{url.rstrip('/')}/realtime/v1/api/broadcast"
    body = {
        "messages": [
            {
                "topic": topic,
                "event": event,
                "payload": payload,
                "private": private,
            }
        ]
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(endpoint, headers=headers, json=body)
        if 200 <= resp.status_code < 300:
            return True
        logger.warning(
            "supabase_broadcast non-2xx status=%s topic=%s body=%s",
            resp.status_code,
            topic,
            resp.text[:200],
        )
        return False
    except Exception as exc:  # pragma: no cover — network failures are ok
        logger.warning("supabase_broadcast failed topic=%s: %s", topic, exc)
        return False


async def broadcast_many(
    items: Iterable[tuple[str, str, dict[str, Any]]],
) -> None:
    """Fire multiple broadcasts sequentially.

    A small convenience for paths that nudge more than one topic
    (e.g. notify both parents + the kid on a new child→parent message).
    """
    for topic, event, payload in items:
        await broadcast_realtime(topic, event, payload)
