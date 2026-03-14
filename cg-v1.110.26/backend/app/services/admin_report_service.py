"""
Admin report generation service.

Generates data reports for the superadmin portal.
Reports are stored as JSON in AuditLog.extra_metadata.
"""

import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserProfile
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


async def generate_report(
    db: AsyncSession,
    report_type: str,
    date_range_days: int,
) -> dict[str, Any]:
    """
    Generate a report based on type and date range.

    Returns a dict with:
      - columns: list of column headers
      - rows: list of row dicts
      - summary: dict of aggregate metrics
      - generated_at: ISO timestamp
      - row_count: number of rows
    """
    generators = {
        "user_export": _generate_user_export,
        "billing_summary": _generate_billing_summary,
        "engagement": _generate_engagement_report,
        "compliance": _generate_compliance_report,
        "growth": _generate_growth_report,
    }

    generator = generators.get(report_type)
    if not generator:
        raise ValueError(f"Unknown report type: {report_type}")

    data = await generator(db, date_range_days)
    data["generated_at"] = datetime.utcnow().isoformat()
    data["report_type"] = report_type
    data["date_range_days"] = date_range_days
    return data


async def _generate_user_export(db: AsyncSession, days: int) -> dict:
    """Full user list with subscription data and activity."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(User, UserProfile)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .where(User.is_deleted == False)
        .order_by(User.created_at.desc())
    )

    rows = []
    for user, profile in result.all():
        rows.append({
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "last_active": user.last_active.isoformat() if user.last_active else None,
            "subscription_tier": profile.subscription_tier if profile else None,
            "subscription_status": profile.subscription_status if profile else None,
            "stripe_customer_id": profile.stripe_customer_id if profile else None,
            "has_stripe": bool(profile and profile.stripe_customer_id),
        })

    # Summary
    total = len(rows)
    active = sum(1 for r in rows if r["is_active"])
    with_stripe = sum(1 for r in rows if r["has_stripe"])
    recently_active = sum(
        1 for r in rows
        if r["last_active"] and r["last_active"] > cutoff.isoformat()
    )

    return {
        "columns": [
            "id", "email", "first_name", "last_name", "is_active",
            "is_admin", "created_at", "last_login", "last_active",
            "subscription_tier", "subscription_status", "stripe_customer_id",
        ],
        "rows": rows,
        "row_count": total,
        "summary": {
            "total_users": total,
            "active_users": active,
            "inactive_users": total - active,
            "with_stripe_customer": with_stripe,
            "without_stripe_customer": total - with_stripe,
            "recently_active": recently_active,
        },
    }


async def _generate_billing_summary(db: AsyncSession, days: int) -> dict:
    """Revenue and subscription metrics."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Tier breakdown
    tier_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            UserProfile.subscription_status,
            func.count(UserProfile.id),
        )
        .group_by(UserProfile.subscription_tier, UserProfile.subscription_status)
    )

    rows = []
    tier_totals: dict[str, dict] = {}
    for tier, status, count in tier_result:
        tier_name = tier or "unknown"
        rows.append({
            "tier": tier_name,
            "status": status or "none",
            "count": count,
        })
        if tier_name not in tier_totals:
            tier_totals[tier_name] = {"total": 0, "active": 0, "trial": 0, "cancelled": 0, "past_due": 0}
        tier_totals[tier_name]["total"] += count
        tier_totals[tier_name][status or "none"] = tier_totals[tier_name].get(status or "none", 0) + count

    # New subscriptions in period
    new_subs = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.created_at >= cutoff,
            UserProfile.subscription_status == "active",
        )
    )

    # Cancelled in period
    cancelled = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_status == "cancelled",
            UserProfile.updated_at >= cutoff,
        )
    )

    total_profiles = await db.scalar(select(func.count(UserProfile.id)))

    return {
        "columns": ["tier", "status", "count"],
        "rows": rows,
        "row_count": len(rows),
        "summary": {
            "tier_totals": tier_totals,
            "new_subscriptions": new_subs,
            "cancelled": cancelled,
            "total_profiles": total_profiles,
        },
    }


async def _generate_engagement_report(db: AsyncSession, days: int) -> dict:
    """Platform usage and ARIA metrics."""
    from app.models.message import Message, MessageFlag
    from app.models.family_file import FamilyFile

    cutoff = datetime.utcnow() - timedelta(days=days)

    # Daily message counts
    msg_result = await db.execute(
        select(
            func.date(Message.sent_at).label("date"),
            func.count(Message.id).label("count"),
        )
        .where(Message.sent_at >= cutoff)
        .group_by(func.date(Message.sent_at))
        .order_by(func.date(Message.sent_at))
    )

    rows = []
    total_messages = 0
    for row in msg_result:
        count = row.count
        total_messages += count
        rows.append({
            "date": str(row.date),
            "messages": count,
        })

    # ARIA stats
    total_flags = await db.scalar(
        select(func.count(MessageFlag.id)).where(MessageFlag.created_at >= cutoff)
    ) or 0
    accepted = await db.scalar(
        select(func.count(MessageFlag.id)).where(
            MessageFlag.created_at >= cutoff,
            MessageFlag.user_action.in_(["accepted", "modified"]),
        )
    ) or 0

    # Family files created
    new_files = await db.scalar(
        select(func.count(FamilyFile.id)).where(FamilyFile.created_at >= cutoff)
    ) or 0

    return {
        "columns": ["date", "messages"],
        "rows": rows,
        "row_count": len(rows),
        "summary": {
            "total_messages": total_messages,
            "avg_messages_per_day": round(total_messages / max(days, 1), 1),
            "total_aria_interventions": total_flags,
            "aria_accepted": accepted,
            "aria_acceptance_rate": round((accepted / total_flags * 100) if total_flags > 0 else 0, 1),
            "new_family_files": new_files,
        },
    }


async def _generate_compliance_report(db: AsyncSession, days: int) -> dict:
    """Audit trail summary grouped by action type."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(
            AuditLog.action,
            AuditLog.status,
            func.count(AuditLog.id).label("count"),
        )
        .where(AuditLog.created_at >= cutoff)
        .group_by(AuditLog.action, AuditLog.status)
        .order_by(func.count(AuditLog.id).desc())
    )

    rows = []
    for row in result:
        rows.append({
            "action": row.action,
            "status": row.status,
            "count": row.count,
        })

    # Error and suspicious counts
    error_count = sum(r["count"] for r in rows if r["status"] == "error")
    suspicious = await db.scalar(
        select(func.count(AuditLog.id)).where(
            AuditLog.created_at >= cutoff,
            AuditLog.is_suspicious == True,
        )
    ) or 0

    total_events = sum(r["count"] for r in rows)

    return {
        "columns": ["action", "status", "count"],
        "rows": rows,
        "row_count": len(rows),
        "summary": {
            "total_events": total_events,
            "error_count": error_count,
            "suspicious_count": suspicious,
            "unique_actions": len(set(r["action"] for r in rows)),
        },
    }


async def _generate_growth_report(db: AsyncSession, days: int) -> dict:
    """User acquisition and retention analysis."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Daily registrations
    result = await db.execute(
        select(
            func.date(User.created_at).label("date"),
            func.count(User.id).label("count"),
        )
        .where(User.created_at >= cutoff)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    )

    rows = []
    total = 0
    for row in result:
        total += row.count
        rows.append({
            "date": str(row.date),
            "new_users": row.count,
        })

    # Retention: of users created in this period, how many are still active
    retained = await db.scalar(
        select(func.count(User.id)).where(
            User.created_at >= cutoff,
            User.is_active == True,
            User.last_active >= cutoff,
        )
    ) or 0

    return {
        "columns": ["date", "new_users"],
        "rows": rows,
        "row_count": len(rows),
        "summary": {
            "total_new_users": total,
            "avg_per_day": round(total / max(days, 1), 1),
            "retained_users": retained,
            "retention_rate": round((retained / total * 100) if total > 0 else 0, 1),
        },
    }


def report_to_csv(report_data: dict) -> str:
    """Convert report data to CSV string."""
    rows = report_data.get("rows", [])
    if not rows:
        return ""

    output = io.StringIO()
    columns = report_data.get("columns", list(rows[0].keys()))
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

    return output.getvalue()
