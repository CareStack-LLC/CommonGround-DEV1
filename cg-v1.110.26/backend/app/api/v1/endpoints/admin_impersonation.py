"""Admin impersonation + bulk user actions + universal CSV exports.

Impersonation
-------------
POST /admin/users/{id}/impersonate — superadmin claims a short-lived token
  whose `sub` is the target user; starts an `ImpersonationSession` row.
POST /admin/impersonate/end        — stamps `ended_at` on the active session.
GET  /admin/impersonation/sessions — paginated session history for audit view.

Bulk user actions
-----------------
POST /admin/users/bulk — apply one of {status | tier | send_email} to many
  users in one request. Returns per-user success/failure breakdown.

CSV exports
-----------
GET /admin/users/export.csv
GET /admin/leads/export.csv
GET /admin/audit-log/export.csv

Each export reuses app.utils.csv_export.stream_csv_rows for chunked streaming.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_admin_user
from app.models.audit import AuditLog
from app.models.impersonation import ImpersonationSession
from app.models.user import User, UserProfile
from app.utils.csv_export import stream_csv_rows, today_suffix

logger = logging.getLogger(__name__)
router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# Impersonation
# ═══════════════════════════════════════════════════════════════════════════

# Impersonation tokens are strictly shorter-lived than normal access tokens —
# a superadmin shouldn't keep an impersonation open across sessions.
_IMPERSONATION_TTL_MINUTES = 30


class ImpersonateRequest(BaseModel):
    reason: Optional[str] = Field(
        None,
        description="Optional free-text reason — appears in the audit viewer",
        max_length=500,
    )


class EndImpersonationRequest(BaseModel):
    session_id: str
    end_reason: Optional[str] = Field("admin_ended", max_length=32)


@router.post("/users/{user_id}/impersonate")
async def start_impersonation(
    user_id: str,
    body: ImpersonateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Start an impersonation session. Returns a short-lived access token whose
    `sub` is the target user but which carries `real_sub` + `imp_sid` so we
    can attribute downstream audit rows to both identities.
    """
    if str(user_id) == str(admin_user.id):
        raise HTTPException(
            status_code=400,
            detail="Cannot impersonate yourself",
        )

    target_q = await db.execute(select(User).where(User.id == user_id))
    target = target_q.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    if target.is_admin:
        # Guard rail — don't let one admin silently act as another admin.
        raise HTTPException(
            status_code=403,
            detail="Impersonating other admins is not allowed",
        )

    session = ImpersonationSession(
        superadmin_id=str(admin_user.id),
        superadmin_email=admin_user.email,
        target_user_id=str(target.id),
        target_email=target.email,
        started_at=datetime.utcnow(),
        action_count=0,
        ip_address=(request.client.host if request.client else None),
        user_agent=(request.headers.get("user-agent") or "")[:500] or None,
        reason=body.reason,
    )
    db.add(session)
    await db.flush()  # populate session.id

    # Token payload: sub=target so get_current_user loads the target; real_sub
    # + imp_sid + act_as preserve accountability. Short TTL (30 min).
    token = create_access_token(
        data={
            "sub": str(target.id),
            "act_as": str(target.id),
            "real_sub": str(admin_user.id),
            "imp_sid": str(session.id),
            "type": "access",
        },
        expires_delta=timedelta(minutes=_IMPERSONATION_TTL_MINUTES),
    )

    # Audit the START of the impersonation with the real admin identity
    db.add(AuditLog(
        user_id=str(admin_user.id),
        user_email=admin_user.email,
        action="admin:impersonate_start",
        resource_type="user",
        resource_id=str(target.id),
        method="POST",
        status="success",
        description=f"Impersonating {target.email}. Reason: {body.reason or 'n/a'}",
        extra_metadata={
            "session_id": str(session.id),
            "target_email": target.email,
        },
        ip_address=session.ip_address,
    ))

    await db.commit()
    await db.refresh(session)

    return {
        "session_id": str(session.id),
        "target_user_id": str(target.id),
        "target_email": target.email,
        "expires_in_minutes": _IMPERSONATION_TTL_MINUTES,
        "access_token": token,
        "started_at": session.started_at.isoformat(),
    }


@router.post("/impersonate/end")
async def end_impersonation(
    body: EndImpersonationRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Close out an active impersonation session.

    Any admin can end any session — useful for "kill all open sessions" ops.
    The session row is looked up by id (not by any ambient state) so this
    endpoint works whether or not the caller is currently holding an
    impersonation token.
    """
    result = await db.execute(
        select(ImpersonationSession).where(ImpersonationSession.id == body.session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.ended_at:
        return {
            "session_id": str(session.id),
            "already_ended": True,
            "ended_at": session.ended_at.isoformat(),
        }

    session.ended_at = datetime.utcnow()
    session.end_reason = body.end_reason or "admin_ended"

    db.add(AuditLog(
        user_id=str(admin_user.id),
        user_email=admin_user.email,
        action="admin:impersonate_end",
        resource_type="user",
        resource_id=str(session.target_user_id),
        method="POST",
        status="success",
        description=f"Ended impersonation session {session.id}",
        extra_metadata={"session_id": str(session.id), "end_reason": session.end_reason},
    ))

    await db.commit()
    return {
        "session_id": str(session.id),
        "ended_at": session.ended_at.isoformat(),
        "duration_seconds": int((session.ended_at - session.started_at).total_seconds()),
    }


@router.get("/impersonation/sessions")
async def list_impersonation_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    target_user_id: Optional[str] = Query(None),
    superadmin_id: Optional[str] = Query(None),
    open_only: bool = Query(False, description="Only sessions without ended_at"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Paginated history for the impersonation audit viewer."""
    q = select(ImpersonationSession)
    count_q = select(func.count(ImpersonationSession.id))
    if target_user_id:
        q = q.where(ImpersonationSession.target_user_id == target_user_id)
        count_q = count_q.where(ImpersonationSession.target_user_id == target_user_id)
    if superadmin_id:
        q = q.where(ImpersonationSession.superadmin_id == superadmin_id)
        count_q = count_q.where(ImpersonationSession.superadmin_id == superadmin_id)
    if open_only:
        q = q.where(ImpersonationSession.ended_at.is_(None))
        count_q = count_q.where(ImpersonationSession.ended_at.is_(None))

    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(desc(ImpersonationSession.started_at))
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = list((await db.execute(q)).scalars())

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "sessions": [
            {
                "id": str(s.id),
                "superadmin_id": s.superadmin_id,
                "superadmin_email": s.superadmin_email,
                "target_user_id": s.target_user_id,
                "target_email": s.target_email,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "end_reason": s.end_reason,
                "duration_seconds": (
                    int((s.ended_at - s.started_at).total_seconds())
                    if s.ended_at and s.started_at else None
                ),
                "action_count": s.action_count,
                "ip_address": s.ip_address,
                "reason": s.reason,
            }
            for s in rows
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════
# Bulk user actions
# ═══════════════════════════════════════════════════════════════════════════

_VALID_BULK_ACTIONS = {"status", "tier"}


class BulkUserAction(BaseModel):
    user_ids: list[str] = Field(..., min_length=1, max_length=1000)
    action: str = Field(..., description="'status' or 'tier'")
    # For action=status: {is_active: bool, reason: str}
    # For action=tier:   {subscription_tier: str, reason: str}
    params: dict = Field(default_factory=dict)


@router.post("/users/bulk")
async def bulk_user_action(
    body: BulkUserAction,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Apply an action to a batch of users.

    Supported actions:
      - status → params: {is_active: bool, reason: str}
      - tier   → params: {subscription_tier: str, reason: str}

    Returns a per-user breakdown. Requires a `reason` on any mutating op for
    audit trail parity with the single-user endpoint.
    """
    if body.action not in _VALID_BULK_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action. Must be one of: {sorted(_VALID_BULK_ACTIONS)}",
        )

    reason = (body.params.get("reason") or "").strip()
    if not reason or len(reason) < 3:
        raise HTTPException(
            status_code=400,
            detail="`reason` (min 3 chars) is required for bulk operations",
        )

    self_id = str(admin_user.id)
    succeeded: list[str] = []
    failed: list[dict] = []

    # Load all users in one query for efficiency
    users_q = await db.execute(select(User).where(User.id.in_(body.user_ids)))
    users_by_id = {str(u.id): u for u in users_q.scalars()}

    for uid in body.user_ids:
        try:
            user = users_by_id.get(uid)
            if not user:
                failed.append({"user_id": uid, "error": "not_found"})
                continue
            if str(user.id) == self_id:
                failed.append({"user_id": uid, "error": "cannot_modify_self"})
                continue

            if body.action == "status":
                is_active = body.params.get("is_active")
                if not isinstance(is_active, bool):
                    failed.append({"user_id": uid, "error": "is_active_required"})
                    continue
                user.is_active = is_active
                db.add(AuditLog(
                    user_id=self_id, user_email=admin_user.email,
                    action="admin:bulk_update_user_status",
                    resource_type="user", resource_id=uid,
                    method="POST", status="success",
                    description=f"is_active={is_active}; reason: {reason}",
                ))
                succeeded.append(uid)

            elif body.action == "tier":
                new_tier = body.params.get("subscription_tier")
                if not new_tier:
                    failed.append({"user_id": uid, "error": "subscription_tier_required"})
                    continue
                # Load profile — may be lazy-loaded
                profile_q = await db.execute(
                    select(UserProfile).where(UserProfile.user_id == uid)
                )
                profile = profile_q.scalar_one_or_none()
                if not profile:
                    failed.append({"user_id": uid, "error": "profile_missing"})
                    continue
                old_tier = profile.subscription_tier
                profile.subscription_tier = new_tier
                db.add(AuditLog(
                    user_id=self_id, user_email=admin_user.email,
                    action="admin:bulk_update_tier",
                    resource_type="user_profile", resource_id=str(profile.id),
                    method="POST", status="success",
                    description=f"tier: {old_tier} -> {new_tier}; reason: {reason}",
                    old_values={"subscription_tier": old_tier},
                    new_values={"subscription_tier": new_tier},
                ))
                succeeded.append(uid)

        except Exception as e:
            logger.error("bulk_user_action failed for %s: %s", uid, e)
            failed.append({"user_id": uid, "error": str(e)[:200]})

    await db.commit()

    return {
        "total_requested": len(body.user_ids),
        "succeeded": len(succeeded),
        "failed": len(failed),
        "succeeded_ids": succeeded,
        "failures": failed,
    }


# ═══════════════════════════════════════════════════════════════════════════
# CSV exports
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/users/export.csv")
async def export_users_csv(
    search: Optional[str] = Query(None),
    tier: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(10_000, ge=1, le=100_000),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Stream filtered users as CSV. Filters mirror the users search UI."""
    q = (
        select(User, UserProfile)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .limit(limit)
    )
    if search:
        like = f"%{search}%"
        q = q.where(
            (User.email.ilike(like))
            | (User.first_name.ilike(like))
            | (User.last_name.ilike(like))
        )
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    if tier:
        q = q.where(UserProfile.subscription_tier == tier)

    rows_raw = await db.execute(q)

    def _rows():
        for user, profile in rows_raw:
            yield {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
                "email_verified": user.email_verified,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "subscription_tier": profile.subscription_tier if profile else None,
                "subscription_status": profile.subscription_status if profile else None,
                "subscription_ends_at": (
                    profile.subscription_ends_at.isoformat()
                    if profile and profile.subscription_ends_at else None
                ),
                "stripe_customer_id": profile.stripe_customer_id if profile else None,
            }

    columns = [
        "id", "email", "first_name", "last_name", "is_active", "is_admin",
        "email_verified", "created_at",
        "subscription_tier", "subscription_status", "subscription_ends_at",
        "stripe_customer_id",
    ]
    filename = f"users_{today_suffix()}.csv"

    # Audit the export
    db.add(AuditLog(
        user_id=str(admin_user.id), user_email=admin_user.email,
        action="admin:export_users_csv",
        resource_type="users", resource_id=None,
        method="GET", status="success",
        description=f"filter: search={search}, tier={tier}, is_active={is_active}, limit={limit}",
    ))
    await db.commit()

    return stream_csv_rows(_rows(), columns=columns, filename=filename)


@router.get("/leads/export.csv")
async def export_leads_csv(
    list_id: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(10_000, ge=1, le=100_000),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Stream filtered leads as CSV. Useful for offline analysis + handoffs."""
    from app.models.lead import Lead

    q = select(Lead).limit(limit)
    if list_id:
        q = q.where(Lead.lead_list_id == list_id)
    if stage:
        q = q.where(Lead.stage == stage)
    if source:
        q = q.where(Lead.source == source)

    rows_raw = await db.execute(q)

    def _rows():
        for lead in rows_raw.scalars():
            yield {
                "id": lead.id,
                "email": lead.email,
                "first_name": lead.first_name,
                "last_name": lead.last_name,
                "company": lead.company,
                "title": lead.title,
                "source": lead.source,
                "status": lead.status,
                "stage": getattr(lead, "stage", None),
                "lost_reason": getattr(lead, "lost_reason", None),
                "closed_at": (
                    lead.closed_at.isoformat()
                    if getattr(lead, "closed_at", None) else None
                ),
                "utm_source": getattr(lead, "utm_source", None),
                "utm_medium": getattr(lead, "utm_medium", None),
                "utm_campaign": getattr(lead, "utm_campaign", None),
                "converted_user_id": getattr(lead, "converted_user_id", None),
                "converted_at": (
                    lead.converted_at.isoformat()
                    if getattr(lead, "converted_at", None) else None
                ),
                "created_at": lead.created_at.isoformat() if lead.created_at else None,
            }

    columns = [
        "id", "email", "first_name", "last_name", "company", "title",
        "source", "status", "stage", "lost_reason", "closed_at",
        "utm_source", "utm_medium", "utm_campaign",
        "converted_user_id", "converted_at", "created_at",
    ]
    filename = f"leads_{today_suffix()}.csv"

    db.add(AuditLog(
        user_id=str(admin_user.id), user_email=admin_user.email,
        action="admin:export_leads_csv",
        resource_type="leads", resource_id=list_id,
        method="GET", status="success",
        description=f"filter: list_id={list_id}, stage={stage}, source={source}, limit={limit}",
    ))
    await db.commit()

    return stream_csv_rows(_rows(), columns=columns, filename=filename)


@router.get("/audit-log/export.csv")
async def export_audit_log_csv(
    days: int = Query(30, ge=1, le=365),
    user_email: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(10_000, ge=1, le=100_000),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Stream filtered audit-log rows as CSV for offline analysis."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    q = select(AuditLog).where(AuditLog.created_at >= cutoff).order_by(desc(AuditLog.created_at)).limit(limit)
    if user_email:
        q = q.where(AuditLog.user_email == user_email)
    if action:
        q = q.where(AuditLog.action == action)

    rows_raw = await db.execute(q)

    def _rows():
        for row in rows_raw.scalars():
            yield {
                "id": row.id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "user_id": row.user_id,
                "user_email": row.user_email,
                "ip_address": row.ip_address,
                "action": row.action,
                "resource_type": row.resource_type,
                "resource_id": row.resource_id,
                "case_id": row.case_id,
                "method": row.method,
                "status": row.status,
                "status_code": row.status_code,
                "description": row.description,
                "extra_metadata": row.extra_metadata,
            }

    columns = [
        "id", "created_at", "user_id", "user_email", "ip_address",
        "action", "resource_type", "resource_id", "case_id",
        "method", "status", "status_code", "description", "extra_metadata",
    ]
    filename = f"audit_log_{today_suffix()}.csv"

    # Also audit the export itself (meta)
    db.add(AuditLog(
        user_id=str(admin_user.id), user_email=admin_user.email,
        action="admin:export_audit_log_csv",
        resource_type="audit_logs", resource_id=None,
        method="GET", status="success",
        description=f"filter: days={days}, user_email={user_email}, action={action}, limit={limit}",
    ))
    await db.commit()

    return stream_csv_rows(_rows(), columns=columns, filename=filename)
