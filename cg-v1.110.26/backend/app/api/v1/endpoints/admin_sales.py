"""
Sales Intelligence admin endpoints for the SuperAdmin portal.
Provides pipeline, conversions, forecasting, CAC, LTV, win/loss analysis,
and AI-powered sales suggestions.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, and_, case as sql_case, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User, UserProfile

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Tier pricing for revenue calculations
# =============================================================================
_TIER_PRICES = {
    "web_starter": 0,
    "plus": 17.99, "complete": 34.99,
    "professional_starter": 49.00,
    "solo": 99.00, "small_firm": 299.00, "mid_size": 799.00,
}

_PIPELINE_STAGES = [
    {"name": "Awareness", "stage": "awareness"},
    {"name": "Sign-up", "stage": "signup"},
    {"name": "Free Trial", "stage": "free_trial"},
    {"name": "Paid Conversion", "stage": "paid"},
    {"name": "Expansion", "stage": "expansion"},
]


@router.get("/sales/pipeline")
async def get_sales_pipeline(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Sales funnel pipeline with stage counts and values."""
    # Total users (awareness/signup)
    total_q = await db.execute(select(func.count(User.id)))
    total_users = total_q.scalar() or 0

    # Users with profiles (completed signup)
    signed_up_q = await db.execute(
        select(func.count(UserProfile.id))
    )
    signed_up = signed_up_q.scalar() or 0

    # Free tier users
    free_q = await db.execute(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.in_(["web_starter", "free", None])
        )
    )
    free_users = free_q.scalar() or 0

    # Paid users
    paid_q = await db.execute(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.notin_(["web_starter", "free", ""])
        ).where(UserProfile.subscription_tier.isnot(None))
    )
    paid_users = paid_q.scalar() or 0

    # Premium paid (solo+)
    premium_q = await db.execute(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.in_(["solo", "small_firm", "mid_size"])
        )
    )
    premium_users = premium_q.scalar() or 0

    # Calculate pipeline value per stage
    stages = [
        {
            "name": "Awareness",
            "count": total_users,
            "value": total_users * 2.50,  # estimated value per lead
            "conversion_from_prev_pct": 100.0,
        },
        {
            "name": "Sign-up",
            "count": signed_up,
            "value": signed_up * 5.00,
            "conversion_from_prev_pct": round((signed_up / max(total_users, 1)) * 100, 1),
        },
        {
            "name": "Free Trial",
            "count": free_users,
            "value": free_users * 10.00,
            "conversion_from_prev_pct": round((free_users / max(signed_up, 1)) * 100, 1),
        },
        {
            "name": "Paid Conversion",
            "count": paid_users,
            "value": sum(
                _TIER_PRICES.get(t, 17.99)
                for t in ["plus", "complete", "professional_starter"]
            ) * max(paid_users, 1),
            "conversion_from_prev_pct": round((paid_users / max(free_users, 1)) * 100, 1),
        },
        {
            "name": "Expansion",
            "count": premium_users,
            "value": premium_users * 199.00,
            "conversion_from_prev_pct": round((premium_users / max(paid_users, 1)) * 100, 1),
        },
    ]

    total_pipeline_value = sum(s["value"] for s in stages)
    return {
        "stages": stages,
        "total_pipeline_value": round(total_pipeline_value, 2),
        # Counts come from real queries. Per-stage `value` uses fabricated
        # per-lead / per-stage rates (e.g. $2.50 per lead) — the frontend
        # should render the value columns with an "Estimated" pill.
        "is_estimate": True,
        "counts_are_real": True,
        "methodology": (
            "Stage counts are live queries on User / UserProfile. Stage values "
            "multiply counts by placeholder rates (lead=$2.50, signup=$5.00, "
            "trial=$10.00, paid=tier-weighted avg, expansion=$199) and do not "
            "reflect real pipeline economics."
        ),
    }


@router.get("/sales/conversions")
async def get_sales_conversions(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Daily conversion metrics over the specified period."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Daily signups
    daily_q = await db.execute(
        select(
            cast(User.created_at, Date).label("date"),
            func.count(User.id).label("signups"),
        )
        .where(User.created_at >= cutoff)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
    )
    daily_signups = [{"date": str(r.date), "signups": r.signups} for r in daily_q]

    # Overall conversion rate
    total_q = await db.execute(select(func.count(User.id)).where(User.created_at >= cutoff))
    total_signups = total_q.scalar() or 0

    paid_q = await db.execute(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.notin_(["web_starter", "free", ""]),
            UserProfile.subscription_tier.isnot(None),
        )
    )
    paid_count = paid_q.scalar() or 0

    return {
        "period_days": days,
        "total_signups": total_signups,
        "total_paid": paid_count,
        "conversion_rate": round((paid_count / max(total_signups, 1)) * 100, 2),
        "daily": daily_signups,
    }


@router.get("/sales/forecast")
async def get_sales_forecast(
    months: int = Query(3, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Simple revenue forecast based on current MRR and growth trends."""
    # Current MRR
    tier_q = await db.execute(
        select(UserProfile.subscription_tier, func.count(UserProfile.id))
        .where(UserProfile.subscription_tier.isnot(None))
        .group_by(UserProfile.subscription_tier)
    )
    current_mrr = sum(
        _TIER_PRICES.get(tier, 0) * count
        for tier, count in tier_q
    )

    # Simple 5% monthly growth projection
    growth_rate = 0.05
    forecast = []
    now = datetime.utcnow()
    for i in range(1, months + 1):
        projected_month = now + timedelta(days=30 * i)
        projected_mrr = current_mrr * ((1 + growth_rate) ** i)
        forecast.append({
            "month": projected_month.strftime("%Y-%m"),
            "projected_mrr": round(projected_mrr, 2),
            "projected_arr": round(projected_mrr * 12, 2),
        })

    return {
        "current_mrr": round(current_mrr, 2),
        "growth_rate_pct": growth_rate * 100,
        "forecast": forecast,
        "is_estimate": True,
        "methodology": (
            "current_mrr is real (subscription tiers * published prices). "
            "Forecast assumes a hardcoded 5% month-over-month growth rate "
            "and does not factor in churn, seasonality, or real cohort data."
        ),
    }


@router.get("/sales/cac")
async def get_sales_cac(
    period: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Customer acquisition cost estimates."""
    cutoff = datetime.utcnow() - timedelta(days=period)
    new_q = await db.execute(
        select(func.count(User.id)).where(User.created_at >= cutoff)
    )
    new_users = new_q.scalar() or 1

    # Estimated marketing spend (placeholder - could be connected to actual data)
    estimated_spend = 500.0  # placeholder monthly spend
    months = max(period / 30, 1)
    total_spend = estimated_spend * months

    return {
        "period_days": period,
        "new_customers": new_users,
        "estimated_spend": round(total_spend, 2),
        "cac": round(total_spend / new_users, 2),
        "note": "Spend is estimated. Connect actual marketing spend for accurate CAC.",
        "is_estimate": True,
        "methodology": (
            f"new_customers is a real count. estimated_spend assumes "
            f"${estimated_spend:.0f}/month placeholder marketing spend — "
            "not sourced from GA4, Google Ads, or any real channel data."
        ),
    }


@router.get("/sales/ltv")
async def get_sales_ltv(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Customer lifetime value by tier."""
    tier_q = await db.execute(
        select(UserProfile.subscription_tier, func.count(UserProfile.id))
        .where(UserProfile.subscription_tier.isnot(None))
        .group_by(UserProfile.subscription_tier)
    )

    avg_lifetime_months = 18  # estimated average customer lifetime
    ltv_by_tier = {}
    total_ltv = 0
    total_customers = 0
    for tier, count in tier_q:
        price = _TIER_PRICES.get(tier, 0)
        ltv = price * avg_lifetime_months
        ltv_by_tier[tier] = {
            "count": count,
            "monthly_price": price,
            "ltv": round(ltv, 2),
        }
        total_ltv += ltv * count
        total_customers += count

    return {
        "avg_lifetime_months": avg_lifetime_months,
        "avg_ltv": round(total_ltv / max(total_customers, 1), 2),
        "by_tier": ltv_by_tier,
        "total_customers": total_customers,
        "is_estimate": True,
        "methodology": (
            "total_customers is a real count. LTV uses a placeholder "
            f"{avg_lifetime_months}-month average customer lifetime — "
            "not sourced from actual cohort retention data."
        ),
    }


@router.get("/sales/win-loss")
async def get_sales_win_loss(
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Win/loss analysis based on signup-to-paid conversion."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Total signups in period
    total_q = await db.execute(
        select(func.count(User.id)).where(User.created_at >= cutoff)
    )
    total = total_q.scalar() or 0

    # Converted to paid
    paid_q = await db.execute(
        select(func.count(UserProfile.id))
        .join(User, User.id == UserProfile.user_id)
        .where(
            User.created_at >= cutoff,
            UserProfile.subscription_tier.notin_(["web_starter", "free", ""]),
            UserProfile.subscription_tier.isnot(None),
        )
    )
    wins = paid_q.scalar() or 0
    losses = total - wins

    return {
        "period_days": days,
        "wins": wins,
        "losses": losses,
        "win_rate": round((wins / max(total, 1)) * 100, 1),
        "loss_rate": round((losses / max(total, 1)) * 100, 1),
        "total_opportunities": total,
    }


@router.post("/sales/ai-suggestions")
async def get_sales_ai_suggestions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Placeholder sales suggestions — a hardcoded template decorated with
    one live stat (current conversion rate). Flagged `is_sample: true` so
    the frontend can render a "sample data" banner. Replace with a real
    Claude/OpenAI call driven by sales data when that integration lands."""
    total_q = await db.execute(select(func.count(User.id)))
    total_users = total_q.scalar() or 0

    paid_q = await db.execute(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.notin_(["web_starter", "free", ""]),
            UserProfile.subscription_tier.isnot(None),
        )
    )
    paid_users = paid_q.scalar() or 0

    conversion_rate = (paid_users / max(total_users, 1)) * 100

    suggestions = [
        {
            "category": "Conversion Optimization",
            "suggestion": f"Current free-to-paid conversion is {conversion_rate:.1f}%. "
                          "Consider adding in-app upgrade prompts after key actions.",
            "priority": "high" if conversion_rate < 5 else "medium",
            "estimated_impact": "10-20% increase in paid conversions",
        },
        {
            "category": "Tier Upsell",
            "suggestion": "Identify Plus tier users with high engagement for Complete tier upsell campaigns.",
            "priority": "medium",
            "estimated_impact": "15% revenue increase from existing customers",
        },
        {
            "category": "Professional Market",
            "suggestion": "Target family law attorneys and mediators with professional tier demos.",
            "priority": "high",
            "estimated_impact": "Higher ARPU from professional segments",
        },
        {
            "category": "Retention",
            "suggestion": "Users who haven't logged in for 7+ days should receive re-engagement emails.",
            "priority": "high",
            "estimated_impact": "Reduce churn by 5-10%",
        },
    ]

    return {
        "suggestions": suggestions,
        "data_summary": {
            "total_users": total_users,
            "paid_users": paid_users,
            "conversion_rate": round(conversion_rate, 2),
        },
        "is_sample": True,
        "sample_reason": (
            "Suggestion text is a hardcoded template — only the conversion_rate "
            "stat is live. Wire Claude or OpenAI into this endpoint to generate "
            "real suggestions from sales data."
        ),
    }
