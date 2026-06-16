"""
Best-effort distributed lock on the shared Redis client.

Used to deduplicate scheduled jobs across the multiple web instances that
each run an in-process APScheduler (render.yaml: numInstances > 1).

Fail-open semantics: if Redis is unavailable the lock is "acquired" —
callers must remain correct without it (DB-level FOR UPDATE SKIP LOCKED
is the correctness backstop; this lock only avoids duplicate work).
"""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

_RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


@asynccontextmanager
async def redis_lock(name: str, ttl_seconds: int) -> AsyncIterator[bool]:
    """Acquire a named lock for up to ttl_seconds.

    Yields True when this caller holds the lock (or Redis is down — fail
    open), False when another holder owns it. Callers should skip their
    work when False:

        async with redis_lock("sched:auto_close", 240) as acquired:
            if not acquired:
                return
            ...
    """
    key = f"lock:{name}"
    token = str(uuid.uuid4())
    redis = None
    acquired = True  # fail-open default
    try:
        redis = await get_redis()
        if redis is not None:
            acquired = bool(await redis.set(key, token, nx=True, ex=ttl_seconds))
    except Exception as e:
        logger.warning("redis_lock(%s): acquire failed, failing open: %s", name, e)
        redis = None
        acquired = True

    try:
        yield acquired
    finally:
        if redis is not None and acquired:
            try:
                await redis.eval(_RELEASE_SCRIPT, 1, key, token)
            except Exception as e:
                logger.warning("redis_lock(%s): release failed (lock expires via TTL): %s", name, e)
