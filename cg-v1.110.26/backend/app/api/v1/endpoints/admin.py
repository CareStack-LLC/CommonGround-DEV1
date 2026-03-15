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


# =============================================================================
# MODULE 06: Report Request Management (Paid Reports Pipeline)
# =============================================================================

@router.get(
    "/reports/requests",
    summary="List report requests",
)
async def list_report_requests(
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
    summary="Get report request details",
)
async def get_report_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get detailed info for a single report request."""
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {str(e)}"
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
# MODULE 07: Bulk Monthly Reports
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
                'https://common-ground-blue.vercel.app'
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
                "error": str(e),
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
