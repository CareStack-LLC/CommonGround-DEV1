"""
Google Search Console integration service.

Reuses the GA4 OAuth token (webmasters.readonly scope already granted in
`ga4_service.GA4_SCOPES`) — so connecting GA4 in the admin settings also
connects Search Console. No separate OAuth flow needed.

Fetches:
- Top search queries (query/clicks/impressions/ctr/position)
- Top landing pages from organic search
- Daily position/click/impression trend

API docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import quote

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ga4_service import _get_access_token, is_ga4_connected

logger = logging.getLogger(__name__)

SC_API_BASE = "https://www.googleapis.com/webmasters/v3"


def _site_url() -> Optional[str]:
    """Search Console requires a `siteUrl` identifier. We reuse the frontend URL.

    Supports both URL-prefix properties (https://example.com/) and domain
    properties (sc-domain:example.com) — the caller should set SEARCH_CONSOLE_SITE
    in settings; falls back to deriving from FRONTEND_URL.
    """
    configured = getattr(settings, "SEARCH_CONSOLE_SITE", None)
    if configured:
        return configured
    # Derive from frontend URL. Search Console requires a trailing slash for
    # URL-prefix properties.
    frontend = getattr(settings, "FRONTEND_URL", None)
    if not frontend:
        return None
    return frontend if frontend.endswith("/") else f"{frontend}/"


async def is_search_console_connected(db: AsyncSession) -> bool:
    """Same token as GA4 — if GA4 is connected, SC is reachable."""
    return await is_ga4_connected(db)


async def _query(
    db: AsyncSession,
    *,
    start_date: str,
    end_date: str,
    dimensions: list[str],
    row_limit: int = 25,
) -> Optional[list[dict]]:
    """Run a Search Console `searchAnalytics.query` request.

    Returns list of row dicts like {"query": "...", "clicks": N, "impressions": N,
    "ctr": 0.042, "position": 8.2}. Returns None if not connected / on error.
    """
    access_token = await _get_access_token(db)
    if not access_token:
        return None

    site = _site_url()
    if not site:
        logger.warning("Search Console: no site URL configured (SEARCH_CONSOLE_SITE or FRONTEND_URL)")
        return None

    # siteUrl must be URL-encoded into the path (safe='' ensures ':' and '/' are escaped)
    encoded_site = quote(site, safe="")
    url = f"{SC_API_BASE}/sites/{encoded_site}/searchAnalytics/query"
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "rowLimit": row_limit,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=body,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        # 403 = site not verified for this token; 401 = token bad
        logger.warning(
            "Search Console query failed (%s): %s",
            e.response.status_code,
            e.response.text[:200],
        )
        return None
    except Exception as e:
        logger.error("Search Console query error: %s", e)
        return None

    rows = []
    for row in data.get("rows", []):
        keys = row.get("keys", [])
        entry: dict = {}
        for i, dim in enumerate(dimensions):
            entry[dim] = keys[i] if i < len(keys) else ""
        entry["clicks"] = int(row.get("clicks", 0))
        entry["impressions"] = int(row.get("impressions", 0))
        entry["ctr"] = round(float(row.get("ctr", 0.0)), 4)
        entry["position"] = round(float(row.get("position", 0.0)), 1)
        rows.append(entry)
    return rows


def _date_range(days: int) -> tuple[str, str]:
    end = datetime.utcnow().date()
    start = end - timedelta(days=days)
    return (start.isoformat(), end.isoformat())


async def get_top_queries(
    db: AsyncSession, days: int = 30, limit: int = 25
) -> Optional[list[dict]]:
    """Top queries by clicks. Frontend shape: {query, position, impressions, clicks, ctr}."""
    start, end = _date_range(days)
    rows = await _query(
        db,
        start_date=start,
        end_date=end,
        dimensions=["query"],
        row_limit=limit,
    )
    if rows is None:
        return None
    return [
        {
            "query": r.get("query", ""),
            "position": r.get("position", 0.0),
            "impressions": r.get("impressions", 0),
            "clicks": r.get("clicks", 0),
            "ctr": r.get("ctr", 0.0),
        }
        for r in rows
    ]


async def get_top_pages(
    db: AsyncSession, days: int = 30, limit: int = 25
) -> Optional[list[dict]]:
    """Top landing pages from organic search."""
    start, end = _date_range(days)
    rows = await _query(
        db,
        start_date=start,
        end_date=end,
        dimensions=["page"],
        row_limit=limit,
    )
    if rows is None:
        return None
    return [
        {
            "page": r.get("page", ""),
            "position": r.get("position", 0.0),
            "impressions": r.get("impressions", 0),
            "clicks": r.get("clicks", 0),
            "ctr": r.get("ctr", 0.0),
        }
        for r in rows
    ]


async def get_position_trend(
    db: AsyncSession, days: int = 30
) -> Optional[list[dict]]:
    """Daily average position / clicks / impressions trend.

    Frontend shape: {date, avg_position}. We also include clicks + impressions
    so the UI can render stacked views without another call.
    """
    start, end = _date_range(days)
    rows = await _query(
        db,
        start_date=start,
        end_date=end,
        dimensions=["date"],
        row_limit=days + 5,  # small buffer
    )
    if rows is None:
        return None
    # Sort ascending by date for charting
    rows_sorted = sorted(rows, key=lambda r: r.get("date", ""))
    return [
        {
            "date": r.get("date", ""),
            "avg_position": r.get("position", 0.0),
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
        }
        for r in rows_sorted
    ]


async def get_seo_insights(
    db: AsyncSession, days: int = 30
) -> dict:
    """One-shot aggregate for the /marketing/seo-insights endpoint.

    Returns:
        {
          connected: bool,
          queries: [...],
          top_pages: [...],
          position_trend: [...],
          site: str | None
        }

    If not connected, returns empty arrays with connected=False so the
    frontend can show a "Connect Search Console" CTA.
    """
    connected = await is_search_console_connected(db)
    if not connected:
        return {
            "connected": False,
            "queries": [],
            "top_pages": [],
            "position_trend": [],
            "site": _site_url(),
        }

    queries = await get_top_queries(db, days=days, limit=25) or []
    pages = await get_top_pages(db, days=days, limit=25) or []
    trend = await get_position_trend(db, days=days) or []

    return {
        "connected": True,
        "queries": queries,
        "top_pages": pages,
        "position_trend": trend,
        "site": _site_url(),
    }
