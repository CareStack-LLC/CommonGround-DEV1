"""
Rate limiting middleware using slowapi.

Provides per-user and per-endpoint rate limits to prevent abuse.
Critical limits:
- Child PIN login: 5 attempts per 15 minutes (brute-force protection for 4-digit PINs)
- ARIA analysis: 10 per minute (prevent LLM API abuse)
- General API: 100 requests per minute per user
- Unauthenticated: 30 requests per minute per IP
"""

import logging
import os
from typing import Optional

from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


def get_user_or_ip(request: Request) -> str:
    """
    Extract user identifier for rate limiting.
    Uses authenticated user ID if available, otherwise falls back to IP.
    """
    # Check for Authorization header — extract user from JWT if present
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            from app.core.security import decode_access_token
            payload = decode_access_token(token)
            if payload and "sub" in payload:
                return f"user:{payload['sub']}"
        except Exception:
            pass

    # Fall back to IP address
    return get_remote_address(request)


# Initialize the limiter with user-or-IP key function
limiter = Limiter(
    key_func=get_user_or_ip,
    default_limits=["100/minute"],
    storage_uri=os.environ.get("REDIS_URL", "memory://"),
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded errors."""
    logger.warning(f"Rate limit exceeded: {get_user_or_ip(request)} on {request.url.path}")
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please try again later.",
            "retry_after": exc.detail,
        }
    )


# Decorator shortcuts for common limits
# Usage: @child_pin_limit (on the endpoint)
CHILD_PIN_LIMIT = "5/15minutes"
ARIA_ANALYSIS_LIMIT = "10/minute"
AUTH_LIMIT = "10/minute"
GENERAL_LIMIT = "100/minute"
UNAUTHENTICATED_LIMIT = "30/minute"
