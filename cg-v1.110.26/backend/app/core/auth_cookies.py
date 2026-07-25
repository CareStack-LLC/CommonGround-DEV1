"""HttpOnly refresh-token cookie helpers.

Strategy: the short-lived ACCESS token stays in frontend memory (sent as a
Bearer header — so the API stays immune to CSRF), while the long-lived REFRESH
token is delivered as an HttpOnly cookie the browser stores and JS can never
read. That removes both tokens from localStorage (the XSS-exfiltration risk)
without adding CSRF surface to every endpoint: only /auth/refresh consumes the
cookie, and its response isn't readable cross-origin, so a forged cross-site
call to it gains nothing.

Cross-subdomain note: frontend (www.find-commonground.com) and API
(api.find-commonground.com) differ, so the cookie needs Domain=.find-commonground.com
and SameSite=None; Secure to be sent on the cross-subdomain XHR. On localhost
(COOKIE_DOMAIN empty) we emit a host-only, SameSite=Lax cookie so dev works over
http.
"""
from __future__ import annotations

from fastapi import Response

from app.core.config import settings

# Scope the cookie to the auth routes so it isn't sent on every API call.
REFRESH_COOKIE_PATH = f"/api/{settings.API_VERSION}/auth"


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Attach the HttpOnly refresh-token cookie to a response."""
    domain = settings.COOKIE_DOMAIN or None
    # Cross-subdomain delivery requires SameSite=None + Secure. Locally
    # (no domain) fall back to Lax so it works over plain http.
    cross_site = bool(domain)
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=cross_site or settings.is_production,
        samesite="none" if cross_site else "lax",
        domain=domain,
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    """Expire the refresh-token cookie (logout)."""
    domain = settings.COOKIE_DOMAIN or None
    cross_site = bool(domain)
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        domain=domain,
        path=REFRESH_COOKIE_PATH,
        samesite="none" if cross_site else "lax",
        secure=cross_site or settings.is_production,
        httponly=True,
    )
