"""
Shared async Redis client for general-purpose key-value work
(JWT blacklist, session memory, short-lived caches).

Separate from `app.core.rate_limit.RedisRateLimiter` so callers don't
reach into middleware internals. Both modules ultimately connect to
`settings.REDIS_URL`; they share the same Redis but their own connection
pool and client instance.

Fail-open semantics:
- If Redis is unreachable at init, `get_redis()` returns None and callers
  MUST handle the None case (auth falls open, caches become misses, etc.).
- `get_redis()` is async, idempotent, and safe to call per-request.
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None  # redis.asyncio.Redis or None
_initialized = False
_last_warn_ts = 0.0


async def get_redis():
    """Return a shared async redis client, or None if unavailable.

    Lazy init on first call. Re-attempts are throttled — one warn per 60s.
    """
    global _client, _initialized, _last_warn_ts

    if _initialized and _client is not None:
        return _client

    if _initialized and _client is None:
        # Already decided Redis is down; don't retry on every request.
        return None

    try:
        import redis.asyncio as aioredis

        _client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            max_connections=50,
        )
        await _client.ping()
        _initialized = True
        logger.info("Shared async Redis client initialized (general-purpose)")
        return _client
    except Exception as e:
        _client = None
        _initialized = True  # don't hammer retries
        now = time.time()
        if now - _last_warn_ts > 60:
            _last_warn_ts = now
            logger.warning(
                "Shared Redis client unavailable: %s — dependent features "
                "(JWT blacklist, etc.) will fail open.", e,
            )
        return None


async def close_redis() -> None:
    """Shut down the shared client. Call from app shutdown hook."""
    global _client, _initialized
    if _client is not None:
        try:
            await _client.aclose()
        except Exception:
            pass
    _client = None
    _initialized = False
