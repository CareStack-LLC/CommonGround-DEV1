"""
Circle Call Service - Manages Daily.co video/audio calls between circle contacts and children.

Handles permanent room creation per (contact, child) pair, call session management,
permission validation, recording, and ARIA child safety monitoring.
"""

import logging
from datetime import datetime, time
from typing import Optional, Dict, Any, Tuple
from uuid import UUID

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circle_call import (
    CircleCallRoom,
    CircleCallSession,
    CircleCallTranscriptChunk,
    CircleCallStatus,
    InitiatorType,
)
from app.models.circle import CircleContact
from app.models.child import Child
from app.models.kidcoms import CirclePermission, KidComsSettings
from app.services.daily_video import daily_service

logger = logging.getLogger(__name__)


class CircleCallService:
    """Service for managing circle contact-child video/audio calls."""

    def __init__(self):
        # Use global daily_service singleton (same as parent calls)
        self.daily_service = daily_service

    async def validate_call_permission(
        self,
        db: AsyncSession,
        circle_contact_id: str,
        child_id: str,
        call_type: str
    ) -> Tuple[bool, str, Optional[CirclePermission]]:
        """
        Check if call is allowed right now based on CirclePermission.

        Args:
            db: Database session
            circle_contact_id: Circle contact ID
            child_id: Child ID
            call_type: "video" or "audio"

        Returns:
            Tuple of (allowed: bool, reason: str, permission: CirclePermission|None)
        """
        # Get CirclePermission for this contact-child pair
        result = await db.execute(
            select(CirclePermission).where(
                and_(
                    CirclePermission.circle_contact_id == circle_contact_id,
                    CirclePermission.child_id == child_id
                )
            )
        )
        permission = result.scalar_one_or_none()

        if not permission:
            return False, "No permission found for this contact and child", None

        # Check feature toggle
        if call_type == "video" and not permission.can_video_call:
            return False, "Video calling not allowed for this contact", permission

        if call_type == "audio" and not permission.can_voice_call:
            return False, "Voice calling not allowed for this contact", permission

        # Check time window (if restrictions set)
        if permission.allowed_start_time and permission.allowed_end_time:
            current_time = datetime.utcnow().time()
            allowed_start = permission.allowed_start_time
            allowed_end = permission.allowed_end_time

            if not (allowed_start <= current_time <= allowed_end):
                return False, f"Calls only allowed between {allowed_start.strftime('%H:%M')} and {allowed_end.strftime('%H:%M')}", permission

        # Check allowed days (if restrictions set)
        if permission.allowed_days:
            current_day = datetime.utcnow().weekday()  # 0=Monday, 6=Sunday
            if current_day not in permission.allowed_days:
                day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                allowed_day_names = [day_names[d] for d in permission.allowed_days]
                return False, f"Calls only allowed on: {', '.join(allowed_day_names)}", permission

        # Check daily session limit (from KidComsSettings)
        # Get child's family_file_id
        child_result = await db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = child_result.scalar_one_or_none()
        if not child:
            return False, "Child not found", permission

        # Get family settings
        settings_result = await db.execute(
            select(KidComsSettings).where(KidComsSettings.family_file_id == child.family_file_id)
        )
        settings = settings_result.scalar_one_or_none()

        if settings and settings.max_daily_sessions:
            # Count sessions today
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            count_result = await db.execute(
                select(func.count(CircleCallSession.id)).where(
                    and_(
                        CircleCallSession.circle_contact_id == circle_contact_id,
                        CircleCallSession.child_id == child_id,
                        CircleCallSession.initiated_at >= today_start,
                        CircleCallSession.status.in_(["completed", "active"])
                    )
                )
            )
            session_count = count_result.scalar()

            if session_count >= settings.max_daily_sessions:
                return False, f"Daily session limit reached ({settings.max_daily_sessions} calls per day)", permission

        # All checks passed
        return True, "Call allowed", permission

    async def get_or_create_room(
        self,
        db: AsyncSession,
        circle_contact_id: str,
        child_id: str,
        family_file_id: str
    ) -> CircleCallRoom:
        """
        Get or create permanent Daily.co room for this contact-child pair.

        Args:
            db: Database session
            circle_contact_id: Circle contact ID
            child_id: Child ID
            family_file_id: Family file ID

        Returns:
            CircleCallRoom instance
        """
        # Check if room already exists
        result = await db.execute(
            select(CircleCallRoom).where(
                and_(
                    CircleCallRoom.circle_contact_id == circle_contact_id,
                    CircleCallRoom.child_id == child_id
                )
            )
        )
        room = result.scalar_one_or_none()

        if room:
            logger.info(f"Found existing circle call room for contact {circle_contact_id[:8]} → child {child_id[:8]}")
            # Verify room exists in Daily.co
            try:
                daily_room = await self.daily_service.create_room_if_not_exists(
                    room_name=room.daily_room_name,
                    privacy="private",
                    exp_minutes=525600,  # 1 year
                    max_participants=4,  # Contact + child + 2 parents (if required)
                    enable_recording=True,
                )
                if daily_room and daily_room.get("url"):
                    room.daily_room_url = daily_room["url"]
                    await db.commit()
                    await db.refresh(room)
                return room
            except Exception as e:
                logger.error(f"Could not verify Daily.co room: {e}")
                raise ValueError(f"Failed to verify video room: {str(e)}")

        # Create new permanent room
        room_name = f"cg-circle-{circle_contact_id[:8]}-{child_id[:8]}"

        try:
            # Create Daily.co room
            daily_room = await self.daily_service.create_room(
                room_name=room_name,
                privacy="private",
                exp_minutes=525600,  # 1 year (like parent calls)
                max_participants=4,  # Contact + child + 2 parents (if supervision required)
                enable_recording=True,
            )

            # Create database record
            room = CircleCallRoom(
                family_file_id=family_file_id,
                child_id=child_id,
                circle_contact_id=circle_contact_id,
                daily_room_name=room_name,
                daily_room_url=daily_room["url"],
                recording_enabled=True,  # Always record for child safety
                aria_monitoring_enabled=True,  # Always monitor for child safety
                max_duration_minutes=60,
                is_active=True,
            )

            db.add(room)
            await db.commit()
            await db.refresh(room)

            logger.info(f"Created permanent circle call room {room_name}")
            return room

        except Exception as e:
            logger.error(f"Failed to create circle call room: {e}")
            await db.rollback()
            raise

    async def create_call_session(
        self,
        db: AsyncSession,
        family_file_id: str,
        circle_contact_id: str,
        child_id: str,
        call_type: str,
        initiated_by_type: str,  # "circle_contact" or "child"
        initiated_by_id: str
    ) -> CircleCallSession:
        """
        Create new call session (bidirectional).

        Args:
            db: Database session
            family_file_id: Family file ID
            circle_contact_id: Circle contact ID
            child_id: Child ID
            call_type: "video" or "audio"
            initiated_by_type: "circle_contact" or "child"
            initiated_by_id: ID of initiator

        Returns:
            CircleCallSession instance

        Raises:
            ValueError: If permission validation fails
        """
        # Validate permission
        allowed, reason, permission = await self.validate_call_permission(
            db, circle_contact_id, child_id, call_type
        )

        if not allowed:
            raise ValueError(reason)

        # Get or create permanent room
        room = await self.get_or_create_room(db, circle_contact_id, child_id, family_file_id)

        # Create permission snapshot for audit trail
        permission_snapshot = {
            "can_video_call": permission.can_video_call,
            "can_voice_call": permission.can_voice_call,
            "allowed_start_time": permission.allowed_start_time.isoformat() if permission.allowed_start_time else None,
            "allowed_end_time": permission.allowed_end_time.isoformat() if permission.allowed_end_time else None,
            "allowed_days": permission.allowed_days,
            "max_call_duration_minutes": permission.max_call_duration_minutes,
            "require_parent_present": permission.require_parent_present,
        }

        # Create session
        session = CircleCallSession(
            family_file_id=family_file_id,
            room_id=room.id,
            child_id=child_id,
            circle_contact_id=circle_contact_id,
            call_type=call_type,
            status=CircleCallStatus.RINGING.value,
            initiated_by_id=initiated_by_id,
            initiated_by_type=initiated_by_type,
            daily_room_name=room.daily_room_name,
            daily_room_url=room.daily_room_url,
            initiated_at=datetime.utcnow(),
            aria_active=True,  # Always active for child safety
            aria_threshold=0.3,  # Stricter than parent calls (0.5)
            permission_snapshot=permission_snapshot,
        )

        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Update room stats
        room.update_last_used()
        await db.commit()

        logger.info(f"Created circle call session {session.id} ({initiated_by_type} initiated)")
        return session

    async def join_call(
        self,
        db: AsyncSession,
        session_id: str,
        user_id: str,  # circle_contact_id or child_id
        user_name: str,
        user_type: str  # "circle_contact" or "child"
    ) -> Dict[str, Any]:
        """
        Join call session and get meeting token.

        Args:
            db: Database session
            session_id: Call session ID
            user_id: ID of user joining (contact or child)
            user_name: Display name
            user_type: "circle_contact" or "child"

        Returns:
            Dict with room_url and token
        """
        # Get session
        result = await db.execute(
            select(CircleCallSession).where(CircleCallSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Call session {session_id} not found")

        # Generate meeting token
        is_audio_only = session.call_type == "audio"
        max_duration = session.permission_snapshot.get("max_call_duration_minutes", 60)

        token = await self.daily_service.create_meeting_token(
            room_name=session.daily_room_name,
            user_name=user_name,
            user_id=user_id,
            is_owner=True,
            exp_minutes=max_duration,
            enable_recording=True,
            start_video_off=is_audio_only,
        )

        # Update session status
        if session.status == CircleCallStatus.RINGING.value:
            # Recipient joined - mark as active
            session.joined_at = datetime.utcnow()
            session.start()  # Sets status to ACTIVE and started_at

        # Store token
        if user_type == "circle_contact":
            session.circle_contact_token = token
        else:
            session.child_token = token

        await db.commit()
        await db.refresh(session)

        logger.info(f"{user_type} {user_id} joined circle call session {session_id}")

        return {
            "session_id": session.id,
            "room_url": session.daily_room_url,
            "token": token,
            "call_type": session.call_type,
            "status": session.status,
        }

    async def end_call(
        self,
        db: AsyncSession,
        session_id: str,
        terminated_by_aria: bool = False,
        termination_reason: Optional[str] = None
    ) -> CircleCallSession:
        """
        End call session.

        Args:
            db: Database session
            session_id: Call session ID
            terminated_by_aria: Whether ARIA terminated for safety
            termination_reason: Reason if ARIA terminated

        Returns:
            Updated CircleCallSession
        """
        # Get session
        result = await db.execute(
            select(CircleCallSession).where(CircleCallSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Call session {session_id} not found")

        # End the session
        session.end(terminated_by_aria=terminated_by_aria, reason=termination_reason)

        await db.commit()
        await db.refresh(session)

        logger.info(
            f"Circle call session {session_id} ended "
            f"({'ARIA terminated' if terminated_by_aria else 'normal'})"
        )

        return session

    async def get_call_history(
        self,
        db: AsyncSession,
        family_file_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> list[CircleCallSession]:
        """
        Get call history for family file (parents only).

        Args:
            db: Database session
            family_file_id: Family file ID
            limit: Max results
            offset: Pagination offset

        Returns:
            List of CircleCallSession
        """
        result = await db.execute(
            select(CircleCallSession)
            .where(CircleCallSession.family_file_id == family_file_id)
            .order_by(CircleCallSession.initiated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        sessions = result.scalars().all()

        return list(sessions)


# Global singleton instance
circle_call_service = CircleCallService()
