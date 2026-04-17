"""Admin geospatial stats endpoint for the /superadmin/geo page.

Three views, one endpoint:
  - users_by_state:         {state_code: count} — aggregated from UserProfile.state
  - professionals_by_state: {state_code: count} — aggregated from ProfessionalProfile.state
  - exchange_points:        [{lat, lng, status, at}] — GPS coordinates of recent
                            custody-exchange check-ins

All queries are bounded + cheap enough to return in a single response.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.custody_exchange import CustodyExchangeInstance
from app.models.professional import ProfessionalProfile
from app.models.user import User, UserProfile

logger = logging.getLogger(__name__)
router = APIRouter()


def _norm_state(code: Optional[str]) -> Optional[str]:
    """Normalize 2-letter state code. Accepts 'ca', 'CA', 'California', etc.
    Returns uppercase 2-letter code or None if unrecognized."""
    if not code:
        return None
    c = code.strip()
    if len(c) == 2:
        return c.upper()
    # Common full-name mapping — not exhaustive; unmatched entries return None
    full = {
        "california": "CA", "texas": "TX", "new york": "NY", "florida": "FL",
        "illinois": "IL", "pennsylvania": "PA", "ohio": "OH", "georgia": "GA",
        "north carolina": "NC", "michigan": "MI", "new jersey": "NJ",
        "virginia": "VA", "washington": "WA", "arizona": "AZ", "massachusetts": "MA",
        "tennessee": "TN", "indiana": "IN", "missouri": "MO", "maryland": "MD",
        "wisconsin": "WI", "colorado": "CO", "minnesota": "MN", "south carolina": "SC",
        "alabama": "AL", "louisiana": "LA", "kentucky": "KY", "oregon": "OR",
        "oklahoma": "OK", "connecticut": "CT", "utah": "UT", "iowa": "IA",
        "nevada": "NV", "arkansas": "AR", "mississippi": "MS", "kansas": "KS",
        "new mexico": "NM", "nebraska": "NE", "west virginia": "WV", "idaho": "ID",
        "hawaii": "HI", "new hampshire": "NH", "maine": "ME", "montana": "MT",
        "rhode island": "RI", "delaware": "DE", "south dakota": "SD", "north dakota": "ND",
        "alaska": "AK", "vermont": "VT", "wyoming": "WY",
    }
    return full.get(c.lower())


@router.get("/stats/geo")
async def get_geo_stats(
    exchange_days: int = Query(30, ge=1, le=365),
    exchange_limit: int = Query(1000, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    """Return geo-level aggregations for the admin geo map page."""
    # ── Users by state
    users_q = await db.execute(
        select(UserProfile.state, func.count(UserProfile.id))
        .where(UserProfile.state.isnot(None))
        .group_by(UserProfile.state)
    )
    users_by_state: dict[str, int] = {}
    users_unknown = 0
    for state_raw, count in users_q:
        code = _norm_state(state_raw)
        if code:
            users_by_state[code] = users_by_state.get(code, 0) + int(count)
        else:
            users_unknown += int(count)

    # ── Professionals by state
    try:
        pros_q = await db.execute(
            select(ProfessionalProfile.state, func.count(ProfessionalProfile.id))
            .where(ProfessionalProfile.state.isnot(None))
            .group_by(ProfessionalProfile.state)
        )
        pros_by_state: dict[str, int] = {}
        pros_unknown = 0
        for state_raw, count in pros_q:
            code = _norm_state(state_raw)
            if code:
                pros_by_state[code] = pros_by_state.get(code, 0) + int(count)
            else:
                pros_unknown += int(count)
    except Exception as e:
        logger.warning("geo: professionals query failed: %s", e)
        pros_by_state = {}
        pros_unknown = 0

    # ── Exchange GPS points (last N days)
    cutoff = datetime.utcnow() - timedelta(days=exchange_days)
    points: list[dict] = []
    try:
        # We return from_parent check-in lat/lng (handoff origin) when present.
        # Only recent, completed-or-disputed rows with both coords filled.
        rows_q = await db.execute(
            select(
                CustodyExchangeInstance.from_parent_check_in_lat,
                CustodyExchangeInstance.from_parent_check_in_lng,
                CustodyExchangeInstance.status,
                CustodyExchangeInstance.updated_at,
            )
            .where(CustodyExchangeInstance.updated_at >= cutoff)
            .where(CustodyExchangeInstance.from_parent_check_in_lat.isnot(None))
            .where(CustodyExchangeInstance.from_parent_check_in_lng.isnot(None))
            .order_by(CustodyExchangeInstance.updated_at.desc())
            .limit(exchange_limit)
        )
        for lat, lng, status_val, updated_at in rows_q:
            try:
                points.append({
                    "lat": float(lat),
                    "lng": float(lng),
                    "status": status_val or "unknown",
                    "at": updated_at.isoformat() if updated_at else None,
                })
            except (TypeError, ValueError):
                continue
    except Exception as e:
        # Pre-migration or model-field mismatch: fall through with empty list
        logger.warning("geo: exchange coordinates query failed: %s", e)

    return {
        "users_by_state": users_by_state,
        "users_unknown_state_count": users_unknown,
        "total_users_geotagged": sum(users_by_state.values()),
        "professionals_by_state": pros_by_state,
        "professionals_unknown_state_count": pros_unknown,
        "total_professionals_geotagged": sum(pros_by_state.values()),
        "exchange_points": points,
        "exchange_point_count": len(points),
        "exchange_window_days": exchange_days,
        "generated_at": datetime.utcnow().isoformat(),
    }
