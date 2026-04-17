"""
Google Analytics 4 admin endpoints.
OAuth connection flow + analytics data for the SuperAdmin portal.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


# ── OAuth ────────────────────────────────────────────────────────────────

@router.get("/ga4/oauth/url")
async def get_ga4_oauth_url(
    admin: User = Depends(get_current_admin_user),
):
    """Get Google OAuth consent URL for GA4 access."""
    from app.services.ga4_service import get_ga4_oauth_url as svc_url
    try:
        return {"url": svc_url()}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/ga4/oauth/callback")
async def ga4_oauth_callback(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Exchange GA4 OAuth code for tokens."""
    from app.services.ga4_service import exchange_ga4_code
    try:
        return await exchange_ga4_code(db, code)
    except Exception as e:
        logger.error("GA4 OAuth exchange failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/ga4/status")
async def get_ga4_status(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Check if GA4 is connected."""
    from app.services.ga4_service import is_ga4_connected
    from app.core.config import settings
    connected = await is_ga4_connected(db)
    return {
        "connected": connected,
        "property_id": settings.GA4_PROPERTY_ID,
        "client_configured": bool(settings.GA4_CLIENT_ID),
    }


# ── Analytics Data ───────────────────────────────────────────────────────

# Wave 5 Phase A: each data endpoint returns 200 with
# `{status: "not_connected", connect_url: ...}` when GA4 isn't connected,
# instead of 503. That lets the frontend render a "Connect GA4" CTA
# rather than a red error banner — the previous behavior made the
# SuperAdmin dashboard feel broken by default.


def _not_connected_payload() -> dict:
    return {
        "status": "not_connected",
        "connect_url": "/admin/ga4/connect",
        "message": "Google Analytics is not connected yet. Connect via OAuth to see live metrics.",
    }


@router.get("/ga4/overview")
async def get_ga4_overview(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """GA4 overview: users, sessions, pageviews, bounce rate, daily trend."""
    from app.services.ga4_service import get_overview
    data = await get_overview(db, days)
    if data is None:
        return _not_connected_payload()
    return {"status": "ok", "data": data}


@router.get("/ga4/top-pages")
async def get_ga4_top_pages(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Top pages by views."""
    from app.services.ga4_service import get_top_pages
    data = await get_top_pages(db, days, limit)
    if data is None:
        return _not_connected_payload()
    return {"status": "ok", "pages": data}


@router.get("/ga4/traffic-sources")
async def get_ga4_traffic_sources(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Traffic by channel group."""
    from app.services.ga4_service import get_traffic_sources
    data = await get_traffic_sources(db, days)
    if data is None:
        return _not_connected_payload()
    return {"status": "ok", "sources": data}


@router.get("/ga4/geo")
async def get_ga4_geo(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Geographic user distribution."""
    from app.services.ga4_service import get_geo_data
    data = await get_geo_data(db, days)
    if data is None:
        return _not_connected_payload()
    return {"status": "ok", "countries": data}


@router.get("/ga4/devices")
async def get_ga4_devices(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Device category breakdown."""
    from app.services.ga4_service import get_device_data
    data = await get_device_data(db, days)
    if data is None:
        return _not_connected_payload()
    return {"status": "ok", "devices": data}
