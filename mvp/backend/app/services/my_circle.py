"""
My Circle Service - Business logic for the My Circle communication system.

Handles:
- Room management (10 rooms per family)
- Circle user authentication (invite/accept/login)
- Child user authentication (PIN-based)
- Permission management
- Communication logging
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import bcrypt

from app.models import (
    FamilyFile,
    Child,
    CircleContact,
    KidComsRoom,
    CircleUser,
    ChildUser,
    CirclePermission,
    KidComsCommunicationLog,
    RoomType,
)
from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def hash_pin(pin: str) -> str:
    """Hash a PIN using bcrypt."""
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verify a PIN against its hash."""
    return bcrypt.checkpw(plain_pin.encode(), hashed_pin.encode())


def generate_invite_token() -> str:
    """Generate a secure invite token."""
    return secrets.token_urlsafe(32)


# ============================================================
# Room Management
# ============================================================

async def initialize_family_rooms(
    db: AsyncSession,
    family_file_id: str,
) -> List[KidComsRoom]:
    """
    Initialize all 10 rooms for a family file.
    Called when My Circle is first enabled for a family.

    Rooms 1-2 are reserved for parents, 3-10 are assignable.
    """
    rooms = []

    for room_number in range(1, 11):
        if room_number == 1:
            room_type = RoomType.PARENT_A.value
            room_name = "Parent A Room"
        elif room_number == 2:
            room_type = RoomType.PARENT_B.value
            room_name = "Parent B Room"
        else:
            room_type = RoomType.CIRCLE.value
            room_name = None

        room = KidComsRoom(
            id=str(uuid4()),
            family_file_id=family_file_id,
            room_number=room_number,
            room_type=room_type,
            room_name=room_name,
            is_active=True,
        )
        rooms.append(room)
        db.add(room)

    await db.flush()
    return rooms


async def get_family_rooms(
    db: AsyncSession,
    family_file_id: str,
) -> List[KidComsRoom]:
    """Get all rooms for a family, creating them if they don't exist."""
    result = await db.execute(
        select(KidComsRoom)
        .where(KidComsRoom.family_file_id == family_file_id)
        .order_by(KidComsRoom.room_number)
    )
    rooms = list(result.scalars().all())

    # Initialize rooms if they don't exist
    if not rooms:
        rooms = await initialize_family_rooms(db, family_file_id)
        await db.commit()

    return rooms


async def get_room_by_id(
    db: AsyncSession,
    room_id: str,
) -> Optional[KidComsRoom]:
    """Get a room by ID."""
    result = await db.execute(
        select(KidComsRoom).where(KidComsRoom.id == room_id)
    )
    return result.scalar_one_or_none()


async def get_room_by_number(
    db: AsyncSession,
    family_file_id: str,
    room_number: int,
) -> Optional[KidComsRoom]:
    """Get a room by family and room number."""
    result = await db.execute(
        select(KidComsRoom).where(
            and_(
                KidComsRoom.family_file_id == family_file_id,
                KidComsRoom.room_number == room_number,
            )
        )
    )
    return result.scalar_one_or_none()


async def assign_room_to_contact(
    db: AsyncSession,
    room_id: str,
    circle_contact_id: str,
    room_name: Optional[str] = None,
) -> KidComsRoom:
    """Assign a circle contact to a room."""
    room = await get_room_by_id(db, room_id)
    if not room:
        raise ValueError("Room not found")

    if room.room_type != RoomType.CIRCLE.value:
        raise ValueError("Cannot assign contact to reserved parent room")

    if room.assigned_to_id and room.assigned_to_id != circle_contact_id:
        raise ValueError("Room is already assigned to another contact")

    # Get the contact to update their room number
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()
    if not contact:
        raise ValueError("Circle contact not found")

    # Update room assignment
    room.assigned_to_id = circle_contact_id
    if room_name:
        room.room_name = room_name
    elif not room.room_name:
        room.room_name = f"{contact.contact_name}'s Room"

    # Update contact's room number
    contact.room_number = room.room_number

    await db.flush()
    return room


async def unassign_room(
    db: AsyncSession,
    room_id: str,
) -> KidComsRoom:
    """Unassign a contact from a room."""
    room = await get_room_by_id(db, room_id)
    if not room:
        raise ValueError("Room not found")

    if room.room_type != RoomType.CIRCLE.value:
        raise ValueError("Cannot unassign reserved parent room")

    # Clear contact's room number if they had one
    if room.assigned_to_id:
        contact_result = await db.execute(
            select(CircleContact).where(CircleContact.id == room.assigned_to_id)
        )
        contact = contact_result.scalar_one_or_none()
        if contact:
            contact.room_number = None

    room.assigned_to_id = None
    room.room_name = None

    await db.flush()
    return room


async def get_next_available_room(
    db: AsyncSession,
    family_file_id: str,
) -> Optional[KidComsRoom]:
    """Get the next available (unassigned) circle room."""
    # Ensure rooms exist
    await get_family_rooms(db, family_file_id)

    result = await db.execute(
        select(KidComsRoom)
        .where(
            and_(
                KidComsRoom.family_file_id == family_file_id,
                KidComsRoom.room_type == RoomType.CIRCLE.value,
                KidComsRoom.assigned_to_id.is_(None),
                KidComsRoom.is_active == True,
            )
        )
        .order_by(KidComsRoom.room_number)
        .limit(1)
    )
    return result.scalar_one_or_none()


# ============================================================
# Circle User Management
# ============================================================

async def create_circle_user_invite(
    db: AsyncSession,
    circle_contact_id: str,
    base_url: str = "http://localhost:3000",
) -> CircleUser:
    """
    Create an invitation for a circle contact to create an account.
    """
    # Get the contact
    contact_result = await db.execute(
        select(CircleContact).where(CircleContact.id == circle_contact_id)
    )
    contact = contact_result.scalar_one_or_none()
    if not contact:
        raise ValueError("Circle contact not found")

    if not contact.contact_email:
        raise ValueError("Circle contact does not have an email address")

    # Check if user already exists
    existing_result = await db.execute(
        select(CircleUser).where(CircleUser.circle_contact_id == circle_contact_id)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        if existing.invite_accepted_at:
            raise ValueError("Circle contact already has an account")

        # Refresh the invite token
        existing.invite_token = generate_invite_token()
        existing.invite_expires_at = datetime.utcnow() + timedelta(days=7)
        await db.flush()
        return existing

    # Create new circle user with invite
    circle_user = CircleUser(
        id=str(uuid4()),
        circle_contact_id=circle_contact_id,
        email=contact.contact_email,
        invite_token=generate_invite_token(),
        invite_expires_at=datetime.utcnow() + timedelta(days=7),
        is_active=True,
    )
    db.add(circle_user)

    # Update contact's invite_sent_at
    contact.invite_sent_at = datetime.utcnow()

    await db.flush()
    return circle_user


async def get_circle_user_by_invite_token(
    db: AsyncSession,
    invite_token: str,
) -> Optional[CircleUser]:
    """Get a circle user by their invite token."""
    result = await db.execute(
        select(CircleUser)
        .options(selectinload(CircleUser.circle_contact))
        .where(CircleUser.invite_token == invite_token)
    )
    return result.scalar_one_or_none()


async def accept_circle_invite(
    db: AsyncSession,
    invite_token: str,
    password: str,
) -> CircleUser:
    """Accept a circle invitation and set password."""
    user = await get_circle_user_by_invite_token(db, invite_token)
    if not user:
        raise ValueError("Invalid or expired invite token")

    if user.invite_accepted_at:
        raise ValueError("Invitation has already been accepted")

    if user.is_invite_expired:
        raise ValueError("Invitation has expired")

    # Set password and mark as accepted
    user.password_hash = hash_password(password)
    user.invite_accepted_at = datetime.utcnow()
    user.invite_token = None  # Clear token
    user.email_verified = True  # They verified by clicking the link

    await db.flush()
    return user


async def get_circle_user_by_email(
    db: AsyncSession,
    email: str,
) -> Optional[CircleUser]:
    """Get a circle user by email."""
    result = await db.execute(
        select(CircleUser)
        .options(selectinload(CircleUser.circle_contact))
        .where(CircleUser.email == email)
    )
    return result.scalar_one_or_none()


async def authenticate_circle_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> Optional[CircleUser]:
    """Authenticate a circle user by email and password."""
    user = await get_circle_user_by_email(db, email)
    if not user:
        return None

    if not user.password_hash:
        return None  # Invite not accepted yet

    if not verify_password(password, user.password_hash):
        return None

    if not user.is_active:
        return None

    # Update last login
    user.last_login = datetime.utcnow()
    await db.flush()

    return user


async def get_circle_user_by_id(
    db: AsyncSession,
    user_id: str,
) -> Optional[CircleUser]:
    """Get a circle user by ID."""
    result = await db.execute(
        select(CircleUser)
        .options(selectinload(CircleUser.circle_contact))
        .where(CircleUser.id == user_id)
    )
    return result.scalar_one_or_none()


# ============================================================
# Child User Management
# ============================================================

async def setup_child_user(
    db: AsyncSession,
    child_id: str,
    family_file_id: str,
    username: str,
    pin: str,
    avatar_id: Optional[str] = None,
) -> ChildUser:
    """Set up a child's login account."""
    # Check if child exists
    child_result = await db.execute(
        select(Child).where(Child.id == child_id)
    )
    child = child_result.scalar_one_or_none()
    if not child:
        raise ValueError("Child not found")

    # Check if username is already taken in this family
    existing_result = await db.execute(
        select(ChildUser).where(
            and_(
                ChildUser.family_file_id == family_file_id,
                ChildUser.username == username,
            )
        )
    )
    existing = existing_result.scalar_one_or_none()

    # Check if child already has an account
    child_account_result = await db.execute(
        select(ChildUser).where(ChildUser.child_id == child_id)
    )
    child_account = child_account_result.scalar_one_or_none()

    if child_account:
        # Update existing account
        if existing and existing.id != child_account.id:
            raise ValueError("Username is already taken")

        child_account.username = username
        child_account.pin_hash = hash_pin(pin)
        if avatar_id:
            child_account.avatar_id = avatar_id

        await db.flush()
        return child_account

    if existing:
        raise ValueError("Username is already taken")

    # Create new child user
    child_user = ChildUser(
        id=str(uuid4()),
        child_id=child_id,
        family_file_id=family_file_id,
        username=username,
        pin_hash=hash_pin(pin),
        avatar_id=avatar_id,
        is_active=True,
    )
    db.add(child_user)
    await db.flush()

    return child_user


async def update_child_user(
    db: AsyncSession,
    child_user_id: str,
    username: Optional[str] = None,
    pin: Optional[str] = None,
    avatar_id: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> ChildUser:
    """Update a child's login account."""
    result = await db.execute(
        select(ChildUser).where(ChildUser.id == child_user_id)
    )
    child_user = result.scalar_one_or_none()
    if not child_user:
        raise ValueError("Child user not found")

    if username and username != child_user.username:
        # Check if new username is taken
        existing_result = await db.execute(
            select(ChildUser).where(
                and_(
                    ChildUser.family_file_id == child_user.family_file_id,
                    ChildUser.username == username,
                    ChildUser.id != child_user_id,
                )
            )
        )
        if existing_result.scalar_one_or_none():
            raise ValueError("Username is already taken")
        child_user.username = username

    if pin:
        child_user.pin_hash = hash_pin(pin)

    if avatar_id is not None:
        child_user.avatar_id = avatar_id

    if is_active is not None:
        child_user.is_active = is_active

    await db.flush()
    return child_user


async def authenticate_child_user(
    db: AsyncSession,
    family_file_id: str,
    username: str,
    pin: str,
) -> Optional[ChildUser]:
    """Authenticate a child by username and PIN."""
    result = await db.execute(
        select(ChildUser)
        .options(selectinload(ChildUser.child))
        .where(
            and_(
                ChildUser.family_file_id == family_file_id,
                ChildUser.username == username,
                ChildUser.is_active == True,
            )
        )
    )
    child_user = result.scalar_one_or_none()
    if not child_user:
        return None

    if not child_user.pin_hash:
        return None

    if not verify_pin(pin, child_user.pin_hash):
        return None

    # Update last login
    child_user.last_login = datetime.utcnow()
    await db.flush()

    return child_user


async def get_child_user_by_id(
    db: AsyncSession,
    user_id: str,
) -> Optional[ChildUser]:
    """Get a child user by ID."""
    result = await db.execute(
        select(ChildUser)
        .options(selectinload(ChildUser.child))
        .where(ChildUser.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_child_users_by_family(
    db: AsyncSession,
    family_file_id: str,
) -> List[ChildUser]:
    """Get all child users for a family."""
    result = await db.execute(
        select(ChildUser)
        .options(selectinload(ChildUser.child))
        .where(ChildUser.family_file_id == family_file_id)
        .order_by(ChildUser.username)
    )
    return list(result.scalars().all())


# ============================================================
# Permission Management
# ============================================================

async def create_or_update_permission(
    db: AsyncSession,
    circle_contact_id: str,
    child_id: str,
    family_file_id: str,
    set_by_parent_id: Optional[str] = None,
    **permission_data,
) -> CirclePermission:
    """Create or update permissions for a circle contact to communicate with a child."""
    # Check if permission already exists
    result = await db.execute(
        select(CirclePermission).where(
            and_(
                CirclePermission.circle_contact_id == circle_contact_id,
                CirclePermission.child_id == child_id,
            )
        )
    )
    permission = result.scalar_one_or_none()

    if permission:
        # Update existing permission
        for key, value in permission_data.items():
            if value is not None and hasattr(permission, key):
                setattr(permission, key, value)
        permission.set_by_parent_id = set_by_parent_id
        await db.flush()
        return permission

    # Create new permission
    permission = CirclePermission(
        id=str(uuid4()),
        circle_contact_id=circle_contact_id,
        child_id=child_id,
        family_file_id=family_file_id,
        set_by_parent_id=set_by_parent_id,
        **{k: v for k, v in permission_data.items() if v is not None},
    )
    db.add(permission)
    await db.flush()

    return permission


async def get_permission(
    db: AsyncSession,
    circle_contact_id: str,
    child_id: str,
) -> Optional[CirclePermission]:
    """Get permission for a contact/child pair."""
    result = await db.execute(
        select(CirclePermission)
        .options(
            selectinload(CirclePermission.circle_contact),
            selectinload(CirclePermission.child),
        )
        .where(
            and_(
                CirclePermission.circle_contact_id == circle_contact_id,
                CirclePermission.child_id == child_id,
            )
        )
    )
    return result.scalar_one_or_none()


async def get_permission_by_id(
    db: AsyncSession,
    permission_id: str,
) -> Optional[CirclePermission]:
    """Get a permission by ID."""
    result = await db.execute(
        select(CirclePermission)
        .options(
            selectinload(CirclePermission.circle_contact),
            selectinload(CirclePermission.child),
        )
        .where(CirclePermission.id == permission_id)
    )
    return result.scalar_one_or_none()


async def get_permissions_for_contact(
    db: AsyncSession,
    circle_contact_id: str,
) -> List[CirclePermission]:
    """Get all permissions for a circle contact."""
    result = await db.execute(
        select(CirclePermission)
        .options(selectinload(CirclePermission.child))
        .where(CirclePermission.circle_contact_id == circle_contact_id)
    )
    return list(result.scalars().all())


async def get_permissions_for_child(
    db: AsyncSession,
    child_id: str,
) -> List[CirclePermission]:
    """Get all permissions for a child."""
    result = await db.execute(
        select(CirclePermission)
        .options(selectinload(CirclePermission.circle_contact))
        .where(CirclePermission.child_id == child_id)
    )
    return list(result.scalars().all())


async def get_permissions_for_family(
    db: AsyncSession,
    family_file_id: str,
) -> List[CirclePermission]:
    """Get all permissions for a family."""
    result = await db.execute(
        select(CirclePermission)
        .options(
            selectinload(CirclePermission.circle_contact),
            selectinload(CirclePermission.child),
        )
        .where(CirclePermission.family_file_id == family_file_id)
    )
    return list(result.scalars().all())


async def delete_permission(
    db: AsyncSession,
    permission_id: str,
) -> bool:
    """Delete a permission."""
    result = await db.execute(
        select(CirclePermission).where(CirclePermission.id == permission_id)
    )
    permission = result.scalar_one_or_none()
    if not permission:
        return False

    await db.delete(permission)
    await db.flush()
    return True


# ============================================================
# Communication Logging
# ============================================================

async def log_communication_start(
    db: AsyncSession,
    family_file_id: str,
    child_id: str,
    contact_type: str,
    contact_id: Optional[str],
    contact_name: str,
    communication_type: str,
    room_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> KidComsCommunicationLog:
    """Log the start of a communication session."""
    log = KidComsCommunicationLog(
        id=str(uuid4()),
        room_id=room_id,
        session_id=session_id,
        family_file_id=family_file_id,
        child_id=child_id,
        contact_type=contact_type,
        contact_id=contact_id,
        contact_name=contact_name,
        communication_type=communication_type,
        started_at=datetime.utcnow(),
    )
    db.add(log)
    await db.flush()
    return log


async def log_communication_end(
    db: AsyncSession,
    log_id: str,
    aria_flags: Optional[Dict[str, Any]] = None,
    total_messages: int = 0,
    flagged_messages: int = 0,
) -> KidComsCommunicationLog:
    """Log the end of a communication session."""
    result = await db.execute(
        select(KidComsCommunicationLog).where(KidComsCommunicationLog.id == log_id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise ValueError("Communication log not found")

    log.end_communication()
    log.aria_flags = aria_flags
    log.total_messages = total_messages
    log.flagged_messages = flagged_messages

    await db.flush()
    return log


async def get_communication_logs(
    db: AsyncSession,
    family_file_id: str,
    child_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[KidComsCommunicationLog]:
    """Get communication logs for a family."""
    query = select(KidComsCommunicationLog).where(
        KidComsCommunicationLog.family_file_id == family_file_id
    )

    if child_id:
        query = query.where(KidComsCommunicationLog.child_id == child_id)

    if contact_id:
        query = query.where(KidComsCommunicationLog.contact_id == contact_id)

    query = query.order_by(KidComsCommunicationLog.started_at.desc())
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


# ============================================================
# Helper Functions
# ============================================================

async def get_child_contacts(
    db: AsyncSession,
    child_id: str,
    family_file_id: str,
) -> List[Dict[str, Any]]:
    """
    Get all contacts a child can communicate with.
    Includes parents and approved circle contacts with permissions.
    """
    contacts = []

    # Get family file to get parent info
    family_result = await db.execute(
        select(FamilyFile)
        .options(
            selectinload(FamilyFile.parent_a),
            selectinload(FamilyFile.parent_b),
        )
        .where(FamilyFile.id == family_file_id)
    )
    family = family_result.scalar_one_or_none()

    if family:
        # Add Parent A
        if family.parent_a:
            contacts.append({
                "contact_id": family.parent_a_id,
                "contact_type": "parent_a",
                "display_name": family.parent_a.first_name or "Mom",
                "room_number": 1,
                "can_video_call": True,
                "can_voice_call": True,
                "can_chat": True,
                "can_theater": True,
            })

        # Add Parent B
        if family.parent_b:
            contacts.append({
                "contact_id": family.parent_b_id,
                "contact_type": "parent_b",
                "display_name": family.parent_b.first_name or "Dad",
                "room_number": 2,
                "can_video_call": True,
                "can_voice_call": True,
                "can_chat": True,
                "can_theater": True,
            })

    # Get circle contacts with permissions for this child
    permissions = await get_permissions_for_child(db, child_id)

    for perm in permissions:
        if perm.circle_contact:
            contacts.append({
                "contact_id": perm.circle_contact_id,
                "contact_type": "circle",
                "display_name": perm.circle_contact.contact_name,
                "relationship": perm.circle_contact.relationship_type,
                "room_number": perm.circle_contact.room_number or 0,
                "can_video_call": perm.can_video_call,
                "can_voice_call": perm.can_voice_call,
                "can_chat": perm.can_chat,
                "can_theater": perm.can_theater,
            })

    return contacts
