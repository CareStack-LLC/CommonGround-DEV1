"""Weekly platform report generation service."""

import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings

logger = logging.getLogger(__name__)
settings = Settings()


async def generate_weekly_report(db: AsyncSession) -> dict:
    """
    Generate a comprehensive weekly platform report.

    Aggregates: users, revenue, engagement, feature adoption, bug count.
    """
    from app.models.user import User, UserProfile
    from app.models.family_file import FamilyFile
    from app.models.message import Message, MessageFlag
    from app.models.professional import ProfessionalProfile

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    thirty_days_ago = now - timedelta(days=30)

    # --- Users ---
    total_users = await db.scalar(
        select(func.count(User.id)).where(User.is_deleted == False)
    ) or 0
    new_users_this_week = await db.scalar(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    ) or 0
    new_users_last_week = await db.scalar(
        select(func.count(User.id)).where(
            User.created_at >= two_weeks_ago,
            User.created_at < week_ago,
        )
    ) or 0
    active_users_30d = await db.scalar(
        select(func.count(User.id)).where(
            User.is_deleted == False,
            User.last_active >= thirty_days_ago,
        )
    ) or 0

    # --- Revenue ---
    tier_prices = {
        "web_starter": 0,
        "plus": 17.99,
        "complete": 34.99,
        "professional_starter": 49.99,
        "solo": 99.00,
        "small_firm": 299.00,
        "mid_size": 799.00,
    }
    tier_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            func.count(UserProfile.id),
        ).group_by(UserProfile.subscription_tier)
    )
    tier_counts = {}
    for tier, count in tier_result:
        tier_counts[tier or "unknown"] = count

    estimated_mrr = sum(
        tier_prices.get(tier, 0) * count
        for tier, count in tier_counts.items()
    )

    paying_users = sum(
        count
        for tier, count in tier_counts.items()
        if tier in tier_prices and tier_prices.get(tier, 0) > 0
    )

    # --- Engagement ---
    messages_this_week = await db.scalar(
        select(func.count(Message.id)).where(Message.sent_at >= week_ago)
    ) or 0
    messages_last_week = await db.scalar(
        select(func.count(Message.id)).where(
            Message.sent_at >= two_weeks_ago,
            Message.sent_at < week_ago,
        )
    ) or 0

    aria_flags_this_week = await db.scalar(
        select(func.count(MessageFlag.id)).where(
            MessageFlag.created_at >= week_ago
        )
    ) or 0

    # --- Feature Adoption ---
    total_family_files = await db.scalar(
        select(func.count(FamilyFile.id)).where(FamilyFile.status == "active")
    ) or 0
    total_professionals = await db.scalar(
        select(func.count(ProfessionalProfile.id))
    ) or 0

    # --- Bugs from Sentry ---
    sentry_bug_count = await _fetch_sentry_bug_count()

    # --- Trends ---
    user_growth_pct = _calc_trend(new_users_this_week, new_users_last_week)
    message_growth_pct = _calc_trend(messages_this_week, messages_last_week)

    return {
        "generated_at": now.isoformat(),
        "period": {
            "start": week_ago.isoformat(),
            "end": now.isoformat(),
        },
        "users": {
            "total": total_users,
            "new_this_week": new_users_this_week,
            "new_last_week": new_users_last_week,
            "growth_pct": user_growth_pct,
            "active_30d": active_users_30d,
        },
        "revenue": {
            "estimated_mrr": round(estimated_mrr, 2),
            "paying_users": paying_users,
            "tier_breakdown": tier_counts,
        },
        "engagement": {
            "messages_this_week": messages_this_week,
            "messages_last_week": messages_last_week,
            "message_growth_pct": message_growth_pct,
            "aria_flags_this_week": aria_flags_this_week,
        },
        "platform": {
            "active_family_files": total_family_files,
            "total_professionals": total_professionals,
        },
        "bugs": {
            "open_sentry_issues": sentry_bug_count,
        },
    }


async def _fetch_sentry_bug_count() -> int:
    """Fetch open issue count from Sentry API."""
    if not settings.SENTRY_AUTH_TOKEN:
        return -1  # Not configured
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://sentry.io/api/0/projects/{settings.SENTRY_ORG_SLUG}/{settings.SENTRY_PROJECT_SLUG}/issues/",
                headers={
                    "Authorization": f"Bearer {settings.SENTRY_AUTH_TOKEN}"
                },
                params={"query": "is:unresolved", "limit": 1},
                timeout=10.0,
            )
            if resp.status_code == 200:
                # The X-Hits header contains total count
                return int(resp.headers.get("X-Hits", len(resp.json())))
    except Exception as e:
        logger.warning(f"Failed to fetch Sentry bug count: {e}")
    return -1


def _calc_trend(current: int, previous: int) -> Optional[float]:
    """Calculate percentage change."""
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


async def send_weekly_report_email(report_data: dict) -> bool:
    """Send weekly report via SendGrid email."""
    try:
        from app.services.email import email_service

        # Render as simple HTML summary for email
        html = _render_report_html(report_data)

        result = await email_service._send_email(
            to_email=settings.FROM_EMAIL.replace("noreply@", "tj@"),
            subject=f"CommonGround Weekly Report - {report_data['period']['end'][:10]}",
            html_content=html,
        )
        return result
    except Exception as e:
        logger.error(f"Failed to send weekly report email: {e}")
        return False


def _render_report_html(data: dict) -> str:
    """Render weekly report as HTML email."""
    users = data["users"]
    rev = data["revenue"]
    eng = data["engagement"]
    plat = data["platform"]
    bugs = data["bugs"]

    growth_arrow = (
        "↑"
        if (users.get("growth_pct") or 0) > 0
        else "↓"
        if (users.get("growth_pct") or 0) < 0
        else "→"
    )
    msg_arrow = (
        "↑"
        if (eng.get("message_growth_pct") or 0) > 0
        else "↓"
        if (eng.get("message_growth_pct") or 0) < 0
        else "→"
    )

    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1E3A4A; font-size: 24px; margin: 0;">CommonGround Weekly Report</h1>
            <p style="color: #666; font-size: 14px;">{data['period']['start'][:10]} — {data['period']['end'][:10]}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
                <td style="padding: 16px; background: #E8F4F8; border-radius: 12px; text-align: center; width: 50%;">
                    <div style="font-size: 28px; font-weight: bold; color: #3DAA8A;">{users['total']}</div>
                    <div style="font-size: 12px; color: #666;">Total Users</div>
                </td>
                <td style="width: 12px;"></td>
                <td style="padding: 16px; background: #E8F4F8; border-radius: 12px; text-align: center; width: 50%;">
                    <div style="font-size: 28px; font-weight: bold; color: #3DAA8A;">${rev['estimated_mrr']}</div>
                    <div style="font-size: 12px; color: #666;">Estimated MRR</div>
                </td>
            </tr>
        </table>

        <h2 style="color: #1E3A4A; font-size: 16px; border-bottom: 2px solid #3DAA8A; padding-bottom: 8px;">Users</h2>
        <ul style="color: #333; line-height: 1.8;">
            <li><strong>{users['new_this_week']}</strong> new users this week {growth_arrow} {users.get('growth_pct', 'N/A')}% vs last week</li>
            <li><strong>{users['active_30d']}</strong> active in last 30 days</li>
            <li><strong>{rev['paying_users']}</strong> paying subscribers</li>
        </ul>

        <h2 style="color: #1E3A4A; font-size: 16px; border-bottom: 2px solid #3DAA8A; padding-bottom: 8px;">Engagement</h2>
        <ul style="color: #333; line-height: 1.8;">
            <li><strong>{eng['messages_this_week']}</strong> messages sent {msg_arrow} {eng.get('message_growth_pct', 'N/A')}% vs last week</li>
            <li><strong>{eng['aria_flags_this_week']}</strong> ARIA interventions</li>
        </ul>

        <h2 style="color: #1E3A4A; font-size: 16px; border-bottom: 2px solid #3DAA8A; padding-bottom: 8px;">Platform</h2>
        <ul style="color: #333; line-height: 1.8;">
            <li><strong>{plat['active_family_files']}</strong> active family files</li>
            <li><strong>{plat['total_professionals']}</strong> professionals registered</li>
            <li><strong>{bugs['open_sentry_issues']}</strong> open Sentry issues</li>
        </ul>

        <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 12px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">Generated by CommonGround SuperAdmin</p>
        </div>
    </div>
    """
