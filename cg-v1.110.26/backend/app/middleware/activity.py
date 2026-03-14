"""
Activity tracking middleware.

Updates User.last_active on every authenticated API request,
throttled to once per 60 seconds to avoid excessive DB writes.
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


class ActivityTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that updates User.last_active on authenticated requests.

    - Extracts Bearer token from Authorization header
    - Decodes JWT to get user sub (supabase_id)
    - Updates last_active if stale (>60s old)
    - Fire-and-forget: never blocks or fails the request
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Process the request first — never block
        response = await call_next(request)

        # After response, try to update last_active in background
        try:
            auth_header = request.headers.get("authorization", "")
            if not auth_header.startswith("Bearer "):
                return response

            token = auth_header[7:]  # Strip "Bearer "

            # Decode token without raising HTTP exceptions
            try:
                secret_key = settings.JWT_SECRET_KEY or settings.SECRET_KEY
                payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])
            except JWTError:
                return response

            # Only process access tokens
            if payload.get("type") != "access":
                return response

            sub = payload.get("sub")
            if not sub:
                return response

            # Fire-and-forget DB update with throttling
            await self._update_last_active(sub)

        except Exception:
            # Never fail the request due to activity tracking
            pass

        return response

    async def _update_last_active(self, supabase_id: str) -> None:
        """Update last_active only if it's stale (>60s old)."""
        try:
            now = datetime.utcnow()
            threshold = now - timedelta(seconds=THROTTLE_SECONDS)

            async with AsyncSessionLocal() as session:
                # Conditional update: only write if last_active is old or null
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
