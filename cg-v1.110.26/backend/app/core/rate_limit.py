"""
Rate limiting middleware with Redis backend for multi-instance support.

Falls back to in-memory rate limiting if Redis is unavailable.

Limits:
- Auth endpoints (login, register, password reset): 10 requests/minute per IP
- Payment/wallet endpoints: 10 requests/minute per IP
- Export/report endpoints: 5 requests/minute per IP
- File upload endpoints: 10 requests/minute per IP
- General API: 100 requests/minute per IP
"""

import logging
import time
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Auth-related path fragments that get stricter rate limits
AUTH_PATHS = {
    "/auth/login",
    "/auth/register",
    "/auth/password-reset",
    "/auth/magic-link",
    "/auth/oauth/sync",
}

# Sensitive endpoints that need tighter rate limits
PAYMENT_PATHS = {"/wallet", "/payment", "/stripe", "/subscription"}
EXPORT_PATHS = {"/export", "/report", "/download-report"}
UPLOAD_PATHS = {"/upload", "/attachment"}

# Rate limit settings: (max_requests, window_seconds)
AUTH_RATE_LIMIT: Tuple[int, int] = (10, 60)          # 10 requests per 60 seconds
PAYMENT_RATE_LIMIT: Tuple[int, int] = (10, 60)       # 10 requests per 60 seconds
EXPORT_RATE_LIMIT: Tuple[int, int] = (5, 60)         # 5 requests per 60 seconds
UPLOAD_RATE_LIMIT: Tuple[int, int] = (10, 60)        # 10 requests per 60 seconds
GENERAL_RATE_LIMIT: Tuple[int, int] = (100, 60)      # 100 requests per 60 seconds

# Cleanup interval in seconds (remove stale entries every 5 minutes)
CLEANUP_INTERVAL = 300


def _get_rate_limit(path: str) -> Tuple[int, int, str]:
    """Determine which rate limit applies to a given path."""
    if any(auth_path in path for auth_path in AUTH_PATHS):
        return AUTH_RATE_LIMIT[0], AUTH_RATE_LIMIT[1], "auth"
    if any(p in path for p in PAYMENT_PATHS):
        return PAYMENT_RATE_LIMIT[0], PAYMENT_RATE_LIMIT[1], "payment"
    if any(p in path for p in EXPORT_PATHS):
        return EXPORT_RATE_LIMIT[0], EXPORT_RATE_LIMIT[1], "export"
    if any(p in path for p in UPLOAD_PATHS):
        return UPLOAD_RATE_LIMIT[0], UPLOAD_RATE_LIMIT[1], "upload"
    return GENERAL_RATE_LIMIT[0], GENERAL_RATE_LIMIT[1], "general"


class RedisRateLimiter:
    """
    Redis-backed rate limiter using sorted sets for sliding window.

    Each request is stored as a member in a sorted set keyed by IP:category,
    with the score being the timestamp. ZRANGEBYSCORE trims old entries.
    """

    def __init__(self):
        self._redis = None
        self._initialized = False

    async def init(self):
        """Initialize Redis connection. Safe to call multiple times."""
        if self._initialized:
            return
        try:
            from app.core.config import settings
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            await self._redis.ping()
            self._initialized = True
            logger.info("Redis rate limiter initialized")
        except Exception as e:
            logger.warning(f"Redis unavailable for rate limiting, using in-memory fallback: {e}")
            self._redis = None
            self._initialized = True

    async def is_rate_limited(self, client_ip: str, path: str) -> Tuple[bool, int]:
        """Check if request should be rate limited using Redis sorted sets."""
        if not self._redis:
            return False, 0

        max_requests, window, category = _get_rate_limit(path)
        key = f"rl:{client_ip}:{category}"
        now = time.time()
        window_start = now - window

        try:
            pipe = self._redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)  # Remove expired
            pipe.zcard(key)  # Count remaining
            pipe.zadd(key, {str(now): now})  # Add current request
            pipe.expire(key, window + 10)  # TTL slightly longer than window
            results = await pipe.execute()

            count = results[1]  # zcard result
            if count >= max_requests:
                # Over limit — remove the request we just added
                await self._redis.zrem(key, str(now))
                # Calculate retry-after
                oldest = await self._redis.zrange(key, 0, 0, withscores=True)
                if oldest:
                    retry_after = int(oldest[0][1] + window - now) + 1
                    return True, max(retry_after, 1)
                return True, 1

            return False, 0
        except Exception as e:
            logger.warning(f"Redis rate limit check failed: {e}")
            return False, 0  # Fail open


class InMemoryRateLimiter:
    """
    Fallback in-memory rate limiter using a sliding window approach.

    Used when Redis is unavailable. Note: not shared across instances.
    """

    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()

    def _cleanup(self, now: float) -> None:
        """Remove entries older than the largest window + buffer."""
        cutoff = now - 120
        keys_to_delete = []
        for key, timestamps in self._requests.items():
            self._requests[key] = [t for t in timestamps if t > cutoff]
            if not self._requests[key]:
                keys_to_delete.append(key)
        for key in keys_to_delete:
            del self._requests[key]
        self._last_cleanup = now

    def is_rate_limited(self, client_ip: str, path: str) -> Tuple[bool, int]:
        """Check if a request should be rate limited."""
        now = time.time()

        if now - self._last_cleanup > CLEANUP_INTERVAL:
            self._cleanup(now)

        max_requests, window, category = _get_rate_limit(path)
        key = f"{client_ip}:{category}"

        window_start = now - window
        self._requests[key] = [t for t in self._requests[key] if t > window_start]

        if len(self._requests[key]) >= max_requests:
            oldest = self._requests[key][0]
            retry_after = int(oldest + window - now) + 1
            return True, max(retry_after, 1)

        self._requests[key].append(now)
        return False, 0


# Global instances
_redis_limiter = RedisRateLimiter()
_memory_limiter = InMemoryRateLimiter()


def _get_client_ip(request: Request) -> str:
    """Return the real client IP, resilient to X-Forwarded-For spoofing.

    X-Forwarded-For is a client-appendable list; taking the LEFTMOST entry (the
    old behavior) returned a fully client-controlled value, so anyone could
    bypass every per-IP rate limit and IP block by sending their own header.

    CommonGround runs behind two trusted proxies — Cloudflare then Render —
    each of which appends to the header. Verified against the live edge
    2026-07-02:
        client sends:              <anything the client wants, spoofable>
        Cloudflare appends:        <the REAL client IP it observed>
        Render appends:            <Cloudflare's edge IP>
    so the trustworthy client IP is the Nth entry from the RIGHT, where
    N = settings.TRUSTED_PROXY_HOPS (2). A client cannot influence that
    position — they can only prepend entries to the left of it.
    """
    from app.core.config import settings
    hops = max(1, int(getattr(settings, "TRUSTED_PROXY_HOPS", 2)))
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if len(parts) >= hops:
            return parts[-hops]
        # Fewer entries than expected proxies (misconfig / direct hit) —
        # fall back to the leftmost present rather than an out-of-range index.
        if parts:
            return parts[0]
    if request.client:
        return request.client.host
    return "unknown"


def strict_rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """
    Factory function for creating stricter rate limit dependencies.

    Usage:
        @router.post("/sensitive", dependencies=[Depends(strict_rate_limit(5, 60))])
    """
    async def _rate_limit_dep(request: Request):
        client_ip = _get_client_ip(request)
        now = time.time()
        key = f"{client_ip}:strict:{request.url.path}"

        window_start = now - window_seconds
        _memory_limiter._requests[key] = [
            t for t in _memory_limiter._requests[key] if t > window_start
        ]

        if len(_memory_limiter._requests[key]) >= max_requests:
            oldest = _memory_limiter._requests[key][0]
            retry_after = int(oldest + window_seconds - now) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Please try again in {max(retry_after, 1)} seconds.",
                headers={"Retry-After": str(max(retry_after, 1))},
            )

        _memory_limiter._requests[key].append(now)

    return _rate_limit_dep


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces per-IP rate limits.

    Uses Redis when available (shared across instances), falls back to in-memory.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and OPTIONS (CORS preflight)
        if request.url.path in ("/", "/health") or request.method == "OPTIONS":
            return await call_next(request)

        client_ip = _get_client_ip(request)

        # Try Redis first, fall back to in-memory
        if _redis_limiter._redis:
            is_limited, retry_after = await _redis_limiter.is_rate_limited(
                client_ip, request.url.path
            )
        else:
            is_limited, retry_after = _memory_limiter.is_rate_limited(
                client_ip, request.url.path
            )

        if is_limited:
            logger.warning(f"Rate limit exceeded: {client_ip} on {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please try again later.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)
