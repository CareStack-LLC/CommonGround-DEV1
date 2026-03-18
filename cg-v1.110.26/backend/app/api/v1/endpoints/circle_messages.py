"""
Circle Messages API endpoints for text messaging between children, parents, and circle contacts.

All messages pass through ARIA child-safety monitoring before delivery.
Supports child ↔ circle contacts, child ↔ parents communication.
Parents are always notified of all child messages.
"""

import hashlib
import json
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_child_user, get_current_circle_user
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.circle import CircleContact
from app.models.kidcoms import (
    CircleUser,
    ChildUser,
    CirclePermission,
    KidComsCommunicationLog,
)
from app.models.circle_message import CircleMessage, SenderType
from app.models.audit import EventLog
from app.models.case import Case
from app.schemas.circle_message import (
    CircleMessageCreate,
    CircleMessageResponse,
    CircleMessageListResponse,
    CircleConversationResponse,
    CircleConversationListResponse,
    UnreadCountResponse,
    CircleMessageAnalyzeRequest,
    CircleMessageAnalyzeResponse,
    InterventionRecord,
    InterventionListResponse,
    InterventionStatsResponse,
)
from app.services.aria_child_chat import ARIAChildChatMonitor, SeverityLevel as AriaSeverity
from app.services.push import push_service
from app.services.realtime import RealtimeService
from app.services.activity import ActivityService
from app.models.activity import ActivityType
from app.services.storage import (
    storage_service,
    StorageBucket,
    sanitize_filename,
    ALLOWED_IMAGE_TYPES,
)

from app.utils.sentry_helpers import capture_error
logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
aria_monitor = ARIAChildChatMonitor()
realtime_service = RealtimeService()


# ============================================================
# Helper: Validate chat permission + availability window
# ============================================================

async def _validate_chat_permission(
    db: AsyncSession,
    child_id: str,
    contact_id: str,
    family_file_id: str,
) -> CirclePermission:
    """
    Validate that the contact has chat permission for this child
    and is within the allowed time window.

    Returns the CirclePermission if valid, raises HTTPException otherwise.
    """
    # Check that the contact is active (not blocked/removed)
    contact_result = await db.execute(
        select(CircleContact).where(
            and_(
                CircleContact.id == contact_id,
                CircleContact.is_active == True,
            )
        )
    )
    contact = contact_result.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contact is blocked or has been removed",
        )

    # Verify contact has full approval based on family settings
    from app.models.kidcoms import KidComsSettings
    settings_result = await db.execute(
        select(KidComsSettings).where(
            KidComsSettings.family_file_id == family_file_id
        )
    )
    kidcoms_settings = settings_result.scalar_one_or_none()
    approval_mode = kidcoms_settings.circle_approval_mode if kidcoms_settings else "both_parents"
    if not contact.can_communicate(approval_mode):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This contact has not been fully approved yet",
        )

    result = await db.execute(
        select(CirclePermission).where(
            and_(
                CirclePermission.child_id == child_id,
                CirclePermission.circle_contact_id == contact_id,
                CirclePermission.family_file_id == family_file_id,
            )
        )
    )
    permission = result.scalar_one_or_none()

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission found for this contact and child",
        )

    if not permission.can_chat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat is not enabled for this contact",
        )

    # Check availability window
    now = datetime.utcnow()
    if permission.allowed_days is not None:
        current_day = now.weekday()
        # Convert Python weekday (Mon=0) to JS convention (Sun=0)
        js_day = (current_day + 1) % 7
        if js_day not in permission.allowed_days:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chat is not available on this day",
            )

    if permission.allowed_start_time and permission.allowed_end_time:
        from datetime import time as dt_time
        current_time = now.time()
        try:
            # Parse stored times (may be "HH:MM" or "H:MM" format)
            start_parts = permission.allowed_start_time.split(":")
            end_parts = permission.allowed_end_time.split(":")
            start_time = dt_time(int(start_parts[0]), int(start_parts[1]))
            end_time = dt_time(int(end_parts[0]), int(end_parts[1]))
            if not (start_time <= current_time <= end_time):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Chat is not available at this time",
                )
        except (ValueError, IndexError):
            # If time parsing fails, allow the message through and log
            import logging
            logging.getLogger(__name__).warning(
                f"Invalid time format in permission: start={permission.allowed_start_time}, end={permission.allowed_end_time}"
            )

    return permission


async def _get_parent_user_ids(db: AsyncSession, family_file_id: str) -> list[str]:
    """Get the user IDs of both parents for a family file (for push notifications)."""
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = result.scalar_one_or_none()
    if not family_file:
        return []

    parent_ids = []
    if family_file.user_a_id:
        parent_ids.append(family_file.user_a_id)
    if family_file.user_b_id:
        parent_ids.append(family_file.user_b_id)
    return parent_ids


async def _send_message_notifications(
    db: AsyncSession,
    message: CircleMessage,
    family_file_id: str,
    child_name: str,
):
    """Send push notifications for a new circle message."""
    parent_ids = await _get_parent_user_ids(db, family_file_id)

    # Always notify parents about all child communications
    for parent_id in parent_ids:
        try:
            await push_service.send_notification(
                db=db,
                user_id=parent_id,
                title=f"My Circle Message",
                body=f"New message from {message.sender_name} to {child_name}",
                url=f"/kidcoms/circle",
                tag=f"circle-msg-{message.child_id}",
                data={
                    "type": "circle_message",
                    "child_id": message.child_id,
                    "message_id": message.id,
                    "sender_name": message.sender_name,
                    "sender_type": message.sender_type,
                },
            )
        except Exception as e:
            logger.error(f"Failed to send parent notification: {e}")
            capture_error(e)

    # Notify the recipient (if they have a user account)
    # Circle contacts have their own user context; children see messages in-app
    # For circle contacts: look up their CircleUser to find notification target
    if message.recipient_type == SenderType.CIRCLE_CONTACT:
        try:
            result = await db.execute(
                select(CircleUser).where(CircleUser.circle_contact_id == message.recipient_id)
            )
            circle_user = result.scalar_one_or_none()
            if circle_user and circle_user.email:
                # Circle users don't have parent user_ids, notifications handled via their portal
                logger.info(f"Circle contact {circle_user.email} has new message from {message.sender_name}")
        except Exception as e:
            logger.error(f"Failed to process recipient notification: {e}")
            capture_error(e)


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
            # No case linked to this family file; skip EventLog
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


async def _create_communication_log(
    db: AsyncSession,
    message: CircleMessage,
    family_file_id: str,
):
    """Create a communication log entry for the message."""
    try:
        log = KidComsCommunicationLog(
            id=str(uuid4()),
            family_file_id=family_file_id,
            child_id=message.child_id,
            contact_type=message.sender_type if message.sender_type != SenderType.CHILD else message.recipient_type,
            contact_id=message.sender_id if message.sender_type != SenderType.CHILD else message.recipient_id,
            contact_name=message.sender_name if message.sender_type != SenderType.CHILD else None,
            communication_type="chat",
            started_at=message.sent_at,
            ended_at=message.sent_at,
            duration_seconds=0,
            total_messages=1,
            flagged_messages=1 if message.aria_flagged else 0,
            aria_flags={"category": message.aria_category, "reason": message.aria_reason} if message.aria_flagged else None,
        )
        db.add(log)
    except Exception as e:
        logger.error(f"Failed to create communication log: {e}")
        capture_error(e)


# ============================================================
# POST /circle-messages/upload-attachment — Upload media/file
# ============================================================

MAX_CIRCLE_ATTACHMENT_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CIRCLE_ATTACHMENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
}
ALLOWED_CIRCLE_ATTACHMENT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


@router.post("/upload-attachment", status_code=status.HTTP_200_OK)
async def upload_circle_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a media attachment for a circle message.

    Accepts image files (jpg, png, gif, webp) up to 10 MB.
    Uploads to Supabase storage and returns the URL + metadata.
    This is a parent-auth endpoint; child and contact uploads
    go through their own upload endpoints below.
    """
    import os

    # Validate file extension
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in ALLOWED_CIRCLE_ATTACHMENT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Accepted: {', '.join(ALLOWED_CIRCLE_ATTACHMENT_EXTENSIONS)}",
        )

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    # Validate size
    if file_size > MAX_CIRCLE_ATTACHMENT_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large ({file_size / 1024 / 1024:.1f} MB). Maximum is 10 MB.",
        )

    # Validate content type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CIRCLE_ATTACHMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type '{content_type}' not allowed.",
        )

    # Determine attachment type category
    attachment_type = "image"

    # Build storage path
    unique_id = str(uuid4())[:8]
    safe_name = sanitize_filename(file.filename or "attachment")
    storage_path = f"circle-messages/{unique_id}_{safe_name}"

    try:
        file_url = await storage_service.upload_file(
            bucket=StorageBucket.MESSAGE_ATTACHMENTS,
            path=storage_path,
            file_content=file_content,
            content_type=content_type,
        )
    except Exception as e:
        logger.error(f"Failed to upload circle attachment: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file",
        )

    return {
        "url": file_url,
        "type": attachment_type,
        "name": file.filename or "attachment",
        "size": file_size,
    }


@router.post("/upload-attachment/child", status_code=status.HTTP_200_OK)
async def upload_circle_attachment_as_child(
    file: UploadFile = File(...),
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a media attachment as a child user."""
    import os

    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in ALLOWED_CIRCLE_ATTACHMENT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Accepted: {', '.join(ALLOWED_CIRCLE_ATTACHMENT_EXTENSIONS)}",
        )

    file_content = await file.read()
    file_size = len(file_content)

    if file_size > MAX_CIRCLE_ATTACHMENT_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large ({file_size / 1024 / 1024:.1f} MB). Maximum is 10 MB.",
        )

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CIRCLE_ATTACHMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type '{content_type}' not allowed.",
        )

    unique_id = str(uuid4())[:8]
    safe_name = sanitize_filename(file.filename or "attachment")
    storage_path = f"circle-messages/{unique_id}_{safe_name}"

    try:
        file_url = await storage_service.upload_file(
            bucket=StorageBucket.MESSAGE_ATTACHMENTS,
            path=storage_path,
            file_content=file_content,
            content_type=content_type,
        )
    except Exception as e:
        logger.error(f"Failed to upload circle attachment (child): {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file",
        )

    return {
        "url": file_url,
        "type": "image",
        "name": file.filename or "attachment",
        "size": file_size,
    }


@router.post("/upload-attachment/contact", status_code=status.HTTP_200_OK)
async def upload_circle_attachment_as_contact(
    file: UploadFile = File(...),
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a media attachment as a circle contact."""
    import os

    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in ALLOWED_CIRCLE_ATTACHMENT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Accepted: {', '.join(ALLOWED_CIRCLE_ATTACHMENT_EXTENSIONS)}",
        )

    file_content = await file.read()
    file_size = len(file_content)

    if file_size > MAX_CIRCLE_ATTACHMENT_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large ({file_size / 1024 / 1024:.1f} MB). Maximum is 10 MB.",
        )

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CIRCLE_ATTACHMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type '{content_type}' not allowed.",
        )

    unique_id = str(uuid4())[:8]
    safe_name = sanitize_filename(file.filename or "attachment")
    storage_path = f"circle-messages/{unique_id}_{safe_name}"

    try:
        file_url = await storage_service.upload_file(
            bucket=StorageBucket.MESSAGE_ATTACHMENTS,
            path=storage_path,
            file_content=file_content,
            content_type=content_type,
        )
    except Exception as e:
        logger.error(f"Failed to upload circle attachment (contact): {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file",
        )

    return {
        "url": file_url,
        "type": "image",
        "name": file.filename or "attachment",
        "size": file_size,
    }


# ============================================================
# POST /circle-messages/analyze — Pre-send ARIA analysis
# ============================================================

@router.post("/analyze", response_model=CircleMessageAnalyzeResponse)
async def analyze_circle_message(
    data: CircleMessageAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Pre-send ARIA analysis for circle messages (parent auth).

    Runs hybrid regex+LLM analysis and returns results including suggested rewrite.
    Frontend uses this to show the intervention modal BEFORE the message is sent.
    """
    # Load recent messages for context
    recent_result = await db.execute(
        select(CircleMessage)
        .where(CircleMessage.child_id == data.child_id)
        .where(CircleMessage.family_file_id == data.family_file_id)
        .order_by(desc(CircleMessage.sent_at))
        .limit(10)
    )
    recent_messages = recent_result.scalars().all()
    context = [f"{m.sender_name}: {m.content}" for m in reversed(recent_messages)]

    # Determine channel type
    channel = "parent" if data.sender_type in ("parent_a", "parent_b") else "circle"

    # Run hybrid analysis
    analysis = await aria_monitor.analyze_message_hybrid(
        content=data.content,
        sender_type=data.sender_type,
        sender_name=current_user.first_name or "User",
        context=context,
        channel=channel,
    )

    # Map severity to action
    if analysis.should_block:
        action = "BLOCK"
    elif analysis.severity in (AriaSeverity.MODERATE, AriaSeverity.SEVERE) and not analysis.should_block:
        action = "WARN_REWRITE"
    elif analysis.should_flag:
        action = "FLAG"
    else:
        action = "ALLOW"

    return CircleMessageAnalyzeResponse(
        is_flagged=analysis.should_flag,
        severity=analysis.severity.value,
        categories=analysis.all_categories,
        explanation=analysis.reason,
        suggested_rewrite=analysis.suggested_rewrite,
        action=action,
        should_block=analysis.should_block,
        confidence_score=analysis.confidence_score,
        response_time_ms=analysis.response_time_ms,
    )


@router.post("/analyze/child", response_model=CircleMessageAnalyzeResponse)
async def analyze_circle_message_as_child(
    data: CircleMessageAnalyzeRequest,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    """Pre-send ARIA analysis for circle messages (child auth)."""
    recent_result = await db.execute(
        select(CircleMessage)
        .where(CircleMessage.child_id == data.child_id)
        .where(CircleMessage.family_file_id == data.family_file_id)
        .order_by(desc(CircleMessage.sent_at))
        .limit(10)
    )
    recent_messages = recent_result.scalars().all()
    context = [f"{m.sender_name}: {m.content}" for m in reversed(recent_messages)]

    analysis = await aria_monitor.analyze_message_hybrid(
        content=data.content,
        sender_type="child",
        sender_name="Child",
        context=context,
        channel="circle",
    )

    if analysis.should_block:
        action = "BLOCK"
    elif analysis.severity in (AriaSeverity.MODERATE, AriaSeverity.SEVERE):
        action = "WARN_REWRITE"
    elif analysis.should_flag:
        action = "FLAG"
    else:
        action = "ALLOW"

    return CircleMessageAnalyzeResponse(
        is_flagged=analysis.should_flag,
        severity=analysis.severity.value,
        categories=analysis.all_categories,
        explanation=analysis.reason,
        suggested_rewrite=analysis.suggested_rewrite,
        action=action,
        should_block=analysis.should_block,
        confidence_score=analysis.confidence_score,
        response_time_ms=analysis.response_time_ms,
    )


@router.post("/analyze/contact", response_model=CircleMessageAnalyzeResponse)
async def analyze_circle_message_as_contact(
    data: CircleMessageAnalyzeRequest,
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    """Pre-send ARIA analysis for circle messages (contact auth)."""
    recent_result = await db.execute(
        select(CircleMessage)
        .where(CircleMessage.child_id == data.child_id)
        .where(CircleMessage.family_file_id == data.family_file_id)
        .order_by(desc(CircleMessage.sent_at))
        .limit(10)
    )
    recent_messages = recent_result.scalars().all()
    context = [f"{m.sender_name}: {m.content}" for m in reversed(recent_messages)]

    analysis = await aria_monitor.analyze_message_hybrid(
        content=data.content,
        sender_type="circle_contact",
        sender_name=current_circle_user.email,
        context=context,
        channel="circle",
    )

    if analysis.should_block:
        action = "BLOCK"
    elif analysis.severity in (AriaSeverity.MODERATE, AriaSeverity.SEVERE):
        action = "WARN_REWRITE"
    elif analysis.should_flag:
        action = "FLAG"
    else:
        action = "ALLOW"

    return CircleMessageAnalyzeResponse(
        is_flagged=analysis.should_flag,
        severity=analysis.severity.value,
        categories=analysis.all_categories,
        explanation=analysis.reason,
        suggested_rewrite=analysis.suggested_rewrite,
        action=action,
        should_block=analysis.should_block,
        confidence_score=analysis.confidence_score,
        response_time_ms=analysis.response_time_ms,
    )


# ============================================================
# POST /circle-messages/ — Send a message
# ============================================================

@router.post("/", response_model=CircleMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_circle_message_as_child(
    data: CircleMessageCreate,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message as a child to a circle contact or parent.

    - Validates chat permission + availability window (for circle contacts)
    - Runs ARIA child-safety analysis
    - If SEVERE → message is hidden (not shown to recipient)
    - Always notifies parents via push
    - Creates communication log entry
    """
    # Get child record
    child_result = await db.execute(
        select(Child).where(Child.id == data.child_id)
    )
    child = child_result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Verify this child user matches the child_id
    if current_child.child_id != data.child_id:
        raise HTTPException(status_code=403, detail="Not authorized for this child")

    family_file_id = current_child.family_file_id

    # For circle contacts, validate permission
    if data.recipient_type == SenderType.CIRCLE_CONTACT:
        await _validate_chat_permission(db, data.child_id, data.recipient_id, family_file_id)

    # Run ARIA hybrid analysis (regex + LLM)
    analysis = await aria_monitor.analyze_message_hybrid(
        content=data.content,
        sender_type="child",
        sender_name=child.first_name or "Child",
        channel="circle",
    )

    # 202 INTERCEPT: If flagged and NOT pre-approved, return intervention payload
    if analysis.should_flag and not data.aria_accepted_rewrite:
        from fastapi.responses import JSONResponse

        # Generate contextual rewrite if not already provided by LLM
        rewrite = analysis.suggested_rewrite
        if not rewrite and analysis.severity in (AriaSeverity.MODERATE, AriaSeverity.SEVERE):
            try:
                from app.services.aria import ARIAService
                aria_service = ARIAService()
                rewrite = await aria_service.generate_contextual_rewrite(
                    flagged_message=data.content,
                    thread_history=[],
                    flag_reason=analysis.reason or "Content flagged",
                    aria_mode="strict",  # Children always get strict mode
                )
            except Exception:
                rewrite = None

        return JSONResponse(
            status_code=202,
            content={
                "aria_flagged": True,
                "aria_mode": "strict",  # Children: no "send original" option
                "original_message": data.content,
                "suggested_rewrite": rewrite,
                "explanation": analysis.reason,
                "categories": analysis.all_categories,
                "severity": analysis.severity.value,
                "confidence_score": analysis.confidence_score,
                "response_time_ms": analysis.response_time_ms,
            }
        )

    # Determine final content
    final_content = data.content
    original_content = None
    user_action = data.intervention_action

    if data.aria_accepted_rewrite and analysis.suggested_rewrite:
        original_content = data.content
        final_content = data.content  # Frontend sends the accepted/edited version as content
        if not user_action:
            user_action = "accepted"

    # Map severity to intervention level
    severity_level_map = {"safe": 0, "mild": 1, "moderate": 2, "severe": 3}
    intervention_level = severity_level_map.get(analysis.severity.value, 0) if analysis.should_flag else None

    # Create message
    message = CircleMessage(
        id=str(uuid4()),
        family_file_id=family_file_id,
        child_id=data.child_id,
        sender_id=current_child.child_id,
        sender_type=SenderType.CHILD,
        sender_name=child.first_name or "Child",
        recipient_id=data.recipient_id,
        recipient_type=data.recipient_type,
        content=final_content,
        original_content=original_content,
        attachment_url=data.attachment_url,
        attachment_type=data.attachment_type,
        attachment_name=data.attachment_name,
        attachment_size=data.attachment_size,
        aria_analyzed=True,
        aria_flagged=analysis.should_flag,
        aria_category=analysis.category.value if analysis.category else None,
        aria_reason=analysis.reason,
        aria_score=analysis.confidence_score,
        is_hidden=analysis.should_hide,
        user_action=user_action,
        aria_intervention_level=intervention_level,
        aria_all_categories=json.dumps(analysis.all_categories) if analysis.all_categories else None,
        aria_suggested_rewrite=analysis.suggested_rewrite,
        aria_response_time_ms=analysis.response_time_ms,
        sent_at=datetime.utcnow(),
    )

    db.add(message)
    await db.flush()

    # Communication log
    await _create_communication_log(db, message, family_file_id)

    # Push notifications
    await _send_message_notifications(db, message, family_file_id, child.first_name or "Child")

    # Activity feed logging
    try:
        activity_type = ActivityType.CIRCLE_MESSAGE_FLAGGED if analysis.should_flag else ActivityType.CIRCLE_MESSAGE_SENT
        attachment_note = " with attachment" if data.attachment_url else ""
        await ActivityService.create_activity(
            db=db,
            family_file_id=family_file_id,
            activity_type=activity_type.value,
            actor_id=str(current_child.child_id),
            actor_name=child.first_name or "Child",
            subject_type="circle_message",
            subject_id=message.id,
            subject_name=child.first_name,
            title=f"{child.first_name or 'Child'} sent a message{attachment_note}" + (" (flagged by ARIA)" if analysis.should_flag else ""),
            description=f"Circle message from {child.first_name} to {data.recipient_type}",
            severity="warning" if analysis.should_flag else "info",
        )
    except Exception as e:
        logger.error(f"Failed to log circle message activity: {e}")
        capture_error(e)

    # Court-evidence EventLog entry
    await _create_event_log(
        db=db,
        family_file_id=family_file_id,
        event_type="circle_message_sent",
        category="communication",
        actor_id=str(current_child.child_id),
        severity="warning" if analysis.should_flag else "info",
        related_resource_type="circle_message",
        related_resource_id=message.id,
        event_data={
            "sender_type": SenderType.CHILD,
            "sender_name": child.first_name or "Child",
            "recipient_type": str(data.recipient_type),
            "recipient_id": data.recipient_id,
            "child_id": data.child_id,
            "message_id": message.id,
            "aria_flagged": analysis.should_flag,
            "aria_category": analysis.category.value if analysis.category else None,
            "has_attachment": bool(data.attachment_url),
        },
    )

    # Broadcast realtime event
    try:
        await realtime_service.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type="circle_message_new",
            data={
                "message_id": message.id,
                "child_id": message.child_id,
                "sender_id": message.sender_id,
                "sender_type": message.sender_type,
                "recipient_id": message.recipient_id,
                "recipient_type": message.recipient_type,
            },
        )
    except Exception as e:
        logger.error(f"Failed to broadcast realtime event: {e}")
        capture_error(e)

    await db.commit()
    await db.refresh(message)
    return message


@router.post("/from-contact", response_model=CircleMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_circle_message_as_contact(
    data: CircleMessageCreate,
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message as a circle contact to a child.

    - Validates chat permission + availability window
    - Runs ARIA child-safety analysis
    - Always notifies parents via push
    """
    family_file_id = current_circle_user.family_file_id

    # Validate permission
    await _validate_chat_permission(db, data.child_id, current_circle_user.contact_id, family_file_id)

    # Get contact info
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == current_circle_user.contact_id)
    )
    contact = contact_result.scalar_one_or_none()
    contact_name = contact.display_name if contact else current_circle_user.email

    # Get child name for notifications
    child_result = await db.execute(select(Child).where(Child.id == data.child_id))
    child = child_result.scalar_one_or_none()
    child_name = child.first_name if child else "Child"

    # Run ARIA hybrid analysis (regex + LLM)
    analysis = await aria_monitor.analyze_message_hybrid(
        content=data.content,
        sender_type="circle_contact",
        sender_name=contact_name,
        channel="circle",
    )

    # 202 INTERCEPT: If flagged and NOT pre-approved, return intervention payload
    if analysis.should_flag and not data.aria_accepted_rewrite:
        from fastapi.responses import JSONResponse

        # Generate contextual rewrite if not already provided by LLM
        rewrite = analysis.suggested_rewrite
        if not rewrite and analysis.severity in (AriaSeverity.MODERATE, AriaSeverity.SEVERE):
            try:
                from app.services.aria import ARIAService
                aria_service = ARIAService()
                rewrite = await aria_service.generate_contextual_rewrite(
                    flagged_message=data.content,
                    thread_history=[],
                    flag_reason=analysis.reason or "Content flagged",
                    aria_mode="standard",  # Contacts get standard mode
                )
            except Exception:
                rewrite = None

        return JSONResponse(
            status_code=202,
            content={
                "aria_flagged": True,
                "aria_mode": "standard",  # Contacts can choose to send original (logged)
                "original_message": data.content,
                "suggested_rewrite": rewrite,
                "explanation": analysis.reason,
                "categories": analysis.all_categories,
                "severity": analysis.severity.value,
                "confidence_score": analysis.confidence_score,
                "response_time_ms": analysis.response_time_ms,
            }
        )

    # Determine final content
    final_content = data.content
    original_content = None
    user_action = data.intervention_action

    if data.aria_accepted_rewrite and analysis.suggested_rewrite:
        original_content = data.content
        final_content = data.content  # Frontend sends accepted/edited version as content
        if not user_action:
            user_action = "accepted"

    # Map severity to intervention level
    severity_level_map = {"safe": 0, "mild": 1, "moderate": 2, "severe": 3}
    intervention_level = severity_level_map.get(analysis.severity.value, 0) if analysis.should_flag else None

    # Create message
    message = CircleMessage(
        id=str(uuid4()),
        family_file_id=family_file_id,
        child_id=data.child_id,
        sender_id=current_circle_user.contact_id,
        sender_type=SenderType.CIRCLE_CONTACT,
        sender_name=contact_name,
        recipient_id=data.child_id,
        recipient_type=SenderType.CHILD,
        content=final_content,
        original_content=original_content,
        attachment_url=data.attachment_url,
        attachment_type=data.attachment_type,
        attachment_name=data.attachment_name,
        attachment_size=data.attachment_size,
        aria_analyzed=True,
        aria_flagged=analysis.should_flag,
        aria_category=analysis.category.value if analysis.category else None,
        aria_reason=analysis.reason,
        aria_score=analysis.confidence_score,
        is_hidden=analysis.should_hide,
        user_action=user_action,
        aria_intervention_level=intervention_level,
        aria_all_categories=json.dumps(analysis.all_categories) if analysis.all_categories else None,
        aria_suggested_rewrite=analysis.suggested_rewrite,
        aria_response_time_ms=analysis.response_time_ms,
        sent_at=datetime.utcnow(),
    )

    db.add(message)
    await db.flush()

    await _create_communication_log(db, message, family_file_id)
    await _send_message_notifications(db, message, family_file_id, child_name)

    # Activity feed logging
    try:
        activity_type = ActivityType.CIRCLE_MESSAGE_FLAGGED if analysis.should_flag else ActivityType.CIRCLE_MESSAGE_SENT
        await ActivityService.create_activity(
            db=db,
            family_file_id=family_file_id,
            activity_type=activity_type.value,
            actor_id=str(current_circle_user.contact_id),
            actor_name=contact_name,
            subject_type="circle_message",
            subject_id=message.id,
            subject_name=child_name,
            title=f"{contact_name} sent a message to {child_name}" + (" (flagged by ARIA)" if analysis.should_flag else ""),
            description=f"Circle contact message to {child_name}",
            severity="warning" if analysis.should_flag else "info",
        )
    except Exception as e:
        logger.error(f"Failed to log circle message activity: {e}")
        capture_error(e)

    # Court-evidence EventLog entry
    await _create_event_log(
        db=db,
        family_file_id=family_file_id,
        event_type="circle_message_sent",
        category="communication",
        actor_id=str(current_circle_user.contact_id),
        severity="warning" if analysis.should_flag else "info",
        related_resource_type="circle_message",
        related_resource_id=message.id,
        event_data={
            "sender_type": SenderType.CIRCLE_CONTACT,
            "sender_name": contact_name,
            "recipient_type": SenderType.CHILD,
            "recipient_id": data.child_id,
            "child_id": data.child_id,
            "message_id": message.id,
            "aria_flagged": analysis.should_flag,
            "aria_category": analysis.category.value if analysis.category else None,
            "user_action": user_action,
            "aria_all_categories": analysis.all_categories,
            "has_attachment": bool(data.attachment_url),
        },
    )

    try:
        await realtime_service.broadcast_to_family_file(
            family_file_id=family_file_id,
            event_type="circle_message_new",
            data={
                "message_id": message.id,
                "child_id": message.child_id,
                "sender_id": message.sender_id,
                "sender_type": message.sender_type,
                "recipient_id": message.recipient_id,
                "recipient_type": message.recipient_type,
            },
        )
    except Exception as e:
        logger.error(f"Failed to broadcast realtime event: {e}")
        capture_error(e)

    await db.commit()
    await db.refresh(message)
    return message


@router.post("/from-parent", response_model=CircleMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_circle_message_as_parent(
    data: CircleMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message as a parent to their child.

    - Parents bypass permission checks (they are the permission authority)
    - ARIA hybrid analysis runs with pre-send 202 intercept
    - Standard mode: parents can accept, edit, or send original (logged)
    - Other parent is notified
    """
    # Verify the parent belongs to the family with this child
    child_result = await db.execute(
        select(Child).where(Child.id == data.child_id)
    )
    child = child_result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Get family file to determine parent role
    family_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == child.family_file_id)
    )
    family_file = family_result.scalar_one_or_none()
    if not family_file:
        raise HTTPException(status_code=404, detail="Family file not found")

    # Determine sender type
    if str(family_file.user_a_id) == str(current_user.id):
        sender_type = SenderType.PARENT_A
    elif str(family_file.user_b_id) == str(current_user.id):
        sender_type = SenderType.PARENT_B
    else:
        raise HTTPException(status_code=403, detail="Not authorized for this child's family")

    sender_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Parent"

    # Run ARIA hybrid analysis (regex + LLM)
    analysis = await aria_monitor.analyze_message_hybrid(
        content=data.content,
        sender_type=sender_type,
        sender_name=sender_name,
        channel="circle",
    )

    # 202 INTERCEPT: If flagged and NOT pre-approved, return intervention payload
    if analysis.should_flag and not data.aria_accepted_rewrite:
        from fastapi.responses import JSONResponse

        # Generate contextual rewrite if not already provided by LLM
        rewrite = analysis.suggested_rewrite
        if not rewrite and analysis.severity in (AriaSeverity.MODERATE, AriaSeverity.SEVERE):
            try:
                from app.services.aria import ARIAService
                aria_service = ARIAService()
                rewrite = await aria_service.generate_contextual_rewrite(
                    flagged_message=data.content,
                    thread_history=[],
                    flag_reason=analysis.reason or "Content flagged",
                    aria_mode="standard",  # Parents get standard mode
                )
            except Exception:
                rewrite = None

        return JSONResponse(
            status_code=202,
            content={
                "aria_flagged": True,
                "aria_mode": "standard",  # Parents can choose to send original (logged)
                "original_message": data.content,
                "suggested_rewrite": rewrite,
                "explanation": analysis.reason,
                "categories": analysis.all_categories,
                "severity": analysis.severity.value,
                "confidence_score": analysis.confidence_score,
                "response_time_ms": analysis.response_time_ms,
            }
        )

    # Determine final content
    final_content = data.content
    original_content = None
    user_action = data.intervention_action

    if data.aria_accepted_rewrite:
        original_content = data.content
        final_content = data.content  # Frontend sends accepted/edited version as content
        if not user_action:
            user_action = "accepted"

    # Map severity to intervention level
    severity_level_map = {"safe": 0, "mild": 1, "moderate": 2, "severe": 3}
    intervention_level = severity_level_map.get(analysis.severity.value, 0) if analysis.should_flag else None

    message = CircleMessage(
        id=str(uuid4()),
        family_file_id=family_file.id,
        child_id=data.child_id,
        sender_id=str(current_user.id),
        sender_type=sender_type,
        sender_name=sender_name,
        recipient_id=data.child_id,
        recipient_type=SenderType.CHILD,
        content=final_content,
        original_content=original_content,
        attachment_url=data.attachment_url,
        attachment_type=data.attachment_type,
        attachment_name=data.attachment_name,
        attachment_size=data.attachment_size,
        aria_analyzed=True,
        aria_flagged=analysis.should_flag,
        aria_category=analysis.category.value if analysis.category else None,
        aria_reason=analysis.reason,
        aria_score=analysis.confidence_score,
        is_hidden=False,  # Parent messages are never hidden
        user_action=user_action,
        aria_intervention_level=intervention_level,
        aria_all_categories=json.dumps(analysis.all_categories) if analysis.all_categories else None,
        aria_suggested_rewrite=analysis.suggested_rewrite,
        aria_response_time_ms=analysis.response_time_ms,
        sent_at=datetime.utcnow(),
    )

    db.add(message)
    await db.flush()

    await _create_communication_log(db, message, family_file.id)

    # Notify the other parent
    other_parent_id = family_file.user_b_id if sender_type == SenderType.PARENT_A else family_file.user_a_id
    if other_parent_id:
        try:
            await push_service.send_notification(
                db=db,
                user_id=other_parent_id,
                title="My Circle Message",
                body=f"{sender_name} sent a message to {child.first_name or 'your child'}",
                url="/kidcoms/circle",
                tag=f"circle-msg-{data.child_id}",
            )
        except Exception as e:
            logger.error(f"Failed to notify other parent: {e}")
            capture_error(e)

    # Activity feed logging
    try:
        activity_type = ActivityType.CIRCLE_MESSAGE_FLAGGED if analysis.should_flag else ActivityType.CIRCLE_MESSAGE_SENT
        await ActivityService.create_activity(
            db=db,
            family_file_id=family_file.id,
            activity_type=activity_type.value,
            actor_id=str(current_user.id),
            actor_name=sender_name,
            subject_type="circle_message",
            subject_id=message.id,
            subject_name=child.first_name,
            title=f"{sender_name} sent a message to {child.first_name or 'child'}" + (" (flagged by ARIA)" if analysis.should_flag else ""),
            description="Parent message via My Circle",
            severity="warning" if analysis.should_flag else "info",
        )
    except Exception as e:
        logger.error(f"Failed to log circle message activity: {e}")
        capture_error(e)

    # Court-evidence EventLog entry
    await _create_event_log(
        db=db,
        family_file_id=family_file.id,
        event_type="circle_message_sent",
        category="communication",
        actor_id=str(current_user.id),
        severity="warning" if analysis.should_flag else "info",
        related_resource_type="circle_message",
        related_resource_id=message.id,
        event_data={
            "sender_type": str(sender_type),
            "sender_name": sender_name,
            "recipient_type": SenderType.CHILD,
            "recipient_id": data.child_id,
            "child_id": data.child_id,
            "message_id": message.id,
            "aria_flagged": analysis.should_flag,
            "aria_category": analysis.category.value if analysis.category else None,
            "user_action": user_action,
            "aria_all_categories": analysis.all_categories,
            "has_attachment": bool(data.attachment_url),
        },
    )

    try:
        await realtime_service.broadcast_to_family_file(
            family_file_id=family_file.id,
            event_type="circle_message_new",
            data={
                "message_id": message.id,
                "child_id": message.child_id,
                "sender_id": message.sender_id,
                "sender_type": message.sender_type,
                "recipient_id": message.recipient_id,
                "recipient_type": message.recipient_type,
            },
        )
    except Exception as e:
        logger.error(f"Failed to broadcast realtime event: {e}")
        capture_error(e)

    await db.commit()
    await db.refresh(message)
    return message


# ============================================================
# GET /circle-messages/child/{child_id}/contact/{contact_id}
# ============================================================

@router.get(
    "/child/{child_id}/contact/{contact_id}",
    response_model=CircleMessageListResponse,
)
async def get_conversation_messages(
    child_id: str,
    contact_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get messages between a child and a contact/parent (child auth).
    Returns messages newest-first, paginated.
    Hidden messages show placeholder text.
    """
    if current_child.child_id != child_id:
        raise HTTPException(status_code=403, detail="Not authorized for this child")

    # Get messages where (sender=child AND recipient=contact) OR (sender=contact AND recipient=child)
    query = (
        select(CircleMessage)
        .where(
            and_(
                CircleMessage.child_id == child_id,
                or_(
                    and_(CircleMessage.sender_id == child_id, CircleMessage.recipient_id == contact_id),
                    and_(CircleMessage.sender_id == contact_id, CircleMessage.recipient_id == child_id),
                ),
            )
        )
        .order_by(desc(CircleMessage.sent_at))
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    messages = result.scalars().all()

    # Get total count
    count_query = (
        select(func.count(CircleMessage.id))
        .where(
            and_(
                CircleMessage.child_id == child_id,
                or_(
                    and_(CircleMessage.sender_id == child_id, CircleMessage.recipient_id == contact_id),
                    and_(CircleMessage.sender_id == contact_id, CircleMessage.recipient_id == child_id),
                ),
            )
        )
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return CircleMessageListResponse(
        items=[CircleMessageResponse.model_validate(m) for m in messages],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/contact/child/{child_id}",
    response_model=CircleMessageListResponse,
)
async def get_conversation_messages_as_contact(
    child_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get messages between a circle contact and a child (contact auth).
    """
    contact_id = current_circle_user.contact_id

    query = (
        select(CircleMessage)
        .where(
            and_(
                CircleMessage.child_id == child_id,
                or_(
                    and_(CircleMessage.sender_id == contact_id, CircleMessage.recipient_id == child_id),
                    and_(CircleMessage.sender_id == child_id, CircleMessage.recipient_id == contact_id),
                ),
            )
        )
        .order_by(desc(CircleMessage.sent_at))
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    messages = result.scalars().all()

    count_query = (
        select(func.count(CircleMessage.id))
        .where(
            and_(
                CircleMessage.child_id == child_id,
                or_(
                    and_(CircleMessage.sender_id == contact_id, CircleMessage.recipient_id == child_id),
                    and_(CircleMessage.sender_id == child_id, CircleMessage.recipient_id == contact_id),
                ),
            )
        )
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return CircleMessageListResponse(
        items=[CircleMessageResponse.model_validate(m) for m in messages],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/parent/child/{child_id}/contact/{contact_id}",
    response_model=CircleMessageListResponse,
)
async def get_conversation_messages_as_parent(
    child_id: str,
    contact_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get messages between a child and contact/parent (parent auth).
    Parents can view all their child's conversations.
    """
    # Verify parent has access to this child
    child_result = await db.execute(select(Child).where(Child.id == child_id))
    child = child_result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    family_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == child.family_file_id)
    )
    family_file = family_result.scalar_one_or_none()
    if not family_file or str(current_user.id) not in [str(family_file.user_a_id), str(family_file.user_b_id)]:
        raise HTTPException(status_code=403, detail="Not authorized for this child")

    query = (
        select(CircleMessage)
        .where(
            and_(
                CircleMessage.child_id == child_id,
                or_(
                    and_(CircleMessage.sender_id == child_id, CircleMessage.recipient_id == contact_id),
                    and_(CircleMessage.sender_id == contact_id, CircleMessage.recipient_id == child_id),
                ),
            )
        )
        .order_by(desc(CircleMessage.sent_at))
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    messages = result.scalars().all()

    count_query = (
        select(func.count(CircleMessage.id))
        .where(
            and_(
                CircleMessage.child_id == child_id,
                or_(
                    and_(CircleMessage.sender_id == child_id, CircleMessage.recipient_id == contact_id),
                    and_(CircleMessage.sender_id == contact_id, CircleMessage.recipient_id == child_id),
                ),
            )
        )
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return CircleMessageListResponse(
        items=[CircleMessageResponse.model_validate(m) for m in messages],
        total=total,
        skip=skip,
        limit=limit,
    )


# ============================================================
# GET /circle-messages/conversations — List active conversations
# ============================================================

@router.get(
    "/conversations/child",
    response_model=CircleConversationListResponse,
)
async def get_conversations_as_child(
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all active conversations for a child.
    Returns unique conversation partners with last message and unread count.
    """
    child_id = current_child.child_id

    # Get latest message per conversation partner using a subquery
    # First, get all unique partners
    partner_query = (
        select(
            CircleMessage.sender_id,
            CircleMessage.sender_type,
            CircleMessage.sender_name,
            CircleMessage.recipient_id,
            CircleMessage.recipient_type,
            CircleMessage.content,
            CircleMessage.sent_at,
            CircleMessage.is_hidden,
        )
        .where(
            and_(
                CircleMessage.child_id == child_id,
                or_(
                    CircleMessage.sender_id == child_id,
                    CircleMessage.recipient_id == child_id,
                ),
            )
        )
        .order_by(desc(CircleMessage.sent_at))
    )

    result = await db.execute(partner_query)
    all_messages = result.all()

    # Group by conversation partner
    conversations = {}
    for msg in all_messages:
        # Determine who the partner is
        if msg.sender_id == child_id:
            partner_id = msg.recipient_id
            partner_type = msg.recipient_type
            partner_name = ""  # We'll look this up
        else:
            partner_id = msg.sender_id
            partner_type = msg.sender_type
            partner_name = msg.sender_name

        if partner_id not in conversations:
            conversations[partner_id] = {
                "partner_id": partner_id,
                "partner_type": partner_type,
                "partner_name": partner_name,
                "last_message": "Message filtered for safety" if msg.is_hidden else msg.content,
                "last_message_at": msg.sent_at,
                "child_id": child_id,
            }

    # Get unread counts per partner
    for partner_id in conversations:
        unread_result = await db.execute(
            select(func.count(CircleMessage.id)).where(
                and_(
                    CircleMessage.child_id == child_id,
                    CircleMessage.sender_id == partner_id,
                    CircleMessage.recipient_id == child_id,
                    CircleMessage.is_read == False,
                    CircleMessage.is_hidden == False,
                )
            )
        )
        conversations[partner_id]["unread_count"] = unread_result.scalar() or 0

    # Look up partner names for recipients (where child sent first)
    for partner_id, conv in conversations.items():
        if not conv["partner_name"]:
            # Try circle contact
            contact_result = await db.execute(
                select(CircleContact).where(CircleContact.id == partner_id)
            )
            contact = contact_result.scalar_one_or_none()
            if contact:
                conv["partner_name"] = contact.display_name
            else:
                # Try user (parent)
                user_result = await db.execute(
                    select(User).where(User.id == partner_id)
                )
                user = user_result.scalar_one_or_none()
                if user:
                    conv["partner_name"] = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Parent"

    items = [
        CircleConversationResponse(**conv) for conv in conversations.values()
    ]
    # Sort by last_message_at descending
    items.sort(key=lambda x: x.last_message_at or datetime.min, reverse=True)

    return CircleConversationListResponse(items=items, total=len(items))


@router.get(
    "/conversations/contact",
    response_model=CircleConversationListResponse,
)
async def get_conversations_as_contact(
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all active conversations for a circle contact.
    Each conversation is with a specific child.
    """
    contact_id = current_circle_user.contact_id

    partner_query = (
        select(CircleMessage)
        .where(
            or_(
                CircleMessage.sender_id == contact_id,
                CircleMessage.recipient_id == contact_id,
            )
        )
        .order_by(desc(CircleMessage.sent_at))
    )

    result = await db.execute(partner_query)
    all_messages = result.scalars().all()

    # Group by child_id (each conversation is with a specific child)
    conversations = {}
    for msg in all_messages:
        child_id = msg.child_id
        if child_id not in conversations:
            conversations[child_id] = {
                "partner_id": child_id,
                "partner_type": SenderType.CHILD,
                "partner_name": "",
                "last_message": "Message filtered for safety" if msg.is_hidden else msg.content,
                "last_message_at": msg.sent_at,
                "child_id": child_id,
            }

    # Look up child names and unread counts
    for child_id, conv in conversations.items():
        child_result = await db.execute(select(Child).where(Child.id == child_id))
        child = child_result.scalar_one_or_none()
        if child:
            conv["partner_name"] = child.first_name or "Child"
            conv["child_name"] = child.first_name

        unread_result = await db.execute(
            select(func.count(CircleMessage.id)).where(
                and_(
                    CircleMessage.child_id == child_id,
                    CircleMessage.sender_id == child_id,
                    CircleMessage.recipient_id == contact_id,
                    CircleMessage.is_read == False,
                    CircleMessage.is_hidden == False,
                )
            )
        )
        conv["unread_count"] = unread_result.scalar() or 0

    items = [CircleConversationResponse(**conv) for conv in conversations.values()]
    items.sort(key=lambda x: x.last_message_at or datetime.min, reverse=True)

    return CircleConversationListResponse(items=items, total=len(items))


# ============================================================
# PUT /circle-messages/{message_id}/read — Mark as read
# ============================================================

@router.put("/{message_id}/read", status_code=status.HTTP_200_OK)
async def mark_message_read(
    message_id: str,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a message as read (child auth)."""
    result = await db.execute(
        select(CircleMessage).where(CircleMessage.id == message_id)
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.recipient_id != current_child.child_id:
        raise HTTPException(status_code=403, detail="Not the recipient of this message")

    message.mark_read()
    await db.commit()
    return {"status": "ok"}


@router.put("/contact/{message_id}/read", status_code=status.HTTP_200_OK)
async def mark_message_read_as_contact(
    message_id: str,
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a message as read (contact auth)."""
    result = await db.execute(
        select(CircleMessage).where(CircleMessage.id == message_id)
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.recipient_id != current_circle_user.contact_id:
        raise HTTPException(status_code=403, detail="Not the recipient of this message")

    message.mark_read()
    await db.commit()
    return {"status": "ok"}


# ============================================================
# GET /circle-messages/unread-count — Total unread messages
# ============================================================

@router.get("/unread-count/child", response_model=UnreadCountResponse)
async def get_unread_count_as_child(
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    """Get total unread message count for a child."""
    result = await db.execute(
        select(func.count(CircleMessage.id)).where(
            and_(
                CircleMessage.recipient_id == current_child.child_id,
                CircleMessage.is_read == False,
                CircleMessage.is_hidden == False,
            )
        )
    )
    count = result.scalar() or 0
    return UnreadCountResponse(count=count)


@router.get("/unread-count/contact", response_model=UnreadCountResponse)
async def get_unread_count_as_contact(
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    """Get total unread message count for a circle contact."""
    result = await db.execute(
        select(func.count(CircleMessage.id)).where(
            and_(
                CircleMessage.recipient_id == current_circle_user.contact_id,
                CircleMessage.is_read == False,
                CircleMessage.is_hidden == False,
            )
        )
    )
    count = result.scalar() or 0
    return UnreadCountResponse(count=count)


# ============================================================
# ARIA Intervention Reporting Endpoints
# ============================================================

@router.get(
    "/interventions/{family_file_id}",
    response_model=InterventionListResponse,
)
async def get_interventions(
    family_file_id: str,
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    severity: Optional[str] = Query(None, pattern=r"^(mild|moderate|severe)$"),
    category: Optional[str] = Query(None, description="Filter by ARIA category"),
    sender_type: Optional[str] = Query(None, pattern=r"^(child|parent_a|parent_b|circle_contact)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get ARIA intervention history for a family file.

    Returns all flagged messages with full intervention metadata,
    filterable by date range, severity, category, and sender type.
    Court-ready data for professional reports.
    """
    # Verify parent access
    family_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = family_result.scalar_one_or_none()
    if not family_file or str(current_user.id) not in [str(family_file.user_a_id), str(family_file.user_b_id)]:
        raise HTTPException(status_code=403, detail="Not authorized for this family file")

    # Build query for flagged messages
    filters = [
        CircleMessage.family_file_id == family_file_id,
        CircleMessage.aria_flagged == True,
    ]

    if start_date:
        try:
            filters.append(CircleMessage.sent_at >= datetime.fromisoformat(start_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")

    if end_date:
        try:
            filters.append(CircleMessage.sent_at <= datetime.fromisoformat(end_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")

    if severity:
        severity_map = {"mild": 1, "moderate": 2, "severe": 3}
        filters.append(CircleMessage.aria_intervention_level == severity_map.get(severity))

    if category:
        filters.append(CircleMessage.aria_all_categories.contains(category))

    if sender_type:
        filters.append(CircleMessage.sender_type == sender_type)

    # Get interventions
    query = (
        select(CircleMessage)
        .where(and_(*filters))
        .order_by(desc(CircleMessage.sent_at))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    messages = result.scalars().all()

    # Get total count
    count_query = select(func.count(CircleMessage.id)).where(and_(*filters))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Map to intervention records
    items = []
    for msg in messages:
        categories = []
        if msg.aria_all_categories:
            try:
                categories = json.loads(msg.aria_all_categories)
            except (json.JSONDecodeError, TypeError):
                categories = [msg.aria_category] if msg.aria_category else []

        severity_names = {0: "safe", 1: "mild", 2: "moderate", 3: "severe"}
        items.append(InterventionRecord(
            message_id=msg.id,
            sent_at=msg.sent_at,
            sender_type=msg.sender_type,
            sender_name=msg.sender_name,
            severity=severity_names.get(msg.aria_intervention_level, "unknown"),
            categories=categories,
            original_content=msg.original_content,
            final_content=msg.content,
            suggested_rewrite=msg.aria_suggested_rewrite,
            user_action=msg.user_action,
            aria_score=msg.aria_score,
            response_time_ms=msg.aria_response_time_ms,
        ))

    return InterventionListResponse(items=items, total=total)


@router.get(
    "/intervention-stats/{family_file_id}",
    response_model=InterventionStatsResponse,
)
async def get_intervention_stats(
    family_file_id: str,
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get ARIA intervention statistics/summary for a family file.

    Returns aggregated metrics: total messages, flag rate, breakdowns
    by category, sender, severity, user action, and escalation trends.
    Designed for dashboard cards and professional court reports.
    """
    # Verify parent access
    family_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = family_result.scalar_one_or_none()
    if not family_file or str(current_user.id) not in [str(family_file.user_a_id), str(family_file.user_b_id)]:
        raise HTTPException(status_code=403, detail="Not authorized for this family file")

    # Date filters
    date_filters = [CircleMessage.family_file_id == family_file_id]
    if start_date:
        try:
            date_filters.append(CircleMessage.sent_at >= datetime.fromisoformat(start_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    if end_date:
        try:
            date_filters.append(CircleMessage.sent_at <= datetime.fromisoformat(end_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")

    # Total messages
    total_result = await db.execute(
        select(func.count(CircleMessage.id)).where(and_(*date_filters))
    )
    total_messages = total_result.scalar() or 0

    # Total flagged
    flagged_filters = date_filters + [CircleMessage.aria_flagged == True]
    flagged_result = await db.execute(
        select(func.count(CircleMessage.id)).where(and_(*flagged_filters))
    )
    total_flagged = flagged_result.scalar() or 0

    flag_rate = round(total_flagged / total_messages, 4) if total_messages > 0 else 0.0

    # Get all flagged messages for detailed breakdowns
    flagged_query = (
        select(CircleMessage)
        .where(and_(*flagged_filters))
        .order_by(CircleMessage.sent_at)
    )
    flagged_msgs_result = await db.execute(flagged_query)
    flagged_msgs = flagged_msgs_result.scalars().all()

    # By category
    by_category = {}
    for msg in flagged_msgs:
        cats = []
        if msg.aria_all_categories:
            try:
                cats = json.loads(msg.aria_all_categories)
            except (json.JSONDecodeError, TypeError):
                cats = [msg.aria_category] if msg.aria_category else []
        elif msg.aria_category:
            cats = [msg.aria_category]
        for cat in cats:
            by_category[cat] = by_category.get(cat, 0) + 1

    # By sender
    by_sender = {}
    for msg in flagged_msgs:
        st = msg.sender_type
        if st not in by_sender:
            by_sender[st] = {"sent": 0, "flagged": 0}
        by_sender[st]["flagged"] += 1

    # Add total sent counts per sender type
    for st in by_sender:
        sent_result = await db.execute(
            select(func.count(CircleMessage.id)).where(
                and_(*date_filters, CircleMessage.sender_type == st)
            )
        )
        by_sender[st]["sent"] = sent_result.scalar() or 0

    # By severity
    severity_names = {1: "mild", 2: "moderate", 3: "severe"}
    by_severity = {}
    for msg in flagged_msgs:
        level = msg.aria_intervention_level
        name = severity_names.get(level, "unknown")
        by_severity[name] = by_severity.get(name, 0) + 1

    # By user action
    by_user_action = {}
    for msg in flagged_msgs:
        action = msg.user_action or "no_response"
        by_user_action[action] = by_user_action.get(action, 0) + 1

    # Escalation trend (compare first half vs second half of flagged messages)
    escalation_trend = "stable"
    if len(flagged_msgs) >= 4:
        midpoint = len(flagged_msgs) // 2
        first_half_avg = sum(
            (m.aria_intervention_level or 0) for m in flagged_msgs[:midpoint]
        ) / midpoint
        second_half_avg = sum(
            (m.aria_intervention_level or 0) for m in flagged_msgs[midpoint:]
        ) / (len(flagged_msgs) - midpoint)
        if second_half_avg > first_half_avg + 0.3:
            escalation_trend = "increasing"
        elif second_half_avg < first_half_avg - 0.3:
            escalation_trend = "decreasing"

    # Time distribution (by hour bucket)
    time_distribution = {"morning": 0, "afternoon": 0, "evening": 0, "night": 0}
    for msg in flagged_msgs:
        hour = msg.sent_at.hour
        if 6 <= hour < 12:
            time_distribution["morning"] += 1
        elif 12 <= hour < 17:
            time_distribution["afternoon"] += 1
        elif 17 <= hour < 22:
            time_distribution["evening"] += 1
        else:
            time_distribution["night"] += 1

    return InterventionStatsResponse(
        total_messages=total_messages,
        total_flagged=total_flagged,
        flag_rate=flag_rate,
        by_category=by_category,
        by_sender=by_sender,
        by_severity=by_severity,
        by_user_action=by_user_action,
        escalation_trend=escalation_trend,
        time_distribution=time_distribution,
    )
