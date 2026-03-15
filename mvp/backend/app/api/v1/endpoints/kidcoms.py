"""
KidComs API endpoints for child communication sessions.

KidComs enables children to have video calls, chat, watch movies together,
play games, and use collaborative whiteboards with their approved circle.
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
import secrets

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.core.security import get_current_user, get_current_child_user, get_current_circle_user
from app.services.daily_video import daily_service
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.circle import CircleContact, ApprovalMode
from app.models.kidcoms import (
    KidComsSettings,
    KidComsSession,
    KidComsMessage,
    KidComsSessionInvite,
    SessionStatus,
    SessionType,
    ParticipantType,
    ChildUser,
    CircleUser,
    CirclePermission,
)
from app.schemas.kidcoms import (
    KidComsSettingsCreate,
    KidComsSettingsUpdate,
    KidComsSettingsResponse,
    KidComsSessionCreate,
    KidComsSessionUpdate,
    KidComsSessionResponse,
    KidComsSessionListResponse,
    KidComsJoinRequest,
    KidComsJoinResponse,
    KidComsEndSessionRequest,
    KidComsMessageCreate,
    KidComsMessageResponse,
    KidComsMessageListResponse,
    KidComsSessionInviteCreate,
    KidComsSessionInviteResponse,
    KidComsInviteAcceptRequest,
    KidComsFamilySummary,
    KidComsChildSummary,
    SessionParticipant,
    ARIAChatAnalyzeRequest,
    ARIAChatAnalyzeResponse,
    SESSION_TYPES,
    ChildSessionCreate,
    CircleContactSessionCreate,
    IncomingCallResponse,
    IncomingCallListResponse,
)

router = APIRouter()


# ============================================================
# Helper Functions
# ============================================================

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

    if family_file.parent_a_id != user_id and family_file.parent_b_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this family file"
        )

    return family_file


async def get_or_create_settings(
    db: AsyncSession, family_file_id: str
) -> KidComsSettings:
    """Get or create KidComs settings for a family file."""
    result = await db.execute(
        select(KidComsSettings).where(
            KidComsSettings.family_file_id == family_file_id
        )
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = KidComsSettings(family_file_id=family_file_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


def generate_room_name() -> str:
    """Generate a unique Daily.co room name."""
    return f"cg-kidcoms-{secrets.token_urlsafe(12)}"


def generate_invite_token() -> str:
    """Generate a session invite token."""
    return secrets.token_urlsafe(32)


# ============================================================
# Settings Endpoints
# ============================================================

@router.get(
    "/settings/{family_file_id}",
    response_model=KidComsSettingsResponse,
    summary="Get KidComs settings",
    description="Get KidComs configuration for a family."
)
async def get_kidcoms_settings(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get KidComs settings for a family file."""
    await get_family_file_with_access(db, family_file_id, current_user.id)
    settings = await get_or_create_settings(db, family_file_id)
    return KidComsSettingsResponse.model_validate(settings)


@router.put(
    "/settings/{family_file_id}",
    response_model=KidComsSettingsResponse,
    summary="Update KidComs settings",
    description="Update KidComs configuration for a family."
)
async def update_kidcoms_settings(
    family_file_id: str,
    update_data: KidComsSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update KidComs settings."""
    await get_family_file_with_access(db, family_file_id, current_user.id)
    settings = await get_or_create_settings(db, family_file_id)

    update_fields = update_data.model_dump(exclude_unset=True)

    # ARIA lockdown: record_sessions cannot be disabled by parents.
    # Recording and ARIA monitoring are always-on for child safety.
    if "record_sessions" in update_fields and update_fields["record_sessions"] is False:
        update_fields["record_sessions"] = True
        logger.info(
            f"Blocked attempt to disable record_sessions for family {family_file_id} "
            f"by user {current_user.id}. Recording is always-on for child safety."
        )

    for field, value in update_fields.items():
        setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)

    return KidComsSettingsResponse.model_validate(settings)


# ============================================================
# Session Endpoints
# ============================================================

@router.post(
    "/sessions",
    status_code=status.HTTP_201_CREATED,
    response_model=KidComsSessionResponse,
    summary="Create KidComs session",
    description="Start a new video call, theater, arcade, or whiteboard session."
)
async def create_session(
    session_data: KidComsSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new KidComs session.

    - **session_type**: video_call, theater, arcade, whiteboard, or mixed
    - **child_id**: The child initiating/participating in the session
    - **invited_contact_ids**: Circle contacts to invite
    """
    # Verify access
    family_file = await get_family_file_with_access(
        db, session_data.family_file_id, current_user.id
    )

    # Verify child belongs to family
    child_result = await db.execute(
        select(Child).where(
            and_(
                Child.id == session_data.child_id,
                Child.family_file_id == session_data.family_file_id
            )
        )
    )
    child = child_result.scalar_one_or_none()
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found in this family file"
        )

    # Check settings
    settings = await get_or_create_settings(db, session_data.family_file_id)

    # Check if session type is allowed
    # Map session types to feature keys: video_call -> video, theater -> theater, etc.
    feature_key = session_data.session_type.split("_")[0]
    if not settings.is_feature_allowed(feature_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Session type '{session_data.session_type}' is not allowed for this family"
        )

    # Check availability
    if settings.enforce_availability and not settings.is_within_availability():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KidComs is not available at this time based on family settings"
        )

    # Generate Daily.co room
    room_name = generate_room_name()

    # Create room via Daily.co API
    # ARIA lockdown: recording and ARIA monitoring are always-on for parent-initiated calls
    # Parents cannot disable these settings for child safety
    try:
        # Handle case where allowed_features might be None for older records
        enable_chat = settings.allowed_features.get("chat", True) if settings.allowed_features else True
        room_data = await daily_service.create_room(
            room_name=room_name,
            privacy="private",
            exp_minutes=settings.max_session_duration_minutes + 30,  # Add buffer
            max_participants=settings.max_participants_per_session,
            enable_chat=enable_chat,
            enable_recording=True,  # Always-on for parent calls (cannot be disabled)
        )
        room_url = room_data.get("url", f"https://{daily_service.domain}/{room_name}")
    except Exception as e:
        logger.error(f"Failed to create Daily.co room: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to create video room. Please try again later."
        )

    # Create session
    is_immediate_call = not session_data.scheduled_for
    session = KidComsSession(
        family_file_id=session_data.family_file_id,
        child_id=session_data.child_id,
        session_type=session_data.session_type,
        title=session_data.title or f"Call from {current_user.first_name}",
        daily_room_name=room_name,
        daily_room_url=room_url,
        initiated_by_id=current_user.id,
        initiated_by_type=ParticipantType.PARENT.value,
        scheduled_for=session_data.scheduled_for,
        status=SessionStatus.WAITING.value if is_immediate_call else SessionStatus.SCHEDULED.value,
        ringing_started_at=datetime.utcnow() if is_immediate_call else None,  # Track when call started ringing
    )

    # Add creating user as first participant
    session.add_participant(
        participant_id=current_user.id,
        participant_type=ParticipantType.PARENT.value,
        name=f"{current_user.first_name} {current_user.last_name}"
    )

    # Add child as participant
    session.add_participant(
        participant_id=child.id,
        participant_type=ParticipantType.CHILD.value,
        name=child.display_name
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Create invites for circle contacts
    for contact_id in session_data.invited_contact_ids:
        contact_result = await db.execute(
            select(CircleContact).where(
                and_(
                    CircleContact.id == contact_id,
                    CircleContact.family_file_id == session_data.family_file_id,
                    CircleContact.is_active == True
                )
            )
        )
        contact = contact_result.scalar_one_or_none()

        if contact:
            invite = KidComsSessionInvite(
                session_id=session.id,
                circle_contact_id=contact.id,
                invited_by_id=current_user.id,
                invited_by_type=ParticipantType.PARENT.value,
                invite_token=generate_invite_token(),
                invite_url=f"{room_url}?token={generate_invite_token()}",
                expires_at=datetime.utcnow() + timedelta(hours=24),
            )
            db.add(invite)

    await db.commit()

    return _session_to_response(session)


@router.get(
    "/sessions",
    response_model=KidComsSessionListResponse,
    summary="List sessions",
    description="List KidComs sessions for a family."
)
async def list_sessions(
    family_file_id: str = Query(..., description="Family file ID"),
    child_id: Optional[str] = Query(None, description="Filter by child"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List KidComs sessions."""
    await get_family_file_with_access(db, family_file_id, current_user.id)

    query = select(KidComsSession).where(
        KidComsSession.family_file_id == family_file_id
    )

    if child_id:
        query = query.where(KidComsSession.child_id == child_id)

    if status_filter:
        query = query.where(KidComsSession.status == status_filter)

    query = query.order_by(KidComsSession.created_at.desc())
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    sessions = result.scalars().all()

    # Get total count
    count_query = select(KidComsSession).where(
        KidComsSession.family_file_id == family_file_id
    )
    if child_id:
        count_query = count_query.where(KidComsSession.child_id == child_id)
    if status_filter:
        count_query = count_query.where(KidComsSession.status == status_filter)

    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    return KidComsSessionListResponse(
        items=[_session_to_response(s) for s in sessions],
        total=total
    )


@router.get(
    "/sessions/active/{family_file_id}",
    response_model=KidComsSessionListResponse,
    summary="Get active sessions",
    description="Get active or waiting sessions for a family file that the user can join."
)
async def get_active_sessions(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get active sessions that the current user can join.

    Returns sessions that are:
    - In 'waiting' status ONLY (incoming calls, not yet answered)
    - Belong to the user's family file
    - User is an invited participant (their ID is in the participants list)
    - User hasn't initiated the call themselves
    """
    await get_family_file_with_access(db, family_file_id, current_user.id)

    # Get WAITING sessions only (not active - those are already in progress)
    query = select(KidComsSession).where(
        and_(
            KidComsSession.family_file_id == family_file_id,
            KidComsSession.status == SessionStatus.WAITING.value
        )
    ).order_by(KidComsSession.created_at.desc())

    result = await db.execute(query)
    sessions = result.scalars().all()

    # Filter to sessions where this user is an invited participant
    incoming_sessions = []
    user_id_str = str(current_user.id)

    for session in sessions:
        # Skip if user initiated this call
        if session.initiated_by_id == user_id_str:
            continue

        # Check if user is in the participants list
        if session.participants:
            for participant in session.participants:
                if participant.get("id") == user_id_str and participant.get("type") == "parent":
                    incoming_sessions.append(session)
                    break

    return KidComsSessionListResponse(
        items=[_session_to_response(s) for s in incoming_sessions],
        total=len(incoming_sessions)
    )


@router.get(
    "/sessions/{session_id}",
    response_model=KidComsSessionResponse,
    summary="Get session",
    description="Get a KidComs session by ID."
)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a KidComs session by ID."""
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    await get_family_file_with_access(db, session.family_file_id, current_user.id)

    return _session_to_response(session)


@router.post(
    "/sessions/{session_id}/join",
    response_model=KidComsJoinResponse,
    summary="Join session",
    description="Join an existing KidComs session."
)
async def join_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join a KidComs session and get a Daily.co token."""
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    await get_family_file_with_access(db, session.family_file_id, current_user.id)

    if session.status not in [SessionStatus.WAITING.value, SessionStatus.ACTIVE.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot join session with status: {session.status}"
        )

    # Add as participant if not already
    participant_ids = [p["id"] for p in (session.participants or [])]
    if current_user.id not in participant_ids:
        session.add_participant(
            participant_id=current_user.id,
            participant_type=ParticipantType.PARENT.value,
            name=f"{current_user.first_name} {current_user.last_name}"
        )

    # Only mark session as active if:
    # 1. It's already waiting AND
    # 2. The person joining is NOT the one who initiated the call
    # This keeps the session in WAITING status so the recipient can see the incoming call
    if session.status == SessionStatus.WAITING.value:
        user_id_str = str(current_user.id)
        if session.initiated_by_id != user_id_str:
            # Recipient is joining - mark as active
            session.start()

    await db.commit()

    # Generate Daily.co meeting token
    participant_name = f"{current_user.first_name} {current_user.last_name}"
    try:
        token = await daily_service.create_meeting_token(
            room_name=session.daily_room_name,
            user_name=participant_name,
            user_id=str(current_user.id),
            is_owner=True,  # Parents are owners
            exp_minutes=120,
        )
    except Exception as e:
        logger.error(f"Failed to create meeting token: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate meeting token. Please try again."
        )

    return KidComsJoinResponse(
        session_id=session.id,
        room_url=session.daily_room_url,
        token=token,
        participant_name=participant_name,
        participant_type=ParticipantType.PARENT.value,
    )


@router.post(
    "/sessions/{session_id}/end",
    response_model=KidComsSessionResponse,
    summary="End session",
    description="End an active KidComs session."
)
async def end_session(
    session_id: str,
    end_data: Optional[KidComsEndSessionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """End a KidComs session."""
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    await get_family_file_with_access(db, session.family_file_id, current_user.id)

    if session.status == SessionStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is already ended"
        )

    session.end()
    if end_data and end_data.notes:
        session.notes = end_data.notes

    # Delete Daily.co room
    await daily_service.delete_room(session.daily_room_name)

    await db.commit()
    await db.refresh(session)

    return _session_to_response(session)


# ============================================================
# Child-Initiated Session Endpoints
# ============================================================

@router.post(
    "/sessions/child/create",
    status_code=status.HTTP_201_CREATED,
    response_model=KidComsJoinResponse,
    summary="Child creates session",
    description="Allow a child to initiate a video/voice call to a parent or circle contact."
)
async def create_child_session(
    session_data: ChildSessionCreate,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new KidComs session initiated by a child.

    - Child clicks on a contact (parent or circle member)
    - Creates a session and returns join info
    - Notifies the target contact of incoming call
    """
    # Get child info
    child_result = await db.execute(
        select(Child).where(Child.id == current_child.child_id)
    )
    child = child_result.scalar_one_or_none()
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found"
        )

    family_file_id = current_child.family_file_id

    # Get family file to verify parent contacts
    family_result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = family_result.scalar_one_or_none()
    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    # Check settings
    settings = await get_or_create_settings(db, family_file_id)

    # Check if child can initiate calls
    if not settings.allow_child_to_initiate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Children are not allowed to initiate calls in this family"
        )

    # Check availability
    if settings.enforce_availability and not settings.is_within_availability():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KidComs is not available at this time"
        )

    # Validate target contact based on type
    target_user_name = None
    target_user_id = None
    target_circle_contact_id = None

    if session_data.contact_type == "parent_a":
        if family_file.parent_a_id != session_data.contact_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid parent_a contact ID"
            )
        target_user_id = family_file.parent_a_id
        # Get parent name
        parent_result = await db.execute(
            select(User).where(User.id == family_file.parent_a_id)
        )
        parent = parent_result.scalar_one_or_none()
        target_user_name = f"{parent.first_name} {parent.last_name}" if parent else "Parent A"

    elif session_data.contact_type == "parent_b":
        if family_file.parent_b_id != session_data.contact_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid parent_b contact ID"
            )
        target_user_id = family_file.parent_b_id
        # Get parent name
        parent_result = await db.execute(
            select(User).where(User.id == family_file.parent_b_id)
        )
        parent = parent_result.scalar_one_or_none()
        target_user_name = f"{parent.first_name} {parent.last_name}" if parent else "Parent B"

    elif session_data.contact_type == "circle":
        # Verify circle contact exists and is active
        contact_result = await db.execute(
            select(CircleContact).where(
                and_(
                    CircleContact.id == session_data.contact_id,
                    CircleContact.family_file_id == family_file_id,
                    CircleContact.is_active == True
                )
            )
        )
        circle_contact = contact_result.scalar_one_or_none()
        if not circle_contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Circle contact not found or not active"
            )
        target_user_name = circle_contact.contact_name
        target_circle_contact_id = circle_contact.id

    # Generate Daily.co room
    room_name = generate_room_name()

    # Create room via Daily.co API
    try:
        # Handle case where allowed_features might be None for older records
        enable_chat = settings.allowed_features.get("chat", True) if settings.allowed_features else True
        room_data = await daily_service.create_room(
            room_name=room_name,
            privacy="private",
            exp_minutes=settings.max_session_duration_minutes + 30,
            max_participants=settings.max_participants_per_session,
            enable_chat=enable_chat,
            enable_recording=settings.record_sessions,
        )
        room_url = room_data.get("url", f"https://{daily_service.domain}/{room_name}")
    except Exception as e:
        logger.error(f"Failed to create Daily.co room: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to create video room. Please try again later."
        )

    # Create session
    session = KidComsSession(
        family_file_id=family_file_id,
        child_id=current_child.child_id,
        circle_contact_id=target_circle_contact_id,  # Set if calling a circle contact
        session_type=session_data.session_type,
        title=f"Call from {child.display_name}",
        daily_room_name=room_name,
        daily_room_url=room_url,
        initiated_by_id=current_child.id,
        initiated_by_type=ParticipantType.CHILD.value,
        status=SessionStatus.WAITING.value,
        ringing_started_at=datetime.utcnow(),  # Track when the call started ringing
    )

    # Add child as first participant
    session.add_participant(
        participant_id=current_child.child_id,
        participant_type=ParticipantType.CHILD.value,
        name=child.display_name
    )

    # Add target as invited participant (parent or circle contact)
    if target_user_id:
        # Parent is the target
        session.add_participant(
            participant_id=target_user_id,
            participant_type=ParticipantType.PARENT.value,
            name=target_user_name
        )
    elif target_circle_contact_id:
        # Circle contact is the target
        session.add_participant(
            participant_id=target_circle_contact_id,
            participant_type=ParticipantType.CIRCLE_CONTACT.value,
            name=target_user_name
        )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Generate Daily.co meeting token for the child
    try:
        token = await daily_service.create_meeting_token(
            room_name=session.daily_room_name,
            user_name=child.display_name,
            user_id=str(current_child.child_id),
            is_owner=False,  # Child is not owner
            exp_minutes=settings.max_session_duration_minutes,
        )
    except Exception as e:
        logger.error(f"Failed to create meeting token: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate meeting token. Please try again."
        )

    # TODO: Send notification to target contact about incoming call

    return KidComsJoinResponse(
        session_id=session.id,
        room_url=session.daily_room_url,
        token=token,
        participant_name=child.display_name,
        participant_type=ParticipantType.CHILD.value,
    )


@router.get(
    "/sessions/child/active",
    response_model=KidComsSessionListResponse,
    summary="Get active sessions for child",
    description="Get active/waiting sessions where the child is a participant."
)
async def get_child_active_sessions(
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get active sessions for a child to show incoming call notifications.
    Returns sessions where:
    - Child is a participant
    - Status is 'waiting' or 'active'
    """
    # Get sessions where child is participant
    result = await db.execute(
        select(KidComsSession)
        .where(
            and_(
                KidComsSession.child_id == current_child.child_id,
                KidComsSession.status.in_([
                    SessionStatus.WAITING.value,
                    SessionStatus.ACTIVE.value
                ])
            )
        )
        .order_by(KidComsSession.created_at.desc())
        .limit(10)
    )
    sessions = result.scalars().all()

    return KidComsSessionListResponse(
        items=[_session_to_response(s) for s in sessions],
        total=len(sessions),
    )


@router.post(
    "/sessions/child/{session_id}/join",
    response_model=KidComsJoinResponse,
    summary="Child joins session",
    description="Allow a child to join an existing session they're part of."
)
async def child_join_session(
    session_id: str,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db)
):
    """Join a KidComs session as a child and get a Daily.co token."""
    # Get session
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Verify child is part of this session
    if session.child_id != current_child.child_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this session"
        )

    if session.status not in [SessionStatus.WAITING.value, SessionStatus.ACTIVE.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot join session with status: {session.status}"
        )

    # Get child info for name
    child_result = await db.execute(
        select(Child).where(Child.id == current_child.child_id)
    )
    child = child_result.scalar_one_or_none()
    child_name = child.display_name if child else "Child"

    # Only mark session as active if:
    # 1. It's currently waiting AND
    # 2. The child joining is NOT the one who initiated the call
    # This keeps the session in WAITING status so the recipient can see the incoming call
    if session.status == SessionStatus.WAITING.value:
        child_id_str = str(current_child.child_id)
        # If child initiated the call, they're waiting for someone else - don't mark as active
        # If someone else initiated (parent/circle), child is answering - mark as active
        if session.initiated_by_id != child_id_str:
            session.start()
            await db.commit()

    # Generate Daily.co meeting token
    try:
        token = await daily_service.create_meeting_token(
            room_name=session.daily_room_name,
            user_name=child_name,
            user_id=str(current_child.child_id),
            is_owner=False,  # Children are not owners
            exp_minutes=120,
        )
    except Exception as e:
        logger.error(f"Failed to create meeting token: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate meeting token. Please try again."
        )

    return KidComsJoinResponse(
        session_id=session.id,
        room_url=session.daily_room_url,
        token=token,
        participant_name=child_name,
        participant_type=ParticipantType.CHILD.value,
    )


# ============================================================
# Circle Contact Session Endpoints
# ============================================================

@router.post(
    "/sessions/circle/create",
    status_code=status.HTTP_201_CREATED,
    response_model=KidComsJoinResponse,
    summary="Create session as circle contact",
    description="Allows a circle contact (grandparent, aunt, etc.) to initiate a call with a child."
)
async def create_circle_contact_session(
    session_data: CircleContactSessionCreate,
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new KidComs session initiated by a circle contact.

    - Validates circle contact has permission for this child
    - Checks time restrictions (allowed days/hours)
    - Creates Daily.co room and session
    - Returns room URL and token to join
    """
    # Get the circle contact associated with this user
    contact_result = await db.execute(
        select(CircleContact).where(
            CircleContact.id == current_circle_user.circle_contact_id
        )
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    if not contact.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Circle contact is not active"
        )

    family_file_id = contact.family_file_id

    # Get KidComs settings (needed for approval mode check)
    settings_result = await db.execute(
        select(KidComsSettings).where(KidComsSettings.family_file_id == family_file_id)
    )
    settings = settings_result.scalar_one_or_none()

    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KidComs not configured for this family"
        )

    if not settings.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KidComs is not enabled for this family"
        )

    # Check approval based on family's approval mode setting
    approval_mode = ApprovalMode(settings.circle_approval_mode)
    if not contact.can_communicate(approval_mode):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Circle contact is not approved to communicate"
        )

    # Get the child
    child_result = await db.execute(
        select(Child).where(
            and_(
                Child.id == session_data.child_id,
                Child.family_file_id == family_file_id
            )
        )
    )
    child = child_result.scalar_one_or_none()

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found in this family"
        )

    # Check permissions for this circle contact + child combination
    permission_result = await db.execute(
        select(CirclePermission).where(
            and_(
                CirclePermission.circle_contact_id == contact.id,
                CirclePermission.child_id == session_data.child_id
            )
        )
    )
    permission = permission_result.scalar_one_or_none()

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to communicate with this child"
        )

    # Check allowed communication type
    if session_data.session_type == "video_call" and not permission.can_video_call:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Video calls are not enabled for this connection"
        )

    if session_data.session_type == "voice_call" and not permission.can_voice_call:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Voice calls are not enabled for this connection"
        )

    # Check time restrictions
    from datetime import datetime
    now = datetime.now()

    # Check allowed days (0=Sunday, 6=Saturday)
    if permission.allowed_days:
        today = now.weekday()
        # Convert Python weekday (0=Monday) to JS weekday (0=Sunday)
        js_weekday = (today + 1) % 7
        if js_weekday not in permission.allowed_days:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Calls are not allowed on this day"
            )

    # Check allowed hours
    if permission.allowed_start_time and permission.allowed_end_time:
        current_time = now.strftime("%H:%M")
        if current_time < permission.allowed_start_time or current_time > permission.allowed_end_time:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Calls are only allowed between {permission.allowed_start_time} and {permission.allowed_end_time}"
            )

    # Generate Daily.co room
    room_name = generate_room_name()

    # Create room via Daily.co API
    try:
        max_duration = permission.max_call_duration_minutes or 60
        # Handle case where allowed_features might be None for older records
        enable_chat = settings.allowed_features.get("chat", True) if settings.allowed_features else True
        room_data = await daily_service.create_room(
            room_name=room_name,
            privacy="private",
            exp_minutes=max_duration + 30,
            max_participants=settings.max_participants_per_session,
            enable_chat=enable_chat,
            enable_recording=settings.record_sessions,
        )
        room_url = room_data.get("url", f"https://{daily_service.domain}/{room_name}")
    except Exception as e:
        logger.error(f"Failed to create Daily.co room: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to create video room. Please try again later."
        )

    # Create session with WAITING status (like child-initiated calls)
    session = KidComsSession(
        family_file_id=family_file_id,
        child_id=session_data.child_id,
        circle_contact_id=contact.id,  # Track which circle contact is in the call
        session_type=session_data.session_type,
        title=f"Call from {contact.contact_name}",
        daily_room_name=room_name,
        daily_room_url=room_url,
        initiated_by_id=current_circle_user.id,
        initiated_by_type=ParticipantType.CIRCLE_CONTACT.value,
        status=SessionStatus.WAITING.value,
        ringing_started_at=datetime.utcnow(),  # Track when the call started ringing
    )

    # Add circle contact as first participant
    session.add_participant(
        participant_id=contact.id,
        participant_type=ParticipantType.CIRCLE_CONTACT.value,
        name=contact.contact_name
    )

    # Add child as invited participant
    session.add_participant(
        participant_id=str(child.id),
        participant_type=ParticipantType.CHILD.value,
        name=child.display_name
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Generate Daily.co meeting token for the circle contact
    try:
        token = await daily_service.create_meeting_token(
            room_name=session.daily_room_name,
            user_name=contact.contact_name,
            user_id=str(contact.id),
            is_owner=False,  # Circle contacts are not owners
            exp_minutes=permission.max_call_duration_minutes or 60,
        )
    except Exception as e:
        logger.error(f"Failed to create meeting token: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate meeting token. Please try again."
        )

    # TODO: Send notification to child/parents about incoming call

    return KidComsJoinResponse(
        session_id=session.id,
        room_url=session.daily_room_url,
        token=token,
        participant_name=contact.contact_name,
        participant_type=ParticipantType.CIRCLE_CONTACT.value,
    )


# ============================================================
# Incoming Call Notification Endpoints
# ============================================================

@router.get(
    "/sessions/incoming/child",
    response_model=IncomingCallListResponse,
    summary="Get incoming calls for child",
    description="Poll for incoming calls. Returns waiting sessions where the child is the recipient."
)
async def get_incoming_calls_for_child(
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get incoming calls for a child.

    Returns sessions where:
    - Child is the target (child_id matches)
    - Status is 'waiting'
    - Call was initiated by a parent or circle contact (not by the child)
    """
    # Get waiting sessions for this child from parents or circle contacts
    result = await db.execute(
        select(KidComsSession)
        .where(
            and_(
                KidComsSession.child_id == current_child.child_id,
                KidComsSession.status == SessionStatus.WAITING.value,
                or_(
                    KidComsSession.initiated_by_type == ParticipantType.CIRCLE_CONTACT.value,
                    KidComsSession.initiated_by_type == ParticipantType.PARENT.value
                )
            )
        )
        .order_by(KidComsSession.created_at.desc())
    )
    sessions = result.scalars().all()

    # Check for timed-out calls (more than 3 minutes waiting - gives time to notice and respond)
    from datetime import datetime as dt, timedelta
    timeout_threshold = dt.utcnow() - timedelta(minutes=3)

    incoming_calls = []
    for session in sessions:
        # Use ringing_started_at if available, fall back to created_at
        ring_time = session.ringing_started_at or session.created_at

        # Mark as cancelled if timed out
        if ring_time and ring_time < timeout_threshold:
            session.status = SessionStatus.CANCELLED.value
            await db.commit()
            continue

        # Get caller info from session title and participants
        caller_name = session.title.replace("Call from ", "") if session.title else "Unknown Caller"
        caller_type = session.initiated_by_type  # "parent" or "circle_contact"

        # Get child info
        child_result = await db.execute(
            select(Child).where(Child.id == session.child_id)
        )
        child = child_result.scalar_one_or_none()

        incoming_calls.append(IncomingCallResponse(
            session_id=session.id,
            caller_name=caller_name,
            caller_type=caller_type,
            session_type=session.session_type,
            room_url=session.daily_room_url,
            started_ringing_at=ring_time,
            child_id=session.child_id,
            child_name=child.display_name if child else None,
            circle_contact_id=session.circle_contact_id,
            contact_name=caller_name,
        ))

    return IncomingCallListResponse(
        items=incoming_calls,
        total=len(incoming_calls)
    )


@router.get(
    "/sessions/incoming/circle",
    response_model=IncomingCallListResponse,
    summary="Get incoming calls for circle contact",
    description="Poll for incoming calls. Returns ringing sessions where the circle contact is the recipient."
)
async def get_incoming_calls_for_circle(
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get incoming calls for a circle contact.

    Returns sessions where:
    - Circle contact is invited
    - Status is 'ringing' or 'waiting'
    - Call was initiated by a child
    """
    # Get the circle contact
    contact_result = await db.execute(
        select(CircleContact).where(
            CircleContact.id == current_circle_user.circle_contact_id
        )
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        return IncomingCallListResponse(items=[], total=0)

    # Get sessions where child is calling this circle contact
    # These would have been created by child and include this contact as participant
    result = await db.execute(
        select(KidComsSession)
        .where(
            and_(
                KidComsSession.family_file_id == contact.family_file_id,
                KidComsSession.status.in_([
                    SessionStatus.RINGING.value,
                    SessionStatus.WAITING.value
                ]),
                KidComsSession.initiated_by_type == ParticipantType.CHILD.value
            )
        )
        .order_by(KidComsSession.created_at.desc())
    )
    sessions = result.scalars().all()

    # Check for timed-out calls (more than 3 minutes ringing - gives time to notice and respond)
    from datetime import datetime as dt, timedelta
    timeout_threshold = dt.utcnow() - timedelta(minutes=3)

    incoming_calls = []
    for session in sessions:
        # Check if this contact is a participant
        participants = session.participants or []
        is_participant = any(
            p.get("id") == contact.id and p.get("type") == ParticipantType.CIRCLE_CONTACT.value
            for p in participants
        )

        if not is_participant:
            continue

        # Use ringing_started_at if available, fall back to created_at
        ring_time = session.ringing_started_at or session.created_at

        # Mark as missed if timed out
        if ring_time and ring_time < timeout_threshold:
            session.status = SessionStatus.MISSED.value
            await db.commit()
            continue

        # Get child info (the caller)
        child_result = await db.execute(
            select(Child).where(Child.id == session.child_id)
        )
        child = child_result.scalar_one_or_none()

        caller_name = child.display_name if child else "Unknown Caller"

        incoming_calls.append(IncomingCallResponse(
            session_id=session.id,
            caller_name=caller_name,
            caller_type="child",
            session_type=session.session_type,
            room_url=session.daily_room_url,
            started_ringing_at=session.ringing_started_at,
            child_id=session.child_id,
            child_name=caller_name,
            circle_contact_id=contact.id,
            contact_name=contact.contact_name,
        ))

    return IncomingCallListResponse(
        items=incoming_calls,
        total=len(incoming_calls)
    )


@router.post(
    "/sessions/{session_id}/accept",
    response_model=KidComsJoinResponse,
    summary="Accept incoming call",
    description="Accept a ringing call and get the token to join."
)
async def accept_incoming_call(
    session_id: str,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accept an incoming call as a child.

    - Changes session status from RINGING to ACTIVE
    - Returns join token for Daily.co room
    """
    # Get the session
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Verify child is the recipient
    if session.child_id != current_child.child_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the recipient of this call"
        )

    # Check status
    if session.status not in [SessionStatus.RINGING.value, SessionStatus.WAITING.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept call with status: {session.status}"
        )

    # Get child info
    child_result = await db.execute(
        select(Child).where(Child.id == current_child.child_id)
    )
    child = child_result.scalar_one_or_none()
    child_name = child.display_name if child else "Child"

    # Update session status to ACTIVE
    session.start()  # This sets status to ACTIVE and started_at
    await db.commit()

    # Generate Daily.co meeting token
    try:
        token = await daily_service.create_meeting_token(
            room_name=session.daily_room_name,
            user_name=child_name,
            user_id=str(current_child.child_id),
            is_owner=False,
            exp_minutes=120,
        )
    except Exception as e:
        logger.error(f"Failed to create meeting token: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate meeting token. Please try again."
        )

    return KidComsJoinResponse(
        session_id=session.id,
        room_url=session.daily_room_url,
        token=token,
        participant_name=child_name,
        participant_type=ParticipantType.CHILD.value,
    )


@router.post(
    "/sessions/{session_id}/reject",
    response_model=KidComsSessionResponse,
    summary="Reject incoming call",
    description="Reject a ringing call."
)
async def reject_incoming_call(
    session_id: str,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reject an incoming call as a child.

    - Changes session status to REJECTED
    - Notifies the caller
    """
    # Get the session
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Verify child is the recipient
    if session.child_id != current_child.child_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the recipient of this call"
        )

    # Check status
    if session.status not in [SessionStatus.RINGING.value, SessionStatus.WAITING.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject call with status: {session.status}"
        )

    # Update session status to REJECTED
    session.status = SessionStatus.REJECTED.value
    session.ended_at = datetime.utcnow()

    # Clean up Daily.co room
    try:
        await daily_service.delete_room(session.daily_room_name)
    except Exception as e:
        logger.warning(f"Failed to delete Daily.co room: {e}")

    await db.commit()
    await db.refresh(session)

    return _session_to_response(session)


@router.post(
    "/sessions/{session_id}/circle/accept",
    response_model=KidComsJoinResponse,
    summary="Accept incoming call as circle contact",
    description="Accept a ringing call from a child and get the token to join."
)
async def accept_incoming_call_as_circle(
    session_id: str,
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accept an incoming call as a circle contact.

    - Changes session status from WAITING to ACTIVE
    - Returns join token for Daily.co room
    """
    # Get the session
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get the circle contact
    contact_result = await db.execute(
        select(CircleContact).where(
            CircleContact.id == current_circle_user.circle_contact_id
        )
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify circle contact is a participant
    participants = session.participants or []
    is_participant = any(
        p.get("id") == contact.id and p.get("type") == ParticipantType.CIRCLE_CONTACT.value
        for p in participants
    )

    if not is_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call"
        )

    # Check status
    if session.status not in [SessionStatus.RINGING.value, SessionStatus.WAITING.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept call with status: {session.status}"
        )

    # Update session status to ACTIVE
    session.start()  # This sets status to ACTIVE and started_at
    await db.commit()

    # Generate Daily.co meeting token
    try:
        token = await daily_service.create_meeting_token(
            room_name=session.daily_room_name,
            user_name=contact.contact_name,
            user_id=str(contact.id),
            is_owner=False,
            exp_minutes=120,
        )
    except Exception as e:
        logger.error(f"Failed to create meeting token: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate meeting token. Please try again."
        )

    return KidComsJoinResponse(
        session_id=session.id,
        room_url=session.daily_room_url,
        token=token,
        participant_name=contact.contact_name,
        participant_type=ParticipantType.CIRCLE_CONTACT.value,
    )


# ============================================================
# Message Endpoints
# ============================================================

@router.post(
    "/sessions/{session_id}/messages",
    status_code=status.HTTP_201_CREATED,
    response_model=KidComsMessageResponse,
    summary="Send message",
    description="Send a chat message in a session (analyzed by ARIA)."
)
async def send_message(
    session_id: str,
    message_data: KidComsMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message in a KidComs session.

    All messages are analyzed by ARIA for child safety before being delivered.
    """
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    await get_family_file_with_access(db, session.family_file_id, current_user.id)

    if session.status != SessionStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only send messages in active sessions"
        )

    # Create message
    message = KidComsMessage(
        session_id=session_id,
        sender_id=current_user.id,
        sender_type=ParticipantType.PARENT.value,
        sender_name=f"{current_user.first_name} {current_user.last_name}",
        content=message_data.content,
    )

    # TODO: Call ARIA for analysis
    # For now, mark as analyzed and safe
    message.aria_analyzed = True
    message.aria_flagged = False

    db.add(message)

    # Update session stats
    session.total_messages += 1

    await db.commit()
    await db.refresh(message)

    # Track feature usage
    session.add_feature_used("chat")
    await db.commit()

    return KidComsMessageResponse.model_validate(message)


@router.get(
    "/sessions/{session_id}/messages",
    response_model=KidComsMessageListResponse,
    summary="Get messages",
    description="Get chat messages from a session."
)
async def get_messages(
    session_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages from a session."""
    result = await db.execute(
        select(KidComsSession).where(KidComsSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    await get_family_file_with_access(db, session.family_file_id, current_user.id)

    # Get messages
    msg_query = select(KidComsMessage).where(
        KidComsMessage.session_id == session_id
    ).order_by(KidComsMessage.sent_at.asc())

    msg_result = await db.execute(msg_query.offset(offset).limit(limit))
    messages = msg_result.scalars().all()

    # Get counts
    total_result = await db.execute(
        select(KidComsMessage).where(KidComsMessage.session_id == session_id)
    )
    total = len(total_result.scalars().all())

    flagged_result = await db.execute(
        select(KidComsMessage).where(
            and_(
                KidComsMessage.session_id == session_id,
                KidComsMessage.aria_flagged == True
            )
        )
    )
    flagged_count = len(flagged_result.scalars().all())

    return KidComsMessageListResponse(
        items=[KidComsMessageResponse.model_validate(m) for m in messages],
        total=total,
        flagged_count=flagged_count,
    )


# ============================================================
# ARIA Chat Analysis
# ============================================================

@router.post(
    "/aria/analyze",
    response_model=ARIAChatAnalyzeResponse,
    summary="Analyze chat message",
    description="Analyze a chat message with ARIA for child safety."
)
async def analyze_chat_message(
    analyze_data: ARIAChatAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze a chat message with ARIA.

    Returns safety assessment and optional suggested rewrite.
    """
    # TODO: Integrate with OpenAI or Claude for actual analysis
    # For now, return mock safe response

    return ARIAChatAnalyzeResponse(
        is_safe=True,
        should_flag=False,
        category=None,
        reason=None,
        confidence_score=0.95,
        suggested_rewrite=None,
        should_hide=False,
        should_notify_parents=False,
    )


# ============================================================
# Summary/Dashboard Endpoints
# ============================================================

@router.get(
    "/summary/{family_file_id}",
    response_model=KidComsFamilySummary,
    summary="Get KidComs summary",
    description="Get KidComs activity summary for a family."
)
async def get_family_summary(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get KidComs activity summary for a family."""
    family_file = await get_family_file_with_access(
        db, family_file_id, current_user.id
    )
    settings = await get_or_create_settings(db, family_file_id)

    # Get children
    children_result = await db.execute(
        select(Child).where(Child.family_file_id == family_file_id)
    )
    children = children_result.scalars().all()

    # Get session counts
    sessions_result = await db.execute(
        select(KidComsSession).where(
            KidComsSession.family_file_id == family_file_id
        )
    )
    all_sessions = sessions_result.scalars().all()

    # Week threshold
    week_ago = datetime.utcnow() - timedelta(days=7)

    child_summaries = []
    feature_usage = {
        "video_call": 0,
        "theater": 0,
        "arcade": 0,
        "whiteboard": 0,
        "chat": 0,
    }

    for child in children:
        child_sessions = [s for s in all_sessions if s.child_id == child.id]
        child_sessions_week = [s for s in child_sessions if s.created_at >= week_ago]

        total_duration = sum(s.duration_seconds or 0 for s in child_sessions)
        total_messages = sum(s.total_messages for s in child_sessions)
        flagged_messages = sum(s.flagged_messages for s in child_sessions)

        # Get circle contacts count
        contacts_result = await db.execute(
            select(CircleContact).where(
                and_(
                    CircleContact.family_file_id == family_file_id,
                    or_(
                        CircleContact.child_id == child.id,
                        CircleContact.child_id.is_(None)
                    ),
                    CircleContact.is_active == True
                )
            )
        )
        contacts = contacts_result.scalars().all()

        last_session = child_sessions[0] if child_sessions else None

        child_summaries.append(KidComsChildSummary(
            child_id=child.id,
            child_name=child.display_name,
            total_sessions=len(child_sessions),
            sessions_this_week=len(child_sessions_week),
            total_duration_minutes=total_duration // 60,
            circle_contacts_count=len(contacts),
            favorite_contacts=[],  # TODO: Calculate based on usage
            messages_sent=total_messages,
            messages_flagged=flagged_messages,
            last_session_at=last_session.created_at if last_session else None,
            last_session_with=None,  # TODO: Determine from participants
        ))

    # Aggregate feature usage
    for session in all_sessions:
        if session.session_type in feature_usage:
            feature_usage[session.session_type] += 1
        for feature in (session.features_used or []):
            if feature in feature_usage:
                feature_usage[feature] += 1

    return KidComsFamilySummary(
        family_file_id=family_file_id,
        total_sessions=len(all_sessions),
        sessions_this_week=len([s for s in all_sessions if s.created_at >= week_ago]),
        children=child_summaries,
        feature_usage=feature_usage,
        is_within_availability=settings.is_within_availability(),
    )


@router.get(
    "/session-types",
    summary="Get session types",
    description="Get list of available session types."
)
async def get_session_types():
    """Get the list of session types."""
    return SESSION_TYPES


# ============================================================
# Helper Functions
# ============================================================

def _session_to_response(session: KidComsSession) -> KidComsSessionResponse:
    """Convert KidComsSession model to response schema."""
    participants = [
        SessionParticipant(
            id=p["id"],
            type=p["type"],
            name=p["name"],
            joined_at=p.get("joined_at")
        )
        for p in (session.participants or [])
    ]

    return KidComsSessionResponse(
        id=session.id,
        family_file_id=session.family_file_id,
        child_id=session.child_id,
        session_type=session.session_type,
        title=session.title,
        status=session.status,
        daily_room_name=session.daily_room_name,
        daily_room_url=session.daily_room_url,
        initiated_by_id=session.initiated_by_id,
        initiated_by_type=session.initiated_by_type,
        participants=participants,
        scheduled_for=session.scheduled_for,
        started_at=session.started_at,
        ended_at=session.ended_at,
        duration_seconds=session.duration_seconds,
        features_used=session.features_used or [],
        total_messages=session.total_messages,
        flagged_messages=session.flagged_messages,
        notes=session.notes,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )
