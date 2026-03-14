"""
SuperAdmin Portal API - Platform administration endpoints.

MVP Modules (from GTM SuperAdmin Portal Spec):
01 - Command Dashboard (user counts, MRR, active cases)
02 - User Management (search, view, status, activity)
03 - Billing Overview (Stripe transactions, subscription metrics, trends)
04 - Admin Audit Log
05 - Platform Statistics & Growth
06 - Report Requests (admin-initiated report processing)
07 - Platform Health & Recent Activity

All endpoints require is_admin=True on the authenticated user.
All actions are logged to the audit_logs table.
"""

import io
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, or_, and_, case as sql_case, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User, UserProfile
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Shared tier pricing helper
# =============================================================================

# Correct prices matching actual Stripe plans
_DEFAULT_TIER_PRICES = {
    "web_starter": 0, "essential": 0, "starter": 0,
    "plus": 17.99, "complete": 34.99, "family_plus": 25.00,
    "premium": 49.99,
    "solo": 99.00, "small_firm": 299.00, "mid_size": 799.00,
}


async def _get_tier_prices(db: AsyncSession) -> dict[str, float]:
    """Get tier prices, falling back to defaults."""
    try:
        from app.models.subscription import SubscriptionPlan
        result = await db.execute(select(SubscriptionPlan))
        plans = result.scalars().all()
        if plans:
            prices = {}
            for plan in plans:
                code = plan.plan_code if hasattr(plan, "plan_code") else (plan.name or "").lower().replace(" ", "_")
                price = float(plan.price_monthly) if hasattr(plan, "price_monthly") and plan.price_monthly else 0
                prices[code] = price
            return {**_DEFAULT_TIER_PRICES, **prices}
    except Exception:
        pass
    return _DEFAULT_TIER_PRICES.copy()


# =============================================================================
# Helpers
# =============================================================================

async def _log_admin_action(
    db: AsyncSession,
    admin_user: User,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
) -> None:
    """Log an admin action for audit trail."""
    log = AuditLog(
        user_id=str(admin_user.id),
        user_email=admin_user.email,
        action=f"admin:{action}",
        resource_type=target_type,
        resource_id=target_id,
        method="GET",
        status="success",
        description=details,
    )
    db.add(log)


# =============================================================================
# MODULE 01: Command Dashboard (Enhanced)
# =============================================================================

@router.get(
    "/dashboard",
    summary="SuperAdmin command dashboard",
)
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Platform-wide dashboard with key metrics.

    Returns user counts, active cases, MRR estimates,
    and recent activity summary.
    """
    from app.models.family_file import FamilyFile
    from app.models.professional import ProfessionalProfile

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    yesterday = now - timedelta(days=1)

    # User counts
    total_users = await db.scalar(
        select(func.count(User.id)).where(User.is_deleted == False)
    )
    active_users_30d = await db.scalar(
        select(func.count(User.id)).where(
            User.is_deleted == False,
            User.last_active >= thirty_days_ago,
        )
    )
    new_users_7d = await db.scalar(
        select(func.count(User.id)).where(
            User.created_at >= seven_days_ago,
        )
    )
    new_users_24h = await db.scalar(
        select(func.count(User.id)).where(
            User.created_at >= yesterday,
        )
    )

    # Family file counts
    total_family_files = await db.scalar(
        select(func.count(FamilyFile.id)).where(FamilyFile.status == "active")
    )

    # Professional counts
    total_professionals = await db.scalar(
        select(func.count(ProfessionalProfile.id))
    )

    # Subscription tier breakdown
    tier_counts = {}
    tier_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            func.count(UserProfile.id),
        )
        .group_by(UserProfile.subscription_tier)
    )
    for tier, count in tier_result:
        tier_counts[tier or "unknown"] = count

    # MRR estimate using correct tier prices
    tier_prices = await _get_tier_prices(db)
    estimated_mrr = sum(
        tier_prices.get(tier, 0) * count
        for tier, count in tier_counts.items()
    )

    # Messages sent in last 7 days
    from app.models.message import Message
    messages_7d = await db.scalar(
        select(func.count(Message.id)).where(
            Message.sent_at >= seven_days_ago,
        )
    )

    # ARIA interventions in last 7 days
    from app.models.message import MessageFlag
    aria_flags_7d = await db.scalar(
        select(func.count(MessageFlag.id)).where(
            MessageFlag.created_at >= seven_days_ago,
        )
    )

    # Active users today (last 24 hours)
    active_today = await db.scalar(
        select(func.count(User.id)).where(
            User.last_active >= yesterday,
            User.is_deleted == False,
        )
    )

    # Past-due count
    past_due_count = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_status == "past_due"
        )
    )

    # Recent signups (last 10 for feed)
    recent_signups_result = await db.execute(
        select(User.id, User.first_name, User.last_name, User.created_at)
        .where(User.is_deleted == False)
        .order_by(User.created_at.desc())
        .limit(10)
    )
    recent_signups = [
        {
            "id": str(row.id),
            "name": f"{row.first_name} {row.last_name}",
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in recent_signups_result
    ]

    # Recent admin actions (last 10 for feed)
    recent_actions_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.action.like("admin:%"))
        .order_by(AuditLog.created_at.desc())
        .limit(10)
    )
    recent_actions = [
        {
            "id": str(log.id),
            "action": log.action,
            "user_email": log.user_email,
            "description": log.description,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in recent_actions_result.scalars()
    ]

    await _log_admin_action(db, admin_user, "view_dashboard", "platform")
    await db.commit()

    return {
        "users": {
            "total": total_users,
            "active_30d": active_users_30d,
            "active_today": active_today,
            "new_7d": new_users_7d,
            "new_24h": new_users_24h,
        },
        "family_files": {
            "active": total_family_files,
        },
        "professionals": {
            "total": total_professionals,
        },
        "subscriptions": {
            "tier_breakdown": tier_counts,
            "estimated_mrr": round(estimated_mrr, 2),
            "past_due_count": past_due_count,
        },
        "engagement": {
            "messages_7d": messages_7d,
            "aria_interventions_7d": aria_flags_7d,
        },
        "recent_signups": recent_signups,
        "recent_admin_actions": recent_actions,
        "generated_at": now.isoformat(),
    }


# =============================================================================
# MODULE 02: User Management (Enhanced)
# =============================================================================

@router.get(
    "/users",
    summary="Search and list users",
)
async def search_users(
    q: Optional[str] = Query(None, description="Search by name or email"),
    tier: Optional[str] = Query(None, description="Filter by subscription tier"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Search and list users with filtering.

    Returns user metadata (no PII beyond what's needed for admin operations).
    """
    query = (
        select(User)
        .options(selectinload(User.profile))
        .where(User.is_deleted == False)
    )

    # Search by name or email
    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                User.email.ilike(search),
                User.first_name.ilike(search),
                User.last_name.ilike(search),
            )
        )

    # Filter by tier
    if tier:
        query = query.join(UserProfile).where(UserProfile.subscription_tier == tier)

    # Filter by active status
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply sort
    sort_col = getattr(User, sort_by, User.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Apply pagination
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    await _log_admin_action(
        db, admin_user, "search_users", "user",
        details=f"query={q}, tier={tier}, results={total}",
    )
    await db.commit()

    return {
        "users": [
            {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "last_active": user.last_active.isoformat() if user.last_active else None,
                "subscription_tier": user.profile.subscription_tier if user.profile else None,
                "subscription_status": user.profile.subscription_status if user.profile else None,
            }
            for user in users
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get(
    "/users/{user_id}",
    summary="Get user details",
)
async def get_user_detail(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get detailed user information for admin review."""
    from app.models.family_file import FamilyFile
    from app.models.message import Message, MessageFlag

    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.profile))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Count their family files
    ff_count = await db.scalar(
        select(func.count(FamilyFile.id)).where(
            or_(
                FamilyFile.parent_a_id == user_id,
                FamilyFile.parent_b_id == user_id,
            )
        )
    )

    # Count messages sent
    messages_sent = await db.scalar(
        select(func.count(Message.id)).where(Message.sender_id == user_id)
    )

    # Count ARIA interventions on their messages
    aria_interventions = await db.scalar(
        select(func.count(MessageFlag.id))
        .join(Message, MessageFlag.message_id == Message.id)
        .where(Message.sender_id == user_id)
    )

    # Recent audit trail for this user (last 20 actions)
    audit_result = await db.execute(
        select(AuditLog)
        .where(
            or_(
                AuditLog.user_id == user_id,
                AuditLog.resource_id == user_id,
            )
        )
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    recent_activity = [
        {
            "id": str(log.id),
            "action": log.action,
            "description": log.description,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "status": log.status,
        }
        for log in audit_result.scalars()
    ]

    # Get family files for this user
    ff_result = await db.execute(
        select(FamilyFile.id, FamilyFile.family_file_number, FamilyFile.title, FamilyFile.status, FamilyFile.created_at)
        .where(
            or_(
                FamilyFile.parent_a_id == user_id,
                FamilyFile.parent_b_id == user_id,
            )
        )
        .order_by(FamilyFile.created_at.desc())
        .limit(10)
    )
    family_files = [
        {
            "id": str(row.id),
            "file_number": row.family_file_number,
            "title": row.title,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in ff_result
    ]

    # Subscription history from profile
    profile_data = None
    if user.profile:
        profile_data = {
            "subscription_tier": user.profile.subscription_tier,
            "subscription_status": user.profile.subscription_status,
            "subscription_ends_at": user.profile.subscription_ends_at.isoformat() if user.profile.subscription_ends_at else None,
            "subscription_period_start": user.profile.subscription_period_start.isoformat() if getattr(user.profile, 'subscription_period_start', None) else None,
            "subscription_period_end": user.profile.subscription_period_end.isoformat() if getattr(user.profile, 'subscription_period_end', None) else None,
            "stripe_customer_id": user.profile.stripe_customer_id,
            "stripe_subscription_id": getattr(user.profile, 'stripe_subscription_id', None),
            "timezone": user.profile.timezone,
            "state": user.profile.state,
        }

    await _log_admin_action(db, admin_user, "view_user", "user", user_id)
    await db.commit()

    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "admin_role": user.admin_role,
        "mfa_enabled": user.mfa_enabled,
        "email_verified": user.email_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "last_active": user.last_active.isoformat() if user.last_active else None,
        "profile": profile_data,
        "family_file_count": ff_count,
        "stats": {
            "messages_sent": messages_sent,
            "aria_interventions": aria_interventions,
            "family_files": ff_count,
        },
        "family_files": family_files,
        "recent_activity": recent_activity,
    }


@router.patch(
    "/users/{user_id}/status",
    summary="Update user status",
)
async def update_user_status(
    user_id: str,
    is_active: bool,
    reason: str = Query(..., min_length=3, description="Reason for status change"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Activate or deactivate a user account.

    Requires a reason for audit trail purposes.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if str(user.id) == str(admin_user.id):
        raise HTTPException(status_code=400, detail="Cannot modify your own status")

    old_status = user.is_active
    user.is_active = is_active

    await _log_admin_action(
        db, admin_user, "update_user_status", "user", user_id,
        details=f"active: {old_status} -> {is_active}, reason: {reason}",
    )
    await db.commit()

    return {
        "id": str(user.id),
        "is_active": user.is_active,
        "updated_by": str(admin_user.id),
        "reason": reason,
    }


# =============================================================================
# MODULE 03: Billing Overview (Enhanced with Trends)
# =============================================================================

@router.get(
    "/billing/overview",
    summary="Billing and subscription overview",
)
async def get_billing_overview(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Platform billing overview with subscription metrics.

    Shows tier breakdown, revenue estimates, and payment status.
    For detailed Stripe data, use Stripe Dashboard directly.
    """
    # Subscription tier breakdown
    tier_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            UserProfile.subscription_status,
            func.count(UserProfile.id),
        )
        .group_by(UserProfile.subscription_tier, UserProfile.subscription_status)
    )

    breakdown = {}
    for tier, sub_status, count in tier_result:
        tier_name = tier or "unknown"
        if tier_name not in breakdown:
            breakdown[tier_name] = {"total": 0, "statuses": {}}
        breakdown[tier_name]["total"] += count
        breakdown[tier_name]["statuses"][sub_status or "none"] = count

    # Professional subscription breakdown
    from app.models.professional import ProfessionalProfile
    prof_result = await db.execute(
        select(
            ProfessionalProfile.subscription_tier,
            func.count(ProfessionalProfile.id),
        )
        .group_by(ProfessionalProfile.subscription_tier)
    )
    prof_breakdown = {}
    for tier, count in prof_result:
        prof_breakdown[tier or "starter"] = count

    # Past-due count (needs attention)
    past_due_count = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_status == "past_due"
        )
    )

    # Trial users count
    trial_count = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_status == "trial"
        )
    )

    # Cancelled in last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    cancelled_30d = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_status == "cancelled",
            UserProfile.updated_at >= thirty_days_ago,
        )
    )

    # Tier prices from config/DB (correct prices)
    tier_prices = await _get_tier_prices(db)

    # Calculate MRR by tier
    mrr_by_tier = {}
    for tier_name, data in breakdown.items():
        active_count = data["statuses"].get("active", 0)
        price = tier_prices.get(tier_name, 0)
        mrr_by_tier[tier_name] = {
            "count": active_count,
            "price": price,
            "mrr": round(active_count * price, 2),
        }

    total_mrr = sum(t["mrr"] for t in mrr_by_tier.values())

    # Subscription growth: new paid subscriptions last 30 days
    new_paid_30d = await db.scalar(
        select(func.count(UserProfile.id)).where(
            UserProfile.subscription_status == "active",
            UserProfile.subscription_tier.notin_(["essential", "starter", "web_starter", "unknown"]),
            UserProfile.created_at >= thirty_days_ago,
        )
    )

    # --- Live Stripe data (graceful fallback) ---
    stripe_live = None
    try:
        import stripe
        from app.core.config import settings as app_settings
        if app_settings.STRIPE_SECRET_KEY:
            stripe.api_key = app_settings.STRIPE_SECRET_KEY

            # Active subscriptions from Stripe
            subs = stripe.Subscription.list(status="active", limit=100)
            stripe_active_count = len(subs.data)
            stripe_mrr_cents = sum(
                sub.plan.amount * sub.quantity
                for sub in subs.data
                if sub.plan and sub.plan.amount
            )

            # Recent invoices
            invoices = stripe.Invoice.list(limit=20, status="paid")
            recent_payments = [
                {
                    "id": inv.id,
                    "customer": inv.customer,
                    "customer_email": inv.customer_email,
                    "amount": inv.amount_paid / 100.0,
                    "currency": inv.currency,
                    "status": inv.status,
                    "created": datetime.fromtimestamp(inv.created).isoformat(),
                    "description": inv.lines.data[0].description if inv.lines and inv.lines.data else None,
                }
                for inv in invoices.data
            ]

            # Total customers
            customers = stripe.Customer.list(limit=1)
            total_customers = customers.total_count if hasattr(customers, "total_count") else len(customers.data)

            stripe_live = {
                "stripe_available": True,
                "active_subscriptions": stripe_active_count,
                "total_mrr": round(stripe_mrr_cents / 100.0, 2),
                "total_customers": total_customers,
                "recent_payments": recent_payments,
            }
    except Exception as e:
        logger.warning(f"Stripe API unavailable for billing overview: {e}")
        stripe_live = {"stripe_available": False, "error": str(e)}

    await _log_admin_action(db, admin_user, "view_billing", "platform")
    await db.commit()

    return {
        "consumer_subscriptions": breakdown,
        "professional_subscriptions": prof_breakdown,
        "past_due_count": past_due_count,
        "trial_count": trial_count,
        "cancelled_30d": cancelled_30d,
        "new_paid_30d": new_paid_30d,
        "mrr_by_tier": mrr_by_tier,
        "total_mrr": round(total_mrr, 2),
        "stripe_live": stripe_live,
        "note": "MRR calculated from database tier counts. See stripe_live for real-time Stripe data.",
    }


# =============================================================================
# MODULE 04: Admin Audit Log (Enhanced)
# =============================================================================

@router.get(
    "/audit-log",
    summary="View admin audit log",
)
async def get_admin_audit_log(
    action: Optional[str] = Query(None, description="Filter by action prefix"),
    admin_email: Optional[str] = Query(None, description="Filter by admin email"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    View the admin audit log showing all admin actions.

    Filter by action type (e.g., 'admin:view_dashboard', 'admin:update_user_status').
    """
    query = (
        select(AuditLog)
        .where(AuditLog.action.like("admin:%"))
        .order_by(AuditLog.created_at.desc())
    )

    if action:
        query = query.where(AuditLog.action.like(f"admin:{action}%"))

    if admin_email:
        query = query.where(AuditLog.user_email == admin_email)

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    )

    result = await db.execute(query.offset(offset).limit(limit))
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "user_id": log.user_id,
                "user_email": log.user_email,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "description": log.description,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# =============================================================================
# MODULE 05: Platform Statistics (Enhanced)
# =============================================================================

@router.get(
    "/stats/growth",
    summary="User growth statistics",
)
async def get_growth_stats(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    User growth statistics over time.

    Returns daily registration counts for the specified period.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(User.created_at).label("date"),
            func.count(User.id).label("count"),
        )
        .where(User.created_at >= start_date)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    )

    daily_registrations = [
        {"date": str(row.date), "count": row.count}
        for row in result
    ]

    await _log_admin_action(db, admin_user, "view_growth_stats", "platform")
    await db.commit()

    return {
        "period_days": days,
        "daily_registrations": daily_registrations,
        "total_new_users": sum(d["count"] for d in daily_registrations),
    }


@router.get(
    "/stats/engagement",
    summary="Platform engagement metrics",
)
async def get_engagement_stats(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Platform engagement statistics including messages, ARIA usage,
    family files created, and feature adoption.
    """
    from app.models.message import Message, MessageFlag
    from app.models.family_file import FamilyFile
    from app.models.agreement import Agreement

    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    # Messages per day
    msg_result = await db.execute(
        select(
            func.date(Message.sent_at).label("date"),
            func.count(Message.id).label("count"),
        )
        .where(Message.sent_at >= start_date)
        .group_by(func.date(Message.sent_at))
        .order_by(func.date(Message.sent_at))
    )
    daily_messages = [
        {"date": str(row.date), "count": row.count}
        for row in msg_result
    ]

    # ARIA interventions per day
    aria_result = await db.execute(
        select(
            func.date(MessageFlag.created_at).label("date"),
            func.count(MessageFlag.id).label("count"),
        )
        .where(MessageFlag.created_at >= start_date)
        .group_by(func.date(MessageFlag.created_at))
        .order_by(func.date(MessageFlag.created_at))
    )
    daily_aria = [
        {"date": str(row.date), "count": row.count}
        for row in aria_result
    ]

    # ARIA acceptance rate
    total_flags = await db.scalar(
        select(func.count(MessageFlag.id)).where(
            MessageFlag.created_at >= start_date,
        )
    )
    accepted_flags = await db.scalar(
        select(func.count(MessageFlag.id)).where(
            MessageFlag.created_at >= start_date,
            MessageFlag.user_action.in_(["accepted", "modified"]),
        )
    )
    aria_acceptance_rate = round((accepted_flags / total_flags * 100) if total_flags > 0 else 0, 1)

    # New family files
    new_ff = await db.scalar(
        select(func.count(FamilyFile.id)).where(
            FamilyFile.created_at >= start_date,
        )
    )

    # New agreements
    new_agreements = await db.scalar(
        select(func.count(Agreement.id)).where(
            Agreement.created_at >= start_date,
        )
    )

    # Total messages in period
    total_messages = sum(d["count"] for d in daily_messages)
    total_aria_interventions = sum(d["count"] for d in daily_aria)

    await _log_admin_action(db, admin_user, "view_engagement_stats", "platform")
    await db.commit()

    return {
        "period_days": days,
        "daily_messages": daily_messages,
        "daily_aria_interventions": daily_aria,
        "totals": {
            "messages": total_messages,
            "aria_interventions": total_aria_interventions,
            "aria_acceptance_rate": aria_acceptance_rate,
            "new_family_files": new_ff,
            "new_agreements": new_agreements,
        },
    }


# =============================================================================
# MODULE 06: Report Requests
# =============================================================================

@router.get(
    "/reports",
    summary="List admin report requests",
)
async def list_report_requests(
    status_filter: Optional[str] = Query(None, description="Filter: pending, processing, completed, failed"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List admin-requested report jobs with their status."""
    query = (
        select(AuditLog)
        .where(AuditLog.action.like("admin:report_%"))
        .order_by(AuditLog.created_at.desc())
    )

    if status_filter:
        query = query.where(AuditLog.status == status_filter)

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    )

    result = await db.execute(query.offset(offset).limit(limit))
    reports = result.scalars().all()

    return {
        "reports": [
            {
                "id": str(r.id),
                "action": r.action,
                "user_email": r.user_email,
                "description": r.description,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "metadata": r.extra_metadata,
            }
            for r in reports
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "/reports/request",
    summary="Request a new admin report",
)
async def create_report_request(
    report_type: str = Query(..., description="Report type: user_export, billing_summary, engagement, compliance, growth"),
    date_range_days: int = Query(30, ge=1, le=365),
    notes: Optional[str] = Query(None, description="Additional notes"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Create a new report request for async processing.

    Supported report types:
    - user_export: Full user list with subscription data
    - billing_summary: Revenue and subscription trends
    - engagement: Platform usage and ARIA metrics
    - compliance: Audit trail summary
    - growth: Detailed growth analytics
    """
    valid_types = ["user_export", "billing_summary", "engagement", "compliance", "growth"]
    if report_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid report type. Must be one of: {', '.join(valid_types)}",
        )

    now = datetime.utcnow()
    report_log = AuditLog(
        user_id=str(admin_user.id),
        user_email=admin_user.email,
        action=f"admin:report_{report_type}",
        resource_type="report",
        method="POST",
        status="processing",
        description=f"Report request: {report_type} for last {date_range_days} days" + (f" - {notes}" if notes else ""),
        extra_metadata={
            "report_type": report_type,
            "date_range_days": date_range_days,
            "requested_at": now.isoformat(),
            "notes": notes,
        },
    )
    db.add(report_log)
    await db.commit()
    await db.refresh(report_log)

    # Actually generate the report
    try:
        from app.services.admin_report_service import generate_report
        report_data = await generate_report(db, report_type, date_range_days)

        report_log.status = "completed"
        report_log.extra_metadata = {
            **report_log.extra_metadata,
            "report_data": report_data,
            "completed_at": datetime.utcnow().isoformat(),
            "row_count": report_data.get("row_count", 0),
        }
        await db.commit()

        return {
            "id": str(report_log.id),
            "report_type": report_type,
            "status": "completed",
            "requested_at": now.isoformat(),
            "requested_by": admin_user.email,
            "row_count": report_data.get("row_count", 0),
            "message": f"Report '{report_type}' generated successfully.",
        }
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        report_log.status = "failed"
        report_log.extra_metadata = {
            **report_log.extra_metadata,
            "error": str(e),
            "failed_at": datetime.utcnow().isoformat(),
        }
        await db.commit()

        return {
            "id": str(report_log.id),
            "report_type": report_type,
            "status": "failed",
            "requested_at": now.isoformat(),
            "requested_by": admin_user.email,
            "message": f"Report generation failed: {str(e)}",
        }


# =============================================================================
# MODULE 07: Platform Health
# =============================================================================

@router.get(
    "/health",
    summary="Platform health overview",
)
async def get_platform_health(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Platform health indicators including active sessions,
    error rates, and system status.
    """
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    twenty_four_hours_ago = now - timedelta(hours=24)

    # Active sessions (users active in last hour)
    active_sessions = await db.scalar(
        select(func.count(User.id)).where(
            User.last_active >= one_hour_ago,
            User.is_deleted == False,
        )
    )

    # Error count in last 24h
    error_count_24h = await db.scalar(
        select(func.count(AuditLog.id)).where(
            AuditLog.created_at >= twenty_four_hours_ago,
            AuditLog.status == "error",
        )
    )

    # Suspicious activity count
    suspicious_count = await db.scalar(
        select(func.count(AuditLog.id)).where(
            AuditLog.created_at >= twenty_four_hours_ago,
            AuditLog.is_suspicious == True,
        )
    )

    # Database row counts
    total_users = await db.scalar(select(func.count(User.id)))
    total_profiles = await db.scalar(select(func.count(UserProfile.id)))
    total_audit_logs = await db.scalar(select(func.count(AuditLog.id)))

    # Determine overall health status
    health_status = "healthy"
    if error_count_24h > 50 or suspicious_count > 10:
        health_status = "degraded"
    if error_count_24h > 200:
        health_status = "critical"

    return {
        "status": health_status,
        "active_sessions": active_sessions,
        "errors_24h": error_count_24h,
        "suspicious_24h": suspicious_count,
        "database": {
            "users": total_users,
            "profiles": total_profiles,
            "audit_logs": total_audit_logs,
        },
        "checked_at": now.isoformat(),
    }


# =============================================================================
# MODULE 08: Report Download
# =============================================================================

@router.get(
    "/reports/{report_id}/download",
    summary="Download a completed report",
)
async def download_report(
    report_id: str,
    format: str = Query("json", description="Output format: json or csv"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> StreamingResponse:
    """Download a completed admin report as JSON or CSV."""
    result = await db.execute(
        select(AuditLog).where(
            AuditLog.id == report_id,
            AuditLog.action.like("admin:report_%"),
        )
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.status != "completed":
        raise HTTPException(status_code=400, detail=f"Report is not completed (status: {report.status})")

    report_data = (report.extra_metadata or {}).get("report_data")
    if not report_data:
        raise HTTPException(status_code=400, detail="Report data not available")

    await _log_admin_action(db, admin_user, "download_report", "report", report_id)
    await db.commit()

    report_type = (report.extra_metadata or {}).get("report_type", "report")

    if format == "csv":
        from app.services.admin_report_service import report_to_csv
        csv_content = report_to_csv(report_data)
        return StreamingResponse(
            io.StringIO(csv_content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_{report_id[:8]}.csv"},
        )
    else:
        import json
        return StreamingResponse(
            io.StringIO(json.dumps(report_data, indent=2, default=str)),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={report_type}_{report_id[:8]}.json"},
        )


# =============================================================================
# MODULE 09: Stripe Sync
# =============================================================================

@router.post(
    "/stripe/sync-customers",
    summary="Backfill Stripe customers for users without one",
)
async def sync_stripe_customers(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Find all users without a Stripe customer ID and create one.
    Safe to run multiple times (idempotent).
    """
    # Find profiles without Stripe customer ID
    result = await db.execute(
        select(UserProfile, User)
        .join(User, User.id == UserProfile.user_id)
        .where(
            (UserProfile.stripe_customer_id == None) | (UserProfile.stripe_customer_id == ""),
            User.is_deleted == False,
        )
    )
    profiles_to_sync = result.all()

    synced = 0
    failed = 0
    errors = []
    already_synced = 0

    try:
        from app.services.stripe_service import StripeService
        stripe_svc = StripeService()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe service unavailable: {e}")

    for profile, user in profiles_to_sync:
        if profile.stripe_customer_id:
            already_synced += 1
            continue
        try:
            customer = await stripe_svc.create_customer(
                email=user.email,
                name=f"{user.first_name} {user.last_name}".strip(),
                user_id=str(user.id),
                metadata={"platform": "commonground", "synced_by": "admin_backfill"},
            )
            profile.stripe_customer_id = customer["id"]
            synced += 1
        except Exception as e:
            failed += 1
            errors.append({"user_id": str(user.id), "email": user.email, "error": str(e)})

    await _log_admin_action(
        db, admin_user, "sync_stripe_customers", "platform",
        details=f"Synced {synced}, failed {failed}, already had {already_synced}",
    )
    await db.commit()

    return {
        "synced": synced,
        "failed": failed,
        "already_synced": already_synced,
        "total_checked": len(profiles_to_sync),
        "errors": errors[:10],  # Limit error details
    }


@router.post(
    "/stripe/sync-subscriptions",
    summary="Sync subscription status from Stripe",
)
async def sync_stripe_subscriptions(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    For each user with a Stripe customer ID, check their Stripe subscription
    and update the local DB if it differs.
    """
    import stripe
    from app.core.config import settings as app_settings

    if not app_settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    stripe.api_key = app_settings.STRIPE_SECRET_KEY

    result = await db.execute(
        select(UserProfile)
        .where(
            UserProfile.stripe_customer_id != None,
            UserProfile.stripe_customer_id != "",
        )
    )
    profiles = result.scalars().all()

    updated = 0
    checked = 0
    errors = []

    for profile in profiles:
        checked += 1
        try:
            subs = stripe.Subscription.list(
                customer=profile.stripe_customer_id,
                status="all",
                limit=1,
            )
            if subs.data:
                sub = subs.data[0]
                stripe_status = sub.status  # active, trialing, past_due, canceled, etc.

                # Map Stripe status to our status
                status_map = {
                    "active": "active",
                    "trialing": "trial",
                    "past_due": "past_due",
                    "canceled": "cancelled",
                    "incomplete": "incomplete",
                    "unpaid": "past_due",
                }
                new_status = status_map.get(stripe_status, stripe_status)

                # Check if update needed
                if profile.subscription_status != new_status:
                    profile.subscription_status = new_status
                    updated += 1

                # Update subscription period dates if available
                if hasattr(sub, "current_period_start") and sub.current_period_start:
                    profile.subscription_period_start = datetime.fromtimestamp(sub.current_period_start)
                if hasattr(sub, "current_period_end") and sub.current_period_end:
                    profile.subscription_period_end = datetime.fromtimestamp(sub.current_period_end)

                # Update Stripe subscription ID
                if not profile.stripe_subscription_id or profile.stripe_subscription_id != sub.id:
                    profile.stripe_subscription_id = sub.id
        except Exception as e:
            errors.append({"customer_id": profile.stripe_customer_id, "error": str(e)})

    await _log_admin_action(
        db, admin_user, "sync_stripe_subscriptions", "platform",
        details=f"Checked {checked}, updated {updated}",
    )
    await db.commit()

    return {
        "checked": checked,
        "updated": updated,
        "errors": errors[:10],
    }


# =============================================================================
# MODULE 10: Tier Configuration
# =============================================================================

@router.get(
    "/config/tiers",
    summary="Get subscription tier configuration",
)
async def get_tier_config(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Returns all subscription tier names, prices, and metadata.
    Used by frontend to dynamically populate tier dropdowns.
    """
    tier_prices = await _get_tier_prices(db)

    # Get actual usage counts per tier
    tier_result = await db.execute(
        select(
            UserProfile.subscription_tier,
            func.count(UserProfile.id),
        )
        .group_by(UserProfile.subscription_tier)
    )
    tier_counts = {tier or "unknown": count for tier, count in tier_result}

    tiers = []
    for tier_name, price in sorted(tier_prices.items(), key=lambda x: x[1]):
        tiers.append({
            "name": tier_name,
            "price": price,
            "user_count": tier_counts.get(tier_name, 0),
            "is_paid": price > 0,
        })

    return {"tiers": tiers}
