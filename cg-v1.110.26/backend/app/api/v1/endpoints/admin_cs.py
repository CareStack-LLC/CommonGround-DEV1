"""
Customer Success admin endpoints for the SuperAdmin portal.
Provides health scores, at-risk accounts, satisfaction metrics,
AI agent, and intervention management.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User, UserProfile

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Request/Response Models
# =============================================================================

class InterventionCreate(BaseModel):
    user_id: str
    type: str  # "email", "call", "in_app", "meeting"
    channel: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


class InterventionUpdate(BaseModel):
    outcome: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class CSAgentRequest(BaseModel):
    user_id: Optional[str] = None
    issue_description: str
    context: Optional[str] = None


class CalculateRequest(BaseModel):
    user_id: Optional[str] = None


# =============================================================================
# Health score calculation helpers
# =============================================================================

def _calculate_health_score(user: User, profile: Optional[UserProfile]) -> dict:
    """Calculate a health score for a user based on available data."""
    factors = {}

    # Login recency factor (0-100)
    if user.last_active:
        days_since_login = (datetime.utcnow() - user.last_active).days
        if days_since_login <= 1:
            factors["login_recency"] = 100
        elif days_since_login <= 7:
            factors["login_recency"] = 80
        elif days_since_login <= 30:
            factors["login_recency"] = 50
        elif days_since_login <= 90:
            factors["login_recency"] = 20
        else:
            factors["login_recency"] = 5
    else:
        factors["login_recency"] = 0

    # Subscription tier factor
    tier = profile.subscription_tier if profile else None
    tier_scores = {
        "mid_size": 95, "small_firm": 90, "solo": 85,
        "professional_starter": 75, "complete": 70,
        "plus": 50, "web_starter": 30,
    }
    factors["subscription_value"] = tier_scores.get(tier, 20)

    # Profile completeness factor
    if profile:
        completeness = 40  # base for having a profile
        if profile.first_name:
            completeness += 20
        if profile.last_name:
            completeness += 20
        if user.phone:
            completeness += 20
        factors["profile_completeness"] = min(completeness, 100)
    else:
        factors["profile_completeness"] = 0

    # Account age factor (longer = more invested)
    if user.created_at:
        age_days = (datetime.utcnow() - user.created_at).days
        if age_days >= 365:
            factors["account_maturity"] = 90
        elif age_days >= 180:
            factors["account_maturity"] = 70
        elif age_days >= 90:
            factors["account_maturity"] = 50
        elif age_days >= 30:
            factors["account_maturity"] = 30
        else:
            factors["account_maturity"] = 15
    else:
        factors["account_maturity"] = 10

    # Weighted overall score
    weights = {
        "login_recency": 0.35,
        "subscription_value": 0.25,
        "profile_completeness": 0.20,
        "account_maturity": 0.20,
    }
    overall = sum(factors[k] * weights[k] for k in weights)

    # Risk level
    if overall >= 70:
        risk_level = "low"
    elif overall >= 40:
        risk_level = "medium"
    else:
        risk_level = "high"

    return {
        "overall_score": round(overall, 1),
        "risk_level": risk_level,
        "factors": factors,
        "weights": weights,
        # Transparency block — surfaced to the UI so admins know these
        # numbers are a heuristic, not engagement data from product usage.
        "transparency": {
            "is_heuristic": True,
            "confidence": "low",
            "data_sources": [
                "User.last_active",
                "UserProfile.subscription_tier",
                "UserProfile.first_name / last_name",
                "User.phone",
                "User.created_at",
            ],
            "not_included": [
                "message volume",
                "ARIA intervention history",
                "ClearFund activity",
                "custody-exchange adherence",
                "KidSpace engagement",
            ],
            "weighting": (
                "35% login recency · 25% subscription tier · "
                "20% profile completeness · 20% account age"
            ),
        },
    }


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/cs/overview")
async def get_cs_overview(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Customer success overview dashboard."""
    # Total accounts
    total_q = await db.execute(select(func.count(User.id)))
    total_accounts = total_q.scalar() or 0

    # Calculate health scores for a sample to get averages
    users_q = await db.execute(
        select(User, UserProfile)
        .outerjoin(UserProfile, User.id == UserProfile.user_id)
        .limit(500)
    )
    users = users_q.all()

    scores = [_calculate_health_score(u, p) for u, p in users]
    at_risk = sum(1 for s in scores if s["risk_level"] == "high")
    avg_score = sum(s["overall_score"] for s in scores) / max(len(scores), 1)

    # Estimated NPS based on health scores
    promoters = sum(1 for s in scores if s["overall_score"] >= 70)
    detractors = sum(1 for s in scores if s["overall_score"] < 40)
    total_scored = max(len(scores), 1)
    estimated_nps = round(((promoters - detractors) / total_scored) * 100, 1)

    return {
        "total_accounts": total_accounts,
        "at_risk_count": at_risk,
        "avg_health_score": round(avg_score, 1),
        "estimated_nps": estimated_nps,
        "active_interventions": 0,  # Will be stored in DB later
    }


@router.get("/cs/health-scores")
async def get_health_scores(
    risk: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """List health scores for all accounts."""
    query = (
        select(User, UserProfile)
        .outerjoin(UserProfile, User.id == UserProfile.user_id)
        .order_by(desc(User.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    users = result.all()

    scores = []
    for user, profile in users:
        health = _calculate_health_score(user, profile)
        if risk and health["risk_level"] != risk:
            continue
        scores.append({
            "user_id": str(user.id),
            "email": user.email or "",
            "first_name": profile.first_name if profile else "",
            "last_name": profile.last_name if profile else "",
            "overall_score": health["overall_score"],
            "risk_level": health["risk_level"],
            "last_active": user.last_active.isoformat() if user.last_active else None,
            "subscription_tier": profile.subscription_tier if profile else None,
            "factors": health["factors"],
        })

    # Get total count
    count_q = await db.execute(select(func.count(User.id)))
    total = count_q.scalar() or 0

    return {"scores": scores, "total": total}


# NOTE: `POST /cs/health-scores/calculate` was removed in the SuperAdmin
# reliability pass. It had no frontend caller and was functionally identical
# to `GET /cs/health-scores` — scores are computed on-read, so a "recalculate"
# trigger was a vestigial noop. Re-add only when a real cache/backing-table
# exists that needs explicit refresh.


@router.get("/cs/churn-risk")
async def get_churn_risk(
    threshold: float = Query(0.7, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Get accounts at risk of churning."""
    score_threshold = threshold * 100
    users_q = await db.execute(
        select(User, UserProfile)
        .outerjoin(UserProfile, User.id == UserProfile.user_id)
        .limit(500)
    )

    at_risk = []
    for user, profile in users_q.all():
        health = _calculate_health_score(user, profile)
        if health["overall_score"] < score_threshold:
            at_risk.append({
                "user_id": str(user.id),
                "email": user.email or "",
                "first_name": profile.first_name if profile else "",
                "last_name": profile.last_name if profile else "",
                "overall_score": health["overall_score"],
                "risk_level": health["risk_level"],
                "last_active": user.last_active.isoformat() if user.last_active else None,
                "subscription_tier": profile.subscription_tier if profile else None,
                "factors": health["factors"],
            })

    return {"at_risk": sorted(at_risk, key=lambda x: x["overall_score"])}


@router.get("/cs/satisfaction")
async def get_satisfaction(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Estimated satisfaction/NPS metrics."""
    users_q = await db.execute(
        select(User, UserProfile)
        .outerjoin(UserProfile, User.id == UserProfile.user_id)
        .limit(500)
    )
    users = users_q.all()
    scores = [_calculate_health_score(u, p) for u, p in users]

    promoters = sum(1 for s in scores if s["overall_score"] >= 70)
    passives = sum(1 for s in scores if 40 <= s["overall_score"] < 70)
    detractors = sum(1 for s in scores if s["overall_score"] < 40)
    total = max(len(scores), 1)

    return {
        "estimated_nps": round(((promoters - detractors) / total) * 100, 1),
        "promoters": promoters,
        "passives": passives,
        "detractors": detractors,
        "response_count": len(scores),
    }


@router.post("/cs/ai-agent")
async def post_cs_agent(
    body: CSAgentRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """AI-powered customer success agent."""
    # Gather context about the user if provided
    user_context = {}
    if body.user_id:
        user_q = await db.execute(
            select(User, UserProfile)
            .outerjoin(UserProfile, User.id == UserProfile.user_id)
            .where(User.id == body.user_id)
        )
        row = user_q.first()
        if row:
            user, profile = row
            health = _calculate_health_score(user, profile)
            user_context = {
                "email": user.email,
                "name": f"{profile.first_name} {profile.last_name}" if profile else "Unknown",
                "tier": profile.subscription_tier if profile else None,
                "health_score": health["overall_score"],
                "risk_level": health["risk_level"],
                "last_active": user.last_active.isoformat() if user.last_active else None,
            }

    return {
        "response": f"Based on the issue described: '{body.issue_description}', "
                    "here are recommended actions:\n"
                    "1. Check user's recent activity and engagement patterns\n"
                    "2. Review their subscription status and usage\n"
                    "3. Consider proactive outreach via email or in-app message\n"
                    "4. If technical issue, escalate to engineering with details",
        "user_context": user_context,
        "suggested_actions": [
            {"action": "Send empathetic follow-up email", "priority": "high"},
            {"action": "Review account for billing issues", "priority": "medium"},
            {"action": "Schedule check-in call if high-value account", "priority": "medium"},
        ],
    }


@router.get("/cs/accounts/{user_id}/health")
async def get_account_health(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Get detailed health for a specific account."""
    user_q = await db.execute(
        select(User, UserProfile)
        .outerjoin(UserProfile, User.id == UserProfile.user_id)
        .where(User.id == user_id)
    )
    row = user_q.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    user, profile = row
    health = _calculate_health_score(user, profile)

    return {
        "user_id": str(user.id),
        "email": user.email or "",
        "name": f"{profile.first_name} {profile.last_name}" if profile else "Unknown",
        "subscription_tier": profile.subscription_tier if profile else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_active": user.last_active.isoformat() if user.last_active else None,
        **health,
    }


# =============================================================================
# Interventions — persisted to `cs_interventions` table
# (see backend/app/models/cs_intervention.py + alembic migration
# add_cs_interventions_20260416). Run `alembic upgrade head` if the table
# is missing on your environment.
# =============================================================================

from datetime import date as _date

from app.models.cs_intervention import CSIntervention


def _parse_follow_up(value) -> Optional[_date]:
    if value is None:
        return None
    if isinstance(value, _date):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def _intervention_to_dict(row: CSIntervention) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "type": row.type,
        "channel": row.channel,
        "notes": row.notes,
        "follow_up_date": row.follow_up_date.isoformat() if row.follow_up_date else None,
        "outcome": row.outcome,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "created_by": row.created_by,
    }


@router.post("/cs/interventions")
async def create_intervention(
    body: InterventionCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Create a customer success intervention (persisted)."""
    row = CSIntervention(
        user_id=body.user_id,
        type=body.type,
        channel=body.channel,
        notes=body.notes,
        follow_up_date=_parse_follow_up(body.follow_up_date),
        status="open",
        created_by=str(admin.id),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _intervention_to_dict(row)


@router.get("/cs/interventions")
async def get_interventions(
    user_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """List customer success interventions."""
    filters = []
    if user_id:
        filters.append(CSIntervention.user_id == user_id)
    if type:
        filters.append(CSIntervention.type == type)
    if outcome:
        filters.append(CSIntervention.outcome == outcome)

    base = select(CSIntervention)
    if filters:
        base = base.where(and_(*filters))

    total_res = await db.execute(select(func.count()).select_from(base.subquery()))
    total = int(total_res.scalar() or 0)

    rows_res = await db.execute(
        base.order_by(desc(CSIntervention.created_at)).offset(offset).limit(limit)
    )
    rows = list(rows_res.scalars().all())

    return {
        "interventions": [_intervention_to_dict(r) for r in rows],
        "total": total,
    }


@router.patch("/cs/interventions/{intervention_id}")
async def update_intervention(
    intervention_id: str,
    body: InterventionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Update an intervention (persisted)."""
    res = await db.execute(
        select(CSIntervention).where(CSIntervention.id == intervention_id)
    )
    row = res.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Intervention not found")

    if body.outcome is not None:
        row.outcome = body.outcome
    if body.notes is not None:
        row.notes = body.notes
    if body.status is not None:
        row.status = body.status

    await db.commit()
    await db.refresh(row)
    return _intervention_to_dict(row)
