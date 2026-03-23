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
08 - Report Download
09 - Stripe Sync
10 - Tier Configuration
11 - Paid Report Request Pipeline (approve/reject/generate/deliver)
12 - Bulk Monthly Reports

All endpoints require is_admin=True on the authenticated user.
All actions are logged to the audit_logs table.
"""

import io
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, or_, and_, case as sql_case, cast, Date, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User, UserProfile
from app.models.audit import AuditLog

from app.utils.sentry_helpers import capture_error
logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Shared tier pricing helper
# =============================================================================

# Correct prices matching actual Stripe plans (from Stripe test export March 2026)
_DEFAULT_TIER_PRICES = {
    "web_starter": 0,
    "plus": 17.99, "complete": 34.99,
    "professional_starter": 49.00,
    "solo": 99.00, "small_firm": 299.00, "mid_size": 799.00,
}

# Canonical mapping of Stripe Price IDs → tier codes
STRIPE_PRICE_TO_TIER: dict[str, str] = {
    # Consumer tiers
    "price_1TE0bXBJIivbOFX7luV9H7OZ": "web_starter",      # $0/mo
    "price_1TE0bXBJIivbOFX70Ysv656Q": "plus",              # $17.99/mo
    "price_1TE0bYBJIivbOFX7atup1qAE": "plus",              # $199.99/yr
    "price_1TE0bYBJIivbOFX7VqmtQH23": "complete",          # $34.99/mo
    "price_1TE0bZBJIivbOFX77f2QUPc6": "complete",          # $349.99/yr
    # Professional tiers
    "price_1TE0bZBJIivbOFX7kmvDAoqr": "professional_starter",  # $49/mo
    "price_1TE0baBJIivbOFX7dqc7W1Dp": "solo",              # $99/mo
    "price_1TE0baBJIivbOFX7smGjiSyj": "small_firm",        # $299/mo
    "price_1TE0bbBJIivbOFX78k6VF4wC": "mid_size",          # $799/mo
}

STRIPE_PRODUCT_TO_TIER: dict[str, str] = {
    "prod_UCPQdxPYuteQUA": "web_starter",
    "prod_UCPQBUvNRmZ4Cs": "plus",
    "prod_UCPQxC2eRt7g6K": "complete",
    "prod_UCPQevbVaWJDfT": "professional_starter",
    "prod_UCPQVLqjYyuiRF": "solo",
    "prod_UCPQOK9Qpuw1hB": "small_firm",
    "prod_UCPQQwcr2VaCXs": "mid_size",
}


_DEFAULT_CAC = 45.0  # Customer acquisition cost estimate — update when real marketing spend data is available


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

    # --- Phase 3: Summary stats (only on first page) ---
    summary = None
    if offset == 0:
        # Total counts
        total_active = await db.scalar(
            select(func.count()).select_from(User).where(User.is_active == True, User.is_deleted == False)
        ) or 0
        total_inactive = await db.scalar(
            select(func.count()).select_from(User).where(User.is_active == False, User.is_deleted == False)
        ) or 0

        # Tier breakdown
        tier_result = await db.execute(
            select(
                UserProfile.subscription_tier,
                func.count().label("count"),
            )
            .join(User, User.id == UserProfile.user_id)
            .where(User.is_deleted == False)
            .group_by(UserProfile.subscription_tier)
            .order_by(func.count().desc())
        )
        tier_breakdown = {row.subscription_tier or "none": row.count for row in tier_result.all()}

        # Professional users (have professional profile)
        try:
            from app.models.professional import ProfessionalProfile
            pro_count = await db.scalar(
                select(func.count()).select_from(ProfessionalProfile)
            ) or 0
        except Exception:
            pro_count = 0

        # New users last 7 days
        seven_days = datetime.utcnow() - timedelta(days=7)
        new_7d = await db.scalar(
            select(func.count()).select_from(User).where(
                User.created_at >= seven_days, User.is_deleted == False
            )
        ) or 0

        # New users last 30 days
        thirty_days = datetime.utcnow() - timedelta(days=30)
        new_30d = await db.scalar(
            select(func.count()).select_from(User).where(
                User.created_at >= thirty_days, User.is_deleted == False
            )
        ) or 0

        summary = {
            "total_active": total_active,
            "total_inactive": total_inactive,
            "professionals": pro_count,
            "new_7d": new_7d,
            "new_30d": new_30d,
            "tier_breakdown": tier_breakdown,
        }

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
        "summary": summary,
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

    # --- Stripe Health: DB integration stats ---
    stripe_health = {}
    try:
        paid_tiers = ["plus", "complete", "professional_starter", "solo", "small_firm", "mid_size"]

        total_profiles = await db.scalar(select(func.count(UserProfile.id))) or 0

        users_with_stripe_customer = await db.scalar(
            select(func.count(UserProfile.id)).where(
                UserProfile.stripe_customer_id != None,
                UserProfile.stripe_customer_id != "",
            )
        ) or 0

        users_with_stripe_sub = await db.scalar(
            select(func.count(UserProfile.id)).where(
                UserProfile.stripe_subscription_id != None,
                UserProfile.stripe_subscription_id != "",
            )
        ) or 0

        mismatch_count = await db.scalar(
            select(func.count(UserProfile.id)).where(
                UserProfile.subscription_tier.in_(paid_tiers),
                UserProfile.subscription_status == "active",
                or_(
                    UserProfile.stripe_subscription_id == None,
                    UserProfile.stripe_subscription_id == "",
                ),
            )
        ) or 0

        stripe_health = {
            "total_profiles": total_profiles,
            "with_stripe_customer": users_with_stripe_customer,
            "with_stripe_subscription": users_with_stripe_sub,
            "paid_no_stripe_sub": mismatch_count,
            "products_expected": list(STRIPE_PRODUCT_TO_TIER.keys()),
            "products_verified": [],
        }
    except Exception as exc:
        logger.warning("Stripe health DB queries failed: %s", exc)

    # --- Live Stripe data (graceful fallback) ---
    stripe_live = None
    try:
        import stripe
        from app.core.config import settings as app_settings
        if app_settings.STRIPE_SECRET_KEY:
            stripe.api_key = app_settings.STRIPE_SECRET_KEY

            # Active subscriptions from Stripe (paginated)
            all_subs = []
            subs = stripe.Subscription.list(status="active", limit=100)
            all_subs.extend(subs.data)
            while subs.has_more:
                subs = stripe.Subscription.list(
                    status="active", limit=100,
                    starting_after=subs.data[-1].id,
                )
                all_subs.extend(subs.data)

            stripe_active_count = len(all_subs)
            stripe_mrr_cents = sum(
                sub.plan.amount * sub.quantity
                for sub in all_subs
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

            # Verify expected products exist in Stripe
            products_verified = []
            for prod_id, tier_code in STRIPE_PRODUCT_TO_TIER.items():
                try:
                    prod = stripe.Product.retrieve(prod_id)
                    products_verified.append({
                        "id": prod_id,
                        "tier": tier_code,
                        "name": prod.name,
                        "active": prod.active,
                        "found": True,
                    })
                except stripe.error.InvalidRequestError:
                    products_verified.append({
                        "id": prod_id,
                        "tier": tier_code,
                        "name": None,
                        "active": False,
                        "found": False,
                    })
            stripe_health["products_verified"] = products_verified
    except Exception as e:
        logger.warning(f"Stripe API unavailable for billing overview: {e}")
        stripe_live = {"stripe_available": False, "error": "Stripe API unavailable."}

    await _log_admin_action(db, admin_user, "view_billing", "platform")
    await db.commit()

    # --- Phase 4: Computed valuation metrics ---
    valuation = {}
    try:
        # Total active paying users
        active_paying = sum(
            t["count"] for t in mrr_by_tier.values() if t["price"] > 0
        )

        # Churn rate: cancelled in 30d / (active + cancelled)
        total_base = active_paying + (cancelled_30d or 0)
        monthly_churn = round((cancelled_30d or 0) / total_base * 100, 1) if total_base > 0 else 0.0

        # ARPU (average revenue per user)
        arpu = round(total_mrr / active_paying, 2) if active_paying > 0 else 0

        # LTV = ARPU / monthly churn rate (in months)
        if monthly_churn > 0:
            avg_lifetime_months = round(100 / monthly_churn, 1)
            ltv = round(arpu * avg_lifetime_months, 2)
        else:
            avg_lifetime_months = 0
            ltv = 0

        # Retention rate (inverse of churn)
        retention_rate = round(100 - monthly_churn, 1)

        # Total users for CAC approximation
        total_users_result = await db.execute(
            select(func.count()).select_from(User).where(User.is_deleted == False)
        )
        total_users = total_users_result.scalar() or 0

        valuation = {
            "active_paying": active_paying,
            "monthly_churn_pct": monthly_churn,
            "retention_rate_pct": retention_rate,
            "arpu": arpu,
            "ltv": ltv,
            "avg_lifetime_months": avg_lifetime_months,
            "cac": _DEFAULT_CAC,
            "ltv_cac_ratio": round(ltv / _DEFAULT_CAC, 1) if ltv > 0 else 0,
            "total_users": total_users,
            "arr": round(total_mrr * 12, 2),
        }
    except Exception as exc:
        logger.warning("Valuation metrics calculation failed: %s", exc)

    # --- Phase 4: Stripe refunds/disputes (if available) ---
    refunds_data = None
    try:
        if stripe_live and stripe_live.get("stripe_available"):
            import stripe
            # Recent refunds
            refunds = stripe.Refund.list(limit=10)
            refund_list = [
                {
                    "id": r.id,
                    "amount": r.amount / 100.0,
                    "status": r.status,
                    "reason": r.reason,
                    "created": datetime.fromtimestamp(r.created).isoformat(),
                }
                for r in refunds.data
            ]
            total_refunded_30d = sum(
                r.amount / 100.0 for r in refunds.data
                if datetime.fromtimestamp(r.created) >= thirty_days_ago
            )

            # Disputes
            disputes = stripe.Dispute.list(limit=10)
            dispute_list = [
                {
                    "id": d.id,
                    "amount": d.amount / 100.0,
                    "status": d.status,
                    "reason": d.reason,
                    "created": datetime.fromtimestamp(d.created).isoformat(),
                }
                for d in disputes.data
            ]

            refunds_data = {
                "recent_refunds": refund_list,
                "total_refunded_30d": round(total_refunded_30d, 2),
                "refund_count_30d": len([
                    r for r in refunds.data
                    if datetime.fromtimestamp(r.created) >= thirty_days_ago
                ]),
                "disputes": dispute_list,
                "dispute_count": len(dispute_list),
            }
    except Exception as exc:
        logger.warning("Stripe refunds/disputes fetch failed: %s", exc)

    verified_mrr = stripe_live.get("total_mrr") if stripe_live and stripe_live.get("stripe_available") else None

    return {
        "consumer_subscriptions": breakdown,
        "professional_subscriptions": prof_breakdown,
        "past_due_count": past_due_count,
        "trial_count": trial_count,
        "cancelled_30d": cancelled_30d,
        "new_paid_30d": new_paid_30d,
        "mrr_by_tier": mrr_by_tier,
        "total_mrr": round(total_mrr, 2),
        "estimated_mrr": round(total_mrr, 2),
        "verified_mrr": verified_mrr,
        "stripe_live": stripe_live,
        "stripe_health": stripe_health,
        "valuation": valuation,
        "refunds": refunds_data,
        "note": "estimated_mrr from DB tier counts. verified_mrr from Stripe API (when available).",
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
    report_type: str = Query(..., description="Report type: user_export, billing_summary, engagement, compliance, growth, operational_efficiency, valuation_metrics"),
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
    - operational_efficiency: Resolution rates, response times, uptime
    - valuation_metrics: LTV, CAC, retention, churn, unit economics
    """
    valid_types = ["user_export", "billing_summary", "engagement", "compliance", "growth", "operational_efficiency", "valuation_metrics"]
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
        capture_error(e)
        report_log.status = "failed"
        report_log.extra_metadata = {
            **report_log.extra_metadata,
            "error": "Report generation failed.",
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
        logger.exception(f"Stripe service unavailable: {e}")
        raise HTTPException(status_code=500, detail="Stripe service unavailable.")

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
            logger.error(f"Failed to sync Stripe customer for user {user.id}: {e}")
            capture_error(e)
            errors.append({"user_id": str(user.id), "email": user.email, "error": "Sync failed."})

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

                # Check if status update needed
                if profile.subscription_status != new_status:
                    profile.subscription_status = new_status
                    updated += 1

                # Sync tier from Stripe price ID
                items_data = sub.get("items", {}).get("data", [])
                if items_data:
                    price_id = items_data[0].get("price", {}).get("id")
                    if price_id and price_id in STRIPE_PRICE_TO_TIER:
                        new_tier = STRIPE_PRICE_TO_TIER[price_id]
                        if profile.subscription_tier != new_tier:
                            profile.subscription_tier = new_tier
                            if profile.subscription_status == new_status:
                                updated += 1  # Count as update if tier changed

                # Update subscription period dates if available
                period_start = sub.get("current_period_start")
                period_end = sub.get("current_period_end")
                if period_start:
                    profile.subscription_period_start = datetime.fromtimestamp(period_start)
                if period_end:
                    profile.subscription_period_end = datetime.fromtimestamp(period_end)

                # Update Stripe subscription ID
                if not profile.stripe_subscription_id or profile.stripe_subscription_id != sub.id:
                    profile.stripe_subscription_id = sub.id
            else:
                # No Stripe subscription — ensure user is on free tier
                if profile.subscription_tier and profile.subscription_tier not in ("web_starter",):
                    # User has a paid tier but no Stripe subscription — leave as-is
                    # (could be a grant or manually assigned tier)
                    pass
        except Exception as e:
            logger.error(f"Failed to audit Stripe customer {profile.stripe_customer_id}: {e}")
            capture_error(e)
            errors.append({"customer_id": profile.stripe_customer_id, "error": "Audit failed."})

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


# =============================================================================
# MODULE 11: Paid Report Request Pipeline (Approve/Reject/Generate/Deliver)
# =============================================================================

@router.get(
    "/reports/requests",
    summary="List paid report requests",
)
async def list_paid_report_requests(
    request_status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    List all paid report requests for superadmin review.

    Filterable by status: pending_payment, paid, in_review, generating,
    completed, delivered, rejected.
    """
    from app.models.report_request import ReportRequest

    query = select(ReportRequest).order_by(ReportRequest.created_at.desc())

    if request_status:
        query = query.where(ReportRequest.status == request_status)

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    )

    result = await db.execute(query.offset(offset).limit(limit))
    requests = result.scalars().all()

    return {
        "requests": [
            {
                "id": str(r.id),
                "family_file_id": r.family_file_id,
                "requested_by_id": r.requested_by_id,
                "report_type": r.report_type,
                "status": r.status,
                "urgency": r.urgency,
                "price_cents": r.price_cents,
                "description": r.description,
                "date_range_start": r.date_range_start.isoformat() if r.date_range_start else None,
                "date_range_end": r.date_range_end.isoformat() if r.date_range_end else None,
                "stripe_checkout_session_id": r.stripe_checkout_session_id,
                "admin_notes": r.admin_notes,
                "assigned_to": r.assigned_to,
                "approved_at": r.approved_at.isoformat() if r.approved_at else None,
                "rejected_at": r.rejected_at.isoformat() if r.rejected_at else None,
                "rejection_reason": r.rejection_reason,
                "generated_at": r.generated_at.isoformat() if r.generated_at else None,
                "file_url": r.file_url,
                "report_id": r.report_id,
                "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in requests
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get(
    "/reports/requests/{request_id}",
    summary="Get paid report request details",
)
async def get_paid_report_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get detailed info for a single paid report request."""
    from app.models.report_request import ReportRequest

    result = await db.execute(
        select(ReportRequest).where(ReportRequest.id == request_id)
    )
    r = result.scalar_one_or_none()

    if not r:
        raise HTTPException(status_code=404, detail="Report request not found")

    # Get requester info
    requester_result = await db.execute(
        select(User).where(User.id == r.requested_by_id)
    )
    requester = requester_result.scalar_one_or_none()

    return {
        "id": str(r.id),
        "family_file_id": r.family_file_id,
        "requested_by_id": r.requested_by_id,
        "requester_name": f"{requester.first_name} {requester.last_name}" if requester else None,
        "requester_email": requester.email if requester else None,
        "report_type": r.report_type,
        "status": r.status,
        "urgency": r.urgency,
        "price_cents": r.price_cents,
        "description": r.description,
        "date_range_start": r.date_range_start.isoformat() if r.date_range_start else None,
        "date_range_end": r.date_range_end.isoformat() if r.date_range_end else None,
        "stripe_checkout_session_id": r.stripe_checkout_session_id,
        "stripe_payment_intent_id": r.stripe_payment_intent_id,
        "admin_notes": r.admin_notes,
        "assigned_to": r.assigned_to,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "approved_by": r.approved_by,
        "rejected_at": r.rejected_at.isoformat() if r.rejected_at else None,
        "rejection_reason": r.rejection_reason,
        "generated_at": r.generated_at.isoformat() if r.generated_at else None,
        "file_url": r.file_url,
        "sha256_hash": r.sha256_hash,
        "report_id": r.report_id,
        "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.post(
    "/reports/requests/{request_id}/approve",
    summary="Approve a paid report request",
)
async def approve_report_request(
    request_id: str,
    admin_notes: Optional[str] = Query(None, description="Admin notes"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Approve a paid report request and move it to in_review status.

    Only requests with status 'paid' can be approved.
    """
    from app.models.report_request import ReportRequest

    result = await db.execute(
        select(ReportRequest).where(ReportRequest.id == request_id)
    )
    r = result.scalar_one_or_none()

    if not r:
        raise HTTPException(status_code=404, detail="Report request not found")

    if r.status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve request with status '{r.status}'. Must be 'paid'."
        )

    r.status = "in_review"
    r.approved_at = datetime.utcnow()
    r.approved_by = str(admin_user.id)
    r.assigned_to = str(admin_user.id)
    if admin_notes:
        r.admin_notes = admin_notes

    await _log_admin_action(
        db, admin_user, "approve_report_request", "report_request", request_id,
        details=f"type={r.report_type}, family_file={r.family_file_id}",
    )
    await db.commit()

    return {
        "id": str(r.id),
        "status": r.status,
        "approved_at": r.approved_at.isoformat(),
        "approved_by": r.approved_by,
    }


@router.post(
    "/reports/requests/{request_id}/reject",
    summary="Reject a paid report request",
)
async def reject_report_request(
    request_id: str,
    reason: str = Query(..., min_length=3, description="Rejection reason"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Reject a paid report request.

    Only requests with status 'paid' or 'in_review' can be rejected.
    A refund should be processed separately through Stripe.
    """
    from app.models.report_request import ReportRequest

    result = await db.execute(
        select(ReportRequest).where(ReportRequest.id == request_id)
    )
    r = result.scalar_one_or_none()

    if not r:
        raise HTTPException(status_code=404, detail="Report request not found")

    if r.status not in ("paid", "in_review"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject request with status '{r.status}'."
        )

    r.status = "rejected"
    r.rejected_at = datetime.utcnow()
    r.rejection_reason = reason

    await _log_admin_action(
        db, admin_user, "reject_report_request", "report_request", request_id,
        details=f"reason={reason}",
    )
    await db.commit()

    return {
        "id": str(r.id),
        "status": r.status,
        "rejected_at": r.rejected_at.isoformat(),
        "rejection_reason": r.rejection_reason,
    }


@router.post(
    "/reports/requests/{request_id}/generate",
    summary="Generate PDF for an approved report request",
)
async def generate_report_for_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Trigger PDF generation for an approved report request.

    Generates the report, stores SHA-256 hash, and updates status to 'completed'.
    """
    import hashlib
    from app.models.report_request import ReportRequest
    from app.services.reports import ParentReportService

    result = await db.execute(
        select(ReportRequest).where(ReportRequest.id == request_id)
    )
    r = result.scalar_one_or_none()

    if not r:
        raise HTTPException(status_code=404, detail="Report request not found")

    if r.status not in ("in_review", "paid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot generate report for request with status '{r.status}'."
        )

    r.status = "generating"
    await db.commit()

    try:
        service = ParentReportService(db)
        report_id = service.generate_report_id()

        pdf_bytes = await service.generate_report(
            report_type=r.report_type,
            family_file_id=r.family_file_id,
            date_start=r.date_range_start,
            date_end=r.date_range_end,
            user_id=r.requested_by_id,
        )

        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()

        r.status = "completed"
        r.generated_at = datetime.utcnow()
        r.sha256_hash = sha256_hash
        r.report_id = report_id

        await _log_admin_action(
            db, admin_user, "generate_report", "report_request", request_id,
            details=f"report_id={report_id}, sha256={sha256_hash[:16]}...",
        )
        await db.commit()

        return {
            "id": str(r.id),
            "status": r.status,
            "report_id": report_id,
            "sha256_hash": sha256_hash,
            "generated_at": r.generated_at.isoformat(),
        }

    except Exception as e:
        r.status = "in_review"
        r.admin_notes = f"Generation failed: {str(e)}"
        await db.commit()
        logger.error(f"Report generation failed for request {request_id}: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Report generation failed."
        )


@router.post(
    "/reports/requests/{request_id}/deliver",
    summary="Mark report as delivered and notify parent",
)
async def deliver_report(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Mark a completed report as delivered and send email notification.

    Only requests with status 'completed' can be delivered.
    """
    from app.models.report_request import ReportRequest

    result = await db.execute(
        select(ReportRequest).where(ReportRequest.id == request_id)
    )
    r = result.scalar_one_or_none()

    if not r:
        raise HTTPException(status_code=404, detail="Report request not found")

    if r.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot deliver request with status '{r.status}'. Must be 'completed'."
        )

    r.status = "delivered"
    r.delivered_at = datetime.utcnow()

    # Send notification email to requester
    try:
        from app.services.email import email_service

        requester_result = await db.execute(
            select(User).where(User.id == r.requested_by_id)
        )
        requester = requester_result.scalar_one_or_none()

        if requester and requester.email:
            await email_service.send_generic_notification(
                to_email=requester.email,
                to_name=requester.first_name or "Parent",
                subject=f"Your CommonGround Report is Ready - {r.report_id}",
                message=(
                    f"Your {r.report_type.replace('_', ' ').title()} report "
                    f"(ID: {r.report_id}) has been generated and is ready for download. "
                    f"Log in to your CommonGround account to access your report."
                ),
                cta_url=f"{email_service.frontend_url}/reports/download/{r.id}",
                cta_text="Download Report",
            )
    except Exception as e:
        logger.error(f"Failed to send delivery notification for {request_id}: {e}")
        capture_error(e)

    await _log_admin_action(
        db, admin_user, "deliver_report", "report_request", request_id,
        details=f"report_id={r.report_id}",
    )
    await db.commit()

    return {
        "id": str(r.id),
        "status": r.status,
        "delivered_at": r.delivered_at.isoformat(),
        "report_id": r.report_id,
    }


# =============================================================================
# MODULE 12: Bulk Monthly Reports
# =============================================================================

@router.post(
    "/reports/send-monthly",
    summary="Send monthly reports for all active family files",
)
async def send_monthly_reports(
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=2024, le=2030, description="Year"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Generate and send monthly reports for all active family files.

    Superadmin only. Iterates through every active family file,
    generates a comprehensive monthly PDF, and emails it to both parents.

    Returns a summary of sent/failed reports.
    """
    from app.models.family_file import FamilyFile
    from app.services.reports.monthly_report_service import MonthlyReportService
    from app.services.email import email_service
    import calendar

    # Validate the requested month is not in the future
    now = datetime.utcnow()
    if year > now.year or (year == now.year and month > now.month):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate reports for a future month."
        )

    month_name = calendar.month_name[month]

    # Get all active family files
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.status == "active")
    )
    family_files = result.scalars().all()

    sent_count = 0
    failed_count = 0
    errors = []

    for ff in family_files:
        try:
            service = MonthlyReportService(db)
            _, summary = await service.generate_monthly_report(
                family_file_id=str(ff.id),
                month=month,
                year=year,
            )

            # Build the report URL for the CTA button
            frontend_url = getattr(
                email_service, 'frontend_url',
                'https://find-commonground.com'
            )
            report_url = (
                f"{frontend_url}/reports/monthly"
                f"?family_file_id={ff.id}&month={month}&year={year}"
            )

            # Send to parent A
            if ff.parent_a_id:
                parent_a_result = await db.execute(
                    select(User).where(User.id == ff.parent_a_id)
                )
                parent_a = parent_a_result.scalar_one_or_none()
                if parent_a and parent_a.email:
                    await email_service.send_monthly_report(
                        to_email=parent_a.email,
                        to_name=parent_a.first_name or "Parent",
                        month_name=summary["month_name"],
                        year=summary["year"],
                        family_file_name=summary["family_file_name"],
                        compliance_rate=summary["compliance_rate"],
                        total_exchanges=summary["total_exchanges"],
                        on_time_count=summary["on_time_count"],
                        completed_exchanges=summary["completed_exchanges"],
                        missed_exchanges=summary["missed_exchanges"],
                        gps_verified_count=summary["gps_verified_count"],
                        message_count=summary["message_count"],
                        full_report_url=report_url,
                    )
                    sent_count += 1

            # Send to parent B
            if ff.parent_b_id:
                parent_b_result = await db.execute(
                    select(User).where(User.id == ff.parent_b_id)
                )
                parent_b = parent_b_result.scalar_one_or_none()
                if parent_b and parent_b.email:
                    await email_service.send_monthly_report(
                        to_email=parent_b.email,
                        to_name=parent_b.first_name or "Parent",
                        month_name=summary["month_name"],
                        year=summary["year"],
                        family_file_name=summary["family_file_name"],
                        compliance_rate=summary["compliance_rate"],
                        total_exchanges=summary["total_exchanges"],
                        on_time_count=summary["on_time_count"],
                        completed_exchanges=summary["completed_exchanges"],
                        missed_exchanges=summary["missed_exchanges"],
                        gps_verified_count=summary["gps_verified_count"],
                        message_count=summary["message_count"],
                        full_report_url=report_url,
                    )
                    sent_count += 1

        except Exception as e:
            failed_count += 1
            errors.append({
                "family_file_id": str(ff.id),
                "error": "Processing failed.",
            })
            logger.error(
                f"Failed to generate/send monthly report for "
                f"family file {ff.id}: {e}"
            )

    await _log_admin_action(
        db, admin_user, "send_monthly_reports", "reports",
        details=(
            f"month={month_name} {year}, "
            f"sent={sent_count}, failed={failed_count}"
        ),
    )
    await db.commit()

    return {
        "month": month_name,
        "year": year,
        "total_family_files": len(family_files),
        "emails_sent": sent_count,
        "failed": failed_count,
        "errors": errors[:10] if errors else [],
    }
@router.get(
    "/aria/insights",
    summary="ARIA intervention analytics",
)
async def get_aria_insights(
    days: int = Query(30, ge=7, le=365, description="Time range in days"),
    offset: int = Query(0, ge=0, description="Offset for flagged messages pagination"),
    limit: int = Query(50, ge=1, le=200, description="Limit for flagged messages pagination"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Comprehensive ARIA intervention analytics: totals, daily counts, categories,
    blocked count, acceptance rate, sentiment distribution, processing time,
    weekly trends, circle message data, call intervention data, and top cases.
    """
    import json as json_mod
    from app.models.message import Message, MessageFlag

    now = datetime.utcnow()
    since = now - timedelta(days=days)
    seven_days_ago = now - timedelta(days=7)

    # ── Total interventions (all time) ──
    total_result = await db.execute(
        select(func.count()).select_from(MessageFlag)
    )
    total_interventions = total_result.scalar() or 0

    # Last 7 days
    result_7d = await db.execute(
        select(func.count()).select_from(MessageFlag).where(
            MessageFlag.created_at >= seven_days_ago
        )
    )
    last_7d = result_7d.scalar() or 0

    # Last N days (selected range)
    result_range = await db.execute(
        select(func.count()).select_from(MessageFlag).where(
            MessageFlag.created_at >= since
        )
    )
    last_range = result_range.scalar() or 0

    # ── Daily interventions ──
    daily_result = await db.execute(
        select(
            cast(MessageFlag.created_at, Date).label("date"),
            func.count().label("count"),
        )
        .where(MessageFlag.created_at >= since)
        .group_by(cast(MessageFlag.created_at, Date))
        .order_by(cast(MessageFlag.created_at, Date))
    )
    daily_interventions = [
        {"date": str(row.date), "count": row.count}
        for row in daily_result.all()
    ]

    # ── Severity breakdown (top_categories) ──
    cat_result = await db.execute(
        select(
            MessageFlag.severity,
            func.count().label("count"),
        )
        .where(MessageFlag.created_at >= since)
        .where(MessageFlag.severity.isnot(None))
        .group_by(MessageFlag.severity)
        .order_by(func.count().desc())
    )
    top_categories = [
        {"category": row.severity, "count": row.count}
        for row in cat_result.all()
    ]

    # ── Blocked count (intervention_level 4) ──
    blocked_result = await db.execute(
        select(func.count()).select_from(MessageFlag).where(
            MessageFlag.intervention_level == 4,
            MessageFlag.created_at >= since,
        )
    )
    blocked_count = blocked_result.scalar() or 0

    # ── Acceptance rate (within range) ──
    accepted_result = await db.execute(
        select(func.count()).select_from(MessageFlag).where(
            MessageFlag.user_action.in_(["accepted", "modified"]),
            MessageFlag.created_at >= since,
        )
    )
    accepted_count = accepted_result.scalar() or 0
    acceptance_rate = (
        round(accepted_count / last_range * 100, 1)
        if last_range > 0
        else 0.0
    )

    # ── Sentiment distribution ──
    sentiment_dist = {"positive": 0, "neutral": 0, "negative": 0}
    for cat in top_categories:
        if cat["category"] in ("low", "medium"):
            sentiment_dist["neutral"] += cat["count"]
        elif cat["category"] in ("high", "severe"):
            sentiment_dist["negative"] += cat["count"]
    try:
        total_msgs_result = await db.execute(
            select(func.count()).select_from(Message).where(
                Message.created_at >= since
            )
        )
        total_msg_count = total_msgs_result.scalar() or 0
        sentiment_dist["positive"] = max(0, total_msg_count - last_range)
    except Exception:
        sentiment_dist["positive"] = 0

    # ── User action breakdown ──
    action_breakdown: dict = {}
    sent_anyway_count = 0
    rejected_count = 0
    try:
        action_result = await db.execute(
            select(
                MessageFlag.user_action,
                func.count().label("count"),
            )
            .where(MessageFlag.user_action.isnot(None))
            .where(MessageFlag.created_at >= since)
            .group_by(MessageFlag.user_action)
            .order_by(func.count().desc())
        )
        action_breakdown = {row.user_action: row.count for row in action_result.all()}
        sent_anyway_count = action_breakdown.get("sent_anyway", 0)
        rejected_count = action_breakdown.get("rejected", 0)
    except Exception as exc:
        logger.warning("ARIA action breakdown query failed: %s", exc)

    # ── Avg messages per day & intervention rate ──
    avg_messages_per_day = 0.0
    total_msgs_30d = 0
    intervention_rate = 0.0
    try:
        msg_count_range = await db.execute(
            select(func.count()).select_from(Message).where(
                Message.created_at >= since
            )
        )
        total_msgs_30d = msg_count_range.scalar() or 0
        avg_messages_per_day = round(total_msgs_30d / days, 1)
        intervention_rate = (
            round(last_range / total_msgs_30d * 100, 1)
            if total_msgs_30d > 0 else 0.0
        )
    except Exception as exc:
        logger.warning("ARIA message count query failed: %s", exc)

    # ── Detailed categories from JSON array (FIX: JSON string fallback) ──
    detailed_categories: list = []
    try:
        cat_detail_result = await db.execute(
            select(MessageFlag.categories, func.count().label("cnt"))
            .where(MessageFlag.created_at >= since)
            .group_by(MessageFlag.categories)
        )
        category_counts: dict[str, int] = {}
        for row in cat_detail_result.all():
            cats = row.categories
            if isinstance(cats, str):
                try:
                    cats = json_mod.loads(cats)
                except (json_mod.JSONDecodeError, TypeError):
                    cats = []
            if not isinstance(cats, list):
                cats = []
            for c in cats:
                if isinstance(c, str) and c:
                    category_counts[c] = category_counts.get(c, 0) + row.cnt
        detailed_categories = sorted(
            [{"category": k, "count": v} for k, v in category_counts.items()],
            key=lambda x: x["count"],
            reverse=True,
        )
    except Exception as exc:
        logger.warning("ARIA category detail query failed: %s", exc)

    # ── Intervention levels (FIX: filter out nulls) ──
    intervention_levels: list = []
    try:
        level_result = await db.execute(
            select(
                MessageFlag.intervention_level,
                func.count().label("count"),
            )
            .where(MessageFlag.intervention_level.isnot(None))
            .group_by(MessageFlag.intervention_level)
            .order_by(MessageFlag.intervention_level)
        )
        level_labels = {1: "Gentle Nudge", 2: "Firm Suggestion", 3: "Strong Warning", 4: "Blocked"}
        intervention_levels = [
            {
                "level": row.intervention_level,
                "label": level_labels.get(row.intervention_level, f"Level {row.intervention_level}"),
                "count": row.count,
            }
            for row in level_result.all()
            if row.intervention_level is not None
        ]
    except Exception as exc:
        logger.warning("ARIA intervention levels query failed: %s", exc)

    # ── Recent flagged messages (FIX: actually populate) ──
    recent_flagged: list = []
    try:
        flagged_result = await db.execute(
            select(
                MessageFlag.created_at,
                MessageFlag.severity,
                MessageFlag.categories,
                MessageFlag.toxicity_score,
                MessageFlag.user_action,
                MessageFlag.intervention_level,
                MessageFlag.processing_time_ms,
                Message.sender_id,
            )
            .join(Message, MessageFlag.message_id == Message.id)
            .where(MessageFlag.created_at >= since)
            .order_by(MessageFlag.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        for row in flagged_result.all():
            cats = row.categories
            if isinstance(cats, str):
                try:
                    cats = json_mod.loads(cats)
                except (json_mod.JSONDecodeError, TypeError):
                    cats = []
            if not isinstance(cats, list):
                cats = []
            sender_short = str(row.sender_id)[:8] if row.sender_id else "unknown"
            recent_flagged.append({
                "timestamp": row.created_at.isoformat() if row.created_at else None,
                "severity": row.severity,
                "categories": cats,
                "toxicity_score": round(row.toxicity_score, 3) if row.toxicity_score else 0,
                "user_action": row.user_action,
                "intervention_level": row.intervention_level,
                "processing_time_ms": row.processing_time_ms,
                "sender_id": sender_short,
            })
    except Exception as exc:
        logger.warning("ARIA recent flagged query failed: %s", exc)

    # ── Processing time statistics ──
    processing_time: dict = {"avg_ms": 0, "min_ms": 0, "max_ms": 0}
    try:
        pt_result = await db.execute(
            select(
                func.avg(MessageFlag.processing_time_ms).label("avg"),
                func.min(MessageFlag.processing_time_ms).label("min"),
                func.max(MessageFlag.processing_time_ms).label("max"),
            )
            .where(MessageFlag.processing_time_ms.isnot(None))
            .where(MessageFlag.created_at >= since)
        )
        pt_row = pt_result.one_or_none()
        if pt_row and pt_row.avg is not None:
            processing_time = {
                "avg_ms": round(float(pt_row.avg), 1),
                "min_ms": int(pt_row.min) if pt_row.min else 0,
                "max_ms": int(pt_row.max) if pt_row.max else 0,
            }
    except Exception as exc:
        logger.warning("ARIA processing time query failed: %s", exc)

    # ── Weekly effectiveness trends ──
    weekly_trends: list = []
    try:
        weekly_result = await db.execute(
            select(
                func.date_trunc("week", MessageFlag.created_at).label("week"),
                func.count().label("total"),
                func.sum(
                    sql_case(
                        (MessageFlag.user_action.in_(["accepted", "modified"]), 1),
                        else_=0,
                    )
                ).label("accepted"),
                func.avg(MessageFlag.toxicity_score).label("avg_toxicity"),
            )
            .where(MessageFlag.created_at >= since)
            .group_by(func.date_trunc("week", MessageFlag.created_at))
            .order_by(func.date_trunc("week", MessageFlag.created_at))
        )
        for row in weekly_result.all():
            total = row.total or 0
            acc = row.accepted or 0
            weekly_trends.append({
                "week": row.week.isoformat() if row.week else None,
                "total": total,
                "accepted": acc,
                "acceptance_rate": round(acc / total * 100, 1) if total > 0 else 0.0,
                "avg_toxicity": round(float(row.avg_toxicity), 3) if row.avg_toxicity else 0,
            })
    except Exception as exc:
        logger.warning("ARIA weekly trends query failed: %s", exc)

    # ── Circle message ARIA data ──
    circle_data: dict = {
        "total_analyzed": 0,
        "total_flagged": 0,
        "intervention_rate": 0.0,
        "action_breakdown": {},
        "categories": [],
        "avg_response_time_ms": 0,
    }
    try:
        from app.models.circle_message import CircleMessage

        # Total analyzed
        ca_result = await db.execute(
            select(func.count()).select_from(CircleMessage).where(
                CircleMessage.aria_analyzed == True,
                CircleMessage.sent_at >= since,
            )
        )
        circle_analyzed = ca_result.scalar() or 0

        # Total flagged
        cf_result = await db.execute(
            select(func.count()).select_from(CircleMessage).where(
                CircleMessage.aria_flagged == True,
                CircleMessage.sent_at >= since,
            )
        )
        circle_flagged = cf_result.scalar() or 0

        # Action breakdown
        ca_action_result = await db.execute(
            select(
                CircleMessage.user_action,
                func.count().label("count"),
            )
            .where(CircleMessage.aria_flagged == True)
            .where(CircleMessage.user_action.isnot(None))
            .where(CircleMessage.sent_at >= since)
            .group_by(CircleMessage.user_action)
        )
        circle_actions = {row.user_action: row.count for row in ca_action_result.all()}

        # Categories from aria_all_categories (JSON string)
        cc_result = await db.execute(
            select(CircleMessage.aria_all_categories)
            .where(CircleMessage.aria_flagged == True)
            .where(CircleMessage.aria_all_categories.isnot(None))
            .where(CircleMessage.sent_at >= since)
        )
        circle_cat_counts: dict[str, int] = {}
        for row in cc_result.all():
            raw = row[0]
            cats = raw
            if isinstance(cats, str):
                try:
                    cats = json_mod.loads(cats)
                except (json_mod.JSONDecodeError, TypeError):
                    cats = []
            if not isinstance(cats, list):
                cats = []
            for c in cats:
                if isinstance(c, str) and c:
                    circle_cat_counts[c] = circle_cat_counts.get(c, 0) + 1
        circle_categories = sorted(
            [{"category": k, "count": v} for k, v in circle_cat_counts.items()],
            key=lambda x: x["count"],
            reverse=True,
        )

        # Avg response time
        crt_result = await db.execute(
            select(func.avg(CircleMessage.aria_response_time_ms))
            .where(CircleMessage.aria_response_time_ms.isnot(None))
            .where(CircleMessage.sent_at >= since)
        )
        avg_rt = crt_result.scalar()

        circle_data = {
            "total_analyzed": circle_analyzed,
            "total_flagged": circle_flagged,
            "intervention_rate": round(circle_flagged / circle_analyzed * 100, 1) if circle_analyzed > 0 else 0.0,
            "action_breakdown": circle_actions,
            "categories": circle_categories,
            "avg_response_time_ms": round(float(avg_rt), 1) if avg_rt else 0,
        }
    except Exception as exc:
        logger.warning("ARIA circle message query failed: %s", exc)

    # ── Call intervention data ──
    call_data: dict = {
        "total_sessions": 0,
        "total_interventions": 0,
        "terminated_count": 0,
        "avg_safety_score": 0,
        "flag_severity": [],
    }
    try:
        from app.models.circle_call import CircleCallSession, CircleCallFlag

        cs_result = await db.execute(
            select(
                func.count().label("total"),
                func.coalesce(func.sum(CircleCallSession.aria_intervention_count), 0).label("interventions"),
                func.sum(
                    sql_case(
                        (CircleCallSession.aria_terminated_call == True, 1),
                        else_=0,
                    )
                ).label("terminated"),
                func.avg(CircleCallSession.overall_safety_score).label("avg_safety"),
            )
            .where(CircleCallSession.created_at >= since)
        )
        cs_row = cs_result.one_or_none()
        if cs_row:
            call_data["total_sessions"] = cs_row.total or 0
            call_data["total_interventions"] = int(cs_row.interventions) if cs_row.interventions else 0
            call_data["terminated_count"] = int(cs_row.terminated) if cs_row.terminated else 0
            call_data["avg_safety_score"] = round(float(cs_row.avg_safety), 2) if cs_row.avg_safety else 0

        # Call flag severity
        cfs_result = await db.execute(
            select(
                CircleCallFlag.severity,
                func.count().label("count"),
            )
            .where(CircleCallFlag.flagged_at >= since)
            .where(CircleCallFlag.severity.isnot(None))
            .group_by(CircleCallFlag.severity)
            .order_by(func.count().desc())
        )
        call_data["flag_severity"] = [
            {"severity": row.severity, "count": row.count}
            for row in cfs_result.all()
        ]
    except Exception as exc:
        logger.warning("ARIA call data query failed: %s", exc)

    # ── Top cases by intervention count ──
    top_cases: list = []
    try:
        tc_result = await db.execute(
            select(
                Message.family_file_id,
                func.count().label("count"),
            )
            .join(MessageFlag, MessageFlag.message_id == Message.id)
            .where(Message.family_file_id.isnot(None))
            .where(MessageFlag.created_at >= since)
            .group_by(Message.family_file_id)
            .order_by(func.count().desc())
            .limit(10)
        )
        top_cases = [
            {"family_file_id": row.family_file_id, "count": row.count}
            for row in tc_result.all()
        ]
    except Exception as exc:
        logger.warning("ARIA top cases query failed: %s", exc)

    return {
        "total_interventions": total_interventions,
        "last_7d": last_7d,
        "last_range": last_range,
        "days": days,
        "daily_interventions": daily_interventions,
        "top_categories": top_categories,
        "detailed_categories": detailed_categories,
        "blocked_count": blocked_count,
        "acceptance_rate": acceptance_rate,
        "sent_anyway_count": sent_anyway_count,
        "rejected_count": rejected_count,
        "action_breakdown": action_breakdown,
        "intervention_levels": intervention_levels,
        "intervention_rate": intervention_rate,
        "avg_messages_per_day": avg_messages_per_day,
        "total_messages_period": total_msgs_30d,
        "sentiment_distribution": sentiment_dist,
        "recent_flagged": recent_flagged,
        "processing_time": processing_time,
        "weekly_trends": weekly_trends,
        "circle_data": circle_data,
        "call_data": call_data,
        "top_cases": top_cases,
    }


# =============================================================================
# MODULE 14: KidSpace Stats
# =============================================================================

@router.get(
    "/kidspace/stats",
    summary="KidSpace usage statistics",
)
async def get_kidspace_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Get KidSpace usage stats: active families, call minutes,
    theater/arcade/stories sessions, and daily usage breakdown.
    """
    from app.models.kidcoms import KidComsSession, SessionType, SessionStatus
    from app.models.child import Child

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    # Active families (distinct family_file_ids with sessions)
    active_fam_result = await db.execute(
        select(func.count(func.distinct(KidComsSession.family_file_id)))
    )
    active_families = active_fam_result.scalar() or 0

    # Total call minutes (all completed sessions)
    total_minutes_result = await db.execute(
        select(func.sum(KidComsSession.duration_seconds)).where(
            KidComsSession.status == SessionStatus.COMPLETED.value
        )
    )
    total_seconds = total_minutes_result.scalar() or 0
    total_call_minutes = total_seconds // 60

    # Call minutes last 30 days
    minutes_30d_result = await db.execute(
        select(func.sum(KidComsSession.duration_seconds)).where(
            KidComsSession.status == SessionStatus.COMPLETED.value,
            KidComsSession.created_at >= thirty_days_ago,
        )
    )
    seconds_30d = minutes_30d_result.scalar() or 0
    call_minutes_30d = seconds_30d // 60

    # Session type breakdowns
    async def _count_sessions(session_type: str):
        count_result = await db.execute(
            select(func.count()).select_from(KidComsSession).where(
                KidComsSession.session_type == session_type
            )
        )
        count = count_result.scalar() or 0

        minutes_result = await db.execute(
            select(func.sum(KidComsSession.duration_seconds)).where(
                KidComsSession.session_type == session_type,
                KidComsSession.status == SessionStatus.COMPLETED.value,
            )
        )
        secs = minutes_result.scalar() or 0
        return count, secs // 60

    theater_sessions, theater_minutes = await _count_sessions(SessionType.THEATER.value)
    arcade_sessions, arcade_minutes = await _count_sessions(SessionType.ARCADE.value)

    # Stories: use MIXED or count video_call sessions with "stories" features
    # For now, we count sessions that used the whiteboard feature as stories
    stories_result = await db.execute(
        select(func.count()).select_from(KidComsSession).where(
            KidComsSession.session_type == SessionType.WHITEBOARD.value
        )
    )
    stories_sessions = stories_result.scalar() or 0

    # Pages turned: approximate from total_messages in whiteboard sessions
    pages_result = await db.execute(
        select(func.sum(KidComsSession.total_messages)).where(
            KidComsSession.session_type == SessionType.WHITEBOARD.value
        )
    )
    pages_turned = pages_result.scalar() or 0

    # COPPA consented children - no coppa_consent field exists,
    # count active children as proxy
    coppa_result = await db.execute(
        select(func.count()).select_from(Child).where(
            Child.is_active == True
        )
    )
    coppa_consented_children = coppa_result.scalar() or 0

    # Daily usage (last 30 days)
    daily_result = await db.execute(
        select(
            cast(KidComsSession.created_at, Date).label("date"),
            func.sum(sql_case(
                (KidComsSession.session_type == SessionType.VIDEO_CALL.value, 1),
                else_=0
            )).label("calls"),
            func.sum(sql_case(
                (KidComsSession.session_type == SessionType.THEATER.value, 1),
                else_=0
            )).label("theater"),
            func.sum(sql_case(
                (KidComsSession.session_type == SessionType.ARCADE.value, 1),
                else_=0
            )).label("arcade"),
            func.sum(sql_case(
                (KidComsSession.session_type == SessionType.WHITEBOARD.value, 1),
                else_=0
            )).label("stories"),
        )
        .where(KidComsSession.created_at >= thirty_days_ago)
        .group_by(cast(KidComsSession.created_at, Date))
        .order_by(cast(KidComsSession.created_at, Date))
    )
    daily_usage = [
        {
            "date": str(row.date),
            "calls": row.calls or 0,
            "theater": row.theater or 0,
            "arcade": row.arcade or 0,
            "stories": row.stories or 0,
        }
        for row in daily_result.all()
    ]

    # --- Phase 3 enhancements (wrapped for resilience) ---
    total_children = 0
    total_minutes_watched = 0
    session_averages: list = []
    most_played: list = []
    most_read: list = []

    try:
        total_children_result = await db.execute(
            select(func.count()).select_from(Child)
        )
        total_children = total_children_result.scalar() or 0
    except Exception as exc:
        logger.warning("KidSpace total_children query failed: %s", exc)

    try:
        total_watch_result = await db.execute(
            select(func.sum(KidComsSession.duration_seconds)).where(
                KidComsSession.session_type.in_([
                    SessionType.THEATER.value,
                    SessionType.WHITEBOARD.value,
                ]),
                KidComsSession.status == SessionStatus.COMPLETED.value,
            )
        )
        total_watch_seconds = total_watch_result.scalar() or 0
        total_minutes_watched = total_watch_seconds // 60
    except Exception as exc:
        logger.warning("KidSpace total_minutes_watched query failed: %s", exc)

    try:
        avg_duration_result = await db.execute(
            select(
                KidComsSession.session_type,
                func.avg(KidComsSession.duration_seconds).label("avg_secs"),
                func.count().label("count"),
            )
            .where(KidComsSession.status == SessionStatus.COMPLETED.value)
            .group_by(KidComsSession.session_type)
        )
        session_averages = [
            {
                "type": row.session_type,
                "avg_minutes": round((row.avg_secs or 0) / 60, 1),
                "total_sessions": row.count,
            }
            for row in avg_duration_result.all()
        ]
    except Exception as exc:
        logger.warning("KidSpace session_averages query failed: %s", exc)

    try:
        most_played_result = await db.execute(
            select(
                KidComsSession.room_name,
                func.count().label("view_count"),
                func.sum(KidComsSession.duration_seconds).label("total_secs"),
            )
            .where(KidComsSession.session_type == SessionType.THEATER.value)
            .group_by(KidComsSession.room_name)
            .order_by(func.count().desc())
            .limit(10)
        )
        most_played = [
            {
                "rank": i + 1,
                "title": row.room_name or f"Session {i+1}",
                "view_count": row.view_count,
                "minutes_watched": (row.total_secs or 0) // 60,
            }
            for i, row in enumerate(most_played_result.all())
        ]
    except Exception as exc:
        logger.warning("KidSpace most_played query failed: %s", exc)

    try:
        most_read_result = await db.execute(
            select(
                KidComsSession.room_name,
                func.count().label("read_count"),
                func.sum(KidComsSession.total_messages).label("pages"),
            )
            .where(KidComsSession.session_type == SessionType.WHITEBOARD.value)
            .group_by(KidComsSession.room_name)
            .order_by(func.count().desc())
            .limit(10)
        )
        most_read = [
            {
                "rank": i + 1,
                "title": row.room_name or f"Story {i+1}",
                "read_count": row.read_count,
                "pages_turned": row.pages or 0,
            }
            for i, row in enumerate(most_read_result.all())
        ]
    except Exception as exc:
        logger.warning("KidSpace most_read query failed: %s", exc)

    return {
        "active_families": active_families,
        "total_children": total_children,
        "total_call_minutes": total_call_minutes,
        "call_minutes_30d": call_minutes_30d,
        "total_minutes_watched": total_minutes_watched,
        "theater_sessions": theater_sessions,
        "theater_minutes": theater_minutes,
        "arcade_sessions": arcade_sessions,
        "arcade_minutes": arcade_minutes,
        "stories_sessions": stories_sessions,
        "stories_read": stories_sessions,
        "pages_turned": pages_turned,
        "coppa_consented_children": coppa_consented_children,
        "session_averages": session_averages,
        "most_played": most_played,
        "most_read": most_read,
        "daily_usage": daily_usage,
        "coppa_consent": {
            "children_with_consent": coppa_consented_children,
            "total_children": total_children,
        },
    }


# =============================================================================
# MODULE 15: Platform Audit Feed
# =============================================================================

@router.get(
    "/platform-audit",
    summary="Unified platform audit event feed",
)
async def get_platform_audit(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    days: int = Query(7, ge=1, le=90, description="Number of days to look back"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Build a unified audit event feed across multiple tables:
    messages, exchanges, reports, agreements, payments, kidcoms sessions,
    and ARIA interventions.
    """
    from app.models.message import Message, MessageFlag
    from app.models.custody_exchange import CustodyExchange
    from app.models.agreement import Agreement
    from app.models.payment import Payment
    from app.models.kidcoms import KidComsSession
    from app.models.generated_report import GeneratedReport

    since = datetime.utcnow() - timedelta(days=days)
    events = []
    warnings = []

    # Helper to resolve user email from ID
    async def _get_email(user_id: str) -> str:
        if not user_id:
            return "unknown"
        try:
            result = await db.execute(
                select(User.email).where(User.id == user_id)
            )
            email = result.scalar_one_or_none()
            return email or "unknown"
        except Exception:
            return "unknown"

    # Filter function
    def _matches(evt_type: str, email: str) -> bool:
        if event_type and evt_type != event_type:
            return False
        if user_email and user_email.lower() not in email.lower():
            return False
        return True

    # 1. Messages
    if not event_type or event_type == "message_sent":
        try:
            msg_result = await db.execute(
                select(Message.created_at, Message.sender_id)
                .where(Message.created_at >= since)
                .order_by(desc(Message.created_at))
                .limit(limit)
            )
            for row in msg_result.all():
                email = await _get_email(row.sender_id)
                if _matches("message_sent", email):
                    events.append({
                        "timestamp": row.created_at.isoformat(),
                        "event_type": "message_sent",
                        "user_email": email,
                    })
        except Exception as exc:
            logger.exception("Platform audit: messages query failed")
            capture_error(exc)
            warnings.append("messages")

    # 2. Custody exchanges
    if not event_type or event_type == "exchange_created":
        try:
            ex_result = await db.execute(
                select(CustodyExchange.created_at, CustodyExchange.family_file_id)
                .where(CustodyExchange.created_at >= since)
                .order_by(desc(CustodyExchange.created_at))
                .limit(limit)
            )
            for row in ex_result.all():
                events.append({
                    "timestamp": row.created_at.isoformat(),
                    "event_type": "exchange_created",
                    "user_email": f"family:{row.family_file_id[:8]}",
                })
        except Exception as exc:
            logger.exception("Platform audit: exchanges query failed")
            capture_error(exc)
            warnings.append("exchanges")

    # 3. Generated reports
    if not event_type or event_type == "report_generated":
        try:
            rep_result = await db.execute(
                select(GeneratedReport.created_at, GeneratedReport.family_file_id)
                .where(GeneratedReport.created_at >= since)
                .order_by(desc(GeneratedReport.created_at))
                .limit(limit)
            )
            for row in rep_result.all():
                events.append({
                    "timestamp": row.created_at.isoformat(),
                    "event_type": "report_generated",
                    "user_email": f"family:{row.family_file_id[:8] if row.family_file_id else 'n/a'}",
                })
        except Exception as exc:
            logger.exception("Platform audit: reports query failed")
            capture_error(exc)
            warnings.append("reports")

    # 4. Agreements
    if not event_type or event_type == "agreement_signed":
        try:
            agr_result = await db.execute(
                select(Agreement.created_at, Agreement.family_file_id)
                .where(Agreement.created_at >= since)
                .order_by(desc(Agreement.created_at))
                .limit(limit)
            )
            for row in agr_result.all():
                events.append({
                    "timestamp": row.created_at.isoformat(),
                    "event_type": "agreement_signed",
                    "user_email": f"family:{row.family_file_id[:8] if row.family_file_id else 'n/a'}",
                })
        except Exception as exc:
            logger.exception("Platform audit: agreements query failed")
            capture_error(exc)
            warnings.append("agreements")

    # 5. Payments
    if not event_type or event_type == "payment_made":
        try:
            pay_result = await db.execute(
                select(Payment.created_at, Payment.payer_id)
                .where(Payment.created_at >= since)
                .order_by(desc(Payment.created_at))
                .limit(limit)
            )
            for row in pay_result.all():
                email = await _get_email(row.payer_id)
                if _matches("payment_made", email):
                    events.append({
                        "timestamp": row.created_at.isoformat(),
                        "event_type": "payment_made",
                        "user_email": email,
                    })
        except Exception as exc:
            logger.exception("Platform audit: payments query failed")
            capture_error(exc)
            warnings.append("payments")

    # 6. KidComs sessions
    if not event_type or event_type == "call_started":
        try:
            kc_result = await db.execute(
                select(KidComsSession.created_at, KidComsSession.initiated_by_id)
                .where(KidComsSession.created_at >= since)
                .order_by(desc(KidComsSession.created_at))
                .limit(limit)
            )
            for row in kc_result.all():
                events.append({
                    "timestamp": row.created_at.isoformat(),
                    "event_type": "call_started",
                    "user_email": row.initiated_by_id[:8] if row.initiated_by_id else "unknown",
                })
        except Exception as exc:
            logger.exception("Platform audit: kidcoms query failed")
            capture_error(exc)
            warnings.append("kidcoms")

    # 7. ARIA interventions
    if not event_type or event_type == "aria_intervention":
        try:
            aria_result = await db.execute(
                select(MessageFlag.created_at, MessageFlag.message_id)
                .where(MessageFlag.created_at >= since)
                .order_by(desc(MessageFlag.created_at))
                .limit(limit)
            )
            for row in aria_result.all():
                events.append({
                    "timestamp": row.created_at.isoformat(),
                    "event_type": "aria_intervention",
                    "user_email": "system",
                })
        except Exception as exc:
            logger.exception("Platform audit: aria query failed")
            capture_error(exc)
            warnings.append("aria")

    # Sort all events by timestamp descending
    events.sort(key=lambda e: e["timestamp"], reverse=True)

    total_count = len(events)
    paged_events = events[offset : offset + limit]

    result = {
        "events": paged_events,
        "total_count": total_count,
    }
    if warnings:
        result["warnings"] = warnings
        result["partial"] = True
    return result


# =============================================================================
# MODULE 16: Billing Transactions (Stripe)
# =============================================================================

@router.get(
    "/billing/transactions",
    summary="Recent Stripe billing transactions",
)
async def get_billing_transactions(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Fetch recent Stripe invoices/charges. Queries Stripe API directly.
    """
    import stripe
    from app.core.config import settings

    stripe.api_key = settings.STRIPE_SECRET_KEY

    transactions = []
    try:
        invoices = stripe.Invoice.list(limit=limit)

        for inv in invoices.data:
            # Resolve user email from stripe customer
            customer_email = None
            if inv.customer_email:
                customer_email = inv.customer_email
            elif inv.customer:
                try:
                    cust = stripe.Customer.retrieve(inv.customer)
                    customer_email = cust.email
                except Exception:
                    customer_email = None

            transactions.append({
                "date": datetime.fromtimestamp(inv.created).isoformat() if inv.created else None,
                "user_email": customer_email or "unknown",
                "amount": (inv.amount_paid or 0) / 100.0,
                "type": "invoice",
                "status": inv.status or "unknown",
                "stripe_id": inv.id,
            })

    except Exception as e:
        logger.error(f"Stripe transactions fetch failed: {e}")
        return {
            "transactions": [],
            "error": "Failed to fetch Stripe data. Check API key.",
        }

    return {"transactions": transactions}


# =============================================================================
# MODULE 17: Retention Cohorts
# =============================================================================

@router.get(
    "/stats/retention",
    summary="User retention cohort analysis",
)
async def get_retention_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Calculate retention cohorts for the last 4 weeks.
    For each week: users who signed up, and their day-1, day-7, day-30 retention.
    """
    from sqlalchemy import text

    now = datetime.utcnow()
    cohorts = []

    for week_offset in range(4):
        week_start = now - timedelta(weeks=week_offset + 1)
        week_end = now - timedelta(weeks=week_offset)

        # Users who signed up in this week
        signup_result = await db.execute(
            select(User.id, User.created_at).where(
                User.created_at >= week_start,
                User.created_at < week_end,
            )
        )
        signups = signup_result.all()
        signup_count = len(signups)

        if signup_count == 0:
            cohorts.append({
                "week": week_start.strftime("%Y-%m-%d"),
                "signups": 0,
                "day1_pct": 0,
                "day7_pct": 0,
                "day30_pct": 0,
            })
            continue

        day1_count = 0
        day7_count = 0
        day30_count = 0

        for user_id, created_at in signups:
            # Check if user logged in after signup
            if not created_at:
                continue

            # Day 1: logged in the next day
            login_result = await db.execute(
                select(func.count()).select_from(User).where(
                    User.id == user_id,
                    User.last_login >= created_at + timedelta(days=1),
                    User.last_login < created_at + timedelta(days=2),
                )
            )
            if (login_result.scalar() or 0) > 0:
                day1_count += 1

            # Day 7: logged in within 7 days
            login7_result = await db.execute(
                select(func.count()).select_from(User).where(
                    User.id == user_id,
                    User.last_login >= created_at + timedelta(days=1),
                    User.last_login <= created_at + timedelta(days=7),
                )
            )
            if (login7_result.scalar() or 0) > 0:
                day7_count += 1

            # Day 30: logged in within 30 days
            login30_result = await db.execute(
                select(func.count()).select_from(User).where(
                    User.id == user_id,
                    User.last_login >= created_at + timedelta(days=1),
                    User.last_login <= created_at + timedelta(days=30),
                )
            )
            if (login30_result.scalar() or 0) > 0:
                day30_count += 1

        cohorts.append({
            "week": week_start.strftime("%Y-%m-%d"),
            "signups": signup_count,
            "day1_pct": round(day1_count / signup_count * 100, 1),
            "day7_pct": round(day7_count / signup_count * 100, 1),
            "day30_pct": round(day30_count / signup_count * 100, 1),
        })

    return {"cohorts": cohorts}


# =============================================================================
# MODULE 18: Conversion Funnel
# =============================================================================

@router.get(
    "/stats/funnel",
    summary="User conversion funnel statistics",
)
async def get_funnel_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Calculate conversion funnel:
    - total signups
    - users who sent at least 1 message
    - users who created at least 1 agreement
    """
    from app.models.message import Message
    from app.models.agreement import Agreement

    # Total signups
    total_result = await db.execute(
        select(func.count()).select_from(User)
    )
    total_signups = total_result.scalar() or 0

    # Users who sent at least 1 message
    msg_senders_result = await db.execute(
        select(func.count(func.distinct(Message.sender_id)))
    )
    sent_first_message = msg_senders_result.scalar() or 0

    # Users who created at least 1 agreement
    # Agreements are per family_file; count distinct family_file_ids with agreements
    agr_creators_result = await db.execute(
        select(func.count(func.distinct(Agreement.family_file_id)))
    )
    created_first_agreement = agr_creators_result.scalar() or 0

    # Calculate percentages
    msg_pct = round(sent_first_message / total_signups * 100, 1) if total_signups > 0 else 0.0
    agr_pct = round(created_first_agreement / total_signups * 100, 1) if total_signups > 0 else 0.0

    return {
        "total_signups": total_signups,
        "sent_first_message": sent_first_message,
        "sent_first_message_pct": msg_pct,
        "created_first_agreement": created_first_agreement,
        "created_first_agreement_pct": agr_pct,
    }


# =============================================================================
# MODULE 13: Weekly Report
# =============================================================================

@router.get(
    "/weekly-report",
    summary="Generate on-demand weekly report",
)
async def get_weekly_report(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Generate on-demand weekly report with platform metrics and highlights."""
    from app.services.weekly_report_service import generate_weekly_report

    report = await generate_weekly_report(db)
    await _log_admin_action(db, admin_user, "weekly_report_generated", "report")
    await db.commit()
    return report


@router.post(
    "/weekly-report/send",
    summary="Generate and email weekly report",
)
async def send_weekly_report(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Generate and email the weekly report to configured recipients."""
    from app.services.weekly_report_service import generate_weekly_report, send_weekly_report_email

    report = await generate_weekly_report(db)
    sent = await send_weekly_report_email(report)
    await _log_admin_action(
        db, admin_user, "weekly_report_sent", "report", details=f"sent={sent}"
    )
    await db.commit()
    return {"sent": sent, "report": report}


# =============================================================================
# MODULE 14: Bug Triage (Sentry Integration)
# =============================================================================

@router.get(
    "/bugs/current",
    summary="Fetch live Sentry issues",
)
async def get_current_bugs(
    project: Optional[str] = Query(None, description="Sentry project slug"),
    days: int = Query(7, description="Look-back window in days"),
) -> dict:
    """Fetch and categorize current Sentry issues."""
    from app.services.sentry_triage_service import fetch_sentry_issues, categorize_issues

    try:
        issues = await fetch_sentry_issues(project, days)
        return categorize_issues(issues)
    except ValueError as exc:
        # SENTRY_AUTH_TOKEN not configured
        logger.warning("Bug triage unavailable: %s", exc)
        return {
            "total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0,
            "user_reported": 0, "frontend": 0, "backend": 0,
            "issues": {"critical": [], "high": [], "medium": [], "low": [], "user_reported": [], "by_platform": {"frontend": [], "backend": []}},
            "setup_required": True,
            "message": str(exc),
        }
    except Exception as exc:
        logger.error("Bug triage fetch failed: %s", exc)
        capture_error(exc)
        return {
            "total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0,
            "user_reported": 0, "frontend": 0, "backend": 0,
            "issues": {"critical": [], "high": [], "medium": [], "low": [], "user_reported": [], "by_platform": {"frontend": [], "backend": []}},
            "error": str(exc),
        }


@router.post(
    "/bugs/triage",
    summary="Run AI triage on Sentry issues",
)
async def run_bug_triage(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
    days: int = Query(7, description="Look-back window in days"),
) -> dict:
    """Run AI-powered triage on current Sentry issues to prioritize fixes."""
    from app.services.sentry_triage_service import fetch_sentry_issues, ai_triage

    try:
        issues = await fetch_sentry_issues(days=days)
        result = await ai_triage(issues)
        await _log_admin_action(
            db, admin_user, "bug_triage_run", "bugs", details=f"issues={len(issues)}"
        )
        await db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Bug triage failed: %s", exc)
        capture_error(exc)
        raise HTTPException(status_code=502, detail=f"Bug triage failed: {type(exc).__name__}")


@router.post(
    "/bugs/sprints",
    summary="Generate and save a sprint plan from AI triage",
)
async def create_sprint(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
    days: int = Query(3, description="Sprint duration in days"),
) -> dict:
    """Generate an AI sprint plan from triaged bugs and persist it."""
    from app.services.sentry_triage_service import (
        fetch_sentry_issues,
        ai_triage,
        generate_sprint_plan,
        save_sprint,
    )

    try:
        issues = await fetch_sentry_issues()
        triaged = await ai_triage(issues)
        sprint_plan = await generate_sprint_plan(triaged, days)
        sprint_id = await save_sprint(db, sprint_plan, triaged)
        await _log_admin_action(db, admin_user, "sprint_created", "sprint", sprint_id)
        await db.commit()
        return {"sprint_id": sprint_id, "plan": sprint_plan}
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Sprint creation failed: %s", exc)
        capture_error(exc)
        raise HTTPException(status_code=502, detail=f"Sprint creation failed: {type(exc).__name__}")


@router.get(
    "/bugs/sprints",
    summary="List past sprint plans",
)
async def list_sprints(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
    limit: int = Query(10, description="Max number of sprints to return"),
) -> list:
    """List recent sprint plans ordered by creation date."""
    from app.models.bug_triage import BugTriageSprint

    try:
        result = await db.execute(
            select(BugTriageSprint)
            .order_by(BugTriageSprint.created_at.desc())
            .limit(limit)
        )
        return [
            {
                "id": s.id,
                "status": s.status,
                "period_start": str(s.period_start),
                "period_end": str(s.period_end),
                "summary": s.summary_json,
                "plan": s.sprint_plan_json,
                "ai_analysis": s.ai_analysis,
                "resolution_notes": getattr(s, "resolution_notes_json", None),
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in result.scalars().all()
        ]
    except Exception as exc:
        logger.warning("Sprint listing failed (table may not exist): %s", exc)
        return []


@router.patch(
    "/bugs/sprints/{sprint_id}",
    summary="Update sprint status",
)
async def update_sprint_status(
    sprint_id: str,
    status: str = Query(..., description="New status: draft, active, or completed"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update the status of a sprint plan (draft/active/completed).

    When closing a sprint (status=completed), you may also send a JSON body
    with ``resolution_notes`` — a dict mapping item keys (e.g. "day_1-0") to
    fix descriptions so the history view shows what was done for each item.

    Body (optional):
        {
          "resolution_notes": {
            "day_1-0": "Fixed by adding null check in auth middleware",
            "day_2-1": "Root cause was stale DB connections — added pre-ping"
          },
          "completed_items": ["day_1-0", "day_1-1", "day_2-0"]
        }
    """
    from app.models.bug_triage import BugTriageSprint

    sprint = await db.get(BugTriageSprint, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    sprint.status = status

    # Persist resolution notes and completed-item list when closing
    if status == "completed":
        try:
            body = await request.json()
        except Exception:
            body = {}
        resolution_notes = body.get("resolution_notes", {})
        completed_items = body.get("completed_items", [])
        if resolution_notes or completed_items:
            sprint.resolution_notes_json = {
                "notes": resolution_notes,
                "completed_items": completed_items,
            }

    await _log_admin_action(
        db, admin_user, "sprint_updated", "sprint", sprint_id, f"status={status}"
    )
    await db.commit()
    return {"id": sprint.id, "status": sprint.status}


# =============================================================================
# MODULE: Performance & AI Monitoring (Sentry)
# =============================================================================

@router.get(
    "/performance/overview",
    summary="Performance and AI monitoring overview",
)
async def get_performance_overview(
    days: int = Query(7, description="Look-back window"),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Fetch performance metrics and AI call stats from Sentry."""
    from app.services.sentry_triage_service import fetch_performance_data

    try:
        return await fetch_performance_data(days)
    except Exception as exc:
        logger.warning("Performance data unavailable: %s", exc)
        return {
            "transactions": [],
            "ai_calls": [],
            "slow_queries": [],
            "error": str(exc),
        }


# =============================================================================
# MODULE: System Status — Live Service Health Checks
# =============================================================================

import asyncio
import time as _time
import httpx


async def _check_service(name: str, slug: str, category: str, check_fn) -> dict:
    """Run a single service health check with timeout and error handling."""
    start = _time.monotonic()
    try:
        detail = await asyncio.wait_for(check_fn(), timeout=5.0)
        latency = round((_time.monotonic() - start) * 1000)
        return {
            "name": name,
            "slug": slug,
            "category": category,
            "status": "operational",
            "latency_ms": latency,
            "detail": detail or "Healthy",
            "checked_at": datetime.utcnow().isoformat(),
        }
    except asyncio.TimeoutError:
        return {
            "name": name, "slug": slug, "category": category,
            "status": "down", "latency_ms": 5000,
            "detail": "Health check timed out (5s)",
            "checked_at": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        latency = round((_time.monotonic() - start) * 1000)
        return {
            "name": name, "slug": slug, "category": category,
            "status": "down", "latency_ms": latency,
            "detail": str(exc)[:200],
            "checked_at": datetime.utcnow().isoformat(),
        }


@router.get("/system-status", summary="Live system health status")
async def get_system_status(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Check health of all platform services concurrently."""
    from app.core.config import Settings
    cfg = Settings()

    # Define all health checks
    async def check_database():
        result = await db.execute(select(func.count()).select_from(User))
        count = result.scalar() or 0
        return f"{count} users in database"

    async def check_supabase_auth():
        if not cfg.SUPABASE_URL:
            raise ValueError("SUPABASE_URL not configured")
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{cfg.SUPABASE_URL}/auth/v1/settings", headers={
                "apikey": cfg.SUPABASE_ANON_KEY or "",
            })
            if resp.status_code < 400:
                return "Auth service responding"
            raise ValueError(f"Auth returned {resp.status_code}")

    async def check_claude():
        if not cfg.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not set")
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=cfg.ANTHROPIC_API_KEY)
        # Lightweight check — list models
        resp = await client.models.list(limit=1)
        return f"Claude API connected"

    async def check_openai():
        if not cfg.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set")
        return "API key configured"

    async def check_stripe():
        if not cfg.STRIPE_SECRET_KEY:
            raise ValueError("STRIPE_SECRET_KEY not set")
        import stripe
        stripe.api_key = cfg.STRIPE_SECRET_KEY
        acct = stripe.Account.retrieve()
        return f"Account: {acct.get('business_profile', {}).get('name', acct.id)}"

    async def check_daily():
        if not cfg.DAILY_API_KEY:
            raise ValueError("DAILY_API_KEY not set")
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get("https://api.daily.co/v1/rooms?limit=1", headers={
                "Authorization": f"Bearer {cfg.DAILY_API_KEY}",
            })
            if resp.status_code == 200:
                data = resp.json()
                count = data.get("total_count", len(data.get("data", [])))
                return f"{count} rooms available"
            raise ValueError(f"Daily.co returned {resp.status_code}")

    async def check_sendgrid():
        if not cfg.SENDGRID_API_KEY:
            raise ValueError("SENDGRID_API_KEY not set")
        if not cfg.EMAIL_ENABLED:
            return "API key set but EMAIL_ENABLED=False"
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get("https://api.sendgrid.com/v3/user/profile", headers={
                "Authorization": f"Bearer {cfg.SENDGRID_API_KEY}",
            })
            if resp.status_code == 200:
                return "SendGrid connected"
            raise ValueError(f"SendGrid returned {resp.status_code}")

    async def check_mapbox():
        if not cfg.MAPBOX_API_KEY:
            raise ValueError("MAPBOX_API_KEY not set")
        return "API key configured"

    async def check_sentry():
        if not cfg.SENTRY_AUTH_TOKEN:
            raise ValueError("SENTRY_AUTH_TOKEN not set")
        org = getattr(cfg, 'SENTRY_ORG_SLUG', 'commonground-s0')
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"https://sentry.io/api/0/organizations/{org}/", headers={
                "Authorization": f"Bearer {cfg.SENTRY_AUTH_TOKEN}",
            })
            if resp.status_code == 200:
                return f"Sentry org: {org}"
            raise ValueError(f"Sentry returned {resp.status_code}")

    async def check_gmail():
        try:
            from app.models.inbox import GoogleOAuthToken
            result = await db.execute(
                select(func.count()).select_from(GoogleOAuthToken)
            )
            count = result.scalar() or 0
            if count > 0:
                return f"{count} OAuth token(s) stored"
            raise ValueError("No OAuth tokens — Gmail not connected")
        except Exception as exc:
            if "GoogleOAuthToken" in str(exc) or "google_oauth_tokens" in str(exc):
                raise ValueError("google_oauth_tokens table not found")
            raise

    async def check_websocket():
        try:
            from app.core.websocket import manager
            active = len(manager.active_connections) if hasattr(manager, 'active_connections') else 0
            return f"{active} active connection(s)"
        except Exception:
            return "WebSocket manager available"

    async def check_blog():
        try:
            from app.models.blog import BlogPost
            result = await db.execute(
                select(func.count()).select_from(BlogPost)
            )
            count = result.scalar() or 0
            return f"{count} blog posts"
        except Exception:
            raise ValueError("Blog system unavailable")

    async def check_landing_pages():
        try:
            from app.models.lead import LandingPage
            result = await db.execute(
                select(func.count()).select_from(LandingPage)
            )
            count = result.scalar() or 0
            return f"{count} landing pages"
        except Exception:
            raise ValueError("Landing pages table unavailable")

    # Run all checks concurrently
    checks = [
        _check_service("Database (PostgreSQL)", "database", "infrastructure", check_database),
        _check_service("Authentication (Supabase)", "supabase_auth", "infrastructure", check_supabase_auth),
        _check_service("ARIA — Claude API", "claude", "ai", check_claude),
        _check_service("ARIA Fallback — OpenAI", "openai", "ai", check_openai),
        _check_service("Payment Processing (Stripe)", "stripe", "infrastructure", check_stripe),
        _check_service("KidComs Video (Daily.co)", "daily", "communication", check_daily),
        _check_service("Email Notifications (SendGrid)", "sendgrid", "communication", check_sendgrid),
        _check_service("Geolocation (Mapbox)", "mapbox", "infrastructure", check_mapbox),
        _check_service("Bug Tracking (Sentry)", "sentry", "ai", check_sentry),
        _check_service("Gmail Monitor", "gmail", "communication", check_gmail),
        _check_service("Real-time Messaging", "websocket", "communication", check_websocket),
        _check_service("Blog System", "blog", "content", check_blog),
        _check_service("Landing Pages", "landing_pages", "content", check_landing_pages),
    ]

    services = await asyncio.gather(*checks)

    # Determine overall status
    statuses = [s["status"] for s in services]
    critical_slugs = {"database", "supabase_auth", "claude"}
    critical_down = any(
        s["status"] == "down" and s["slug"] in critical_slugs for s in services
    )

    if critical_down:
        overall = "down"
    elif "down" in statuses:
        overall = "degraded"
    else:
        overall = "operational"

    return {
        "overall": overall,
        "checked_at": datetime.utcnow().isoformat(),
        "services": services,
        "total": len(services),
        "operational": statuses.count("operational"),
        "degraded": statuses.count("degraded"),
        "down": statuses.count("down"),
    }


# =============================================================================
# MODULE 15: Bug Hunt Cohorts (Organized QA Testing)
# =============================================================================

@router.post(
    "/bug-hunts",
    summary="Create a new bug hunt cohort",
    status_code=status.HTTP_201_CREATED,
)
async def create_bug_hunt(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new bug hunt cohort for organized QA testing."""
    from app.services.bug_hunt_service import create_cohort

    body = await request.json()
    cohort = await create_cohort(
        db,
        admin_user,
        name=body["name"],
        description=body.get("description"),
        target_feature=body.get("target_feature", "general"),
        family_count=body.get("family_count", 3),
        test_instructions=body.get("test_instructions"),
    )
    await _log_admin_action(db, admin_user, "bug_hunt_create", "bug_hunt", target_id=cohort.id, details=cohort.name)
    await db.commit()
    return {
        "id": cohort.id, "name": cohort.name, "description": cohort.description,
        "target_feature": cohort.target_feature, "status": cohort.status,
        "family_count": cohort.family_count, "test_instructions": cohort.test_instructions,
        "created_by": cohort.created_by, "started_at": None, "completed_at": None,
        "seed_config": None, "summary_json": None,
        "created_at": cohort.created_at.isoformat(), "updated_at": cohort.updated_at.isoformat(),
    }


@router.get(
    "/bug-hunts",
    summary="List bug hunt cohorts",
)
async def list_bug_hunts(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50),
    offset: int = Query(0),
) -> list:
    """List all bug hunt cohorts with summary counts."""
    from app.services.bug_hunt_service import list_cohorts
    return await list_cohorts(db, status_filter=status_filter, limit=limit, offset=offset)


@router.get(
    "/bug-hunts/{cohort_id}",
    summary="Get bug hunt cohort dashboard",
)
async def get_bug_hunt(
    cohort_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get full dashboard data for a bug hunt cohort."""
    from app.services.bug_hunt_service import get_cohort_dashboard

    try:
        return await get_cohort_dashboard(db, cohort_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post(
    "/bug-hunts/{cohort_id}/generate",
    summary="Generate seed data for bug hunt",
)
async def generate_bug_hunt_data(
    cohort_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Generate seed test families with accounts for the bug hunt."""
    from app.services.bug_hunt_service import generate_seed_families

    try:
        families = await generate_seed_families(db, cohort_id)
        await _log_admin_action(db, admin_user, "bug_hunt_generate", "bug_hunt", target_id=cohort_id, details=f"{len(families)} families")
        await db.commit()
        return {"status": "active", "families_created": len(families)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Bug hunt data generation failed: %s", exc)
        capture_error(exc)
        raise HTTPException(status_code=502, detail=f"Generation failed: {type(exc).__name__}: {exc}")


@router.patch(
    "/bug-hunts/{cohort_id}",
    summary="Update bug hunt cohort",
)
async def update_bug_hunt(
    cohort_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update a bug hunt cohort's details."""
    from app.models.bug_hunt import BugHuntCohort

    cohort = await db.get(BugHuntCohort, cohort_id)
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    body = await request.json()
    for field in ("name", "description", "test_instructions", "status"):
        if field in body:
            setattr(cohort, field, body[field])

    await _log_admin_action(db, admin_user, "bug_hunt_update", "bug_hunt", target_id=cohort_id)
    await db.commit()
    return {"id": cohort.id, "name": cohort.name, "status": cohort.status, "updated": True}


@router.post(
    "/bug-hunts/{cohort_id}/checklist",
    summary="Add checklist item",
    status_code=status.HTTP_201_CREATED,
)
async def add_bug_hunt_checklist_item(
    cohort_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Add a new checklist item to the bug hunt."""
    from app.services.bug_hunt_service import add_checklist_item

    body = await request.json()
    item = await add_checklist_item(db, cohort_id, title=body["title"], description=body.get("description"))
    await db.commit()
    return {
        "id": item.id, "cohort_id": item.cohort_id, "title": item.title,
        "description": item.description, "display_order": item.display_order,
        "is_completed": item.is_completed, "completed_by": None, "completed_at": None,
        "created_at": item.created_at.isoformat(),
    }


@router.patch(
    "/bug-hunts/{cohort_id}/checklist/{item_id}",
    summary="Toggle checklist item",
)
async def toggle_bug_hunt_checklist_item(
    cohort_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Toggle a checklist item's completion status."""
    from app.services.bug_hunt_service import toggle_checklist_item

    try:
        item = await toggle_checklist_item(db, item_id, admin_user)
        await db.commit()
        return {
            "id": item.id, "cohort_id": item.cohort_id, "title": item.title,
            "description": item.description, "display_order": item.display_order,
            "is_completed": item.is_completed, "completed_by": item.completed_by,
            "completed_at": item.completed_at.isoformat() if item.completed_at else None,
            "created_at": item.created_at.isoformat(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete(
    "/bug-hunts/{cohort_id}/checklist/{item_id}",
    summary="Delete checklist item",
)
async def delete_bug_hunt_checklist_item(
    cohort_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete a checklist item."""
    from app.models.bug_hunt import BugHuntChecklistItem

    item = await db.get(BugHuntChecklistItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
    return {"deleted": True}


@router.post(
    "/bug-hunts/{cohort_id}/notes",
    summary="Add note to bug hunt",
    status_code=status.HTTP_201_CREATED,
)
async def add_bug_hunt_note(
    cohort_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Add a tester note to the bug hunt."""
    from app.services.bug_hunt_service import add_note

    body = await request.json()
    note = await add_note(
        db, cohort_id, author_id=str(admin_user.id),
        content=body["content"], note_type=body.get("note_type", "observation"),
        family_id=body.get("family_id"),
    )
    await db.commit()
    return {
        "id": note.id, "cohort_id": note.cohort_id, "family_id": note.family_id,
        "author_id": note.author_id, "content": note.content, "note_type": note.note_type,
        "created_at": note.created_at.isoformat(),
    }


@router.post(
    "/bug-hunts/{cohort_id}/bugs",
    summary="Report a bug during bug hunt",
    status_code=status.HTTP_201_CREATED,
)
async def add_bug_hunt_bug_report(
    cohort_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Report a bug found during the bug hunt."""
    from app.services.bug_hunt_service import add_bug_report

    body = await request.json()
    report = await add_bug_report(
        db, cohort_id, reported_by=str(admin_user.id),
        title=body["title"], description=body["description"],
        severity=body.get("severity", "medium"),
        family_id=body.get("family_id"),
        steps_to_reproduce=body.get("steps_to_reproduce"),
    )
    await _log_admin_action(db, admin_user, "bug_hunt_bug_report", "bug_hunt", target_id=cohort_id, details=report.title)
    await db.commit()
    return {
        "id": report.id, "cohort_id": report.cohort_id, "family_id": report.family_id,
        "reported_by": report.reported_by, "title": report.title, "description": report.description,
        "severity": report.severity, "status": report.status,
        "sentry_issue_id": report.sentry_issue_id,
        "steps_to_reproduce": report.steps_to_reproduce,
        "screenshot_urls": report.screenshot_urls or [],
        "created_at": report.created_at.isoformat(),
    }


@router.patch(
    "/bug-hunts/{cohort_id}/bugs/{bug_id}",
    summary="Update bug report status",
)
async def update_bug_hunt_bug(
    cohort_id: str,
    bug_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update a bug report's status."""
    from app.services.bug_hunt_service import update_bug_status

    body = await request.json()
    try:
        bug = await update_bug_status(db, bug_id, status=body["status"])
        await db.commit()
        return {
            "id": bug.id, "cohort_id": bug.cohort_id, "title": bug.title,
            "severity": bug.severity, "status": bug.status,
            "created_at": bug.created_at.isoformat(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post(
    "/bug-hunts/{cohort_id}/feedback",
    summary="Add feedback to bug hunt",
    status_code=status.HTTP_201_CREATED,
)
async def add_bug_hunt_feedback(
    cohort_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Add tester feedback to the bug hunt."""
    from app.services.bug_hunt_service import add_feedback

    body = await request.json()
    fb = await add_feedback(
        db, cohort_id, submitted_by=str(admin_user.id),
        content=body["content"], category=body.get("category", "other"),
        rating=body.get("rating"), family_id=body.get("family_id"),
        feature_area=body.get("feature_area"),
    )
    await db.commit()
    return {
        "id": fb.id, "cohort_id": fb.cohort_id, "family_id": fb.family_id,
        "submitted_by": fb.submitted_by, "rating": fb.rating,
        "category": fb.category, "content": fb.content,
        "feature_area": fb.feature_area, "created_at": fb.created_at.isoformat(),
    }


@router.post(
    "/bug-hunts/{cohort_id}/complete",
    summary="Complete bug hunt cohort",
)
async def complete_bug_hunt(
    cohort_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Complete a bug hunt and generate summary."""
    from app.services.bug_hunt_service import complete_cohort as _complete

    try:
        cohort = await _complete(db, cohort_id)
        await _log_admin_action(db, admin_user, "bug_hunt_complete", "bug_hunt", target_id=cohort_id)
        await db.commit()
        return {
            "id": cohort.id, "name": cohort.name, "status": cohort.status,
            "completed_at": cohort.completed_at.isoformat() if cohort.completed_at else None,
            "summary_json": cohort.summary_json,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch(
    "/bug-hunts/{cohort_id}/families/{family_id}",
    summary="Update family test status",
)
async def update_bug_hunt_family(
    cohort_id: str,
    family_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update a test family's status and notes."""
    from app.services.bug_hunt_service import update_family_status

    body = await request.json()
    try:
        family = await update_family_status(
            db, family_id,
            test_status=body["test_status"],
            tester_notes=body.get("tester_notes"),
        )
        await db.commit()
        return {
            "id": family.id, "cohort_id": family.cohort_id,
            "test_status": family.test_status, "tester_notes": family.tester_notes,
            "parent_a_name": family.parent_a_name, "parent_b_name": family.parent_b_name,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete(
    "/bug-hunts/{cohort_id}",
    summary="Delete bug hunt cohort",
)
async def delete_bug_hunt(
    cohort_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete a bug hunt cohort and clean up generated data."""
    from app.services.bug_hunt_service import delete_cohort

    try:
        await delete_cohort(db, cohort_id)
        await _log_admin_action(db, admin_user, "bug_hunt_delete", "bug_hunt", target_id=cohort_id)
        await db.commit()
        return {"deleted": True}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post(
    "/bug-hunts/{cohort_id}/families/{family_id}/assign-tester",
    summary="Assign a tester to a bug hunt family",
    status_code=status.HTTP_201_CREATED,
)
async def assign_bug_hunt_tester(
    cohort_id: str,
    family_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Assign an external tester to a test family and send them an email."""
    from app.services.bug_hunt_service import assign_tester
    from app.services.email import email_service
    from app.core.config import settings

    body = await request.json()
    try:
        tester = await assign_tester(
            db, cohort_id, family_id,
            tester_name=body["tester_name"],
            tester_email=body["tester_email"],
        )

        # Build magic link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.find-commonground.com')
        magic_link = f"{frontend_url}/bug-hunt/test/{tester.access_token}"

        # Get cohort and family info for the email
        from app.models.bug_hunt import BugHuntCohort, BugHuntFamily
        cohort = await db.get(BugHuntCohort, cohort_id)
        family = await db.get(BugHuntFamily, family_id)
        if not cohort or not family:
            raise HTTPException(status_code=404, detail="Cohort or family not found")

        # Send assignment email
        email_sent = await email_service.send_bug_hunt_tester_assignment(
            to_email=tester.tester_email,
            tester_name=tester.tester_name,
            cohort_name=cohort.name,
            cohort_description=cohort.description,
            test_instructions=cohort.test_instructions,
            family_name=f"{family.parent_a_name.split(' ')[-1]} & {family.parent_b_name.split(' ')[-1]}",
            parent_a_email=family.parent_a_email,
            parent_a_password=family.parent_a_password,
            parent_a_name=family.parent_a_name,
            parent_b_email=family.parent_b_email,
            parent_b_password=family.parent_b_password,
            parent_b_name=family.parent_b_name,
            children_names=family.children_names or [],
            magic_link=magic_link,
        )

        if email_sent:
            tester.email_sent_at = datetime.utcnow()

        await _log_admin_action(
            db, admin_user, "bug_hunt_assign_tester", "bug_hunt",
            target_id=cohort_id, details=f"{tester.tester_name} ({tester.tester_email})"
        )
        await db.commit()

        return {
            "id": tester.id, "cohort_id": tester.cohort_id,
            "family_id": tester.family_id, "tester_name": tester.tester_name,
            "tester_email": tester.tester_email, "status": tester.status,
            "email_sent_at": tester.email_sent_at.isoformat() if tester.email_sent_at else None,
            "created_at": tester.created_at.isoformat(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/bug-hunts/{cohort_id}/testers/{tester_id}/revoke",
    summary="Revoke tester access",
)
async def revoke_bug_hunt_tester(
    cohort_id: str,
    tester_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Revoke a tester's access to the bug hunt."""
    from app.services.bug_hunt_service import revoke_tester

    try:
        tester = await revoke_tester(db, tester_id)
        await _log_admin_action(db, admin_user, "bug_hunt_revoke_tester", "bug_hunt", target_id=tester_id)
        await db.commit()
        return {"id": tester.id, "status": tester.status, "revoked": True}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post(
    "/bug-hunts/{cohort_id}/testers/{tester_id}/resend",
    summary="Resend tester invitation",
)
async def resend_bug_hunt_tester_invite(
    cohort_id: str,
    tester_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Regenerate token and resend invitation email to tester."""
    from app.services.bug_hunt_service import resend_tester_invite
    from app.services.email import email_service
    from app.core.config import settings

    try:
        tester = await resend_tester_invite(db, tester_id)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.find-commonground.com')
        magic_link = f"{frontend_url}/bug-hunt/test/{tester.access_token}"

        from app.models.bug_hunt import BugHuntCohort, BugHuntFamily
        cohort = await db.get(BugHuntCohort, cohort_id)
        family = await db.get(BugHuntFamily, tester.family_id)
        if not cohort or not family:
            raise HTTPException(status_code=404, detail="Cohort or family not found")

        email_sent = await email_service.send_bug_hunt_tester_assignment(
            to_email=tester.tester_email,
            tester_name=tester.tester_name,
            cohort_name=cohort.name,
            cohort_description=cohort.description,
            test_instructions=cohort.test_instructions,
            family_name=f"{family.parent_a_name.split(' ')[-1]} & {family.parent_b_name.split(' ')[-1]}",
            parent_a_email=family.parent_a_email,
            parent_a_password=family.parent_a_password,
            parent_a_name=family.parent_a_name,
            parent_b_email=family.parent_b_email,
            parent_b_password=family.parent_b_password,
            parent_b_name=family.parent_b_name,
            children_names=family.children_names or [],
            magic_link=magic_link,
        )

        if email_sent:
            tester.email_sent_at = datetime.utcnow()

        await _log_admin_action(db, admin_user, "bug_hunt_resend_tester", "bug_hunt", target_id=tester_id)
        await db.commit()
        return {"id": tester.id, "status": tester.status, "resent": True}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
