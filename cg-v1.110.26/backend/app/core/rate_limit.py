"""
Custom in-memory rate limiting middleware.

Replaces slowapi which crashes on Render. Uses a simple dict-based
approach with automatic cleanup to prevent memory leaks.

Limits:
- Auth endpoints (login, register, password reset): 10 requests/minute per IP
- General API: 100 requests/minute per IP
"""

import logging
import time
from collections import defaultdict
from typing import Dict, List, Tuple

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

# Rate limit settings: (max_requests, window_seconds)
AUTH_RATE_LIMIT: Tuple[int, int] = (10, 60)       # 10 requests per 60 seconds
GENERAL_RATE_LIMIT: Tuple[int, int] = (100, 60)   # 100 requests per 60 seconds

# Cleanup interval in seconds (remove stale entries every 5 minutes)
CLEANUP_INTERVAL = 300


class InMemoryRateLimiter:
    """
    Simple in-memory rate limiter using a sliding window approach.

    Stores timestamps of recent requests per client IP. Periodically
    cleans up expired entries to prevent unbounded memory growth.
    """

    def __init__(self):
        # Key: (ip, path_category) -> List of request timestamps
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()

    def _cleanup(self, now: float) -> None:
        """Remove entries older than the largest window (60s) + buffer."""
        cutoff = now - 120  # 2 minutes — generous buffer
        keys_to_delete = []
        for key, timestamps in self._requests.items():
            # Filter out old timestamps
            self._requests[key] = [t for t in timestamps if t > cutoff]
            if not self._requests[key]:
                keys_to_delete.append(key)
        for key in keys_to_delete:
            del self._requests[key]
        self._last_cleanup = now

    def is_rate_limited(self, client_ip: str, path: str) -> Tuple[bool, int]:
        """
        Check if a request should be rate limited.

        Args:
            client_ip: The client's IP address
            path: The request path

        Returns:
            Tuple of (is_limited, retry_after_seconds)
        """
        now = time.time()

        # Periodic cleanup to prevent memory leak
        if now - self._last_cleanup > CLEANUP_INTERVAL:
            self._cleanup(now)

        # Determine which rate limit applies
        is_auth = any(auth_path in path for auth_path in AUTH_PATHS)
        max_requests, window = AUTH_RATE_LIMIT if is_auth else GENERAL_RATE_LIMIT

        # Build key: separate buckets for auth vs general per IP
        category = "auth" if is_auth else "general"
        key = f"{client_ip}:{category}"

        # Filter timestamps within the current window
        window_start = now - window
        self._requests[key] = [t for t in self._requests[key] if t > window_start]

        # Check if over limit
        if len(self._requests[key]) >= max_requests:
            # Calculate retry-after from the oldest request in window
            oldest = self._requests[key][0]
            retry_after = int(oldest + window - now) + 1
            return True, max(retry_after, 1)

        # Record this request
        self._requests[key].append(now)
        return False, 0


# Global instance
_rate_limiter = InMemoryRateLimiter()


def _get_client_ip(request: Request) -> str:
    """
    Extract the real client IP from the request.

    Checks X-Forwarded-For header (set by Render/load balancers) first,
    then falls back to the direct client address.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs; the first is the client
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces per-IP rate limits.

    - 10 req/min for auth endpoints (login, register, password reset)
    - 100 req/min for all other endpoints
    - Returns 429 with Retry-After header when exceeded
    """

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and OPTIONS (CORS preflight)
        if request.url.path in ("/", "/health") or request.method == "OPTIONS":
            return await call_next(request)

        client_ip = _get_client_ip(request)
        is_limited, retry_after = _rate_limiter.is_rate_limited(client_ip, request.url.path)

        if is_limited:
            logger.warning(
                f"Rate limit exceeded: {client_ip} on {request.url.path}"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please try again later.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)
