"""Alert metric registry.

Each entry maps a string metric path (e.g. "platform.error_rate_5m") to a
resolver async function that returns a float. AlertRule rows reference
these paths; the evaluator looks up the resolver at eval time.

All resolvers take a single AsyncSession argument and return a float —
or raise. Exceptions are caught in the evaluator and logged as an error
alert on that rule.

Adding a new metric: define an async function, register it in METRIC_REGISTRY,
and reference its key in a new AlertRule row.
"""

import logging
from datetime import datetime, timedelta
from typing import Awaitable, Callable, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserProfile
from app.models.message import Message, MessageFlag
from app.models.audit import AuditLog
from app.models.custody_exchange import CustodyExchangeInstance
from app.models.lead import Lead

logger = logging.getLogger(__name__)

MetricResolver = Callable[[AsyncSession], Awaitable[float]]


# ─────────────────────────────────────────────────────────────────────────
# Individual metric resolvers
# ─────────────────────────────────────────────────────────────────────────

async def _users_signup_rate_24h(db: AsyncSession) -> float:
    """New signups in the last 24 hours."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    q = await db.execute(
        select(func.count(User.id)).where(User.created_at >= cutoff)
    )
    return float(q.scalar() or 0)


async def _users_active_count(db: AsyncSession) -> float:
    """Total active users (is_active=true)."""
    q = await db.execute(select(func.count(User.id)).where(User.is_active.is_(True)))
    return float(q.scalar() or 0)


async def _billing_mrr(db: AsyncSession) -> float:
    """Current MRR from subscription tiers × published prices."""
    from app.api.v1.endpoints.admin_sales import _TIER_PRICES

    q = await db.execute(
        select(UserProfile.subscription_tier, func.count(UserProfile.id))
        .where(UserProfile.subscription_tier.isnot(None))
        .group_by(UserProfile.subscription_tier)
    )
    total = 0.0
    for tier, count in q:
        total += _TIER_PRICES.get(tier, 0.0) * int(count or 0)
    return total


async def _billing_paying_subscribers(db: AsyncSession) -> float:
    """Count of paying (non-free) subscriptions."""
    q = await db.execute(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_tier.notin_(["web_starter", "free", "", "essential"]),
            UserProfile.subscription_tier.isnot(None),
        )
    )
    return float(q.scalar() or 0)


async def _platform_errors_24h(db: AsyncSession) -> float:
    """Error-level audit log rows in last 24h. Indicator of overall system health."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    q = await db.execute(
        select(func.count(AuditLog.id))
        .where(AuditLog.created_at >= cutoff)
        .where(AuditLog.status.in_(["failure", "error"]))
    )
    return float(q.scalar() or 0)


async def _aria_flag_rate_24h(db: AsyncSession) -> float:
    """% of messages flagged by ARIA in the last 24h (0-100).

    Matches ADR-001 contract — rate as percentage, not fraction.
    """
    cutoff = datetime.utcnow() - timedelta(hours=24)
    total_q = await db.execute(
        select(func.count(Message.id)).where(Message.created_at >= cutoff)
    )
    total = total_q.scalar() or 0
    if not total:
        return 0.0
    flagged_q = await db.execute(
        select(func.count(MessageFlag.id)).where(MessageFlag.created_at >= cutoff)
    )
    flagged = flagged_q.scalar() or 0
    return round((flagged / total) * 100, 2)


async def _custody_exchanges_disputed_24h(db: AsyncSession) -> float:
    """Count of custody exchanges transitioned to `disputed` in last 24h."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    try:
        q = await db.execute(
            select(func.count(CustodyExchangeInstance.id))
            .where(CustodyExchangeInstance.status == "disputed")
            .where(CustodyExchangeInstance.updated_at >= cutoff)
        )
        return float(q.scalar() or 0)
    except Exception as e:
        logger.warning("custody disputed metric failed: %s", e)
        return 0.0


async def _leads_converted_24h(db: AsyncSession) -> float:
    """Leads that converted to a user account in the last 24h."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    q = await db.execute(
        select(func.count(Lead.id))
        .where(Lead.converted_at.isnot(None))
        .where(Lead.converted_at >= cutoff)
    )
    return float(q.scalar() or 0)


async def _leads_lost_24h(db: AsyncSession) -> float:
    """Leads marked closed_lost in last 24h."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    q = await db.execute(
        select(func.count(Lead.id))
        .where(Lead.stage == "closed_lost")
        .where(Lead.closed_at.isnot(None))
        .where(Lead.closed_at >= cutoff)
    )
    return float(q.scalar() or 0)


# ─────────────────────────────────────────────────────────────────────────
# Registry
# ─────────────────────────────────────────────────────────────────────────

# Structure: {metric_path: (resolver, description, units)}
METRIC_REGISTRY: dict[str, tuple[MetricResolver, str, str]] = {
    # Platform / ops
    "platform.errors_24h": (
        _platform_errors_24h,
        "Audit log rows with status=failure|error in last 24h",
        "count",
    ),
    # Users / growth
    "users.signup_rate_24h": (
        _users_signup_rate_24h,
        "New user signups in the last 24 hours",
        "count",
    ),
    "users.active_count": (
        _users_active_count,
        "Total active user accounts",
        "count",
    ),
    # Billing / revenue
    "billing.mrr": (
        _billing_mrr,
        "Current monthly recurring revenue (sum of subscription tiers × prices)",
        "usd",
    ),
    "billing.paying_subscribers": (
        _billing_paying_subscribers,
        "Count of users on paid tiers",
        "count",
    ),
    # ARIA / communication
    "aria.flag_rate_24h": (
        _aria_flag_rate_24h,
        "% of messages flagged by ARIA in last 24h (0-100)",
        "percent",
    ),
    # Custody
    "custody.exchanges_disputed_24h": (
        _custody_exchanges_disputed_24h,
        "Exchange instances transitioned to `disputed` in last 24h",
        "count",
    ),
    # Leads / sales
    "leads.converted_24h": (
        _leads_converted_24h,
        "Leads that converted to a registered user in last 24h",
        "count",
    ),
    "leads.lost_24h": (
        _leads_lost_24h,
        "Leads marked closed_lost in last 24h",
        "count",
    ),
}


def list_available_metrics() -> list[dict]:
    """Introspection for the UI — rule-creation form shows this list."""
    return [
        {"path": path, "description": desc, "units": units}
        for path, (_, desc, units) in sorted(METRIC_REGISTRY.items())
    ]


async def resolve_metric(db: AsyncSession, metric_path: str) -> Optional[float]:
    """Resolve a metric path to a numeric value. None if path not registered."""
    entry = METRIC_REGISTRY.get(metric_path)
    if not entry:
        return None
    resolver, _, _ = entry
    try:
        return float(await resolver(db))
    except Exception as e:
        logger.error("metric %s resolver failed: %s", metric_path, e)
        return None
