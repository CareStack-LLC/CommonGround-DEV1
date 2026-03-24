"""
BizOps Sales Intelligence API - Pipeline, conversions, forecasting, CAC, LTV, win/loss.

All endpoints require is_admin=True on the authenticated user.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, and_, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User, UserProfile
from app.models.bizops import SalesEvent, DailyMetricsSnapshot, MarketingSpend

logger = logging.getLogger(__name__)
router = APIRouter()

TIER_PRICES = {
    "starter": 0,
    "plus": 12.00,
    "family_plus": 25.00,
    "solo": 99.00,
    "small_firm": 299.00,
    "mid_size": 799.00,
}

PAYING_TIERS = [t for t, p in TIER_PRICES.items() if p > 0]


# =============================================================================
# 1. Sales Pipeline / Funnel
# =============================================================================

@router.get("/sales/pipeline", summary="Sales funnel stage counts and conversion rates")
async def get_sales_pipeline(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Count users at each funnel stage and calculate stage-to-stage conversion rates."""

    # Total non-deleted users
    total_users = await db.scalar(
        select(func.count(User.id)).where(User.is_deleted == False)
    ) or 0

    # Leads: users with no profile
    users_with_profile = await db.scalar(
        select(func.count(distinct(UserProfile.user_id)))
    ) or 0
    leads = total_users - users_with_profile

    # Trial users
    trial_count = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_status == "trial"
        )
    ) or 0

    # Active Free (starter tier, active status)
    active_free = await db.scalar(
        select(func.count(UserProfile.id)).where(
            and_(
                UserProfile.subscription_tier == "starter",
                UserProfile.subscription_status == "active",
            )
        )
    ) or 0

    # Paid (paying tiers, active status)
    paid_count = await db.scalar(
        select(func.count(UserProfile.id)).where(
            and_(
                UserProfile.subscription_tier.in_(PAYING_TIERS),
                UserProfile.subscription_status == "active",
            )
        )
    ) or 0

    # Upgraded (distinct users with upgrade events)
    upgraded_count = await db.scalar(
        select(func.count(distinct(SalesEvent.user_id))).where(
            SalesEvent.event_type == "upgrade"
        )
    ) or 0

    # Conversion rates
    def _rate(numerator: int, denominator: int) -> float:
        return round((numerator / denominator) * 100, 2) if denominator > 0 else 0.0

    stages = [
        {"stage": "lead", "count": leads},
        {"stage": "trial", "count": trial_count},
        {"stage": "active_free", "count": active_free},
        {"stage": "paid", "count": paid_count},
        {"stage": "upgraded", "count": upgraded_count},
    ]

    return {
        "total_users": total_users,
        "stages": stages,
        "conversion_rates": {
            "lead_to_trial": _rate(trial_count, leads),
            "trial_to_active_free": _rate(active_free, trial_count),
            "active_free_to_paid": _rate(paid_count, active_free),
            "paid_to_upgraded": _rate(upgraded_count, paid_count),
        },
    }


# =============================================================================
# 2. Conversion Metrics
# =============================================================================

@router.get("/sales/conversions", summary="Conversion metrics over a period")
async def get_conversion_metrics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Query SalesEvent for trial_start, conversion, upgrade, downgrade, churn events.
    Calculate trial-to-paid rate, avg days to convert, tier upgrade counts.
    """
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    # Count events by type in the period
    event_counts_result = await db.execute(
        select(
            SalesEvent.event_type,
            func.count(SalesEvent.id),
        )
        .where(SalesEvent.occurred_at >= start_date)
        .group_by(SalesEvent.event_type)
    )
    event_counts = {row[0]: row[1] for row in event_counts_result.all()}

    trial_starts = event_counts.get("trial_start", 0)
    conversions = event_counts.get("conversion", 0)
    upgrades = event_counts.get("upgrade", 0)
    downgrades = event_counts.get("downgrade", 0)
    churns = event_counts.get("churn", 0)

    trial_to_paid_rate = (
        round((conversions / trial_starts) * 100, 2) if trial_starts > 0 else 0.0
    )

    # Average days to convert: find users who have both trial_start and conversion
    avg_days_result = await db.execute(
        select(
            func.avg(
                func.julianday(SalesEvent.occurred_at)
                - func.julianday(
                    select(SalesEvent.occurred_at)
                    .where(
                        and_(
                            SalesEvent.user_id == SalesEvent.user_id,
                            SalesEvent.event_type == "trial_start",
                        )
                    )
                    .correlate(SalesEvent)
                    .scalar_subquery()
                )
            )
        ).where(
            and_(
                SalesEvent.event_type == "conversion",
                SalesEvent.occurred_at >= start_date,
            )
        )
    )
    raw_avg = avg_days_result.scalar()
    avg_days_to_convert = round(float(raw_avg), 1) if raw_avg else None

    # Tier upgrade breakdown
    tier_upgrades_result = await db.execute(
        select(
            SalesEvent.to_tier,
            func.count(SalesEvent.id),
        )
        .where(
            and_(
                SalesEvent.event_type == "upgrade",
                SalesEvent.occurred_at >= start_date,
            )
        )
        .group_by(SalesEvent.to_tier)
    )
    tier_upgrade_counts = {row[0]: row[1] for row in tier_upgrades_result.all()}

    return {
        "period_days": days,
        "events": {
            "trial_start": trial_starts,
            "conversion": conversions,
            "upgrade": upgrades,
            "downgrade": downgrades,
            "churn": churns,
        },
        "trial_to_paid_rate": trial_to_paid_rate,
        "avg_days_to_convert": avg_days_to_convert,
        "tier_upgrade_counts": tier_upgrade_counts,
    }


# =============================================================================
# 3. MRR Forecast
# =============================================================================

@router.get("/sales/forecast", summary="MRR forecast with linear regression")
async def get_mrr_forecast(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Get MRR trend from DailyMetricsSnapshot (last 90 days).
    Use simple linear regression to project forward 3 months.
    Confidence bands at +/- 15%.
    """
    now = datetime.utcnow()
    ninety_days_ago = now - timedelta(days=90)

    result = await db.execute(
        select(DailyMetricsSnapshot.date, DailyMetricsSnapshot.mrr)
        .where(DailyMetricsSnapshot.date >= ninety_days_ago)
        .order_by(DailyMetricsSnapshot.date)
    )
    snapshots = result.all()

    if len(snapshots) < 2:
        return {
            "historical": [],
            "forecast": [],
            "slope": None,
            "current_mrr": None,
            "message": "Insufficient data for forecast (need at least 2 data points).",
        }

    # Prepare data: x = day index, y = mrr
    base_date = snapshots[0][0]
    xs = [(s[0] - base_date).days for s in snapshots]
    ys = [float(s[1]) for s in snapshots]
    n = len(xs)

    # Simple linear regression: y = slope * x + intercept
    sum_x = sum(xs)
    sum_y = sum(ys)
    sum_xy = sum(x * y for x, y in zip(xs, ys))
    sum_x2 = sum(x * x for x in xs)

    denominator = n * sum_x2 - sum_x * sum_x
    if denominator == 0:
        slope = 0.0
        intercept = sum_y / n
    else:
        slope = (n * sum_xy - sum_x * sum_y) / denominator
        intercept = (sum_y - slope * sum_x) / n

    current_mrr = ys[-1]
    last_day = xs[-1]

    # Historical fitted line
    historical = [
        {
            "date": s[0].isoformat(),
            "actual_mrr": float(s[1]),
            "fitted_mrr": round(slope * x + intercept, 2),
        }
        for s, x in zip(snapshots, xs)
    ]

    # Project forward 90 days (3 months)
    forecast = []
    for days_ahead in range(1, 91):
        future_x = last_day + days_ahead
        projected_mrr = slope * future_x + intercept
        future_date = (base_date + timedelta(days=future_x)).isoformat()
        forecast.append({
            "date": future_date,
            "projected_mrr": round(projected_mrr, 2),
            "lower_bound": round(projected_mrr * 0.85, 2),
            "upper_bound": round(projected_mrr * 1.15, 2),
        })

    return {
        "historical": historical,
        "forecast": forecast,
        "slope_per_day": round(slope, 2),
        "current_mrr": current_mrr,
        "projected_mrr_30d": round(slope * (last_day + 30) + intercept, 2),
        "projected_mrr_60d": round(slope * (last_day + 60) + intercept, 2),
        "projected_mrr_90d": round(slope * (last_day + 90) + intercept, 2),
    }


# =============================================================================
# 4. Customer Acquisition Cost (CAC)
# =============================================================================

@router.get("/sales/cac", summary="CAC by channel")
async def get_cac(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Query MarketingSpend for last 90 days.
    Query new paying users in the same window.
    Calculate overall and per-channel CAC.
    """
    now = datetime.utcnow()
    ninety_days_ago = now - timedelta(days=90)

    # Total marketing spend by channel
    spend_result = await db.execute(
        select(
            MarketingSpend.channel,
            func.sum(MarketingSpend.amount),
        )
        .where(MarketingSpend.month >= ninety_days_ago)
        .group_by(MarketingSpend.channel)
    )
    spend_by_channel = {row[0]: float(row[1]) for row in spend_result.all()}
    total_spend = sum(spend_by_channel.values())

    # New paying users in the period (conversion events)
    new_paying_result = await db.execute(
        select(
            SalesEvent.source,
            func.count(distinct(SalesEvent.user_id)),
        )
        .where(
            and_(
                SalesEvent.event_type == "conversion",
                SalesEvent.occurred_at >= ninety_days_ago,
            )
        )
        .group_by(SalesEvent.source)
    )
    conversions_by_source = {row[0]: row[1] for row in new_paying_result.all()}
    total_conversions = sum(conversions_by_source.values())

    overall_cac = round(total_spend / total_conversions, 2) if total_conversions > 0 else None

    # Per-channel CAC: match spend channels to conversion sources
    channel_cac = {}
    for channel, amount in spend_by_channel.items():
        channel_conversions = conversions_by_source.get(channel, 0)
        channel_cac[channel] = {
            "spend": round(amount, 2),
            "conversions": channel_conversions,
            "cac": round(amount / channel_conversions, 2) if channel_conversions > 0 else None,
        }

    return {
        "period_days": 90,
        "total_spend": round(total_spend, 2),
        "total_conversions": total_conversions,
        "overall_cac": overall_cac,
        "by_channel": channel_cac,
    }


# =============================================================================
# 5. Lifetime Value (LTV)
# =============================================================================

@router.get("/sales/ltv", summary="LTV by subscription tier")
async def get_ltv(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Calculate ARPU per tier, estimate average lifespan from churn data.
    LTV = ARPU * avg_lifespan_months. Return per-tier and overall.
    """
    now = datetime.utcnow()
    twelve_months_ago = now - timedelta(days=365)

    # Active paying users per tier
    tier_counts_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            func.count(UserProfile.id),
        )
        .where(
            and_(
                UserProfile.subscription_tier.in_(PAYING_TIERS),
                UserProfile.subscription_status == "active",
            )
        )
        .group_by(UserProfile.subscription_tier)
    )
    tier_counts = {row[0]: row[1] for row in tier_counts_result.all()}
    total_paying = sum(tier_counts.values())

    # Churn events per tier (last 12 months)
    churn_result = await db.execute(
        select(
            SalesEvent.from_tier,
            func.count(SalesEvent.id),
        )
        .where(
            and_(
                SalesEvent.event_type == "churn",
                SalesEvent.occurred_at >= twelve_months_ago,
            )
        )
        .group_by(SalesEvent.from_tier)
    )
    churns_by_tier = {row[0]: row[1] for row in churn_result.all()}
    total_churns = sum(churns_by_tier.values())

    # Calculate per-tier LTV
    per_tier = {}
    for tier in PAYING_TIERS:
        price = TIER_PRICES[tier]
        count = tier_counts.get(tier, 0)
        tier_churns = churns_by_tier.get(tier, 0)

        # Monthly churn rate
        if count > 0 and tier_churns > 0:
            monthly_churn_rate = tier_churns / (count * 12)  # annualized to monthly
            avg_lifespan_months = round(1 / monthly_churn_rate, 1) if monthly_churn_rate > 0 else None
        else:
            monthly_churn_rate = 0
            avg_lifespan_months = None

        ltv = round(price * avg_lifespan_months, 2) if avg_lifespan_months else None

        per_tier[tier] = {
            "arpu": price,
            "active_users": count,
            "churns_12m": tier_churns,
            "monthly_churn_rate": round(monthly_churn_rate * 100, 2) if monthly_churn_rate else 0,
            "avg_lifespan_months": avg_lifespan_months,
            "ltv": ltv,
        }

    # Overall metrics
    overall_arpu = (
        round(sum(TIER_PRICES[t] * tier_counts.get(t, 0) for t in PAYING_TIERS) / total_paying, 2)
        if total_paying > 0
        else 0
    )
    overall_monthly_churn = (
        total_churns / (total_paying * 12) if total_paying > 0 and total_churns > 0 else 0
    )
    overall_lifespan = round(1 / overall_monthly_churn, 1) if overall_monthly_churn > 0 else None
    overall_ltv = round(overall_arpu * overall_lifespan, 2) if overall_lifespan else None

    return {
        "per_tier": per_tier,
        "overall": {
            "arpu": overall_arpu,
            "total_paying_users": total_paying,
            "monthly_churn_rate": round(overall_monthly_churn * 100, 2),
            "avg_lifespan_months": overall_lifespan,
            "ltv": overall_ltv,
        },
    }


# =============================================================================
# 6. Win/Loss Analysis
# =============================================================================

@router.get("/sales/win-loss", summary="Win/loss analysis from sales events")
async def get_win_loss(
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    From SalesEvent, find conversions (wins) vs churn (losses).
    Return counts, source breakdown, and common patterns.
    """
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    # Wins: conversions and upgrades
    wins_result = await db.execute(
        select(
            SalesEvent.event_type,
            SalesEvent.source,
            SalesEvent.to_tier,
            func.count(SalesEvent.id),
        )
        .where(
            and_(
                SalesEvent.event_type.in_(["conversion", "upgrade"]),
                SalesEvent.occurred_at >= start_date,
            )
        )
        .group_by(SalesEvent.event_type, SalesEvent.source, SalesEvent.to_tier)
    )
    wins_raw = wins_result.all()

    # Losses: churn and downgrade
    losses_result = await db.execute(
        select(
            SalesEvent.event_type,
            SalesEvent.source,
            SalesEvent.from_tier,
            func.count(SalesEvent.id),
        )
        .where(
            and_(
                SalesEvent.event_type.in_(["churn", "downgrade"]),
                SalesEvent.occurred_at >= start_date,
            )
        )
        .group_by(SalesEvent.event_type, SalesEvent.source, SalesEvent.from_tier)
    )
    losses_raw = losses_result.all()

    total_wins = sum(row[3] for row in wins_raw)
    total_losses = sum(row[3] for row in losses_raw)

    # Source breakdown for wins
    win_by_source: dict = {}
    for event_type, source, to_tier, count in wins_raw:
        src = source or "unknown"
        win_by_source.setdefault(src, 0)
        win_by_source[src] += count

    # Tier breakdown for losses
    loss_by_tier: dict = {}
    for event_type, source, from_tier, count in losses_raw:
        tier = from_tier or "unknown"
        loss_by_tier.setdefault(tier, 0)
        loss_by_tier[tier] += count

    win_rate = round((total_wins / (total_wins + total_losses)) * 100, 2) if (total_wins + total_losses) > 0 else 0.0

    return {
        "period_days": days,
        "wins": {
            "total": total_wins,
            "by_source": win_by_source,
        },
        "losses": {
            "total": total_losses,
            "by_tier": loss_by_tier,
        },
        "win_rate": win_rate,
    }


# =============================================================================
# 7. AI Sales Suggestions
# =============================================================================

@router.post("/sales/ai-suggestions", summary="AI-generated sales suggestions")
async def get_ai_sales_suggestions(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Gather pipeline and conversion data, then call AI service
    for actionable sales suggestions.
    """
    from app.services.bizops_ai import generate_sales_suggestions

    # Gather pipeline data
    pipeline = await get_sales_pipeline(db=db, admin_user=admin_user)

    # Gather conversion data (last 30 days)
    conversions = await get_conversion_metrics(days=30, db=db, admin_user=admin_user)

    suggestions = await generate_sales_suggestions(
        pipeline_data=pipeline,
        conversion_data=conversions,
    )

    return {
        "suggestions": suggestions,
        "generated_at": datetime.utcnow().isoformat(),
    }
