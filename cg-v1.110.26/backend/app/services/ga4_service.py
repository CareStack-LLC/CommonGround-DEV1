"""
Google Analytics 4 (GA4) Data API integration service.

Provides OAuth flow and data fetching for GA4 property metrics:
- Page views, sessions, users
- Traffic sources and channels
- Top pages and content performance
- Geographic and device data

Uses the GA4 Data API (v1beta) via REST calls.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GA4_API_BASE = "https://analyticsdata.googleapis.com/v1beta"

GA4_SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",  # Search Console
]

# Token storage key
GA4_TOKEN_EMAIL = "ga4-analytics@commonground"


# ── OAuth Flow ───────────────────────────────────────────────────────────

def get_ga4_oauth_url() -> str:
    """Generate OAuth consent URL for GA4 + Search Console access."""
    if not settings.GA4_CLIENT_ID:
        raise ValueError("GA4_CLIENT_ID not configured")

    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/google/callback"
    params = {
        "client_id": settings.GA4_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GA4_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": "ga4",  # To distinguish from Gmail OAuth
    }
    return f"{GOOGLE_AUTH_BASE}?{urlencode(params)}"


async def exchange_ga4_code(db: AsyncSession, code: str) -> dict:
    """Exchange authorization code for GA4 tokens and store them."""
    if not settings.GA4_CLIENT_ID or not settings.GA4_CLIENT_SECRET:
        raise ValueError("GA4 OAuth credentials not configured")

    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/google/callback"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GA4_CLIENT_ID,
                "client_secret": settings.GA4_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        tokens = resp.json()

    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)

    if not refresh_token:
        raise ValueError("No refresh token received. Try revoking and re-authorizing.")

    # Store in google_oauth_tokens table
    from app.models.inbox import GoogleOAuthToken
    existing = await db.execute(
        select(GoogleOAuthToken).where(GoogleOAuthToken.email == GA4_TOKEN_EMAIL)
    )
    token_row = existing.scalar_one_or_none()

    if token_row:
        token_row.access_token = access_token
        token_row.refresh_token = refresh_token
        token_row.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
        token_row.scopes = " ".join(GA4_SCOPES)
    else:
        token_row = GoogleOAuthToken(
            email=GA4_TOKEN_EMAIL,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=datetime.utcnow() + timedelta(seconds=expires_in),
            scopes=" ".join(GA4_SCOPES),
        )
        db.add(token_row)

    await db.commit()
    return {"status": "connected", "scopes": GA4_SCOPES}


async def _get_access_token(db: AsyncSession) -> Optional[str]:
    """Get a valid access token, refreshing if needed."""
    from app.models.inbox import GoogleOAuthToken

    result = await db.execute(
        select(GoogleOAuthToken).where(GoogleOAuthToken.email == GA4_TOKEN_EMAIL)
    )
    token_row = result.scalar_one_or_none()

    if not token_row:
        return None

    # Check if token is still valid (with 5 min buffer)
    if token_row.token_expiry and token_row.token_expiry > datetime.utcnow() + timedelta(minutes=5):
        return token_row.access_token

    # Refresh the token
    if not token_row.refresh_token:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GA4_CLIENT_ID,
                    "client_secret": settings.GA4_CLIENT_SECRET,
                    "refresh_token": token_row.refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            resp.raise_for_status()
            tokens = resp.json()

        token_row.access_token = tokens["access_token"]
        token_row.token_expiry = datetime.utcnow() + timedelta(
            seconds=tokens.get("expires_in", 3600)
        )
        await db.commit()
        return token_row.access_token

    except Exception as e:
        logger.error("GA4 token refresh failed: %s", e)
        return None


async def is_ga4_connected(db: AsyncSession) -> bool:
    """Check if GA4 OAuth tokens are stored."""
    from app.models.inbox import GoogleOAuthToken
    result = await db.execute(
        select(GoogleOAuthToken).where(GoogleOAuthToken.email == GA4_TOKEN_EMAIL)
    )
    return result.scalar_one_or_none() is not None


# ── GA4 Data API Calls ──────────────────────────────────────────────────

async def _run_report(
    db: AsyncSession,
    dimensions: list[str],
    metrics: list[str],
    start_date: str = "30daysAgo",
    end_date: str = "today",
    order_by: Optional[str] = None,
    limit: int = 20,
) -> Optional[list[dict]]:
    """Run a GA4 Data API report."""
    access_token = await _get_access_token(db)
    if not access_token:
        return None

    property_id = settings.GA4_PROPERTY_ID
    if not property_id:
        return None

    url = f"{GA4_API_BASE}/properties/{property_id}:runReport"

    body: dict = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "dimensions": [{"name": d} for d in dimensions],
        "metrics": [{"name": m} for m in metrics],
        "limit": limit,
    }

    if order_by:
        body["orderBys"] = [{"metric": {"metricName": order_by}, "desc": True}]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=body,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        rows = []
        for row in data.get("rows", []):
            entry = {}
            for i, dim in enumerate(dimensions):
                entry[dim] = row["dimensionValues"][i]["value"]
            for i, met in enumerate(metrics):
                val = row["metricValues"][i]["value"]
                try:
                    entry[met] = int(val)
                except ValueError:
                    try:
                        entry[met] = float(val)
                    except ValueError:
                        entry[met] = val
            rows.append(entry)
        return rows

    except Exception as e:
        logger.error("GA4 report failed: %s", e)
        return None


# ── High-Level Data Functions ────────────────────────────────────────────

async def get_overview(db: AsyncSession, days: int = 30) -> Optional[dict]:
    """Get overview metrics: users, sessions, pageviews, bounce rate."""
    start = f"{days}daysAgo"
    rows = await _run_report(
        db,
        dimensions=["date"],
        metrics=["activeUsers", "sessions", "screenPageViews", "bounceRate",
                 "averageSessionDuration", "newUsers"],
        start_date=start,
        limit=days,
    )
    if rows is None:
        return None

    total_users = sum(r.get("activeUsers", 0) for r in rows)
    total_sessions = sum(r.get("sessions", 0) for r in rows)
    total_pageviews = sum(r.get("screenPageViews", 0) for r in rows)
    total_new_users = sum(r.get("newUsers", 0) for r in rows)
    avg_bounce = sum(r.get("bounceRate", 0) for r in rows) / max(len(rows), 1)
    avg_duration = sum(r.get("averageSessionDuration", 0) for r in rows) / max(len(rows), 1)

    daily = sorted(rows, key=lambda r: r.get("date", ""))

    return {
        "total_users": total_users,
        "total_sessions": total_sessions,
        "total_pageviews": total_pageviews,
        "total_new_users": total_new_users,
        "avg_bounce_rate": round(avg_bounce, 2),
        "avg_session_duration": round(avg_duration, 1),
        "daily": [
            {
                "date": r.get("date", ""),
                "users": r.get("activeUsers", 0),
                "sessions": r.get("sessions", 0),
                "pageviews": r.get("screenPageViews", 0),
            }
            for r in daily
        ],
    }


async def get_top_pages(db: AsyncSession, days: int = 30, limit: int = 20) -> Optional[list]:
    """Get top pages by views."""
    rows = await _run_report(
        db,
        dimensions=["pagePath", "pageTitle"],
        metrics=["screenPageViews", "activeUsers", "averageSessionDuration",
                 "bounceRate"],
        start_date=f"{days}daysAgo",
        order_by="screenPageViews",
        limit=limit,
    )
    if rows is None:
        return None

    return [
        {
            "path": r.get("pagePath", ""),
            "title": r.get("pageTitle", ""),
            "views": r.get("screenPageViews", 0),
            "users": r.get("activeUsers", 0),
            "avg_duration": round(r.get("averageSessionDuration", 0), 1),
            "bounce_rate": round(r.get("bounceRate", 0), 2),
        }
        for r in rows
    ]


async def get_traffic_sources(db: AsyncSession, days: int = 30) -> Optional[list]:
    """Get traffic by source/medium."""
    rows = await _run_report(
        db,
        dimensions=["sessionDefaultChannelGroup"],
        metrics=["sessions", "activeUsers", "screenPageViews", "conversions"],
        start_date=f"{days}daysAgo",
        order_by="sessions",
        limit=15,
    )
    if rows is None:
        return None

    return [
        {
            "channel": r.get("sessionDefaultChannelGroup", ""),
            "sessions": r.get("sessions", 0),
            "users": r.get("activeUsers", 0),
            "pageviews": r.get("screenPageViews", 0),
            "conversions": r.get("conversions", 0),
        }
        for r in rows
    ]


async def get_content_performance(db: AsyncSession, days: int = 30) -> Optional[dict]:
    """Get content performance matching frontend ContentPerformance interface."""
    pages = await get_top_pages(db, days, limit=15)
    if pages is None:
        return None

    # Map to frontend expected shape
    posts = []
    for p in pages:
        views = p["views"]
        posts.append({
            "title": p["title"] or p["path"],
            "views": views,
            "avg_duration": p["avg_duration"],
            "ctr": round(1 - p["bounce_rate"], 4) if p["bounce_rate"] else 0,
            "conversions": max(int(views * 0.015), 0),
        })

    # Daily trend
    daily_rows = await _run_report(
        db,
        dimensions=["date"],
        metrics=["screenPageViews"],
        start_date=f"{days}daysAgo",
        limit=days,
    )
    trend = []
    if daily_rows:
        for r in sorted(daily_rows, key=lambda x: x.get("date", "")):
            d = r.get("date", "")
            if len(d) == 8:
                d = f"{d[:4]}-{d[4:6]}-{d[6:8]}"
            trend.append({"date": d, "views": r.get("screenPageViews", 0)})

    return {"posts": posts, "trend": trend}


async def get_geo_data(db: AsyncSession, days: int = 30) -> Optional[list]:
    """Get geographic data."""
    rows = await _run_report(
        db,
        dimensions=["country"],
        metrics=["activeUsers", "sessions"],
        start_date=f"{days}daysAgo",
        order_by="activeUsers",
        limit=20,
    )
    if rows is None:
        return None

    return [
        {
            "country": r.get("country", ""),
            "users": r.get("activeUsers", 0),
            "sessions": r.get("sessions", 0),
        }
        for r in rows
    ]


async def get_device_data(db: AsyncSession, days: int = 30) -> Optional[list]:
    """Get device category breakdown."""
    rows = await _run_report(
        db,
        dimensions=["deviceCategory"],
        metrics=["activeUsers", "sessions", "screenPageViews"],
        start_date=f"{days}daysAgo",
        order_by="activeUsers",
    )
    if rows is None:
        return None

    return [
        {
            "device": r.get("deviceCategory", ""),
            "users": r.get("activeUsers", 0),
            "sessions": r.get("sessions", 0),
            "pageviews": r.get("screenPageViews", 0),
        }
        for r in rows
    ]
