"""
Request ID middleware for distributed tracing and canonical log lines.

Generates a unique request ID for every request, sets it as a response header,
tags it in Sentry, and emits a single structured log event per request at
completion (following loggingsucks.com "wide event" best practice).
"""

import logging
import time
import uuid

import sentry_sdk
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("commonground.request")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that:
    1. Generates a UUID request ID for each request
    2. Sets X-Request-ID response header
    3. Tags the Sentry scope with the request ID
    4. Emits a canonical log line at request completion
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate or use existing request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        # Tag Sentry scope
        sentry_sdk.set_tag("request_id", request_id)

        # Track timing
        start_time = time.time()

        # Process the request
        response = None
        error = None
        try:
            response = await call_next(request)
        except Exception as exc:
            error = exc
            raise
        finally:
            duration_ms = round((time.time() - start_time) * 1000, 1)

            # Set response header
            if response:
                response.headers["X-Request-ID"] = request_id

            # Extract user info from Sentry scope (set by get_current_user)
            scope = sentry_sdk.get_current_scope()
            user_data = scope._user or {}

            # Emit canonical log line (one wide event per request)
            status_code = response.status_code if response else 500
            path = request.url.path
            log_data = {
                "request_id": request_id,
                "method": request.method,
                "path": path,
                "status": status_code,
                "duration_ms": duration_ms,
                "user_id": user_data.get("id"),
                "client_ip": request.client.host if request.client else None,
            }

            # Sentry Metrics — track response time and status codes
            try:
                from app.utils.sentry_helpers import metric_distribution, metric_increment
                # Normalize path for metric grouping (strip IDs)
                import re
                metric_path = re.sub(
                    r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
                    ':id', path
                )
                metric_distribution("http.response_time", duration_ms, tags={
                    "method": request.method,
                    "path": metric_path,
                    "status": str(status_code),
                })
                if status_code >= 500:
                    metric_increment("http.errors.5xx", tags={"path": metric_path})
                elif status_code >= 400:
                    metric_increment("http.errors.4xx", tags={"path": metric_path})
            except Exception:
                pass

            # Log level based on status code and duration
            if error or status_code >= 500:
                logger.error("request_completed %s", log_data)
            elif status_code >= 400 or duration_ms > 5000:
                logger.warning("request_completed %s", log_data)
            else:
                logger.info("request_completed %s", log_data)

        return response
