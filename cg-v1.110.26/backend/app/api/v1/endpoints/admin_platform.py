"""Platform administration actions (SuperAdmin).

Operator capabilities the dashboards previously lacked:
  - platform-wide child-safety incident oversight,
  - user lifecycle (reset MFA, password reset, soft-delete, reactivate),
  - subscription/tier grants,
  - global feature flags / kill-switches,
  - platform announcements + single-user notifications.

All mutating actions are written to the admin audit log.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select, and_, or_, func, desc, case as sql_case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin_user, get_current_user
from app.models.user import User, UserProfile
from app.models.audit import AuditLog
from app.models.circle_message import CircleMessage
from app.models.circle_call import CircleCallSession
from app.models.circle import CircleContact
from app.models.announcement import Announcement
from app.services import feature_flags
from app.services.push import push_service

logger = logging.getLogger(__name__)

router = APIRouter()         # mounted under /admin
public_router = APIRouter()  # mounted at root (authenticated, non-admin)

SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3, "severe": 4}


async def _audit(
    db: AsyncSession,
    admin: User,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    description: Optional[str] = None,
    method: str = "POST",
) -> None:
    db.add(
        AuditLog(
            user_id=str(admin.id),
            user_email=admin.email,
            action=f"admin:{action}",
            resource_type=resource_type,
            resource_id=resource_id,
            method=method,
            status="success",
            description=description,
        )
    )


# =============================================================================
# CHILD-SAFETY OVERSIGHT (platform-wide)
# =============================================================================

@router.get("/safety/incidents", summary="Platform-wide child-safety incidents")
async def safety_incidents(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    min_severity: Optional[str] = Query(None, description="low|medium|high|severe"),
    category: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Flagged KidSpace messages + flagged/terminated calls across ALL families,
    plus repeat-offender circle contacts. Read-only oversight."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    min_rank = SEVERITY_RANK.get((min_severity or "").lower(), 0)

    # --- flagged / hidden messages ---
    msg_rows = (
        await db.execute(
            select(CircleMessage)
            .where(
                and_(
                    CircleMessage.sent_at >= cutoff,
                    or_(
                        CircleMessage.aria_flagged.is_(True),
                        CircleMessage.is_hidden.is_(True),
                    ),
                )
            )
            .order_by(desc(CircleMessage.sent_at))
            .limit(limit)
        )
    ).scalars().all()

    def msg_severity(level: Optional[int]) -> str:
        return {1: "low", 2: "medium", 3: "high", 4: "severe"}.get(level or 0, "low")

    message_incidents = []
    for m in msg_rows:
        sev = msg_severity(m.aria_intervention_level)
        if min_rank and SEVERITY_RANK[sev] < min_rank:
            continue
        if category and (m.aria_category or "") != category:
            continue
        message_incidents.append(
            {
                "id": m.id,
                "family_file_id": m.family_file_id,
                "child_id": m.child_id,
                "sender_name": m.sender_name,
                "sender_type": m.sender_type,
                "sender_id": m.sender_id,
                "category": m.aria_category,
                "reason": m.aria_reason,
                "score": m.aria_score,
                "severity": sev,
                "is_hidden": m.is_hidden,
                "occurred_at": m.sent_at.isoformat() if m.sent_at else None,
            }
        )

    # --- flagged / terminated calls ---
    call_rows = (
        await db.execute(
            select(CircleCallSession)
            .where(
                and_(
                    CircleCallSession.initiated_at >= cutoff,
                    or_(
                        CircleCallSession.aria_terminated_call.is_(True),
                        CircleCallSession.aria_intervention_count > 0,
                    ),
                )
            )
            .options(selectinload(CircleCallSession.flags))
            .order_by(desc(CircleCallSession.initiated_at))
            .limit(limit)
        )
    ).scalars().all()

    call_incidents = []
    for c in call_rows:
        flags = [
            {
                "severity": f.severity,
                "categories": f.categories,
                "triggers": f.triggers,
                "intervention_type": f.intervention_type,
                "flagged_at": f.flagged_at.isoformat() if f.flagged_at else None,
            }
            for f in (c.flags or [])
        ]
        worst = max((SEVERITY_RANK.get(f["severity"], 0) for f in flags), default=0)
        if min_rank and worst < min_rank:
            continue
        if category and not any(category in (f["categories"] or []) for f in flags):
            continue
        call_incidents.append(
            {
                "id": c.id,
                "family_file_id": c.family_file_id,
                "child_id": c.child_id,
                "circle_contact_id": c.circle_contact_id,
                "status": c.status,
                "aria_terminated": c.aria_terminated_call,
                "termination_reason": c.aria_termination_reason,
                "intervention_count": c.aria_intervention_count,
                "overall_safety_score": c.overall_safety_score,
                "occurred_at": c.initiated_at.isoformat() if c.initiated_at else None,
                "has_recording": bool(c.recording_storage_path or c.recording_url),
                "flags": flags,
            }
        )

    # --- repeat-offender circle contacts (by call incidents, across families) ---
    repeat_rows = (
        await db.execute(
            select(
                CircleCallSession.circle_contact_id,
                func.count(func.distinct(CircleCallSession.family_file_id)),
                func.count(CircleCallSession.id),
                func.sum(sql_case((CircleCallSession.aria_terminated_call, 1), else_=0)),
            )
            .where(
                and_(
                    CircleCallSession.initiated_at >= cutoff,
                    or_(
                        CircleCallSession.aria_terminated_call.is_(True),
                        CircleCallSession.aria_intervention_count > 0,
                    ),
                )
            )
            .group_by(CircleCallSession.circle_contact_id)
            .having(func.count(CircleCallSession.id) > 1)
            .order_by(desc(func.count(CircleCallSession.id)))
            .limit(50)
        )
    ).all()

    contact_ids = [r[0] for r in repeat_rows if r[0]]
    names: dict[str, str] = {}
    if contact_ids:
        crows = (
            await db.execute(
                select(CircleContact).where(CircleContact.id.in_(contact_ids))
            )
        ).scalars().all()
        for cc in crows:
            names[cc.id] = getattr(cc, "contact_name", None) or "Contact"

    repeat_contacts = [
        {
            "circle_contact_id": r[0],
            "contact_name": names.get(r[0], "Contact"),
            "families_count": int(r[1] or 0),
            "incident_count": int(r[2] or 0),
            "terminated_count": int(r[3] or 0),
        }
        for r in repeat_rows
    ]

    await _audit(
        db, admin_user, "view_safety_incidents", "child_safety",
        description=f"days={days} min_severity={min_severity} category={category}",
        method="GET",
    )
    await db.commit()

    return {
        "window_days": days,
        "flagged_message_count": len(message_incidents),
        "flagged_call_count": len(call_incidents),
        "terminated_call_count": sum(1 for c in call_incidents if c["aria_terminated"]),
        "repeat_contact_count": len(repeat_contacts),
        "message_incidents": message_incidents,
        "call_incidents": call_incidents,
        "repeat_contacts": repeat_contacts,
    }


# =============================================================================
# USER LIFECYCLE
# =============================================================================

async def _get_user(db: AsyncSession, user_id: str) -> User:
    user = (
        await db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == user_id)
        )
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _guard_not_self_or_admin(user: User, admin_user: User) -> None:
    if str(user.id) == str(admin_user.id):
        raise HTTPException(status_code=400, detail="Cannot perform this action on your own account")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot perform this action on another admin")


@router.post("/users/{user_id}/reset-mfa", summary="Reset a user's MFA")
async def reset_mfa(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    user = await _get_user(db, user_id)
    _guard_not_self_or_admin(user, admin_user)
    user.mfa_enabled = False
    # Best-effort clear of Supabase MFA factors.
    try:
        from app.core.supabase import get_supabase_admin_client
        client = get_supabase_admin_client()
        if user.supabase_id and hasattr(client.auth, "admin"):
            factors = client.auth.admin.mfa.list_factors({"user_id": user.supabase_id})  # type: ignore[attr-defined]
            for f in getattr(factors, "factors", []) or []:
                client.auth.admin.mfa.delete_factor({"user_id": user.supabase_id, "id": f.id})  # type: ignore[attr-defined]
    except Exception as e:
        logger.info("reset_mfa: Supabase factor clear skipped/failed: %s", e)
    await _audit(db, admin_user, "reset_mfa", "user", user_id, description="MFA reset by admin")
    await db.commit()
    return {"id": user_id, "mfa_enabled": user.mfa_enabled}


@router.post("/users/{user_id}/reset-password", summary="Send a user a password reset")
async def reset_password(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    user = await _get_user(db, user_id)
    if user.is_deleted:
        raise HTTPException(status_code=400, detail="User is deleted")
    sent = False
    try:
        from app.core.supabase import get_supabase_admin_client
        client = get_supabase_admin_client()
        client.auth.reset_password_for_email(user.email)  # type: ignore[attr-defined]
        sent = True
    except Exception as e:
        logger.warning("reset_password: Supabase reset failed: %s", e)
    await _audit(
        db, admin_user, "reset_password", "user", user_id,
        description=f"Password reset email requested (sent={sent})",
    )
    await db.commit()
    return {"id": user_id, "reset_email_sent": sent}


@router.delete("/users/{user_id}", summary="Soft-delete a user")
async def soft_delete_user(
    user_id: str,
    reason: str = Query(..., min_length=3),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    user = await _get_user(db, user_id)
    _guard_not_self_or_admin(user, admin_user)

    # Cancel Stripe subscription best-effort before wiping fields.
    if user.profile and getattr(user.profile, "stripe_subscription_id", None):
        try:
            import stripe
            from app.core.config import settings as _settings
            if _settings.STRIPE_SECRET_KEY:
                stripe.api_key = _settings.STRIPE_SECRET_KEY
                await asyncio.to_thread(
                    stripe.Subscription.cancel,
                    user.profile.stripe_subscription_id,
                )
        except Exception as e:
            logger.warning("soft_delete_user: stripe cancel failed: %s", e)

    supabase_id = user.supabase_id
    user.is_active = False
    user.is_deleted = True
    user.deleted_at = datetime.utcnow()
    user.email = f"deleted_{user.id}@deleted.local"
    user.first_name = "Deleted"
    user.last_name = "User"
    user.phone = None
    if user.profile:
        user.profile.first_name = "Deleted"
        user.profile.last_name = "User"

    # Remove from Supabase Auth + revoke tokens.
    try:
        from app.core.supabase import get_supabase_admin_client
        if supabase_id:
            get_supabase_admin_client().auth.admin.delete_user(supabase_id)
    except Exception as e:
        logger.warning("soft_delete_user: supabase delete failed: %s", e)
    try:
        from app.core.redis_client import get_redis
        r = await get_redis()
        if r is not None:
            await r.setex(f"user_revoked:{user_id}", 7 * 24 * 60 * 60, "1")
    except Exception as e:
        logger.warning("soft_delete_user: revoke sentinel failed: %s", e)

    await _audit(
        db, admin_user, "delete_user", "user", user_id,
        description=f"Admin soft-deleted user. reason: {reason}", method="DELETE",
    )
    await db.commit()
    return {"id": user_id, "is_deleted": True}


@router.post("/users/{user_id}/reactivate", summary="Reactivate a suspended user")
async def reactivate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    user = await _get_user(db, user_id)
    if user.is_deleted:
        raise HTTPException(
            status_code=400,
            detail="User is deleted (PII redacted) and cannot be reactivated",
        )
    user.is_active = True
    await _audit(db, admin_user, "reactivate_user", "user", user_id, description="User reactivated")
    await db.commit()
    return {"id": user_id, "is_active": True}


# =============================================================================
# SUBSCRIPTION / TIER GRANTS
# =============================================================================

class SubscriptionGrant(BaseModel):
    tier: str
    status: Optional[str] = "active"
    note: Optional[str] = None


@router.patch("/users/{user_id}/subscription", summary="Grant/override a user's subscription tier")
async def grant_subscription(
    user_id: str,
    data: SubscriptionGrant,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    user = await _get_user(db, user_id)
    if not user.profile:
        raise HTTPException(status_code=400, detail="User has no profile")
    old_tier = user.profile.subscription_tier
    old_status = user.profile.subscription_status
    user.profile.subscription_tier = data.tier
    if data.status:
        user.profile.subscription_status = data.status
    await _audit(
        db, admin_user, "grant_subscription", "user", user_id, method="PATCH",
        description=(
            f"tier: {old_tier} -> {data.tier}, status: {old_status} -> "
            f"{data.status}, note: {data.note or '-'}"
        ),
    )
    await db.commit()
    return {
        "id": user_id,
        "subscription_tier": user.profile.subscription_tier,
        "subscription_status": user.profile.subscription_status,
    }


# =============================================================================
# SINGLE-USER NOTIFICATION
# =============================================================================

class NotifyBody(BaseModel):
    title: str
    body: str
    url: Optional[str] = None


@router.post("/users/{user_id}/notify", summary="Send a push notification to a user")
async def notify_user(
    user_id: str,
    data: NotifyBody,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    await _get_user(db, user_id)
    sent = 0
    try:
        sent = await push_service.send_to_users(
            db, [user_id], data.title, data.body, url=data.url, tag="admin-notice"
        )
    except Exception as e:
        logger.warning("notify_user: push failed: %s", e)
    await _audit(
        db, admin_user, "notify_user", "user", user_id,
        description=f"Sent admin notification: {data.title}",
    )
    await db.commit()
    return {"id": user_id, "push_sent": sent}


# =============================================================================
# FEATURE FLAGS
# =============================================================================

class FlagUpdate(BaseModel):
    value: bool


@router.get("/feature-flags", summary="List global feature flags")
async def list_feature_flags(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    return {"flags": await feature_flags.all_flags(db)}


@router.put("/feature-flags/{key}", summary="Set a global feature flag")
async def set_feature_flag(
    key: str,
    data: FlagUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    if key not in feature_flags.FEATURE_FLAGS:
        raise HTTPException(status_code=404, detail="Unknown feature flag")
    await feature_flags.set_flag(db, key, data.value)
    await _audit(
        db, admin_user, "set_feature_flag", "feature_flag", key, method="PUT",
        description=f"{key} = {data.value}",
    )
    await db.commit()
    return {"key": key, "value": data.value}


# =============================================================================
# ANNOUNCEMENTS
# =============================================================================

class AnnouncementBody(BaseModel):
    title: str
    body: str
    level: str = "info"
    audience: str = "all"
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


def _announcement_dict(a: Announcement) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "body": a.body,
        "level": a.level,
        "audience": a.audience,
        "is_active": a.is_active,
        "starts_at": a.starts_at.isoformat() if a.starts_at else None,
        "ends_at": a.ends_at.isoformat() if a.ends_at else None,
        "created_by_email": a.created_by_email,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/announcements", summary="List announcements")
async def list_announcements(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    rows = (
        await db.execute(select(Announcement).order_by(desc(Announcement.created_at)))
    ).scalars().all()
    return {"announcements": [_announcement_dict(a) for a in rows]}


@router.post("/announcements", summary="Create an announcement")
async def create_announcement(
    data: AnnouncementBody,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    a = Announcement(
        id=str(uuid4()),
        title=data.title,
        body=data.body,
        level=data.level if data.level in ("info", "warning", "critical") else "info",
        audience=data.audience,
        is_active=data.is_active,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        created_by=str(admin_user.id),
        created_by_email=admin_user.email,
    )
    db.add(a)
    await _audit(db, admin_user, "create_announcement", "announcement", a.id, description=data.title)
    await db.commit()
    await db.refresh(a)
    return _announcement_dict(a)


@router.patch("/announcements/{announcement_id}", summary="Update an announcement")
async def update_announcement(
    announcement_id: str,
    data: AnnouncementBody,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    a = (
        await db.execute(select(Announcement).where(Announcement.id == announcement_id))
    ).scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")
    a.title = data.title
    a.body = data.body
    a.level = data.level if data.level in ("info", "warning", "critical") else a.level
    a.audience = data.audience
    a.is_active = data.is_active
    a.starts_at = data.starts_at
    a.ends_at = data.ends_at
    await _audit(db, admin_user, "update_announcement", "announcement", a.id, method="PATCH")
    await db.commit()
    return _announcement_dict(a)


# --- public (any authenticated user) ---

@public_router.get("/announcements/active", summary="Active announcements for the current user")
async def active_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    rows = (
        await db.execute(
            select(Announcement).where(Announcement.is_active.is_(True))
        )
    ).scalars().all()
    live = [_announcement_dict(a) for a in rows if a.is_live()]
    return {"announcements": live}
