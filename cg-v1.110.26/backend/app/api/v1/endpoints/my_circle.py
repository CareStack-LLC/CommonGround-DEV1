"""
My Circle API endpoints for the child/contact communication portal.

My Circle provides:
- Room management (10 rooms per family)
- Circle user authentication (invite/accept/login)
- Child user authentication (PIN-based)
- Permission management
- Communication logging
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, get_current_circle_user, create_access_token
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.circle import CircleContact
from app.models.kidcoms import (
    KidComsRoom,
    CircleUser,
    ChildUser,
    CirclePermission,
    KidComsCommunicationLog,
    RoomType,
)
from app.schemas.kidcoms import (
    # Room schemas
    KidComsRoomResponse,
    KidComsRoomListResponse,
    KidComsRoomAssignRequest,
    KidComsRoomUpdate,
    # Circle user schemas
    CircleUserInviteRequest,
    CircleUserCreateAndInviteRequest,
    CircleUserInviteResponse,
    CircleUserAcceptInviteRequest,
    CircleUserLoginRequest,
    CircleUserLoginResponse,
    CircleUserProfileResponse,
    # Child user schemas
    ChildUserSetupRequest,
    ChildUserUpdateRequest,
    ChildUserResponse,
    ChildUserLoginRequest,
    ChildUserLoginResponse,
    ChildUserListResponse,
    # Permission schemas
    CirclePermissionCreate,
    CirclePermissionUpdate,
    CirclePermissionResponse,
    CirclePermissionListResponse,
    # Communication log schemas
    KidComsCommunicationLogResponse,
    # Constants
    CHILD_AVATARS,
)
from app.services import my_circle as my_circle_service
from app.services.email import email_service
from app.core.config import settings

logger = logging.getLogger(__name__)

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


def _room_to_response(room: KidComsRoom, contact: Optional[CircleContact] = None) -> KidComsRoomResponse:
    """Convert KidComsRoom model to response schema."""
    is_reserved = room.room_type in [RoomType.PARENT_A.value, RoomType.PARENT_B.value]

    return KidComsRoomResponse(
        id=room.id,
        family_file_id=room.family_file_id,
        room_number=room.room_number,
        room_type=room.room_type,
        room_name=room.room_name,
        assigned_to_id=room.assigned_to_id,
        assigned_contact_name=contact.contact_name if contact else None,
        assigned_contact_relationship=contact.relationship_type if contact else None,
        daily_room_name=room.daily_room_name,
        daily_room_url=room.daily_room_url,
        is_active=room.is_active,
        is_reserved=is_reserved,
        is_assigned=room.assigned_to_id is not None,
        created_at=room.created_at,
        updated_at=room.updated_at,
    )


def _permission_to_response(
    permission: CirclePermission,
    contact: Optional[CircleContact] = None,
    child: Optional[Child] = None
) -> CirclePermissionResponse:
    """Convert CirclePermission model to response schema."""
    return CirclePermissionResponse(
        id=permission.id,
        circle_contact_id=permission.circle_contact_id,
        child_id=permission.child_id,
        family_file_id=permission.family_file_id,
        can_video_call=permission.can_video_call,
        can_voice_call=permission.can_voice_call,
        can_chat=permission.can_chat,
        can_theater=permission.can_theater,
        allowed_days=permission.allowed_days,
        allowed_start_time=permission.allowed_start_time,
        allowed_end_time=permission.allowed_end_time,
        is_within_allowed_time=permission.is_within_allowed_time() if hasattr(permission, 'is_within_allowed_time') else True,
        max_call_duration_minutes=permission.max_call_duration_minutes,
        require_parent_present=permission.require_parent_present,
        set_by_parent_id=permission.set_by_parent_id,
        created_at=permission.created_at,
        updated_at=permission.updated_at,
        contact_name=contact.contact_name if contact else None,
        child_name=child.display_name if child else None,
    )


def _child_user_to_response(child_user: ChildUser, child: Optional[Child] = None) -> ChildUserResponse:
    """Convert ChildUser model to response schema."""
    return ChildUserResponse(
        id=child_user.id,
        child_id=child_user.child_id,
        family_file_id=child_user.family_file_id,
        username=child_user.username,
        avatar_id=child_user.avatar_id,
        is_active=child_user.is_active,
        last_login=child_user.last_login,
        created_at=child_user.created_at,
        updated_at=child_user.updated_at,
        child_name=child.display_name if child else None,
        child_photo_url=child.photo_url if child else None,
    )


# ============================================================
# Room Management Endpoints
# ============================================================

@router.get(
    "/rooms/{family_file_id}",
    response_model=KidComsRoomListResponse,
    summary="Get all rooms",
    description="Get all 10 rooms for a family file."
)
async def get_family_rooms(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all 10 rooms for a family file.

    - Rooms 1-2 are reserved for parents
    - Rooms 3-10 can be assigned to circle contacts
    """
    await get_family_file_with_access(db, family_file_id, current_user.id)

    rooms = await my_circle_service.get_family_rooms(db, family_file_id)

    # Get contact info for assigned rooms
    items = []
    assigned_count = 0
    available_count = 0

    for room in rooms:
        contact = None
        if room.assigned_to_id:
            contact_result = await db.execute(
                select(CircleContact).where(CircleContact.id == room.assigned_to_id)
            )
            contact = contact_result.scalar_one_or_none()
            assigned_count += 1
        elif room.room_type == RoomType.CIRCLE.value:
            available_count += 1

        items.append(_room_to_response(room, contact))

    return KidComsRoomListResponse(
        items=items,
        total=len(rooms),
        assigned_count=assigned_count,
        available_count=available_count,
    )


@router.put(
    "/rooms/{room_id}/assign",
    response_model=KidComsRoomResponse,
    summary="Assign room to contact",
    description="Assign a circle contact to a room."
)
async def assign_room_to_contact(
    room_id: str,
    assign_data: KidComsRoomAssignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign a circle contact to a room.

    - Only rooms 3-10 can be assigned (not parent rooms)
    - Contact must exist and be active
    """
    # Get room first
    room = await my_circle_service.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    # Verify access
    await get_family_file_with_access(db, room.family_file_id, current_user.id)

    try:
        room = await my_circle_service.assign_room_to_contact(
            db,
            room_id=room_id,
            circle_contact_id=assign_data.circle_contact_id,
            room_name=assign_data.room_name,
        )
        await db.commit()

        # Get contact info for response
        contact_result = await db.execute(
            select(CircleContact).where(CircleContact.id == assign_data.circle_contact_id)
        )
        contact = contact_result.scalar_one_or_none()

        return _room_to_response(room, contact)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/rooms/{room_id}/unassign",
    response_model=KidComsRoomResponse,
    summary="Unassign room",
    description="Remove a contact from a room."
)
async def unassign_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a contact assignment from a room."""
    room = await my_circle_service.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    await get_family_file_with_access(db, room.family_file_id, current_user.id)

    try:
        room = await my_circle_service.unassign_room(db, room_id)
        await db.commit()
        return _room_to_response(room)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/rooms/{room_id}",
    response_model=KidComsRoomResponse,
    summary="Update room",
    description="Update room name or status."
)
async def update_room(
    room_id: str,
    update_data: KidComsRoomUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a room's name or status."""
    room = await my_circle_service.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    await get_family_file_with_access(db, room.family_file_id, current_user.id)

    # Update fields
    if update_data.room_name is not None:
        room.room_name = update_data.room_name
    if update_data.is_active is not None:
        room.is_active = update_data.is_active

    await db.commit()
    await db.refresh(room)

    # Get contact if assigned
    contact = None
    if room.assigned_to_id:
        contact_result = await db.execute(
            select(CircleContact).where(CircleContact.id == room.assigned_to_id)
        )
        contact = contact_result.scalar_one_or_none()

    return _room_to_response(room, contact)


# ============================================================
# Circle User Authentication Endpoints
# ============================================================

@router.post(
    "/circle-users/invite",
    response_model=CircleUserInviteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite circle contact",
    description="Send invitation for a circle contact to create their account."
)
async def invite_circle_user(
    invite_data: CircleUserInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create and send an invitation for a circle contact to register.

    - Contact must have an email address
    - Invitation is valid for 7 days
    """
    # Get the contact first
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == invite_data.circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify parent has access to this family
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Create default permissions for all children in the family (if not already created)
    children_result = await db.execute(
        select(Child).where(Child.family_file_id == contact.family_file_id)
    )
    children = children_result.scalars().all()

    for child in children:
        # Check if permission already exists
        existing_permission = await db.execute(
            select(CirclePermission).where(
                and_(
                    CirclePermission.circle_contact_id == contact.id,
                    CirclePermission.child_id == child.id
                )
            )
        )
        if not existing_permission.scalar_one_or_none():
            permission = CirclePermission(
                circle_contact_id=contact.id,
                child_id=child.id,
                family_file_id=contact.family_file_id,
                can_video_call=True,
                can_voice_call=True,
                can_chat=True,
                can_theater=True,
                set_by_parent_id=current_user.id,
            )
            db.add(permission)

    base_url = settings.FRONTEND_URL

    # Check if circle user already exists
    existing_user_result = await db.execute(
        select(CircleUser).where(CircleUser.circle_contact_id == contact.id)
    )
    existing_circle_user = existing_user_result.scalar_one_or_none()

    # If user already accepted invite, return login URL instead
    if existing_circle_user and existing_circle_user.invite_accepted_at:
        await db.commit()  # Commit any permission changes
        login_url = f"{base_url}/my-circle/contact"
        return CircleUserInviteResponse(
            id=existing_circle_user.id,
            circle_contact_id=existing_circle_user.circle_contact_id,
            email=existing_circle_user.email,
            invite_token="",  # No token needed for login
            invite_url=login_url,  # Return login URL instead
            invite_expires_at=None,
            contact_name=contact.contact_name,
            relationship_type=contact.relationship_type,
            room_number=contact.room_number,
        )

    try:
        circle_user = await my_circle_service.create_circle_user_invite(
            db,
            circle_contact_id=invite_data.circle_contact_id,
            base_url=base_url,
        )
        await db.commit()

        # Build invite URL
        invite_url = f"{base_url}/my-circle/accept-invite?token={circle_user.invite_token}"

        # Get children names for email
        children_result = await db.execute(
            select(Child).where(Child.family_file_id == contact.family_file_id)
        )
        children = children_result.scalars().all()
        child_name = children[0].display_name if children else "your family's children"

        # Send invitation email
        inviter_name = f"{current_user.first_name} {current_user.last_name}".strip() or "A parent"
        await email_service.send_circle_invitation(
            to_email=circle_user.email,
            to_name=contact.contact_name,
            inviter_name=inviter_name,
            child_name=child_name,
            invitation_link=invite_url,
            relationship=contact.relationship_type or "family member",
        )
        logger.info(f"Circle invitation email sent to {circle_user.email}")

        return CircleUserInviteResponse(
            id=circle_user.id,
            circle_contact_id=circle_user.circle_contact_id,
            email=circle_user.email,
            invite_token=circle_user.invite_token,
            invite_url=invite_url,
            invite_expires_at=circle_user.invite_expires_at,
            contact_name=contact.contact_name,
            relationship_type=contact.relationship_type,
            room_number=contact.room_number,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/circle-users/create-and-invite",
    response_model=CircleUserInviteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create contact and send invite",
    description="Create a new circle contact and send them an invitation to join."
)
async def create_and_invite_circle_user(
    invite_data: CircleUserCreateAndInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new circle contact and send an invitation in one call.

    - Creates the CircleContact record
    - Assigns them to a room (if specified)
    - Sends invitation email
    - Returns invite token for sharing
    """
    # Verify parent has access to this family
    await get_family_file_with_access(db, invite_data.family_file_id, current_user.id)

    # Determine room number
    room_number = invite_data.room_number
    if not room_number:
        # Find first available room (3-10)
        rooms_result = await db.execute(
            select(KidComsRoom)
            .where(KidComsRoom.family_file_id == invite_data.family_file_id)
            .where(KidComsRoom.room_number >= 3)
            .where(KidComsRoom.assigned_to_id.is_(None))
            .order_by(KidComsRoom.room_number)
            .limit(1)
        )
        available_room = rooms_result.scalar_one_or_none()
        if not available_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No available rooms. All rooms (3-10) are assigned."
            )
        room_number = available_room.room_number

    try:
        # Create the circle contact
        contact = CircleContact(
            family_file_id=invite_data.family_file_id,
            contact_name=invite_data.contact_name,
            contact_email=invite_data.email,
            relationship_type=invite_data.relationship_type,
            room_number=room_number,
            added_by=current_user.id,
            is_active=True,
        )
        db.add(contact)
        await db.flush()  # Get the ID

        # Assign to room
        room_result = await db.execute(
            select(KidComsRoom)
            .where(KidComsRoom.family_file_id == invite_data.family_file_id)
            .where(KidComsRoom.room_number == room_number)
        )
        room = room_result.scalar_one_or_none()
        if room:
            room.assigned_to_id = contact.id
            room.room_name = invite_data.contact_name

        # Create default permissions for all children in the family
        children_result = await db.execute(
            select(Child).where(Child.family_file_id == invite_data.family_file_id)
        )
        children = children_result.scalars().all()

        for child in children:
            permission = CirclePermission(
                circle_contact_id=contact.id,
                child_id=child.id,
                family_file_id=invite_data.family_file_id,
                can_video_call=True,
                can_voice_call=True,
                can_chat=True,
                can_theater=True,
                set_by_parent_id=current_user.id,
            )
            db.add(permission)

        # Create the invite
        base_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else "http://localhost:3000"
        circle_user = await my_circle_service.create_circle_user_invite(
            db,
            circle_contact_id=contact.id,
            base_url=base_url,
        )

        await db.commit()

        # Build invite URL
        invite_url = f"{base_url}/my-circle/accept-invite?token={circle_user.invite_token}"

        # Get child name for email (use first child or generic)
        child_name = children[0].display_name if children else "your family's children"

        # Send invitation email
        inviter_name = f"{current_user.first_name} {current_user.last_name}".strip() or "A parent"
        await email_service.send_circle_invitation(
            to_email=invite_data.email,
            to_name=invite_data.contact_name,
            inviter_name=inviter_name,
            child_name=child_name,
            invitation_link=invite_url,
            relationship=invite_data.relationship_type or "family member",
        )
        logger.info(f"Circle invitation email sent to {invite_data.email}")

        return CircleUserInviteResponse(
            id=circle_user.id,
            circle_contact_id=circle_user.circle_contact_id,
            email=circle_user.email,
            invite_token=circle_user.invite_token,
            invite_url=invite_url,
            invite_expires_at=circle_user.invite_expires_at,
            contact_name=contact.contact_name,
            relationship_type=contact.relationship_type or "",
            room_number=contact.room_number,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/circle-users/{circle_contact_id}/resend-invite",
    response_model=CircleUserInviteResponse,
    summary="Resend circle invitation",
    description="Resend the invitation email to a circle contact."
)
async def resend_circle_invite(
    circle_contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Resend an invitation email to a circle contact.

    - Generates a new invite token if expired
    - Sends a fresh invitation email
    """
    # Get the contact
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify parent has access
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Get the circle user
    circle_user_result = await db.execute(
        select(CircleUser).where(CircleUser.circle_contact_id == circle_contact_id)
    )
    circle_user = circle_user_result.scalar_one_or_none()

    if not circle_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No invitation found for this contact. Create a new invite first."
        )

    if circle_user.invite_accepted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This contact has already accepted their invitation and can log in."
        )

    # Generate new token if expired
    if circle_user.is_invite_expired:
        import secrets
        circle_user.invite_token = secrets.token_urlsafe(32)
        circle_user.invite_expires_at = datetime.utcnow() + timedelta(days=7)
        await db.commit()

    base_url = settings.FRONTEND_URL
    invite_url = f"{base_url}/my-circle/accept-invite?token={circle_user.invite_token}"

    # Get child name for email
    children_result = await db.execute(
        select(Child).where(Child.family_file_id == contact.family_file_id)
    )
    children = children_result.scalars().all()
    child_name = children[0].display_name if children else "your family's children"

    # Send invitation email
    inviter_name = f"{current_user.first_name} {current_user.last_name}".strip() or "A parent"
    await email_service.send_circle_invitation(
        to_email=circle_user.email,
        to_name=contact.contact_name,
        inviter_name=inviter_name,
        child_name=child_name,
        invitation_link=invite_url,
        relationship=contact.relationship_type or "family member",
    )
    logger.info(f"Circle invitation email resent to {circle_user.email}")

    return CircleUserInviteResponse(
        id=circle_user.id,
        circle_contact_id=circle_user.circle_contact_id,
        email=circle_user.email,
        invite_token=circle_user.invite_token,
        invite_url=invite_url,
        invite_expires_at=circle_user.invite_expires_at,
        contact_name=contact.contact_name,
        relationship_type=contact.relationship_type,
        room_number=contact.room_number,
    )


@router.post(
    "/circle-users/accept-invite",
    response_model=CircleUserLoginResponse,
    summary="Accept circle invitation",
    description="Accept an invitation and set up the circle user account."
)
async def accept_circle_invite(
    accept_data: CircleUserAcceptInviteRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Accept a circle invitation and set password.

    - Validates passwords match
    - Returns access token on success
    """
    if accept_data.password != accept_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    try:
        circle_user = await my_circle_service.accept_circle_invite(
            db,
            invite_token=accept_data.invite_token,
            password=accept_data.password,
        )
        await db.commit()

        # Get contact info
        contact_result = await db.execute(
            select(CircleContact)
            .options(selectinload(CircleContact.permissions))
            .where(CircleContact.id == circle_user.circle_contact_id)
        )
        contact = contact_result.scalar_one_or_none()

        # Get children this contact can communicate with
        child_ids = []
        if contact and contact.permissions:
            child_ids = [p.child_id for p in contact.permissions]

        # Generate access token
        token_data = {
            "sub": circle_user.id,
            "type": "circle_user",
            "contact_id": circle_user.circle_contact_id,
            "family_file_id": contact.family_file_id if contact else None,
        }
        token = create_access_token(token_data)

        return CircleUserLoginResponse(
            access_token=token,
            token_type="bearer",
            expires_in=3600,  # 1 hour
            user_id=circle_user.id,
            circle_contact_id=circle_user.circle_contact_id,
            contact_name=contact.contact_name if contact else "",
            family_file_id=contact.family_file_id if contact else "",
            child_ids=child_ids,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/circle-users/login",
    response_model=CircleUserLoginResponse,
    summary="Circle user login",
    description="Login with email and password for circle users."
)
async def circle_user_login(
    login_data: CircleUserLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate a circle user and return access token.
    """
    circle_user = await my_circle_service.authenticate_circle_user(
        db,
        email=login_data.email,
        password=login_data.password,
    )

    if not circle_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    await db.commit()  # Save last_login update

    # Get contact info
    contact_result = await db.execute(
        select(CircleContact)
        .options(selectinload(CircleContact.permissions))
        .where(CircleContact.id == circle_user.circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    # Get children this contact can communicate with
    child_ids = []
    if contact and contact.permissions:
        child_ids = [p.child_id for p in contact.permissions]

    # Generate access token
    token_data = {
        "sub": circle_user.id,
        "type": "circle_user",
        "contact_id": circle_user.circle_contact_id,
        "family_file_id": contact.family_file_id if contact else None,
    }
    token = create_access_token(token_data)

    return CircleUserLoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=3600,
        user_id=circle_user.id,
        circle_contact_id=circle_user.circle_contact_id,
        contact_name=contact.contact_name if contact else "",
        family_file_id=contact.family_file_id if contact else "",
        child_ids=child_ids,
    )


@router.get(
    "/circle-users/{invite_token}/info",
    summary="Get invite info",
    description="Get information about a circle invite before accepting."
)
async def get_circle_invite_info(
    invite_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get info about a circle invitation (for the accept-invite page)."""
    circle_user = await my_circle_service.get_circle_user_by_invite_token(db, invite_token)

    if not circle_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invite token"
        )

    if circle_user.invite_accepted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has already been accepted"
        )

    if circle_user.is_invite_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )

    # Get contact info
    contact = circle_user.circle_contact

    return {
        "email": circle_user.email,
        "contact_name": contact.contact_name if contact else None,
        "relationship_type": contact.relationship_type if contact else None,
        "invite_expires_at": circle_user.invite_expires_at,
    }


@router.get(
    "/circle-users/me/permissions",
    response_model=CirclePermissionListResponse,
    summary="Get my permissions",
    description="Get all permissions for the authenticated circle user."
)
async def get_my_circle_permissions(
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get permissions for the authenticated circle user.

    This endpoint allows circle contacts to see which children they can
    communicate with and what permissions they have for each child.
    """
    # Get the circle contact
    contact_result = await db.execute(
        select(CircleContact)
        .where(CircleContact.id == current_circle_user.circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Get permissions for this contact
    permissions = await my_circle_service.get_permissions_for_contact(
        db, str(current_circle_user.circle_contact_id)
    )

    items = [_permission_to_response(p, p.circle_contact, p.child) for p in permissions]

    return CirclePermissionListResponse(
        items=items,
        total=len(items),
    )


@router.get(
    "/circle-users/me/profile",
    response_model=CircleUserProfileResponse,
    summary="Get my profile",
    description="Get profile information for the authenticated circle user."
)
async def get_my_circle_profile(
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get profile information for the authenticated circle user.
    """
    # Get the circle contact
    contact_result = await db.execute(
        select(CircleContact)
        .where(CircleContact.id == current_circle_user.circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Get permissions and children
    permissions = await my_circle_service.get_permissions_for_contact(
        db, str(current_circle_user.circle_contact_id)
    )

    children_list = []
    permissions_list = []
    for permission in permissions:
        child = permission.child
        if child:
            age = None
            if child.date_of_birth:
                today = datetime.utcnow().date()
                age = today.year - child.date_of_birth.year - (
                    (today.month, today.day) < (child.date_of_birth.month, child.date_of_birth.day)
                )
            children_list.append({
                "id": child.id,
                "name": child.display_name or child.first_name,
                "avatar_url": child.photo_url,
                "age": age,
            })
        permissions_list.append({
            "child_id": permission.child_id,
            "can_video_call": permission.can_video_call,
            "can_voice_call": permission.can_voice_call,
            "can_chat": permission.can_chat,
            "can_theater": permission.can_theater,
        })

    return CircleUserProfileResponse(
        id=current_circle_user.id,
        circle_contact_id=current_circle_user.circle_contact_id,
        email=current_circle_user.email,
        contact_name=contact.contact_name,
        relationship_type=contact.relationship_type or "",
        family_file_id=contact.family_file_id,
        room_number=contact.room_number,
        email_verified=contact.is_verified or False,
        is_active=contact.is_active,
        last_login=current_circle_user.last_login,
        children=children_list,
        permissions=permissions_list,
        created_at=current_circle_user.created_at,
    )


@router.get(
    "/circle-users/me/children",
    summary="Get my connected children",
    description="Get all children this circle user can communicate with."
)
async def get_my_connected_children(
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all children this circle user is permitted to communicate with.
    Returns children with their online status and permissions.
    """
    # Get permissions for this contact
    permissions = await my_circle_service.get_permissions_for_contact(
        db, str(current_circle_user.circle_contact_id)
    )

    children = []
    for permission in permissions:
        child = permission.child
        if child:
            # Calculate age from date_of_birth
            age = None
            if child.date_of_birth:
                today = datetime.utcnow().date()
                age = today.year - child.date_of_birth.year - (
                    (today.month, today.day) < (child.date_of_birth.month, child.date_of_birth.day)
                )

            children.append({
                "id": child.id,
                "name": child.display_name or child.first_name,
                "avatar_url": child.photo_url,
                "age": age,
                "is_online": False,  # TODO: Integrate with presence system
                "family_file_id": child.family_file_id,
                "can_video_call": permission.can_video_call,
                "can_voice_call": permission.can_voice_call,
                "can_chat": permission.can_chat,
                "can_theater": permission.can_theater,
            })

    return {"items": children, "total": len(children)}


@router.get(
    "/circle-users/me/children/{child_id}",
    summary="Get child profile",
    description="Get a specific child's profile for communication."
)
async def get_child_for_circle_user(
    child_id: str,
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific child's profile that this circle user can communicate with.
    """
    # Check permission
    permission_result = await db.execute(
        select(CirclePermission).where(
            and_(
                CirclePermission.circle_contact_id == current_circle_user.circle_contact_id,
                CirclePermission.child_id == child_id
            )
        )
    )
    permission = permission_result.scalar_one_or_none()

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this child"
        )

    # Get child
    child_result = await db.execute(
        select(Child).where(Child.id == child_id)
    )
    child = child_result.scalar_one_or_none()

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found"
        )

    # Calculate age
    age = None
    if child.date_of_birth:
        today = datetime.utcnow().date()
        age = today.year - child.date_of_birth.year - (
            (today.month, today.day) < (child.date_of_birth.month, child.date_of_birth.day)
        )

    return {
        "id": child.id,
        "first_name": child.first_name,
        "display_name": child.display_name,
        "avatar_url": child.photo_url,
        "age": age,
        "family_file_id": child.family_file_id,
    }


@router.get(
    "/circle-users/me/children/{child_id}/availability",
    summary="Check child availability",
    description="Check if a child is available for a call."
)
async def check_child_availability_for_circle(
    child_id: str,
    current_circle_user: CircleUser = Depends(get_current_circle_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a child is available for a call from this circle user.
    Checks permissions, time restrictions, and online status.
    """
    # Get permission
    permission_result = await db.execute(
        select(CirclePermission).where(
            and_(
                CirclePermission.circle_contact_id == current_circle_user.circle_contact_id,
                CirclePermission.child_id == child_id
            )
        )
    )
    permission = permission_result.scalar_one_or_none()

    if not permission:
        return {
            "available": False,
            "reason": "You don't have permission to contact this child"
        }

    if not permission.can_video_call and not permission.can_voice_call:
        return {
            "available": False,
            "reason": "Calling is not enabled for this child"
        }

    # Check time restrictions
    if hasattr(permission, 'is_within_allowed_time') and not permission.is_within_allowed_time():
        return {
            "available": False,
            "reason": "Calls are only allowed during specific times"
        }

    # TODO: Check if child is actually online via presence system
    return {
        "available": True,
        "reason": None
    }


# ============================================================
# Child User Authentication Endpoints
# ============================================================

@router.post(
    "/child-users/setup",
    response_model=ChildUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Set up child login",
    description="Create or update a child's PIN-based login."
)
async def setup_child_user(
    setup_data: ChildUserSetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Set up a child's login account with username, PIN, and avatar.

    - PIN must be 4-6 digits
    - Username must be unique within the family
    """
    # Get child and verify access
    child_result = await db.execute(
        select(Child).where(Child.id == setup_data.child_id)
    )
    child = child_result.scalar_one_or_none()

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found"
        )

    await get_family_file_with_access(db, child.family_file_id, current_user.id)

    try:
        child_user = await my_circle_service.setup_child_user(
            db,
            child_id=setup_data.child_id,
            family_file_id=child.family_file_id,
            username=setup_data.username,
            pin=setup_data.pin,
            avatar_id=setup_data.avatar_id,
        )
        await db.commit()

        return _child_user_to_response(child_user, child)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/child-users/{child_user_id}",
    response_model=ChildUserResponse,
    summary="Update child login",
    description="Update a child's login settings."
)
async def update_child_user(
    child_user_id: str,
    update_data: ChildUserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a child's login settings."""
    child_user = await my_circle_service.get_child_user_by_id(db, child_user_id)

    if not child_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child user not found"
        )

    await get_family_file_with_access(db, child_user.family_file_id, current_user.id)

    try:
        child_user = await my_circle_service.update_child_user(
            db,
            child_user_id=child_user_id,
            username=update_data.username,
            pin=update_data.pin,
            avatar_id=update_data.avatar_id,
            is_active=update_data.is_active,
        )
        await db.commit()

        # Get child info
        child_result = await db.execute(
            select(Child).where(Child.id == child_user.child_id)
        )
        child = child_result.scalar_one_or_none()

        return _child_user_to_response(child_user, child)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/child-users/family/{family_file_id}",
    response_model=ChildUserListResponse,
    summary="List child users",
    description="List all child users for a family."
)
async def list_child_users(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all child users for a family file."""
    await get_family_file_with_access(db, family_file_id, current_user.id)

    child_users = await my_circle_service.get_child_users_by_family(db, family_file_id)

    items = []
    for cu in child_users:
        child = cu.child
        items.append(_child_user_to_response(cu, child))

    return ChildUserListResponse(
        items=items,
        total=len(items),
    )


@router.post(
    "/child-users/login",
    response_model=ChildUserLoginResponse,
    summary="Child user login",
    description="Login with username and PIN for children."
)
async def child_user_login(
    login_data: ChildUserLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate a child with username and PIN.

    - Returns access token and available contacts
    """
    child_user = await my_circle_service.authenticate_child_user(
        db,
        family_file_id=login_data.family_file_id,
        username=login_data.username,
        pin=login_data.pin,
    )

    if not child_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or PIN"
        )

    await db.commit()  # Save last_login update

    # Get contacts this child can communicate with
    contacts = await my_circle_service.get_child_contacts(
        db,
        child_id=child_user.child_id,
        family_file_id=child_user.family_file_id,
    )

    # Generate access token
    token_data = {
        "sub": child_user.id,
        "type": "child_user",
        "child_id": child_user.child_id,
        "family_file_id": child_user.family_file_id,
    }
    token = create_access_token(token_data)

    child = child_user.child

    return ChildUserLoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=3600,
        user_id=child_user.id,
        child_id=child_user.child_id,
        child_name=child.display_name if child else child_user.username,
        avatar_id=child_user.avatar_id,
        family_file_id=child_user.family_file_id,
        contacts=contacts,
    )


@router.get(
    "/child-users/avatars",
    summary="Get avatar choices",
    description="Get list of available avatars for child users."
)
async def get_avatar_choices():
    """Get the list of available avatars for child users."""
    return CHILD_AVATARS


# ============================================================
# Permission Management Endpoints
# ============================================================

@router.post(
    "/permissions",
    response_model=CirclePermissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create permission",
    description="Create or update permissions for a circle contact."
)
async def create_permission(
    permission_data: CirclePermissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update permissions for a circle contact to communicate with a child.

    - Specify which features are allowed (video, voice, chat, theater)
    - Set time restrictions (days, hours)
    - Set session limits
    """
    # Get contact and verify access
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == permission_data.circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Verify child exists in this family
    child_result = await db.execute(
        select(Child).where(
            and_(
                Child.id == permission_data.child_id,
                Child.family_file_id == contact.family_file_id
            )
        )
    )
    child = child_result.scalar_one_or_none()

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found in this family file"
        )

    permission = await my_circle_service.create_or_update_permission(
        db,
        circle_contact_id=permission_data.circle_contact_id,
        child_id=permission_data.child_id,
        family_file_id=contact.family_file_id,
        set_by_parent_id=current_user.id,
        can_video_call=permission_data.can_video_call,
        can_voice_call=permission_data.can_voice_call,
        can_chat=permission_data.can_chat,
        can_theater=permission_data.can_theater,
        allowed_days=permission_data.allowed_days,
        allowed_start_time=permission_data.allowed_start_time,
        allowed_end_time=permission_data.allowed_end_time,
        max_call_duration_minutes=permission_data.max_call_duration_minutes,
        require_parent_present=permission_data.require_parent_present,
    )
    await db.commit()

    return _permission_to_response(permission, contact, child)


@router.put(
    "/permissions/{permission_id}",
    response_model=CirclePermissionResponse,
    summary="Update permission",
    description="Update existing permissions."
)
async def update_permission(
    permission_id: str,
    update_data: CirclePermissionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update existing permissions."""
    permission = await my_circle_service.get_permission_by_id(db, permission_id)

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )

    await get_family_file_with_access(db, permission.family_file_id, current_user.id)

    # Update fields
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        if value is not None:
            setattr(permission, field, value)

    permission.set_by_parent_id = current_user.id

    await db.commit()
    await db.refresh(permission)

    return _permission_to_response(permission, permission.circle_contact, permission.child)


@router.get(
    "/permissions/{permission_id}",
    response_model=CirclePermissionResponse,
    summary="Get permission",
    description="Get permission by ID."
)
async def get_permission(
    permission_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific permission by ID."""
    permission = await my_circle_service.get_permission_by_id(db, permission_id)

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )

    await get_family_file_with_access(db, permission.family_file_id, current_user.id)

    return _permission_to_response(permission, permission.circle_contact, permission.child)


@router.get(
    "/permissions/family/{family_file_id}",
    response_model=CirclePermissionListResponse,
    summary="List permissions",
    description="List all permissions for a family."
)
async def list_permissions(
    family_file_id: str,
    child_id: Optional[str] = Query(None, description="Filter by child"),
    contact_id: Optional[str] = Query(None, description="Filter by contact"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all permissions for a family, optionally filtered."""
    await get_family_file_with_access(db, family_file_id, current_user.id)

    if child_id:
        permissions = await my_circle_service.get_permissions_for_child(db, child_id)
    elif contact_id:
        permissions = await my_circle_service.get_permissions_for_contact(db, contact_id)
    else:
        permissions = await my_circle_service.get_permissions_for_family(db, family_file_id)

    items = [_permission_to_response(p, p.circle_contact, p.child) for p in permissions]

    return CirclePermissionListResponse(
        items=items,
        total=len(items),
    )


@router.delete(
    "/permissions/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete permission",
    description="Remove permission (contact can no longer communicate with child)."
)
async def delete_permission(
    permission_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a permission."""
    permission = await my_circle_service.get_permission_by_id(db, permission_id)

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )

    await get_family_file_with_access(db, permission.family_file_id, current_user.id)

    await my_circle_service.delete_permission(db, permission_id)
    await db.commit()


# ============================================================
# Communication Log Endpoints
# ============================================================

@router.get(
    "/logs/{family_file_id}",
    response_model=List[KidComsCommunicationLogResponse],
    summary="Get communication logs",
    description="Get communication history for a family."
)
async def get_communication_logs(
    family_file_id: str,
    child_id: Optional[str] = Query(None, description="Filter by child"),
    contact_id: Optional[str] = Query(None, description="Filter by contact"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get communication logs for audit and monitoring."""
    await get_family_file_with_access(db, family_file_id, current_user.id)

    logs = await my_circle_service.get_communication_logs(
        db,
        family_file_id=family_file_id,
        child_id=child_id,
        contact_id=contact_id,
        limit=limit,
        offset=offset,
    )

    items = []
    for log in logs:
        duration_display = None
        if log.duration_seconds:
            mins, secs = divmod(log.duration_seconds, 60)
            duration_display = f"{mins} min {secs} sec"

        items.append(KidComsCommunicationLogResponse(
            id=log.id,
            room_id=log.room_id,
            session_id=log.session_id,
            family_file_id=log.family_file_id,
            child_id=log.child_id,
            contact_type=log.contact_type,
            contact_id=log.contact_id,
            contact_name=log.contact_name,
            communication_type=log.communication_type,
            started_at=log.started_at,
            ended_at=log.ended_at,
            duration_seconds=log.duration_seconds,
            duration_display=duration_display,
            aria_flags=log.aria_flags,
            total_messages=log.total_messages,
            flagged_messages=log.flagged_messages,
            has_flags=log.flagged_messages > 0 if log.flagged_messages else False,
        ))

    return items
