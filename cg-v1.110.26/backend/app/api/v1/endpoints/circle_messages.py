"""
Circle Messages API endpoints for text messaging between children, parents, and circle contacts.

All messages pass through ARIA child-safety monitoring before delivery.
Supports child ↔ circle contacts, child ↔ parents communication.
Parents are always notified of all child messages.
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Query
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
from app.schemas.circle_message import (
    CircleMessageCreate,
    CircleMessageResponse,
    CircleMessageListResponse,
    CircleConversationResponse,
    CircleConversationListResponse,
    UnreadCountResponse,
)
from app.services.aria_child_chat import ARIAChildChatMonitor
from app.services.push import push_service
from app.services.realtime import RealtimeService

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
        current_time = now.strftime("%H:%M")
        if not (permission.allowed_start_time <= current_time <= permission.allowed_end_time):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chat is not available at this time",
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

    # Notify the recipient (if they have a user account)
    # Circle contacts have their own user context; children see messages in-app
    # For circle contacts: look up their CircleUser to find notification target
    if message.recipient_type == SenderType.CIRCLE_CONTACT:
        try:
            result = await db.execute(
                select(CircleUser).where(CircleUser.contact_id == message.recipient_id)
            )
            circle_user = result.scalar_one_or_none()
            if circle_user and circle_user.email:
                # Circle users don't have parent user_ids, notifications handled via their portal
                logger.info(f"Circle contact {circle_user.email} has new message from {message.sender_name}")
        except Exception as e:
            logger.error(f"Failed to process recipient notification: {e}")


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

    # Run ARIA analysis
    analysis = aria_monitor.analyze_message(
        content=data.content,
        sender_type="child",
        sender_name=child.first_name or "Child",
    )

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
        content=data.content if not analysis.suggested_rewrite else analysis.suggested_rewrite,
        original_content=data.content if analysis.suggested_rewrite else None,
        aria_analyzed=True,
        aria_flagged=analysis.should_flag,
        aria_category=analysis.category.value if analysis.category else None,
        aria_reason=analysis.reason,
        aria_score=analysis.confidence_score,
        is_hidden=analysis.should_hide,
        sent_at=datetime.utcnow(),
    )

    db.add(message)
    await db.flush()

    # Communication log
    await _create_communication_log(db, message, family_file_id)

    # Push notifications
    await _send_message_notifications(db, message, family_file_id, child.first_name or "Child")

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

    # Run ARIA analysis
    analysis = aria_monitor.analyze_message(
        content=data.content,
        sender_type="circle_contact",
        sender_name=contact_name,
    )

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
        content=data.content if not analysis.suggested_rewrite else analysis.suggested_rewrite,
        original_content=data.content if analysis.suggested_rewrite else None,
        aria_analyzed=True,
        aria_flagged=analysis.should_flag,
        aria_category=analysis.category.value if analysis.category else None,
        aria_reason=analysis.reason,
        aria_score=analysis.confidence_score,
        is_hidden=analysis.should_hide,
        sent_at=datetime.utcnow(),
    )

    db.add(message)
    await db.flush()

    await _create_communication_log(db, message, family_file_id)
    await _send_message_notifications(db, message, family_file_id, child_name)

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
    - ARIA analysis still runs for consistency and logging
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

    # Run ARIA analysis (for logging consistency)
    analysis = aria_monitor.analyze_message(
        content=data.content,
        sender_type=sender_type,
        sender_name=sender_name,
    )

    message = CircleMessage(
        id=str(uuid4()),
        family_file_id=family_file.id,
        child_id=data.child_id,
        sender_id=str(current_user.id),
        sender_type=sender_type,
        sender_name=sender_name,
        recipient_id=data.child_id,
        recipient_type=SenderType.CHILD,
        content=data.content,
        aria_analyzed=True,
        aria_flagged=analysis.should_flag,
        aria_category=analysis.category.value if analysis.category else None,
        aria_reason=analysis.reason,
        aria_score=analysis.confidence_score,
        is_hidden=False,  # Parent messages are never hidden
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
