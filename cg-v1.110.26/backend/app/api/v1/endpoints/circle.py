"""
Circle API endpoints for managing approved child contacts.

The Circle is a list of trusted contacts (grandparents, family friends, etc.)
that a child can communicate with through KidComs.
"""

import hashlib
import json
import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.utils.sentry_helpers import capture_error
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.circle import CircleContact, ApprovalMode
from app.models.kidcoms import KidComsSettings
from app.models.circle_call import CircleCallSession, CircleCallStatus
from app.services.aria_circle_monitor import aria_circle_monitor
from app.models.audit import EventLog
from app.models.case import Case
from app.models.activity import ActivityType
from app.services.activity import ActivityService
from app.services.notification_service import notification_service
from app.services.push import push_service
from app.schemas.circle import (
    CircleContactCreate,
    CircleContactUpdate,
    CircleContactResponse,
    CircleContactListResponse,
    CircleContactApproval,
    CircleContactInvite,
    CircleContactInviteResponse,
    RELATIONSHIP_CHOICES,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_family_file_with_access(
    db: AsyncSession, family_file_id: str, user_id: str
) -> FamilyFile:
    """Get family file and verify user has access."""
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    # Check if user is a parent in this family file
    if family_file.parent_a_id != user_id and family_file.parent_b_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this family file"
        )

    return family_file


async def _create_event_log(
    db: AsyncSession,
    family_file_id: str,
    event_type: str,
    category: str,
    actor_id: Optional[str],
    event_data: dict,
    severity: str = "info",
    related_user_id: Optional[str] = None,
    related_resource_type: Optional[str] = None,
    related_resource_id: Optional[str] = None,
    source: str = "api",
):
    """
    Create an immutable EventLog entry for court-evidence chain of custody.

    Non-fatal: failures are logged but do not affect the calling operation.
    """
    try:
        # Find the case associated with this family file
        case_result = await db.execute(
            select(Case).where(Case.family_file_id == family_file_id).limit(1)
        )
        case = case_result.scalar_one_or_none()
        if not case:
            return

        # Get the next sequence number for this case
        seq_result = await db.execute(
            select(func.coalesce(func.max(EventLog.sequence_number), 0)).where(
                EventLog.case_id == str(case.id)
            )
        )
        next_seq = (seq_result.scalar() or 0) + 1

        # Get previous hash for chain linking
        prev_result = await db.execute(
            select(EventLog.content_hash)
            .where(EventLog.case_id == str(case.id))
            .order_by(desc(EventLog.sequence_number))
            .limit(1)
        )
        previous_hash = prev_result.scalar_one_or_none()

        # Compute content hash
        content_str = json.dumps(event_data, sort_keys=True, default=str)
        content_hash = hashlib.sha256(content_str.encode()).hexdigest()

        event_log = EventLog(
            event_type=event_type,
            case_id=str(case.id),
            actor_id=actor_id,
            event_timestamp=datetime.utcnow(),
            event_data=event_data,
            content_hash=content_hash,
            previous_hash=previous_hash,
            sequence_number=next_seq,
            source=source,
            category=category,
            severity=severity,
            related_user_id=related_user_id,
            related_resource_type=related_resource_type,
            related_resource_id=related_resource_id,
        )
        db.add(event_log)
    except Exception as e:
        logger.error(f"Failed to create EventLog ({event_type}): {e}")
        capture_error(e)


async def get_approval_mode(db: AsyncSession, family_file_id: str) -> ApprovalMode:
    """Get the approval mode for circle contacts."""
    result = await db.execute(
        select(KidComsSettings).where(KidComsSettings.family_file_id == family_file_id)
    )
    settings = result.scalar_one_or_none()

    if settings:
        return ApprovalMode(settings.circle_approval_mode)
    return ApprovalMode.BOTH_PARENTS


def is_parent_a(family_file: FamilyFile, user_id: str) -> bool:
    """Check if user is parent A in the family file."""
    return family_file.parent_a_id == user_id


async def _end_active_calls_for_contact(
    db: AsyncSession, contact_id: str, reason: str
) -> int:
    """
    End any IN-PROGRESS circle calls with a contact (used when a parent blocks
    the contact mid-call). Reuses the shared ARIA teardown so the Daily room is
    torn down and participants are disconnected server-side.
    """
    result = await db.execute(
        select(CircleCallSession).where(
            CircleCallSession.circle_contact_id == contact_id,
            CircleCallSession.status == CircleCallStatus.ACTIVE.value,
        )
    )
    sessions = result.scalars().all()
    for session in sessions:
        try:
            await aria_circle_monitor.terminate_session_for_safety(db, session, reason)
        except Exception as e:
            logger.error(f"Failed to end active call {session.id} on contact block: {e}")
            capture_error(e)
    return len(sessions)


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=CircleContactResponse,
    summary="Add circle contact",
    description="Add a new contact to a child's approved circle."
)
async def create_circle_contact(
    contact_data: CircleContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a new contact to the approved circle.

    - **child_id**: If null, contact is approved for ALL children
    - **relationship**: grandparent, aunt, uncle, etc.
    - Contact will be pending approval from other parent (based on settings)

    Requires a Complete subscription, and enforces the plan's contact limit.
    """
    from app.services.feature_gate import feature_gate
    try:
        await feature_gate.enforce_circle_contact_limit(
            db, current_user, contact_data.family_file_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    # Verify access to family file
    family_file = await get_family_file_with_access(
        db, contact_data.family_file_id, current_user.id
    )

    # If child_id is provided, verify child belongs to this family
    if contact_data.child_id:
        child_result = await db.execute(
            select(Child).where(
                and_(
                    Child.id == contact_data.child_id,
                    Child.family_file_id == contact_data.family_file_id
                )
            )
        )
        child = child_result.scalar_one_or_none()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child not found in this family file"
            )

    # Create the contact
    contact = CircleContact(
        family_file_id=contact_data.family_file_id,
        child_id=contact_data.child_id,
        contact_name=contact_data.contact_name,
        contact_email=contact_data.contact_email,
        contact_phone=contact_data.contact_phone,
        relationship_type=contact_data.relationship_type,
        photo_url=contact_data.photo_url,
        notes=contact_data.notes,
        added_by=current_user.id,
        availability_override=contact_data.availability_override,
    )

    # Auto-approve for the creating parent
    if is_parent_a(family_file, current_user.id):
        contact.approved_by_parent_a_at = datetime.utcnow()
    else:
        contact.approved_by_parent_b_at = datetime.utcnow()

    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    # Get approval mode for response
    approval_mode = await get_approval_mode(db, contact_data.family_file_id)

    return _contact_to_response(contact, approval_mode)


@router.get(
    "/family/{family_file_id}",
    response_model=CircleContactListResponse,
    summary="List circle contacts",
    description="List all circle contacts for a family file."
)
async def list_circle_contacts(
    family_file_id: str,
    child_id: Optional[str] = Query(None, description="Filter by specific child"),
    include_inactive: bool = Query(False, description="Include inactive contacts"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all circle contacts for a family file."""
    # Verify access
    family_file = await get_family_file_with_access(db, family_file_id, current_user.id)

    # Build query
    query = select(CircleContact).where(
        CircleContact.family_file_id == family_file_id
    )

    if child_id:
        # Include contacts for this specific child OR for all children (null)
        query = query.where(
            or_(
                CircleContact.child_id == child_id,
                CircleContact.child_id.is_(None)
            )
        )

    if not include_inactive:
        query = query.where(CircleContact.is_active == True)

    query = query.order_by(CircleContact.contact_name)

    result = await db.execute(query)
    contacts = result.scalars().all()

    # Get approval mode
    approval_mode = await get_approval_mode(db, family_file_id)

    # Build response
    items = [_contact_to_response(c, approval_mode) for c in contacts]

    return CircleContactListResponse(
        items=items,
        total=len(items),
        fully_approved_count=sum(1 for c in contacts if c.is_fully_approved),
        pending_approval_count=sum(1 for c in contacts if c.is_partially_approved and not c.is_fully_approved),
    )


@router.get(
    "/{contact_id}",
    response_model=CircleContactResponse,
    summary="Get circle contact",
    description="Get a circle contact by ID."
)
async def get_circle_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a circle contact by ID."""
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Get approval mode
    approval_mode = await get_approval_mode(db, contact.family_file_id)

    return _contact_to_response(contact, approval_mode)


@router.put(
    "/{contact_id}",
    response_model=CircleContactResponse,
    summary="Update circle contact",
    description="Update a circle contact's information."
)
async def update_circle_contact(
    contact_id: str,
    update_data: CircleContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a circle contact."""
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Update fields
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)

    # Get approval mode
    approval_mode = await get_approval_mode(db, contact.family_file_id)

    return _contact_to_response(contact, approval_mode)


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove circle contact",
    description="Remove a contact from the approved circle."
)
async def delete_circle_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a circle contact (soft delete by setting inactive)."""
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access
    family_file = await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    actor_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Parent"
    contact_name = contact.contact_name or "Contact"

    # Soft delete
    contact.is_active = False

    # End any in-progress calls with this contact immediately.
    await _end_active_calls_for_contact(
        db, contact.id, "Contact was blocked by a parent during the call."
    )

    # Court-evidence EventLog entry
    await _create_event_log(
        db=db,
        family_file_id=contact.family_file_id,
        event_type="circle_contact_blocked",
        category="custody",
        actor_id=str(current_user.id),
        severity="warning",
        related_resource_type="circle_contact",
        related_resource_id=str(contact.id),
        event_data={
            "contact_name": contact_name,
            "contact_email": contact.contact_email,
            "relationship_type": contact.relationship_type,
            "blocked_by": actor_name,
            "room_number": contact.room_number,
        },
    )

    # Notify the other parent that a contact was blocked
    other_parent_id = (
        family_file.parent_b_id
        if str(family_file.parent_a_id) == str(current_user.id)
        else family_file.parent_a_id
    )
    if other_parent_id:
        try:
            await push_service.send_notification(
                db=db,
                user_id=other_parent_id,
                title="Circle Contact Removed",
                body=f"{actor_name} removed {contact_name} from the circle",
                url="/my-circle/contact",
                tag=f"circle-contact-blocked-{contact.id}",
                data={
                    "type": "circle_contact_blocked",
                    "contact_id": str(contact.id),
                    "contact_name": contact_name,
                },
            )
        except Exception as e:
            logger.error(f"Failed to send contact-blocked notification: {e}")
            capture_error(e)

    # Activity feed entry
    try:
        await ActivityService.create_activity(
            db=db,
            family_file_id=contact.family_file_id,
            activity_type=ActivityType.CIRCLE_CONTACT_BLOCKED.value,
            actor_id=str(current_user.id),
            actor_name=actor_name,
            subject_type="circle_contact",
            subject_id=str(contact.id),
            subject_name=contact_name,
            title=f"{actor_name} removed {contact_name} from the circle",
            description=f"{contact_name} can no longer communicate with children",
            severity="warning",
        )
    except Exception as e:
        logger.error(f"Failed to log circle contact-blocked activity: {e}")
        capture_error(e)

    # Notify the contact themselves that their access has been revoked.
    try:
        await notification_service.notify_circle_contact(
            db=db, contact=contact, action="revoked", inviter_name=actor_name
        )
    except Exception as exc:
        logger.warning("Circle contact revoke notification failed: %s", exc)
        capture_error(exc)

    await db.commit()


@router.post(
    "/{contact_id}/approve",
    response_model=CircleContactResponse,
    summary="Approve circle contact",
    description="Parent approval for a circle contact."
)
async def approve_circle_contact(
    contact_id: str,
    approval: CircleContactApproval,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a circle contact.

    Based on family settings:
    - both_parents: Both parents must approve
    - either_parent: Either parent can approve
    """
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access and get family file
    family_file = await get_family_file_with_access(
        db, contact.family_file_id, current_user.id
    )

    # Track prior state so we only notify on *transitions*.
    was_communicable = contact.can_communicate(
        await get_approval_mode(db, contact.family_file_id)
    )

    if approval.approved:
        # Set approval timestamp for this parent
        if is_parent_a(family_file, current_user.id):
            contact.approved_by_parent_a_at = datetime.utcnow()
        else:
            contact.approved_by_parent_b_at = datetime.utcnow()
    else:
        # Revoke approval (this parent no longer approves)
        if is_parent_a(family_file, current_user.id):
            contact.approved_by_parent_a_at = None
        else:
            contact.approved_by_parent_b_at = None

    await db.commit()
    await db.refresh(contact)

    # Get approval mode
    approval_mode = await get_approval_mode(db, contact.family_file_id)

    # Notify the contact on approval transitions — only fire when the
    # communicable state actually flips so we don't spam the contact on
    # every toggle.
    now_communicable = contact.can_communicate(approval_mode)
    actor_name = (
        f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
        or "A parent"
    )
    try:
        if approval.approved and now_communicable and not was_communicable:
            await notification_service.notify_circle_contact(
                db=db, contact=contact, action="verified", inviter_name=actor_name
            )
        elif (not approval.approved) and was_communicable and not now_communicable:
            await notification_service.notify_circle_contact(
                db=db, contact=contact, action="revoked", inviter_name=actor_name
            )
    except Exception as exc:
        logger.warning("Circle contact lifecycle notification failed: %s", exc)
        capture_error(exc)

    return _contact_to_response(contact, approval_mode)


@router.post(
    "/{contact_id}/report",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Report circle contact (Wave 3 C4)",
    description=(
        "Parents can report a circle contact for safety concerns — inappropriate "
        "language, attempting to bypass the circle, or child-safety red flags. "
        "Logs a tamper-evident EventLog entry and, if severity=='critical', "
        "auto-deactivates the contact. Notifies the other parent."
    ),
)
async def report_circle_contact(
    contact_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reason = (body or {}).get("reason")
    category = (body or {}).get("category") or "safety"
    severity = (body or {}).get("severity") or "warning"
    if not reason or not isinstance(reason, str) or len(reason.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'reason' is required (min 3 chars).",
        )
    if severity not in ("info", "warning", "critical"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="severity must be 'info', 'warning', or 'critical'.",
        )
    if category not in ("safety", "inappropriate", "bypass", "other"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="category must be safety|inappropriate|bypass|other.",
        )

    result = await db.execute(select(CircleContact).where(CircleContact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Circle contact not found")

    family_file = await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    actor_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Parent"
    contact_name = contact.contact_name or "Contact"
    auto_blocked = severity == "critical"
    if auto_blocked:
        contact.is_active = False
        # Critical report auto-blocks — end any in-progress call with this contact.
        await _end_active_calls_for_contact(
            db, contact.id, "Contact was blocked after a critical safety report."
        )

    await _create_event_log(
        db=db,
        family_file_id=contact.family_file_id,
        event_type="circle_contact_reported",
        category="safety",
        actor_id=str(current_user.id),
        severity=severity,
        related_resource_type="circle_contact",
        related_resource_id=str(contact.id),
        event_data={
            "contact_name": contact_name,
            "contact_email": contact.contact_email,
            "relationship_type": contact.relationship_type,
            "reported_by": actor_name,
            "category": category,
            "severity": severity,
            "reason": reason[:500],
            "auto_blocked": auto_blocked,
        },
    )

    # Notify the other parent so both sides see the safety signal.
    other_parent_id = (
        family_file.parent_b_id
        if str(family_file.parent_a_id) == str(current_user.id)
        else family_file.parent_a_id
    )
    if other_parent_id:
        try:
            await push_service.send_notification(
                db=db,
                user_id=other_parent_id,
                title="Circle Contact Reported",
                body=(
                    f"{actor_name} reported {contact_name} for {category}"
                    + (" (auto-blocked)" if auto_blocked else "")
                ),
                url="/my-circle/contact",
                tag=f"circle-contact-reported-{contact.id}",
                data={
                    "type": "circle_contact_reported",
                    "contact_id": str(contact.id),
                    "severity": severity,
                    "category": category,
                },
            )
        except Exception as e:
            logger.error(f"Failed to send contact-reported notification: {e}")
            capture_error(e)

    try:
        await ActivityService.create_activity(
            db=db,
            family_file_id=contact.family_file_id,
            activity_type=ActivityType.CIRCLE_CONTACT_BLOCKED.value,
            actor_id=str(current_user.id),
            actor_name=actor_name,
            subject_type="circle_contact",
            subject_id=str(contact.id),
            subject_name=contact_name,
            title=f"{actor_name} reported {contact_name}",
            description=f"Reason: {reason[:200]}",
            severity=severity,
        )
    except Exception as e:
        logger.error(f"Failed to log circle contact-reported activity: {e}")
        capture_error(e)

    await db.commit()
    return {
        "reported": True,
        "contact_id": str(contact.id),
        "auto_blocked": auto_blocked,
        "severity": severity,
    }


@router.post(
    "/{contact_id}/invite",
    response_model=CircleContactInviteResponse,
    summary="Send verification invite",
    description="Send email/SMS to verify circle contact's identity."
)
async def send_circle_invite(
    contact_id: str,
    invite_data: CircleContactInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a verification invite to a circle contact.

    This allows the contact to verify their email/phone before
    being able to join KidComs sessions.
    """
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Generate verification token
    import secrets
    verification_token = secrets.token_urlsafe(32)
    contact.verification_token = verification_token

    await db.commit()

    email_sent = False
    sms_sent = False
    verification_url = f"{settings.FRONTEND_URL}/my-circle/verify/{verification_token}"

    if invite_data.send_email and contact.contact_email:
        try:
            from app.services.email import email_service
            child_name = contact.child.display_name if hasattr(contact, 'child') and contact.child else "a child"
            parent_name = f"{current_user.first_name} {current_user.last_name}"
            await email_service.send_circle_invitation(
                to_email=contact.contact_email,
                to_name=contact.contact_name,
                inviter_name=parent_name,
                child_name=child_name,
                invitation_link=verification_url,
                relationship=contact.relationship or "family member",
            )
            email_sent = True
        except Exception as e:
            logger.warning(f"Failed to send circle invite email to {contact.contact_email}: {e}")

    if invite_data.send_sms and contact.contact_phone:
        # SMS not currently supported — email is the primary invite channel
        logger.info(f"SMS invite requested for {contact.contact_phone} — SMS delivery not available, use email instead")
        sms_sent = False

    expires_at = datetime.utcnow() + timedelta(days=7)

    return CircleContactInviteResponse(
        success=email_sent or sms_sent,
        message="Verification invite sent" if (email_sent or sms_sent) else "No contact method available",
        email_sent=email_sent,
        sms_sent=sms_sent,
        verification_expires_at=expires_at,
    )


@router.get(
    "/relationships/choices",
    summary="Get relationship choices",
    description="Get list of relationship type choices for circle contacts."
)
async def get_relationship_choices():
    """Get the list of relationship type choices."""
    return RELATIONSHIP_CHOICES


def _contact_to_response(
    contact: CircleContact,
    approval_mode: ApprovalMode
) -> CircleContactResponse:
    """Convert CircleContact model to response schema."""
    return CircleContactResponse(
        id=contact.id,
        family_file_id=contact.family_file_id,
        child_id=contact.child_id,
        contact_name=contact.contact_name,
        contact_email=contact.contact_email,
        contact_phone=contact.contact_phone,
        relationship_type=contact.relationship_type,
        photo_url=contact.photo_url,
        notes=contact.notes,
        added_by=contact.added_by,
        approved_by_parent_a_at=contact.approved_by_parent_a_at,
        approved_by_parent_b_at=contact.approved_by_parent_b_at,
        is_fully_approved=contact.is_fully_approved,
        is_partially_approved=contact.is_partially_approved,
        can_communicate=contact.can_communicate(approval_mode),
        is_active=contact.is_active,
        is_verified=contact.is_verified,
        verified_at=contact.verified_at,
        availability_override=contact.availability_override,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )
