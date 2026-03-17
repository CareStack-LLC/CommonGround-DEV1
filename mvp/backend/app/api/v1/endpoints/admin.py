"""
SuperAdmin Portal API - Platform administration endpoints.

MVP Modules (from GTM SuperAdmin Portal Spec):
01 - Command Dashboard (user counts, MRR, active cases)
02 - User Management (search, view, status)
03 - Billing Overview (Stripe transactions, subscription metrics)
04 - Support (placeholder for ticket system)

All endpoints require is_admin=True on the authenticated user.
All actions are logged to the audit_logs table.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User, UserProfile
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)
router = APIRouter()


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
# MODULE 01: Command Dashboard
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

    # MRR estimate (rough calculation from tier counts)
    tier_prices = {
        "plus": 12.00, "family_plus": 25.00,
        "solo": 99.00, "small_firm": 299.00, "mid_size": 799.00,
    }
    estimated_mrr = sum(
        tier_prices.get(tier, 0) * count
        for tier, count in tier_counts.items()
    )

    await _log_admin_action(db, admin_user, "view_dashboard", "platform")
    await db.commit()

    return {
        "users": {
            "total": total_users,
            "active_30d": active_users_30d,
            "new_7d": new_users_7d,
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
        },
        "generated_at": now.isoformat(),
    }


# =============================================================================
# MODULE 02: User Management
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

    # Apply pagination
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)

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
        "profile": {
            "subscription_tier": user.profile.subscription_tier,
            "subscription_status": user.profile.subscription_status,
            "stripe_customer_id": user.profile.stripe_customer_id,
            "stripe_subscription_id": getattr(user.profile, 'stripe_subscription_id', None),
        } if user.profile else None,
        "family_file_count": ff_count,
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
# MODULE 03: Billing Overview
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

    await _log_admin_action(db, admin_user, "view_billing", "platform")
    await db.commit()

    return {
        "consumer_subscriptions": breakdown,
        "professional_subscriptions": prof_breakdown,
        "past_due_count": past_due_count,
        "note": "For detailed transaction data, use the Stripe Dashboard.",
    }


# =============================================================================
# MODULE 04: Admin Audit Log
# =============================================================================

@router.get(
    "/audit-log",
    summary="View admin audit log",
)
async def get_admin_audit_log(
    action: Optional[str] = Query(None, description="Filter by action prefix"),
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
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "description": log.description,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# =============================================================================
# MODULE 05: Platform Statistics
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
