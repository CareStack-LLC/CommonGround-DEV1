"""
Customer Success API endpoints for the SuperAdmin BizOps portal.

Provides customer health scoring, churn risk detection, NPS/CSAT tracking,
CS interventions, and AI-assisted customer analysis.

All endpoints require admin authentication.
"""

import logging
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User, UserProfile
from app.models.bizops import CustomerHealthScore, CSIntervention, NPSResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Pydantic Request/Response Models
# =============================================================================

class HealthScoreCalculateRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="Specific user ID to recalculate, or None for all users")


class CSAgentRequest(BaseModel):
    user_id: Optional[str] = None
    issue_description: str
    context: Optional[dict] = None


class InterventionCreateRequest(BaseModel):
    user_id: str
    type: str = Field(..., pattern=r"^(outreach|discount|guidance|escalation|retention)$")
    channel: str = Field(default="email", pattern=r"^(email|phone|in_app)$")
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None


class InterventionUpdateRequest(BaseModel):
    outcome: Optional[str] = Field(None, pattern=r"^(resolved|pending|escalated|churned)$")
    notes: Optional[str] = None


# =============================================================================
# 1. GET /cs/overview - Overview KPIs
# =============================================================================

@router.get(
    "/cs/overview",
    summary="Customer Success overview KPIs",
)
async def get_cs_overview(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Platform-wide Customer Success KPIs.

    Returns total accounts, at-risk count, average health score,
    and estimated NPS.
    """
    now = datetime.utcnow()
    today = now.date()

    # Get latest health scores per user (most recent date)
    latest_date_subq = (
        select(
            CustomerHealthScore.user_id,
            func.max(CustomerHealthScore.date).label("max_date"),
        )
        .group_by(CustomerHealthScore.user_id)
        .subquery()
    )

    latest_scores_q = (
        select(CustomerHealthScore)
        .join(
            latest_date_subq,
            and_(
                CustomerHealthScore.user_id == latest_date_subq.c.user_id,
                CustomerHealthScore.date == latest_date_subq.c.max_date,
            ),
        )
    )
    result = await db.execute(latest_scores_q)
    scores = result.scalars().all()

    total_accounts = len(scores)
    at_risk_count = sum(1 for s in scores if s.risk_level in ("at_risk", "critical"))
    critical_count = sum(1 for s in scores if s.risk_level == "critical")
    avg_health = round(sum(s.overall_score for s in scores) / total_accounts, 1) if total_accounts > 0 else 0

    # NPS calculation from NPSResponse
    nps_result = await db.execute(select(NPSResponse))
    nps_responses = nps_result.scalars().all()

    promoters = sum(1 for r in nps_responses if r.score >= 9)
    passives = sum(1 for r in nps_responses if 7 <= r.score <= 8)
    detractors = sum(1 for r in nps_responses if r.score <= 6)
    response_count = len(nps_responses)

    estimated_nps = (
        round(((promoters - detractors) / response_count) * 100, 1)
        if response_count > 0
        else None
    )

    return {
        "total_accounts": total_accounts,
        "at_risk_count": at_risk_count,
        "critical_count": critical_count,
        "avg_health_score": avg_health,
        "estimated_nps": estimated_nps,
        "nps_promoters": promoters,
        "nps_passives": passives,
        "nps_detractors": detractors,
        "nps_response_count": response_count,
    }


# =============================================================================
# 2. GET /cs/health-scores - List customer health scores
# =============================================================================

@router.get(
    "/cs/health-scores",
    summary="List customer health scores",
)
async def list_health_scores(
    risk_level: Optional[str] = Query(None, description="Filter by risk level: healthy, at_risk, critical"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    List customer health scores with optional risk level filter.
    Joins with User to include email and name.
    """
    # Get latest score per user
    latest_date_subq = (
        select(
            CustomerHealthScore.user_id,
            func.max(CustomerHealthScore.date).label("max_date"),
        )
        .group_by(CustomerHealthScore.user_id)
        .subquery()
    )

    query = (
        select(CustomerHealthScore, User.email, User.first_name, User.last_name, User.last_active)
        .join(
            latest_date_subq,
            and_(
                CustomerHealthScore.user_id == latest_date_subq.c.user_id,
                CustomerHealthScore.date == latest_date_subq.c.max_date,
            ),
        )
        .join(User, CustomerHealthScore.user_id == User.id)
    )

    if risk_level:
        query = query.where(CustomerHealthScore.risk_level == risk_level)

    query = query.order_by(CustomerHealthScore.overall_score.asc()).offset(offset).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    # Count total
    count_query = (
        select(func.count())
        .select_from(CustomerHealthScore)
        .join(
            latest_date_subq,
            and_(
                CustomerHealthScore.user_id == latest_date_subq.c.user_id,
                CustomerHealthScore.date == latest_date_subq.c.max_date,
            ),
        )
    )
    if risk_level:
        count_query = count_query.where(CustomerHealthScore.risk_level == risk_level)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    items = []
    for row in rows:
        score = row[0]
        items.append({
            "user_id": score.user_id,
            "email": row.email,
            "name": f"{row.first_name} {row.last_name}",
            "overall_score": score.overall_score,
            "risk_level": score.risk_level,
            "login_score": score.login_score,
            "activity_score": score.activity_score,
            "payment_score": score.payment_score,
            "adoption_score": score.adoption_score,
            "support_score": score.support_score,
            "factors": score.factors,
            "last_active": row.last_active.isoformat() if row.last_active else None,
            "scored_date": score.date.isoformat() if score.date else None,
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}


# =============================================================================
# 3. POST /cs/health-scores/calculate - Calculate/refresh health scores
# =============================================================================

@router.post(
    "/cs/health-scores/calculate",
    summary="Calculate or refresh health scores",
)
async def calculate_health_scores(
    body: HealthScoreCalculateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Calculate and upsert health scores for all users or a specific user.

    Algorithm uses weighted scoring across login, activity, payment,
    adoption, and support dimensions.
    """
    from app.models.family_file import FamilyFile
    from app.models.message import Message, MessageFlag
    from app.models.agreement import Agreement

    now = datetime.utcnow()
    today = now.date()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    # Determine which users to score
    user_query = (
        select(User)
        .options(selectinload(User.profile))
        .where(User.is_active == True, User.is_deleted == False)  # noqa: E712
    )
    if body.user_id:
        user_query = user_query.where(User.id == body.user_id)

    user_result = await db.execute(user_query)
    users = user_result.scalars().all()

    if body.user_id and not users:
        raise HTTPException(status_code=404, detail="User not found")

    scored_count = 0

    for user in users:
        profile = user.profile

        # --- Login score (25% weight) ---
        if user.last_active and user.last_active >= seven_days_ago:
            login_score = 100
        elif user.last_active and user.last_active >= thirty_days_ago:
            login_score = 70
        elif user.last_active and user.last_active >= sixty_days_ago:
            login_score = 40
        else:
            login_score = 10

        # --- Activity score (25% weight) ---
        # Messages sent in last 30 days
        msg_count_result = await db.execute(
            select(func.count()).select_from(Message).where(
                Message.sender_id == str(user.id),
                Message.sent_at >= thirty_days_ago,
            )
        )
        msg_count = msg_count_result.scalar() or 0

        # Family files count
        ff_count_result = await db.execute(
            select(func.count()).select_from(FamilyFile).where(
                FamilyFile.creator_id == str(user.id),
            )
        )
        ff_count = ff_count_result.scalar() or 0

        # Agreements count
        agree_count_result = await db.execute(
            select(func.count()).select_from(Agreement).where(
                Agreement.creator_id == str(user.id),
            )
        )
        agree_count = agree_count_result.scalar() or 0

        # Score activity: messages (up to 50 pts), files (up to 25 pts), agreements (up to 25 pts)
        activity_score = min(50, msg_count * 5) + min(25, ff_count * 10) + min(25, agree_count * 10)

        # --- Payment score (20% weight) ---
        payment_score = 0
        if profile:
            sub_status = profile.subscription_status
            if sub_status == "active":
                payment_score = 100
            elif sub_status == "trial":
                payment_score = 60
            elif sub_status == "past_due":
                payment_score = 20
            elif sub_status == "grant":
                payment_score = 80
            else:
                payment_score = 0  # cancelled or unknown

        # --- Adoption score (20% weight) ---
        features_used = 0
        if ff_count > 0:
            features_used += 1
        if agree_count > 0:
            features_used += 1
        if msg_count > 0:
            features_used += 1
        # Check if user has schedule-related activity (family file implies scheduling context)
        if ff_count > 1:
            features_used += 1

        adoption_score = min(100, features_used * 25)

        # --- Support score (10% weight) ---
        # Count escalation interventions for this user
        escalation_result = await db.execute(
            select(func.count()).select_from(CSIntervention).where(
                CSIntervention.user_id == str(user.id),
                CSIntervention.type == "escalation",
            )
        )
        escalation_count = escalation_result.scalar() or 0
        support_score = max(0, 100 - (escalation_count * 20))

        # --- Overall weighted score ---
        overall = round(
            login_score * 0.25
            + activity_score * 0.25
            + payment_score * 0.20
            + adoption_score * 0.20
            + support_score * 0.10
        )

        # --- Risk level ---
        if overall >= 70:
            risk_level = "healthy"
        elif overall >= 40:
            risk_level = "at_risk"
        else:
            risk_level = "critical"

        factors = {
            "login": {"score": login_score, "last_active": user.last_active.isoformat() if user.last_active else None},
            "activity": {"score": activity_score, "messages_30d": msg_count, "family_files": ff_count, "agreements": agree_count},
            "payment": {"score": payment_score, "status": profile.subscription_status if profile else "unknown", "tier": profile.subscription_tier if profile else "unknown"},
            "adoption": {"score": adoption_score, "features_used": features_used},
            "support": {"score": support_score, "escalations": escalation_count},
        }

        # Upsert: check if score exists for this user and today
        existing_result = await db.execute(
            select(CustomerHealthScore).where(
                CustomerHealthScore.user_id == str(user.id),
                CustomerHealthScore.date == today,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.overall_score = overall
            existing.risk_level = risk_level
            existing.login_score = login_score
            existing.activity_score = activity_score
            existing.payment_score = payment_score
            existing.adoption_score = adoption_score
            existing.support_score = support_score
            existing.factors = factors
        else:
            new_score = CustomerHealthScore(
                id=str(uuid4()),
                user_id=str(user.id),
                date=today,
                overall_score=overall,
                risk_level=risk_level,
                login_score=login_score,
                activity_score=activity_score,
                payment_score=payment_score,
                adoption_score=adoption_score,
                support_score=support_score,
                factors=factors,
            )
            db.add(new_score)

        scored_count += 1

    await db.commit()

    return {
        "status": "success",
        "scored_count": scored_count,
        "date": today.isoformat(),
    }


# =============================================================================
# 4. GET /cs/churn-risk - At-risk accounts
# =============================================================================

@router.get(
    "/cs/churn-risk",
    summary="Get at-risk and critical accounts",
)
async def get_churn_risk(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Get accounts at risk of churning.
    Returns users with risk_level 'at_risk' or 'critical', sorted by score ascending.
    """
    latest_date_subq = (
        select(
            CustomerHealthScore.user_id,
            func.max(CustomerHealthScore.date).label("max_date"),
        )
        .group_by(CustomerHealthScore.user_id)
        .subquery()
    )

    query = (
        select(CustomerHealthScore, User.email, User.first_name, User.last_name, User.last_active)
        .join(
            latest_date_subq,
            and_(
                CustomerHealthScore.user_id == latest_date_subq.c.user_id,
                CustomerHealthScore.date == latest_date_subq.c.max_date,
            ),
        )
        .join(User, CustomerHealthScore.user_id == User.id)
        .where(CustomerHealthScore.risk_level.in_(["at_risk", "critical"]))
        .order_by(CustomerHealthScore.overall_score.asc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        score = row[0]
        items.append({
            "user_id": score.user_id,
            "email": row.email,
            "name": f"{row.first_name} {row.last_name}",
            "overall_score": score.overall_score,
            "risk_level": score.risk_level,
            "login_score": score.login_score,
            "activity_score": score.activity_score,
            "payment_score": score.payment_score,
            "adoption_score": score.adoption_score,
            "support_score": score.support_score,
            "factors": score.factors,
            "last_active": row.last_active.isoformat() if row.last_active else None,
        })

    return {"items": items, "total": len(items), "limit": limit, "offset": offset}


# =============================================================================
# 5. GET /cs/satisfaction - CSAT/NPS data
# =============================================================================

@router.get(
    "/cs/satisfaction",
    summary="Customer satisfaction and NPS data",
)
async def get_satisfaction(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Calculate NPS and satisfaction metrics from NPSResponse table.
    Also computes a satisfaction proxy from message flag acceptance rates.
    """
    from app.models.message import MessageFlag

    # NPS from NPSResponse
    nps_result = await db.execute(select(NPSResponse))
    nps_responses = nps_result.scalars().all()

    promoters = sum(1 for r in nps_responses if r.score >= 9)
    passives = sum(1 for r in nps_responses if 7 <= r.score <= 8)
    detractors = sum(1 for r in nps_responses if r.score <= 6)
    response_count = len(nps_responses)

    estimated_nps = (
        round(((promoters - detractors) / response_count) * 100, 1)
        if response_count > 0
        else None
    )

    avg_score = (
        round(sum(r.score for r in nps_responses) / response_count, 2)
        if response_count > 0
        else None
    )

    # Satisfaction proxy: message flag acceptance rate
    total_flags_result = await db.execute(
        select(func.count()).select_from(MessageFlag)
    )
    total_flags = total_flags_result.scalar() or 0

    accepted_flags_result = await db.execute(
        select(func.count()).select_from(MessageFlag).where(
            MessageFlag.user_action.in_(["accepted", "modified"])
        )
    )
    accepted_flags = accepted_flags_result.scalar() or 0

    flag_acceptance_rate = (
        round(accepted_flags / total_flags * 100, 1)
        if total_flags > 0
        else None
    )

    return {
        "estimated_nps": estimated_nps,
        "avg_nps_score": avg_score,
        "promoters": promoters,
        "passives": passives,
        "detractors": detractors,
        "response_count": response_count,
        "flag_acceptance_rate": flag_acceptance_rate,
        "total_flags": total_flags,
        "accepted_flags": accepted_flags,
    }


# =============================================================================
# 6. POST /cs/ai-agent - AI Customer Success agent
# =============================================================================

@router.post(
    "/cs/ai-agent",
    summary="AI Customer Success agent analysis",
)
async def cs_ai_agent(
    body: CSAgentRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    AI-powered customer success agent.
    Gathers user context if user_id is provided, then calls the AI analysis service.
    """
    from app.models.family_file import FamilyFile
    from app.services.bizops_ai import generate_cs_analysis

    user_context = {}

    if body.user_id:
        # Gather user data
        user_result = await db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == body.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        profile = user.profile

        # Family files count
        ff_count_result = await db.execute(
            select(func.count()).select_from(FamilyFile).where(
                FamilyFile.creator_id == str(user.id),
            )
        )
        ff_count = ff_count_result.scalar() or 0

        # Latest health score
        health_result = await db.execute(
            select(CustomerHealthScore)
            .where(CustomerHealthScore.user_id == str(user.id))
            .order_by(CustomerHealthScore.date.desc())
            .limit(1)
        )
        health_score = health_result.scalar_one_or_none()

        user_context = {
            "user_id": str(user.id),
            "email": user.email,
            "name": f"{user.first_name} {user.last_name}",
            "subscription_status": profile.subscription_status if profile else "unknown",
            "subscription_tier": profile.subscription_tier if profile else "unknown",
            "last_active": user.last_active.isoformat() if user.last_active else None,
            "family_files_count": ff_count,
            "health_score": health_score.overall_score if health_score else None,
            "risk_level": health_score.risk_level if health_score else None,
        }

    if body.context:
        user_context.update(body.context)

    result = await generate_cs_analysis(
        user_context=user_context,
        issue_description=body.issue_description,
    )

    return result


# =============================================================================
# 7. GET /cs/accounts/{user_id}/health - Individual account health
# =============================================================================

@router.get(
    "/cs/accounts/{user_id}/health",
    summary="Individual account health details",
)
async def get_account_health(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Detailed health view for a single account.

    Returns health score history (last 90 days), subscription info,
    activity timeline, and feature usage summary.
    """
    from app.models.family_file import FamilyFile
    from app.models.message import Message
    from app.models.agreement import Agreement

    # Verify user exists
    user_result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = user.profile
    now = datetime.utcnow()
    ninety_days_ago = now - timedelta(days=90)

    # Health score history (last 90 days)
    score_result = await db.execute(
        select(CustomerHealthScore)
        .where(
            CustomerHealthScore.user_id == user_id,
            CustomerHealthScore.date >= ninety_days_ago.date(),
        )
        .order_by(CustomerHealthScore.date.asc())
    )
    scores = score_result.scalars().all()

    score_history = [
        {
            "date": s.date.isoformat() if s.date else None,
            "overall_score": s.overall_score,
            "risk_level": s.risk_level,
            "login_score": s.login_score,
            "activity_score": s.activity_score,
            "payment_score": s.payment_score,
            "adoption_score": s.adoption_score,
            "support_score": s.support_score,
            "factors": s.factors,
        }
        for s in scores
    ]

    # Subscription info
    subscription = {
        "tier": profile.subscription_tier if profile else "unknown",
        "status": profile.subscription_status if profile else "unknown",
        "ends_at": profile.subscription_ends_at.isoformat() if profile and profile.subscription_ends_at else None,
        "period_start": profile.subscription_period_start.isoformat() if profile and profile.subscription_period_start else None,
        "period_end": profile.subscription_period_end.isoformat() if profile and profile.subscription_period_end else None,
    }

    # Feature usage
    ff_count_result = await db.execute(
        select(func.count()).select_from(FamilyFile).where(FamilyFile.creator_id == user_id)
    )
    ff_count = ff_count_result.scalar() or 0

    msg_count_result = await db.execute(
        select(func.count()).select_from(Message).where(Message.sender_id == user_id)
    )
    msg_count = msg_count_result.scalar() or 0

    agree_count_result = await db.execute(
        select(func.count()).select_from(Agreement).where(Agreement.creator_id == user_id)
    )
    agree_count = agree_count_result.scalar() or 0

    # Recent messages (last 30 days) for activity timeline
    thirty_days_ago = now - timedelta(days=30)
    recent_msg_result = await db.execute(
        select(func.count()).select_from(Message).where(
            Message.sender_id == user_id,
            Message.sent_at >= thirty_days_ago,
        )
    )
    recent_msg_count = recent_msg_result.scalar() or 0

    return {
        "user_id": user_id,
        "email": user.email,
        "name": f"{user.first_name} {user.last_name}",
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "last_active": user.last_active.isoformat() if user.last_active else None,
        "subscription": subscription,
        "score_history": score_history,
        "feature_usage": {
            "family_files": ff_count,
            "messages_total": msg_count,
            "messages_last_30d": recent_msg_count,
            "agreements": agree_count,
        },
        "current_score": score_history[-1] if score_history else None,
    }


# =============================================================================
# 8. POST /cs/interventions - Create intervention
# =============================================================================

@router.post(
    "/cs/interventions",
    summary="Create a CS intervention",
    status_code=status.HTTP_201_CREATED,
)
async def create_intervention(
    body: InterventionCreateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Create a new Customer Success intervention record.
    """
    # Verify target user exists
    user_result = await db.execute(select(User).where(User.id == body.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found")

    intervention = CSIntervention(
        id=str(uuid4()),
        user_id=body.user_id,
        admin_id=str(admin_user.id),
        type=body.type,
        channel=body.channel,
        notes=body.notes,
        outcome="pending",
        follow_up_date=body.follow_up_date,
    )
    db.add(intervention)
    await db.commit()
    await db.refresh(intervention)

    return {
        "id": intervention.id,
        "user_id": intervention.user_id,
        "admin_id": intervention.admin_id,
        "type": intervention.type,
        "channel": intervention.channel,
        "notes": intervention.notes,
        "outcome": intervention.outcome,
        "follow_up_date": intervention.follow_up_date.isoformat() if intervention.follow_up_date else None,
        "created_at": intervention.created_at.isoformat() if intervention.created_at else None,
    }


# =============================================================================
# 9. GET /cs/interventions - List interventions
# =============================================================================

@router.get(
    "/cs/interventions",
    summary="List CS interventions",
)
async def list_interventions(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    type: Optional[str] = Query(None, description="Filter by type"),
    outcome: Optional[str] = Query(None, description="Filter by outcome"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    List CS interventions with optional filters.
    Joined with User for names. Sorted by created_at descending.
    """
    query = (
        select(
            CSIntervention,
            User.email,
            User.first_name,
            User.last_name,
        )
        .join(User, CSIntervention.user_id == User.id)
    )

    if user_id:
        query = query.where(CSIntervention.user_id == user_id)
    if type:
        query = query.where(CSIntervention.type == type)
    if outcome:
        query = query.where(CSIntervention.outcome == outcome)

    query = query.order_by(CSIntervention.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    # Count
    count_query = select(func.count()).select_from(CSIntervention)
    if user_id:
        count_query = count_query.where(CSIntervention.user_id == user_id)
    if type:
        count_query = count_query.where(CSIntervention.type == type)
    if outcome:
        count_query = count_query.where(CSIntervention.outcome == outcome)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    items = []
    for row in rows:
        intervention = row[0]
        items.append({
            "id": intervention.id,
            "user_id": intervention.user_id,
            "user_email": row.email,
            "user_name": f"{row.first_name} {row.last_name}",
            "admin_id": intervention.admin_id,
            "type": intervention.type,
            "channel": intervention.channel,
            "notes": intervention.notes,
            "outcome": intervention.outcome,
            "follow_up_date": intervention.follow_up_date.isoformat() if intervention.follow_up_date else None,
            "created_at": intervention.created_at.isoformat() if intervention.created_at else None,
            "updated_at": intervention.updated_at.isoformat() if intervention.updated_at else None,
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}


# =============================================================================
# 10. PATCH /cs/interventions/{intervention_id} - Update intervention
# =============================================================================

@router.patch(
    "/cs/interventions/{intervention_id}",
    summary="Update a CS intervention outcome and notes",
)
async def update_intervention(
    intervention_id: str,
    body: InterventionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Update the outcome and/or notes of an existing intervention.
    """
    result = await db.execute(
        select(CSIntervention).where(CSIntervention.id == intervention_id)
    )
    intervention = result.scalar_one_or_none()
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention not found")

    if body.outcome is not None:
        intervention.outcome = body.outcome
    if body.notes is not None:
        intervention.notes = body.notes

    await db.commit()
    await db.refresh(intervention)

    return {
        "id": intervention.id,
        "user_id": intervention.user_id,
        "admin_id": intervention.admin_id,
        "type": intervention.type,
        "channel": intervention.channel,
        "notes": intervention.notes,
        "outcome": intervention.outcome,
        "follow_up_date": intervention.follow_up_date.isoformat() if intervention.follow_up_date else None,
        "created_at": intervention.created_at.isoformat() if intervention.created_at else None,
        "updated_at": intervention.updated_at.isoformat() if intervention.updated_at else None,
    }
