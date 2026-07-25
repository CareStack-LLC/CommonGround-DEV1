"""Unified error envelope so no error is a mystery.

Every error response carries a stable ``reference`` (the per-request ID that is
also on the ``X-Request-ID`` response header, tagged on the Sentry event, and
printed in the canonical request log line). That single id is the thread that
ties together:

  - what the END USER sees  → a plain-language message + "reference: <id>"
  - what the SYSTEM records  → full stack trace + request context in Sentry/logs

so support can paste the reference into Sentry and see exactly what happened,
without ever exposing internals to the client.

Envelope shape (``detail`` stays a plain string for backward compat with the
existing frontend, which reads ``errorData.detail``):

    {
      "detail": "<user-safe message>",
      "error": {
        "reference": "<request_id>",
        "type": "<machine category, e.g. validation_error>",
        "status": <int>,
        "fields": [ {"field": "email", "message": "field required"} ],  # validation only
        "debug": { ... }        # non-production only: exception type/message/trace
      }
    }
"""
from __future__ import annotations

import re
from typing import Any, Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings


def get_request_reference(request: Request) -> str:
    """Return the request's reference id (set by RequestIDMiddleware).

    Falls back to ``unknown`` if the middleware hasn't run yet (should not
    happen for normal request flow, but keeps error handling total).
    """
    return getattr(request.state, "request_id", None) or "unknown"


def cors_headers_for(request: Request) -> dict[str, str]:
    """Build CORS headers for an error response.

    Uncaught exceptions bypass the CORS middleware, so error responses must set
    these themselves or the browser hides the real status behind a CORS error
    (another way errors become mysterious).
    """
    origin = request.headers.get("origin", "")
    if not origin:
        return {}

    allowed = origin in settings.allowed_origins_list
    if not allowed and settings.CORS_ORIGIN_REGEX:
        try:
            allowed = bool(re.match(settings.CORS_ORIGIN_REGEX, origin))
        except re.error:
            allowed = False
    if not allowed:
        return {}

    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Request-ID",
    }


def build_error_response(
    request: Request,
    *,
    status_code: int,
    message: str,
    error_type: str,
    fields: Optional[list[dict[str, Any]]] = None,
    debug: Optional[dict[str, Any]] = None,
    extra_headers: Optional[dict[str, str]] = None,
) -> JSONResponse:
    """Assemble a consistent JSON error response with a reference id.

    Args:
        message: user-safe, plain-language description of what went wrong.
        error_type: stable machine category (``validation_error``,
            ``not_found``, ``internal_error``, ...). Lets the frontend branch
            without string-matching prose.
        fields: per-field validation problems (validation errors only).
        debug: extra diagnostic detail — only attached OUTSIDE production so we
            never leak internals to end users.
    """
    reference = get_request_reference(request)

    error_obj: dict[str, Any] = {
        "reference": reference,
        "type": error_type,
        "status": status_code,
    }
    if fields:
        error_obj["fields"] = fields
    if debug and not settings.is_production:
        error_obj["debug"] = debug

    headers = {"X-Request-ID": reference}
    headers.update(cors_headers_for(request))
    if extra_headers:
        headers.update(extra_headers)

    return JSONResponse(
        status_code=status_code,
        content={"detail": message, "error": error_obj},
        headers=headers,
    )
