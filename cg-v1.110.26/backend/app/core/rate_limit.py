"""
Custom in-memory rate limiting middleware.

Replaces slowapi which crashes on Render. Uses a simple dict-based
approach with automatic cleanup to prevent memory leaks.

Limits (relaxed for bug hunt testing, revert after ~2026-04-23):
- Auth endpoints (login, register, password reset): 30 requests/minute per IP
- Payment/wallet endpoints: 30 requests/minute per IP
- Export/report endpoints: 15 requests/minute per IP
- File upload endpoints: 30 requests/minute per IP
- General API: 300 requests/minute per IP

Original limits (restore after bug hunt):
- Auth: 10/min, Payment: 10/min, Export: 5/min, Upload: 10/min, General: 100/min
"""

import logging
import time
from collections import defaultdict
from typing import Dict, List, Tuple

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
# TODO: Revert to original limits after bug hunt ends (~2026-04-23)
# Original values: Auth=10, Payment=10, Export=5, Upload=10, General=100
AUTH_RATE_LIMIT: Tuple[int, int] = (30, 60)          # 30 requests per 60 seconds
PAYMENT_RATE_LIMIT: Tuple[int, int] = (30, 60)       # 30 requests per 60 seconds
EXPORT_RATE_LIMIT: Tuple[int, int] = (15, 60)        # 15 requests per 60 seconds
UPLOAD_RATE_LIMIT: Tuple[int, int] = (30, 60)        # 30 requests per 60 seconds
GENERAL_RATE_LIMIT: Tuple[int, int] = (300, 60)      # 300 requests per 60 seconds

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
        is_payment = any(p in path for p in PAYMENT_PATHS)
        is_export = any(p in path for p in EXPORT_PATHS)
        is_upload = any(p in path for p in UPLOAD_PATHS)

        if is_auth:
            max_requests, window = AUTH_RATE_LIMIT
            category = "auth"
        elif is_payment:
            max_requests, window = PAYMENT_RATE_LIMIT
            category = "payment"
        elif is_export:
            max_requests, window = EXPORT_RATE_LIMIT
            category = "export"
        elif is_upload:
            max_requests, window = UPLOAD_RATE_LIMIT
            category = "upload"
        else:
            max_requests, window = GENERAL_RATE_LIMIT
            category = "general"
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


def strict_rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """
    Factory function for creating stricter rate limit dependencies.

    Usage as a FastAPI dependency:
        @router.post("/sensitive", dependencies=[Depends(strict_rate_limit(5, 60))])

    Args:
        max_requests: Maximum number of requests allowed in the window.
        window_seconds: Duration of the sliding window in seconds.
    """
    async def _rate_limit_dep(request: Request):
        client_ip = _get_client_ip(request)
        now = time.time()
        key = f"{client_ip}:strict:{request.url.path}"

        window_start = now - window_seconds
        _rate_limiter._requests[key] = [
            t for t in _rate_limiter._requests[key] if t > window_start
        ]

        if len(_rate_limiter._requests[key]) >= max_requests:
            oldest = _rate_limiter._requests[key][0]
            retry_after = int(oldest + window_seconds - now) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Please try again in {max(retry_after, 1)} seconds.",
                headers={"Retry-After": str(max(retry_after, 1))},
            )

        _rate_limiter._requests[key].append(now)

    return _rate_limit_dep


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces per-IP rate limits.

    - 30 req/min for auth endpoints (login, register, password reset)
    - 30 req/min for payment/wallet endpoints
    - 15 req/min for export/report endpoints
    - 30 req/min for file upload endpoints
    - 300 req/min for all other endpoints
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
