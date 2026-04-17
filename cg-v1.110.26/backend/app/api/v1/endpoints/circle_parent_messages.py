"""
Circle Parent Messages — dedicated parent ↔ circle-contact coordination
thread.

Separate from `circle_messages.py` (child ↔ contact) because a grandparent
asking "can I take Mia to a movie Saturday?" should NOT land in the child's
inbox. One thread per (circle_contact_id, parent_user_id).

All messages are analyzed by ARIA before save. SEVERE messages are saved
with a placeholder in `content` and the raw text in `original_content`
for parent/moderator review.

Two auth surfaces:
- Parent side uses `get_current_user` (standard User JWT).
- Contact side uses `get_current_circle_user` (CircleUser JWT). The
  contact's parent target is derived server-side from the CircleContact
  (defaulting to `added_by`), so the contact can't forge a thread key.
"""

import logging
from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_circle_user, get_current_user
from app.models.circle import CircleContact
from app.models.circle_parent_message import CircleParentMessage
from app.models.family_file import FamilyFile
from app.models.kidcoms import CircleUser
from app.models.user import User
from app.schemas.circle_parent_message import (
    CircleParentMessageCreate,
    CircleParentMessageListResponse,
    CircleParentMessageResponse,
    CircleParentThreadListResponse,
    CircleParentThreadSummary,
    ContactSideThreadInfo,
    ContactSideThreadResponse,
)
from app.services.aria_child_chat import aria_child_chat_monitor
from app.services.notification_service import notification_service
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)
router = APIRouter()

HIDDEN_PLACEHOLDER = "[Message hidden by safety filter]"
PREVIEW_LEN = 120


# ============================================================
# Helpers
# ============================================================


def _preview(text: Optional[str]) -> str:
    text = text or ""
    if len(text) <= PREVIEW_LEN:
        return text
    return text[: PREVIEW_LEN - 1].rstrip() + "\u2026"


def _parent_display_name(user: User) -> str:
    first = getattr(user, "first_name", None) or ""
    last = getattr(user, "last_name", None) or ""
    full = f"{first} {last}".strip()
    return full or getattr(user, "email", "Parent")


def _message_to_response(
    msg: CircleParentMessage, sender_name: str
) -> CircleParentMessageResponse:
    return CircleParentMessageResponse(
        id=msg.id,
        family_file_id=msg.family_file_id,
        circle_contact_id=msg.circle_contact_id,
        parent_user_id=msg.parent_user_id,
        sender_type=msg.sender_type,
        sender_name=sender_name,
        content=msg.content,
        original_content=msg.original_content,
        aria_flagged=msg.aria_flagged,
        aria_reason=msg.aria_reason,
        read_at=msg.read_at,
        created_at=msg.created_at,
    )


async def _load_contact_for_parent(
    db: AsyncSession, circle_contact_id: str, parent_user: User
) -> CircleContact:
    """
    Load a CircleContact and verify the requesting parent has access to
    its family file.
    """
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == circle_contact_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Circle contact not found"
        )

    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == contact.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()
    if family_file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found",
        )
    if (
        family_file.parent_a_id != parent_user.id
        and family_file.parent_b_id != parent_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this circle contact",
        )
    return contact


async def _resolve_contact_for_circle_user(
    db: AsyncSession, circle_user: CircleUser
) -> CircleContact:
    """Load the CircleContact backing a logged-in CircleUser."""
    result = await db.execute(
        select(CircleContact).where(
            CircleContact.id == circle_user.circle_contact_id
        )
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated contact not found",
        )
    return contact


async def _resolve_parent_for_contact(
    db: AsyncSession, contact: CircleContact
) -> User:
    """
    Pick the parent the contact should thread with. Defaults to the
    parent who added the contact; falls back to parent_a then parent_b
    if the adder is no longer on the file.
    """
    ff_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == contact.family_file_id)
    )
    family_file = ff_result.scalar_one_or_none()
    if family_file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Family file not found"
        )

    valid_parent_ids = {
        pid for pid in (family_file.parent_a_id, family_file.parent_b_id) if pid
    }
    parent_id = (
        contact.added_by if contact.added_by in valid_parent_ids else None
    ) or family_file.parent_a_id or family_file.parent_b_id
    if not parent_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No parent available on this family file",
        )

    user_result = await db.execute(select(User).where(User.id == parent_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent user not found",
        )
    return user


def _assert_contact_can_message(contact: CircleContact) -> None:
    """Block messaging for unverified or inactive contacts."""
    if not contact.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This contact is no longer active.",
        )
    if not contact.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This contact hasn't verified their email yet. "
                "They need to accept the invite before messages can go through."
            ),
        )


async def _run_aria(
    content: str, sender_type: str, sender_name: str
) -> Tuple[str, Optional[str], bool, Optional[str]]:
    """
    Run ARIA analysis and return (final_content, original_content,
    aria_flagged, aria_reason). On SEVERE flag, content is replaced
    with the hidden placeholder.
    """
    try:
        result = aria_child_chat_monitor.analyze_message(
            content=content,
            sender_type=sender_type,
            sender_name=sender_name,
        )
    except Exception as exc:  # pragma: no cover — never fail the send on ARIA crash
        logger.warning("ARIA analysis failed, allowing message: %s", exc)
        capture_error(exc)
        return content, None, False, None

    should_hide = bool(getattr(result, "should_hide", False))
    should_flag = bool(getattr(result, "should_flag", False))
    reason = getattr(result, "reason", None) if should_flag else None

    if should_hide:
        return HIDDEN_PLACEHOLDER, content, True, reason
    return content, None, should_flag, reason


async def _notify_contact(
    db: AsyncSession,
    contact: CircleContact,
    parent_user: User,
    body_preview: str,
) -> None:
    """In-app + email nudge to the contact for a new parent → contact msg."""
    circle_user_result = await db.execute(
        select(CircleUser).where(
            CircleUser.circle_contact_id == contact.id
        )
    )
    circle_user = circle_user_result.scalar_one_or_none()
    if circle_user is None:
        return

    # Contacts aren't users.id-backed, so they don't have a row in
    # `notifications`. Use the generic email template as the durable
    # notification; the contact will also see unread messages in their
    # dashboard when they log in.
    try:
        from app.services.email import email_service

        parent_name = _parent_display_name(parent_user)
        await email_service.send_generic_notification(
            to_email=circle_user.email,
            to_name=contact.contact_name or circle_user.email,
            subject=f"New message from {parent_name} on CommonGround",
            message=body_preview
            or "You have a new message on CommonGround My Circle.",
            cta_url="/my-circle/contact/chat",
            cta_text="Open Thread",
            title="New Message",
        )
    except Exception as exc:  # pragma: no cover — best-effort email
        logger.warning("Failed to email circle contact notification: %s", exc)
        capture_error(exc)


async def _notify_parent(
    db: AsyncSession,
    parent_user: User,
    contact: CircleContact,
    family_file_id: str,
    body_preview: str,
) -> None:
    """In-app + email nudge to the parent for a new contact → parent msg."""
    try:
        await notification_service.create(
            db=db,
            user_id=parent_user.id,
            notification_type="circle_contact_message",
            title=f"New message from {contact.contact_name or 'a circle contact'}",
            body=body_preview or "You have a new My Circle message.",
            action_url=f"/my-circle/{contact.id}/chat",
            family_file_id=family_file_id,
            metadata={
                "circle_contact_id": contact.id,
                "cta_text": "Open Thread",
            },
            send_email=True,
        )
    except Exception as exc:  # pragma: no cover — never fail the send
        logger.warning("Failed to notify parent of circle message: %s", exc)
        capture_error(exc)


# ============================================================
# Parent-side: list all contact threads
# ============================================================


@router.get(
    "/threads",
    response_model=CircleParentThreadListResponse,
    summary="List circle-contact threads for this parent",
)
async def list_parent_threads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    One summary per circle contact on any family file the parent belongs
    to, with last-message preview and the parent's unread count.
    """
    ff_result = await db.execute(
        select(FamilyFile).where(
            or_(
                FamilyFile.parent_a_id == current_user.id,
                FamilyFile.parent_b_id == current_user.id,
            )
        )
    )
    family_files = list(ff_result.scalars().all())
    if not family_files:
        return CircleParentThreadListResponse(items=[], total=0)

    ff_ids = [ff.id for ff in family_files]

    contacts_result = await db.execute(
        select(CircleContact).where(CircleContact.family_file_id.in_(ff_ids))
    )
    contacts = list(contacts_result.scalars().all())

    summaries: List[CircleParentThreadSummary] = []
    for contact in contacts:
        last_msg_result = await db.execute(
            select(CircleParentMessage)
            .where(
                and_(
                    CircleParentMessage.circle_contact_id == contact.id,
                    CircleParentMessage.parent_user_id == current_user.id,
                )
            )
            .order_by(desc(CircleParentMessage.created_at))
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()

        unread_result = await db.execute(
            select(func.count(CircleParentMessage.id)).where(
                and_(
                    CircleParentMessage.circle_contact_id == contact.id,
                    CircleParentMessage.parent_user_id == current_user.id,
                    CircleParentMessage.sender_type == "contact",
                    CircleParentMessage.read_at.is_(None),
                )
            )
        )
        unread = int(unread_result.scalar_one() or 0)

        summaries.append(
            CircleParentThreadSummary(
                circle_contact_id=contact.id,
                contact_name=contact.contact_name or "Contact",
                contact_photo_url=contact.photo_url,
                relationship_type=contact.relationship_type,
                is_verified=bool(contact.is_verified),
                is_active=bool(contact.is_active),
                last_message_preview=(
                    _preview(last_msg.content) if last_msg else None
                ),
                last_message_at=last_msg.created_at if last_msg else None,
                unread_count=unread,
            )
        )

    summaries.sort(
        key=lambda s: (
            s.last_message_at is None,
            -(s.last_message_at.timestamp() if s.last_message_at else 0),
        )
    )
    return CircleParentThreadListResponse(items=summaries, total=len(summaries))


# ============================================================
# Parent-side: view a single contact thread
# ============================================================


@router.get(
    "/thread/{circle_contact_id}",
    response_model=CircleParentMessageListResponse,
    summary="View parent ↔ contact thread (parent auth)",
)
async def get_parent_thread(
    circle_contact_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await _load_contact_for_parent(
        db, circle_contact_id, current_user
    )

    base = select(CircleParentMessage).where(
        and_(
            CircleParentMessage.circle_contact_id == contact.id,
            CircleParentMessage.parent_user_id == current_user.id,
        )
    )

    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()

    items_result = await db.execute(
        base.order_by(desc(CircleParentMessage.created_at))
        .offset(offset)
        .limit(limit)
    )
    messages = list(items_result.scalars().all())

    unread_result = await db.execute(
        select(func.count(CircleParentMessage.id)).where(
            and_(
                CircleParentMessage.circle_contact_id == contact.id,
                CircleParentMessage.parent_user_id == current_user.id,
                CircleParentMessage.sender_type == "contact",
                CircleParentMessage.read_at.is_(None),
            )
        )
    )
    unread = int(unread_result.scalar_one() or 0)

    parent_name = _parent_display_name(current_user)
    contact_name = contact.contact_name or "Contact"

    items: List[CircleParentMessageResponse] = []
    for msg in messages:
        sender_name = parent_name if msg.sender_type == "parent" else contact_name
        items.append(_message_to_response(msg, sender_name))

    return CircleParentMessageListResponse(
        items=items, total=int(total), unread_count=unread
    )


# ============================================================
# Parent-side: send a message
# ============================================================


@router.post(
    "/{circle_contact_id}/send",
    response_model=CircleParentMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message from parent to circle contact",
)
async def send_parent_message(
    circle_contact_id: str,
    payload: CircleParentMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await _load_contact_for_parent(
        db, circle_contact_id, current_user
    )
    _assert_contact_can_message(contact)

    parent_name = _parent_display_name(current_user)
    final_content, original_content, aria_flagged, aria_reason = await _run_aria(
        payload.content, sender_type="parent", sender_name=parent_name
    )

    message = CircleParentMessage(
        family_file_id=contact.family_file_id,
        circle_contact_id=contact.id,
        parent_user_id=current_user.id,
        sender_type="parent",
        content=final_content,
        original_content=original_content,
        aria_flagged=aria_flagged,
        aria_reason=aria_reason,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    # Best-effort nudge to the contact (email; no user row for in-app).
    await _notify_contact(
        db=db,
        contact=contact,
        parent_user=current_user,
        body_preview=_preview(final_content),
    )

    if aria_flagged:
        logger.warning(
            "ARIA flagged parent→contact message contact=%s parent=%s reason=%s",
            contact.id,
            current_user.id,
            aria_reason,
        )

    return _message_to_response(message, parent_name)


# ============================================================
# Contact-side: view their thread with the parent
# ============================================================


@router.get(
    "/thread",
    response_model=ContactSideThreadResponse,
    summary="View parent ↔ contact thread (contact auth)",
)
async def get_contact_thread(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await _resolve_contact_for_circle_user(db, current_circle_user)
    parent = await _resolve_parent_for_contact(db, contact)

    base = select(CircleParentMessage).where(
        and_(
            CircleParentMessage.circle_contact_id == contact.id,
            CircleParentMessage.parent_user_id == parent.id,
        )
    )
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()

    items_result = await db.execute(
        base.order_by(desc(CircleParentMessage.created_at))
        .offset(offset)
        .limit(limit)
    )
    messages = list(items_result.scalars().all())

    unread_result = await db.execute(
        select(func.count(CircleParentMessage.id)).where(
            and_(
                CircleParentMessage.circle_contact_id == contact.id,
                CircleParentMessage.parent_user_id == parent.id,
                CircleParentMessage.sender_type == "parent",
                CircleParentMessage.read_at.is_(None),
            )
        )
    )
    unread = int(unread_result.scalar_one() or 0)

    parent_name = _parent_display_name(parent)
    contact_name = contact.contact_name or "Contact"

    items: List[CircleParentMessageResponse] = []
    for msg in messages:
        sender_name = parent_name if msg.sender_type == "parent" else contact_name
        items.append(_message_to_response(msg, sender_name))

    info = ContactSideThreadInfo(
        circle_contact_id=contact.id,
        parent_user_id=parent.id,
        parent_name=parent_name,
        family_file_id=contact.family_file_id,
        is_active=bool(contact.is_active),
        is_verified=bool(contact.is_verified),
    )
    return ContactSideThreadResponse(
        info=info, items=items, total=int(total), unread_count=unread
    )


# ============================================================
# Contact-side: send a message
# ============================================================


@router.post(
    "/send",
    response_model=CircleParentMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message from circle contact to parent",
)
async def send_contact_message(
    payload: CircleParentMessageCreate,
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await _resolve_contact_for_circle_user(db, current_circle_user)
    _assert_contact_can_message(contact)
    parent = await _resolve_parent_for_contact(db, contact)

    contact_name = contact.contact_name or "Contact"
    final_content, original_content, aria_flagged, aria_reason = await _run_aria(
        payload.content, sender_type="circle_contact", sender_name=contact_name
    )

    message = CircleParentMessage(
        family_file_id=contact.family_file_id,
        circle_contact_id=contact.id,
        parent_user_id=parent.id,
        sender_type="contact",
        content=final_content,
        original_content=original_content,
        aria_flagged=aria_flagged,
        aria_reason=aria_reason,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    await _notify_parent(
        db=db,
        parent_user=parent,
        contact=contact,
        family_file_id=contact.family_file_id,
        body_preview=_preview(final_content),
    )

    if aria_flagged:
        logger.warning(
            "ARIA flagged contact→parent message contact=%s parent=%s reason=%s",
            contact.id,
            parent.id,
            aria_reason,
        )

    return _message_to_response(message, contact_name)


# ============================================================
# Mark thread read (parent OR contact)
# ============================================================


async def _mark_read_for(
    db: AsyncSession,
    circle_contact_id: str,
    parent_user_id: str,
    requester_side: str,  # "parent" or "contact"
) -> int:
    # The requester marks messages from the OTHER side as read.
    opposite = "contact" if requester_side == "parent" else "parent"
    result = await db.execute(
        select(CircleParentMessage).where(
            and_(
                CircleParentMessage.circle_contact_id == circle_contact_id,
                CircleParentMessage.parent_user_id == parent_user_id,
                CircleParentMessage.sender_type == opposite,
                CircleParentMessage.read_at.is_(None),
            )
        )
    )
    rows = list(result.scalars().all())
    now = datetime.utcnow()
    for row in rows:
        row.read_at = now
    if rows:
        await db.commit()
    return len(rows)


@router.post(
    "/{thread_id}/mark-read",
    summary="Mark messages from the other side as read (parent OR contact auth)",
)
async def mark_thread_read(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    `thread_id` is the circle_contact_id. Parent auth marks their own
    thread with that contact read. The contact-side mark-read hits a
    separate convenience route below (no ID needed).
    """
    contact = await _load_contact_for_parent(db, thread_id, current_user)
    updated = await _mark_read_for(
        db, contact.id, current_user.id, requester_side="parent"
    )
    return {"updated": updated}


@router.post(
    "/mark-read-as-contact",
    summary="Contact marks their parent-thread as read",
)
async def mark_thread_read_as_contact(
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await _resolve_contact_for_circle_user(db, current_circle_user)
    parent = await _resolve_parent_for_contact(db, contact)
    updated = await _mark_read_for(
        db, contact.id, parent.id, requester_side="contact"
    )
    return {"updated": updated}
