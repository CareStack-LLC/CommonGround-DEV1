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
    history_days: int = Query(90, ge=30, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Revenue forecast via linear regression on real daily MRR history.

    Method:
      1. Reconstruct daily MRR from UserProfile.subscription_started_at (or
         created_at fallback) — each paying subscription contributes its tier
         price from its start date onward.
      2. Fit a simple ordinary-least-squares linear model on the last
         `history_days` days of daily MRR.
      3. Project `months` months forward using that slope.
      4. Compute a rough 1-sigma confidence band from residuals.
    """
    now = datetime.utcnow()
    history_cutoff = now - timedelta(days=history_days)

    # Pull paying subscriptions with their start dates
    # subscription_period_start is the Stripe period start; fall back to
    # created_at (profile row) if the Stripe link is missing or preceded it.
    sub_q = await db.execute(
        select(
            UserProfile.subscription_tier,
            UserProfile.subscription_period_start,
            UserProfile.created_at,
        ).where(UserProfile.subscription_tier.isnot(None))
    )
    subs = [
        (tier, started or created)
        for tier, started, created in sub_q
        if tier and tier not in ("web_starter", "free", "", "essential")
    ]

    # Build daily MRR series: for each day in window, sum price of active subs
    # (simplification: once a subscription starts, it's counted from then on —
    # doesn't model cancellations beyond what's in current subscription_tier)
    day_count = history_days
    daily_mrr: list[float] = []
    daily_dates: list[str] = []
    for i in range(day_count):
        d = (history_cutoff + timedelta(days=i)).date()
        mrr = sum(
            _TIER_PRICES.get(tier, 0)
            for tier, start in subs
            if start and start.date() <= d
        )
        daily_mrr.append(mrr)
        daily_dates.append(d.isoformat())

    # Current MRR (today)
    current_mrr = sum(_TIER_PRICES.get(t, 0) for t, _ in subs)

    # Ordinary least squares (no numpy): y = a + b*x where x = day_index
    n = len(daily_mrr)
    if n < 2 or all(v == 0 for v in daily_mrr):
        slope = 0.0
        intercept = float(current_mrr)
        residual_std = 0.0
    else:
        mean_x = (n - 1) / 2
        mean_y = sum(daily_mrr) / n
        num = sum((i - mean_x) * (daily_mrr[i] - mean_y) for i in range(n))
        den = sum((i - mean_x) ** 2 for i in range(n)) or 1
        slope = num / den
        intercept = mean_y - slope * mean_x
        # 1-sigma residual (simple std of y - (a+b*x))
        residuals = [daily_mrr[i] - (intercept + slope * i) for i in range(n)]
        residual_std = (sum(r * r for r in residuals) / max(n - 1, 1)) ** 0.5

    # Project forward: month-end values at 30-day intervals
    forecast = []
    for m in range(1, months + 1):
        x_future = n + 30 * m - 1  # day index at month m
        projected = max(intercept + slope * x_future, 0.0)
        low = max(projected - residual_std, 0.0)
        high = projected + residual_std
        projected_month = (now + timedelta(days=30 * m)).strftime("%Y-%m")
        forecast.append({
            "month": projected_month,
            "projected_mrr": round(projected, 2),
            "projected_arr": round(projected * 12, 2),
            "low_mrr": round(low, 2),
            "high_mrr": round(high, 2),
        })

    # Implied MoM growth % (from slope)
    implied_mom_pct = round((slope * 30) / max(current_mrr, 1) * 100, 2) if current_mrr else 0

    # Build historical series (for chart)
    historical = [
        {"date": daily_dates[i], "mrr": round(daily_mrr[i], 2)}
        for i in range(n)
    ]

    return {
        "current_mrr": round(current_mrr, 2),
        "history_days": history_days,
        "historical": historical,
        "forecast": forecast,
        "method": "ols_linear_regression",
        "implied_mom_growth_pct": implied_mom_pct,
        "residual_std": round(residual_std, 2),
        "paying_subscribers": len(subs),
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
    """Win/loss analysis from the Lead sales funnel.

    Aggregates two views:
      - Funnel-based (Lead.stage): counts closed_won / closed_lost leads with
        a real breakdown by `lost_reason` — fed by the "Close as lost" UX.
      - Signup-based (User → paid subscription): counts all signups in the
        window that did / didn't convert to a paid tier. This is a fallback
        for cohorts where funnel tracking isn't yet populated.
    """
    from app.models.lead import Lead

    cutoff = datetime.utcnow() - timedelta(days=days)

    # ── Funnel-based (leads with explicit stage)
    lead_rows_q = await db.execute(
        select(Lead.stage, Lead.lost_reason, Lead.created_at, Lead.closed_at)
        .where(Lead.stage.isnot(None))
        .where(
            # Include leads closed OR created in the window
            (Lead.closed_at >= cutoff) | (Lead.created_at >= cutoff)
        )
    )
    leads_in_window = list(lead_rows_q)

    funnel_wins = 0
    funnel_losses = 0
    by_reason: dict[str, int] = {}
    days_to_close: list[float] = []
    for stage, reason, created_at, closed_at in leads_in_window:
        if stage == "closed_won":
            funnel_wins += 1
            if created_at and closed_at:
                delta = (closed_at - created_at).total_seconds() / 86400
                days_to_close.append(delta)
        elif stage == "closed_lost":
            funnel_losses += 1
            r = (reason or "other").strip().lower() or "other"
            by_reason[r] = by_reason.get(r, 0) + 1
            if created_at and closed_at:
                delta = (closed_at - created_at).total_seconds() / 86400
                days_to_close.append(delta)

    funnel_total = funnel_wins + funnel_losses
    funnel_win_rate = round((funnel_wins / max(funnel_total, 1)) * 100, 1) if funnel_total else 0.0
    avg_days_to_close = round(sum(days_to_close) / max(len(days_to_close), 1), 1) if days_to_close else 0.0

    by_reason_list = [
        {"reason": r, "count": c, "pct_of_losses": round((c / max(funnel_losses, 1)) * 100, 1)}
        for r, c in sorted(by_reason.items(), key=lambda kv: kv[1], reverse=True)
    ]

    # ── Signup-based fallback view (no funnel tracking required)
    total_q = await db.execute(
        select(func.count(User.id)).where(User.created_at >= cutoff)
    )
    signup_total = total_q.scalar() or 0

    paid_q = await db.execute(
        select(func.count(UserProfile.id))
        .join(User, User.id == UserProfile.user_id)
        .where(
            User.created_at >= cutoff,
            UserProfile.subscription_tier.notin_(["web_starter", "free", "", "essential"]),
            UserProfile.subscription_tier.isnot(None),
        )
    )
    signup_wins = paid_q.scalar() or 0
    signup_losses = signup_total - signup_wins

    return {
        "period_days": days,
        # Funnel-based (preferred — uses Lead.stage)
        "funnel": {
            "wins": funnel_wins,
            "losses": funnel_losses,
            "total": funnel_total,
            "win_rate": funnel_win_rate,
            "avg_days_to_close": avg_days_to_close,
            "by_reason": by_reason_list,
            "tracked_leads": len(leads_in_window),
        },
        # Signup-based fallback (only useful when funnel tracking is sparse)
        "signups": {
            "wins": signup_wins,
            "losses": signup_losses,
            "total": signup_total,
            "win_rate": round((signup_wins / max(signup_total, 1)) * 100, 1),
            "loss_rate": round((signup_losses / max(signup_total, 1)) * 100, 1),
        },
    }


@router.post("/sales/ai-suggestions")
async def get_sales_ai_suggestions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Claude-generated sales suggestions grounded in real metric context.

    Falls back to deterministic data-driven recommendations if Claude is
    unreachable — no hard-coded copy-paste templates.
    """
    import json as _json

    # ── Gather live context
    now = datetime.utcnow()
    cutoff_30 = now - timedelta(days=30)
    cutoff_60 = now - timedelta(days=60)

    total_q = await db.execute(select(func.count(User.id)))
    total_users = total_q.scalar() or 0

    paid_q = await db.execute(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.notin_(["web_starter", "free", "", "essential"]),
            UserProfile.subscription_tier.isnot(None),
        )
    )
    paid_users = paid_q.scalar() or 0

    # Tier mix
    tier_mix_q = await db.execute(
        select(UserProfile.subscription_tier, func.count(UserProfile.id))
        .where(UserProfile.subscription_tier.isnot(None))
        .group_by(UserProfile.subscription_tier)
    )
    tier_mix = {str(t): int(c) for t, c in tier_mix_q if t}

    # Current MRR
    current_mrr = sum(_TIER_PRICES.get(t, 0) * c for t, c in tier_mix.items())

    # Growth: last 30 vs prior 30
    recent_q = await db.execute(
        select(func.count(User.id)).where(User.created_at >= cutoff_30)
    )
    recent_signups = recent_q.scalar() or 0

    prev_q = await db.execute(
        select(func.count(User.id))
        .where(User.created_at >= cutoff_60, User.created_at < cutoff_30)
    )
    prev_signups = prev_q.scalar() or 0
    growth_pct = ((recent_signups - prev_signups) / max(prev_signups, 1)) * 100

    conversion_rate = (paid_users / max(total_users, 1)) * 100

    # Lost-reason breakdown (what's killing deals)
    from app.models.lead import Lead
    lost_q = await db.execute(
        select(Lead.lost_reason, func.count(Lead.id))
        .where(Lead.stage == "closed_lost")
        .where(Lead.closed_at >= now - timedelta(days=90))
        .group_by(Lead.lost_reason)
        .order_by(func.count(Lead.id).desc())
    )
    top_lost_reasons = [(r or "unknown", int(c)) for r, c in lost_q]

    context_block = "\n".join([
        f"- Total users: {total_users}",
        f"- Paying subscribers: {paid_users}",
        f"- Free → paid conversion rate: {conversion_rate:.2f}%",
        f"- Current MRR: ${current_mrr:,.2f}",
        f"- New signups (last 30 days): {recent_signups}",
        f"- Prior 30-day signups: {prev_signups}",
        f"- Signup growth MoM: {growth_pct:+.1f}%",
        f"- Tier mix: {tier_mix}",
        f"- Top lost reasons (90d): {top_lost_reasons or 'none tracked'}",
    ])

    # ── Try Claude
    suggestions: Optional[list[dict]] = None
    try:
        from app.core.ai_clients import get_async_anthropic
        from app.core.config import settings as app_settings

        if app_settings.ANTHROPIC_API_KEY:
            client = get_async_anthropic()
            system_prompt = (
                "You are a growth / revenue advisor for CommonGround, a co-parenting "
                "SaaS. Given real metrics, produce 5 concrete, data-grounded sales "
                "suggestions. Each should reference specific numbers from the context "
                "and propose a measurable tactic. Avoid generic advice.\n\n"
                "Return ONLY a JSON array of objects with this exact shape "
                "(no markdown fences, no commentary):\n"
                '[{"category": "...", "suggestion": "...", "priority": "high|medium|low", '
                '"estimated_impact": "..."}]'
            )
            resp = await client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1500,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"Current metrics:\n{context_block}\n\nProduce 5 suggestions now.",
                }],
            )
            text_blocks = [
                b.text for b in resp.content
                if hasattr(b, "text") and isinstance(b.text, str)
            ]
            raw = "\n".join(text_blocks).strip()
            if raw.startswith("```"):
                raw = raw.split("```", 2)[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip().rstrip("`").strip()
            parsed = _json.loads(raw)
            if isinstance(parsed, list) and all(
                isinstance(s, dict) and "suggestion" in s for s in parsed
            ):
                suggestions = parsed
    except Exception as e:
        logger.warning("Claude sales suggestions failed, using deterministic fallback: %s", e)

    if suggestions is None:
        # Deterministic data-driven fallback — every suggestion references real metrics
        suggestions = []
        if conversion_rate < 5:
            suggestions.append({
                "category": "Conversion Optimization",
                "suggestion": f"Free→paid conversion is {conversion_rate:.1f}% (below the 5% benchmark). Add in-app upgrade prompts after 3 successful ARIA interventions.",
                "priority": "high",
                "estimated_impact": "Lift conversion toward 5-7% baseline",
            })
        if growth_pct < 0:
            suggestions.append({
                "category": "Top-of-Funnel",
                "suggestion": f"Signups dropped {abs(growth_pct):.0f}% MoM (prior {prev_signups} → now {recent_signups}). Audit top traffic channel and restart highest-performing campaign.",
                "priority": "high",
                "estimated_impact": "Return signup growth to neutral within 30 days",
            })
        if top_lost_reasons:
            top_reason, top_count = top_lost_reasons[0]
            suggestions.append({
                "category": "Win-Loss",
                "suggestion": f"Top lost reason is '{top_reason}' ({top_count} lost deals in 90 days). Ship a dedicated one-pager addressing this objection and put it in the sales sequence.",
                "priority": "high",
                "estimated_impact": f"Recover ~{int(top_count * 0.3)} deals/quarter if objection is addressed",
            })
        if tier_mix.get("plus", 0) > tier_mix.get("complete", 0) * 3:
            suggestions.append({
                "category": "Tier Upsell",
                "suggestion": f"Plus subscribers outnumber Complete {tier_mix.get('plus', 0)} to {tier_mix.get('complete', 0)}. Build a Complete-tier nudge for users with 10+ active agreement sections.",
                "priority": "medium",
                "estimated_impact": f"~${(tier_mix.get('plus', 0) * 0.15) * (34.99 - 17.99):.0f}/mo additional MRR",
            })
        pro_count = sum(tier_mix.get(t, 0) for t in ("professional_starter", "solo", "small_firm", "mid_size"))
        if pro_count < paid_users * 0.1:
            suggestions.append({
                "category": "Professional Market",
                "suggestion": f"Only {pro_count} professional-tier subscribers out of {paid_users} paying users (<10%). Run a targeted LinkedIn campaign at family law attorneys.",
                "priority": "high",
                "estimated_impact": "Professionals pay $49-$799/mo vs $17-$35 consumer — highest ARPU lever",
            })
        if not suggestions:
            suggestions.append({
                "category": "Retention",
                "suggestion": f"Metrics healthy (conversion {conversion_rate:.1f}%, growth {growth_pct:+.0f}%). Focus next on activation: measure day-1 feature usage for new subscribers.",
                "priority": "medium",
                "estimated_impact": "Baseline activation cohort analysis for future experiments",
            })

    return {
        "suggestions": suggestions,
        "data_summary": {
            "total_users": total_users,
            "paid_users": paid_users,
            "conversion_rate": round(conversion_rate, 2),
            "current_mrr": round(current_mrr, 2),
            "growth_pct": round(growth_pct, 1),
            "tier_mix": tier_mix,
            "top_lost_reasons": [
                {"reason": r, "count": c} for r, c in top_lost_reasons
            ],
        },
    }
