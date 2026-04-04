"""
Activity tracking middleware.

Updates User.last_active on authenticated API requests,
throttled via Redis SET NX (60s TTL) to avoid excessive DB writes.
Falls back to DB-only throttling if Redis is unavailable.
"""

import logging
from datetime import datetime, timedelta

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from jose import JWTError, jwt
from sqlalchemy import update

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)

# Throttle: only update if last_active is older than this
THROTTLE_SECONDS = 60

# Redis client (lazy-initialized)
_redis = None
_redis_checked = False


async def _get_redis():
    """Get Redis client for activity throttling. Returns None if unavailable."""
    global _redis, _redis_checked
    if _redis_checked:
        return _redis
    _redis_checked = True
    try:
        import redis.asyncio as aioredis
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        await _redis.ping()
        return _redis
    except Exception:
        _redis = None
        return None


class ActivityTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that updates User.last_active on authenticated requests.

    Uses Redis SET NX with 60s TTL as a fast throttle gate:
    - If Redis key doesn't exist → set it + update DB (once per 60s per user)
    - If Redis key exists → skip DB entirely (~0.1ms Redis check vs ~5-20ms DB)
    - Falls back to DB conditional update if Redis unavailable
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        try:
            auth_header = request.headers.get("authorization", "")
            if not auth_header.startswith("Bearer "):
                return response

            token = auth_header[7:]

            try:
                secret_key = settings.JWT_SECRET_KEY or settings.SECRET_KEY
                payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])
            except JWTError:
                return response

            if payload.get("type") != "access":
                return response

            sub = payload.get("sub")
            if not sub:
                return response

            await self._update_last_active(sub)

        except Exception:
            pass

        return response

    async def _update_last_active(self, supabase_id: str) -> None:
        """Update last_active with Redis throttle gate."""
        try:
            # Try Redis throttle first (fast path: ~0.1ms)
            redis_client = await _get_redis()
            if redis_client:
                key = f"activity:{supabase_id}"
                # SET NX: only sets if key doesn't exist. Returns True if set, False if exists.
                was_set = await redis_client.set(key, "1", nx=True, ex=THROTTLE_SECONDS)
                if not was_set:
                    return  # Key exists = recently updated, skip DB

            # DB update (only reached if Redis gate passed or Redis unavailable)
            now = datetime.utcnow()
            threshold = now - timedelta(seconds=THROTTLE_SECONDS)

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    update(User)
                    .where(
                        User.supabase_id == supabase_id,
                        User.is_deleted == False,
                        (User.last_active == None) | (User.last_active < threshold),
                    )
                    .values(last_active=now)
                )
                if result.rowcount > 0:
                    await session.commit()
                else:
                    await session.rollback()
        except Exception as e:
            logger.debug(f"Activity tracking update failed (non-critical): {e}")
