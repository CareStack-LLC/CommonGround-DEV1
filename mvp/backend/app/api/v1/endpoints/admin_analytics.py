"""
BizOps Analytics API - Cohort analysis, unit economics, retention, revenue metrics.

All endpoints require is_admin=True on the authenticated user.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, and_, case, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User, UserProfile
from app.models.message import Message, MessageFlag
from app.models.bizops import DailyMetricsSnapshot
from app.services.bizops_ai import generate_executive_summary

logger = logging.getLogger(__name__)
router = APIRouter()

TIER_PRICES = {
    "starter": 0, "plus": 12.00, "family_plus": 25.00,
    "solo": 99.00, "small_firm": 299.00, "mid_size": 799.00,
}


@router.get("/analytics/cohorts")
async def get_cohort_analysis(
    months: int = Query(6, ge=2, le=12),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Cohort retention analysis - monthly cohorts with retention rates."""
    now = datetime.utcnow()
    start_date = now - timedelta(days=months * 30)

    # Get all users created in the period
    result = await db.execute(
        select(
            User.id,
            User.created_at,
            User.last_active,
        ).where(
            User.created_at >= start_date,
            User.is_deleted == False,
        )
    )
    users = result.all()

    # Build cohort matrix
    cohorts = {}
    for user_id, created_at, last_active in users:
        if not created_at:
            continue
        cohort_key = created_at.strftime("%Y-%m")
        if cohort_key not in cohorts:
            cohorts[cohort_key] = {"size": 0, "active_by_month": {}}
        cohorts[cohort_key]["size"] += 1

        if last_active:
            # Calculate how many months the user was active after signup
            months_active = (last_active.year - created_at.year) * 12 + (last_active.month - created_at.month)
            for m in range(months_active + 1):
                cohorts[cohort_key]["active_by_month"][m] = cohorts[cohort_key]["active_by_month"].get(m, 0) + 1

    # Convert to retention percentages
    cohort_data = []
    for month_key in sorted(cohorts.keys()):
        c = cohorts[month_key]
        size = c["size"]
        retention = []
        for m in range(months):
            active = c["active_by_month"].get(m, 0)
            retention.append(round((active / size) * 100, 1) if size > 0 else 0)
        cohort_data.append({
            "month": month_key,
            "size": size,
            "retention": retention,
        })

    return {"cohorts": cohort_data, "months": months}


@router.get("/analytics/unit-economics")
async def get_unit_economics(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Calculate CAC, LTV, LTV:CAC ratio, payback period."""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    ninety_days_ago = now - timedelta(days=90)

    # Count paying users
    paying_tiers = ["plus", "family_plus", "solo", "small_firm", "mid_size"]
    paying_count = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.in_(paying_tiers),
            UserProfile.subscription_status == "active",
        )
    )

    # Calculate ARPU
    tier_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            func.count(UserProfile.id),
        ).where(
            UserProfile.subscription_tier.in_(paying_tiers),
            UserProfile.subscription_status == "active",
        ).group_by(UserProfile.subscription_tier)
    )
    total_revenue = 0
    tier_breakdown = {}
    for tier, count in tier_result:
        price = TIER_PRICES.get(tier, 0)
        tier_revenue = price * count
        total_revenue += tier_revenue
        tier_breakdown[tier] = {"count": count, "price": price, "revenue": round(tier_revenue, 2)}

    arpu = round(total_revenue / paying_count, 2) if paying_count else 0

    # Estimate churn rate (users who went from active to inactive in last 30d)
    total_users = await db.scalar(
        select(func.count(User.id)).where(User.is_deleted == False)
    )
    churned_30d = await db.scalar(
        select(func.count(User.id)).where(
            User.is_deleted == False,
            User.last_active < thirty_days_ago,
            User.last_active >= (thirty_days_ago - timedelta(days=30)),
        )
    )
    monthly_churn_rate = round((churned_30d / total_users) * 100, 2) if total_users else 0

    # LTV = ARPU / churn_rate (simplified)
    ltv = round(arpu / (monthly_churn_rate / 100), 2) if monthly_churn_rate > 0 else arpu * 24

    # CAC (from marketing spend if available, otherwise estimate)
    from app.models.bizops import MarketingSpend
    spend_result = await db.scalar(
        select(func.sum(MarketingSpend.amount)).where(
            MarketingSpend.month >= ninety_days_ago
        )
    )
    new_paying_90d = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.in_(paying_tiers),
            UserProfile.subscription_status == "active",
            UserProfile.created_at >= ninety_days_ago,
        )
    )
    total_spend = float(spend_result) if spend_result else 0
    cac = round(total_spend / new_paying_90d, 2) if new_paying_90d else 0

    ltv_cac_ratio = round(ltv / cac, 1) if cac > 0 else 0
    payback_months = round(cac / arpu, 1) if arpu > 0 else 0

    return {
        "arpu": arpu,
        "mrr": round(total_revenue, 2),
        "arr": round(total_revenue * 12, 2),
        "paying_users": paying_count,
        "monthly_churn_rate": monthly_churn_rate,
        "ltv": ltv,
        "cac": cac,
        "ltv_cac_ratio": ltv_cac_ratio,
        "payback_months": payback_months,
        "tier_breakdown": tier_breakdown,
    }


@router.get("/analytics/retention-curve")
async def get_retention_curve(
    days: int = Query(90, ge=7, le=180),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Day-by-day retention curve from signup."""
    start_date = datetime.utcnow() - timedelta(days=days + 30)  # Extra buffer for cohort

    result = await db.execute(
        select(User.created_at, User.last_active).where(
            User.created_at >= start_date,
            User.is_deleted == False,
        )
    )
    users = result.all()

    # Calculate retention at each day offset
    total_users = len(users)
    if total_users == 0:
        return {"curve": [], "total_cohort_size": 0}

    curve = []
    for day in range(0, min(days, 90) + 1):
        retained = sum(
            1 for created_at, last_active in users
            if last_active and (last_active - created_at).days >= day
        )
        curve.append({
            "day": day,
            "pct": round((retained / total_users) * 100, 1),
            "count": retained,
        })

    return {"curve": curve, "total_cohort_size": total_users}


@router.get("/analytics/revenue-metrics")
async def get_revenue_metrics(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """MRR, ARR, MRR growth rate, net revenue retention."""
    paying_tiers = ["plus", "family_plus", "solo", "small_firm", "mid_size"]

    # Current MRR
    tier_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            func.count(UserProfile.id),
        ).where(
            UserProfile.subscription_tier.in_(paying_tiers),
            UserProfile.subscription_status == "active",
        ).group_by(UserProfile.subscription_tier)
    )

    current_mrr = 0
    breakdown = {}
    for tier, count in tier_result:
        price = TIER_PRICES.get(tier, 0)
        revenue = price * count
        current_mrr += revenue
        breakdown[tier] = {"count": count, "revenue": round(revenue, 2)}

    # MRR from snapshots for trend
    snapshots = await db.execute(
        select(DailyMetricsSnapshot.date, DailyMetricsSnapshot.mrr)
        .order_by(DailyMetricsSnapshot.date.desc())
        .limit(90)
    )
    mrr_trend = [
        {"date": str(s.date), "mrr": float(s.mrr)}
        for s in snapshots
    ]
    mrr_trend.reverse()

    # Calculate growth rate from snapshots
    if len(mrr_trend) >= 30:
        current_period = mrr_trend[-1]["mrr"] if mrr_trend else current_mrr
        prev_period = mrr_trend[-30]["mrr"] if len(mrr_trend) >= 30 else current_period
        growth_rate = round(((current_period - prev_period) / prev_period) * 100, 1) if prev_period else 0
    else:
        growth_rate = 0

    # Past due revenue (at risk)
    past_due_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            func.count(UserProfile.id),
        ).where(
            UserProfile.subscription_tier.in_(paying_tiers),
            UserProfile.subscription_status == "past_due",
        ).group_by(UserProfile.subscription_tier)
    )
    at_risk_mrr = sum(
        TIER_PRICES.get(tier, 0) * count
        for tier, count in past_due_result
    )

    return {
        "mrr": round(current_mrr, 2),
        "arr": round(current_mrr * 12, 2),
        "mrr_growth_rate": growth_rate,
        "at_risk_mrr": round(at_risk_mrr, 2),
        "breakdown": breakdown,
        "mrr_trend": mrr_trend,
    }


@router.get("/analytics/executive-summary")
async def get_executive_summary(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """DAU/MAU ratio, activation rate, paying conversion rate."""
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    total_users = await db.scalar(
        select(func.count(User.id)).where(User.is_deleted == False)
    )
    mau = await db.scalar(
        select(func.count(User.id)).where(
            User.is_deleted == False,
            User.last_active >= thirty_days_ago,
        )
    )
    dau = await db.scalar(
        select(func.count(User.id)).where(
            User.is_deleted == False,
            User.last_active >= today,
        )
    )

    dau_mau_ratio = round((dau / mau) * 100, 1) if mau else 0

    # Activation rate (users who created a family file within 7 days of signup)
    from app.models.family_file import FamilyFile
    activated = await db.scalar(
        select(func.count(func.distinct(FamilyFile.parent_a_id))).where(
            FamilyFile.created_at >= seven_days_ago,
        )
    )
    new_users_7d = await db.scalar(
        select(func.count(User.id)).where(User.created_at >= seven_days_ago)
    )
    activation_rate = round((activated / new_users_7d) * 100, 1) if new_users_7d else 0

    # Paying conversion rate
    paying_tiers = ["plus", "family_plus", "solo", "small_firm", "mid_size"]
    paying_count = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.in_(paying_tiers),
            UserProfile.subscription_status == "active",
        )
    )
    paying_conversion = round((paying_count / total_users) * 100, 1) if total_users else 0

    return {
        "total_users": total_users,
        "dau": dau,
        "mau": mau,
        "dau_mau_ratio": dau_mau_ratio,
        "activation_rate": activation_rate,
        "paying_conversion": paying_conversion,
        "paying_users": paying_count,
        "new_users_7d": new_users_7d,
    }


@router.get("/analytics/ai-summary")
async def get_ai_summary(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """AI-generated executive pulse summary."""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    # Gather metrics for AI
    total_users = await db.scalar(
        select(func.count(User.id)).where(User.is_deleted == False)
    )
    active_30d = await db.scalar(
        select(func.count(User.id)).where(
            User.is_deleted == False,
            User.last_active >= thirty_days_ago,
        )
    )
    new_7d = await db.scalar(
        select(func.count(User.id)).where(User.created_at >= seven_days_ago)
    )

    # MRR
    paying_tiers = ["plus", "family_plus", "solo", "small_firm", "mid_size"]
    tier_result = await db.execute(
        select(UserProfile.subscription_tier, func.count(UserProfile.id))
        .where(
            UserProfile.subscription_tier.in_(paying_tiers),
            UserProfile.subscription_status == "active",
        ).group_by(UserProfile.subscription_tier)
    )
    mrr = sum(TIER_PRICES.get(t, 0) * c for t, c in tier_result)

    # Messages
    messages_7d = await db.scalar(
        select(func.count(Message.id)).where(Message.created_at >= seven_days_ago)
    )

    metrics = {
        "total_users": total_users,
        "active_users_30d": active_30d,
        "new_signups_7d": new_7d,
        "estimated_mrr": round(mrr, 2),
        "messages_7d": messages_7d or 0,
        "engagement_rate": round((active_30d / total_users) * 100, 1) if total_users else 0,
    }

    result = await generate_executive_summary(metrics)
    result["metrics"] = metrics
    result["generated_at"] = now.isoformat()

    return result
