"""
Parent Call Service - Manages Daily.co video/audio calls between parents.

Handles permanent room creation, call session management, recording,
and transcription for court documentation.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parent_call import (
    ParentCallRoom,
    ParentCallSession,
    CallTranscriptChunk,
    CallStatus,
)
from app.models.family_file import FamilyFile
from app.services.daily_video import daily_service

logger = logging.getLogger(__name__)


class ParentCallService:
    """Service for managing parent-to-parent video/audio calls."""

    def __init__(self):
        # Use global daily_service singleton (same as KidComs)
        self.daily_service = daily_service

    async def get_or_create_permanent_room(
        self,
        db: AsyncSession,
        family_file_id: str
    ) -> ParentCallRoom:
        """
        Get or create the permanent Daily.co room for a family file.

        Each family file has ONE permanent room that is always available.

        Args:
            db: Database session
            family_file_id: Family file ID

        Returns:
            ParentCallRoom instance
        """
        # Check if room already exists in database
        result = await db.execute(
            select(ParentCallRoom).where(ParentCallRoom.family_file_id == family_file_id)
        )
        room = result.scalar_one_or_none()

        if room:
            logger.info(f"Found existing permanent room for family file {family_file_id}")
            # IMPORTANT: Verify the room exists in Daily.co and create if not
            # This handles cases where the DB record exists but Daily.co room
            # was never created or expired
            try:
                await self.daily_service.create_room_if_not_exists(
                    room_name=room.daily_room_name,
                    privacy="private",
                    exp_minutes=525600,  # 1 year
                    max_participants=4,
                    enable_recording=True,
                )
                logger.info(f"Verified Daily.co room exists: {room.daily_room_name}")
            except Exception as e:
                logger.warning(f"Could not verify Daily.co room: {e}")
            return room

        # Get family file to construct room name
        ff_result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = ff_result.scalar_one_or_none()
        if not family_file:
            raise ValueError(f"Family file {family_file_id} not found")

        # Create permanent Daily.co room
        room_name = f"cg-parent-{family_file.family_file_number}"

        try:
            # Create room with no expiration (permanent)
            daily_room = await self.daily_service.create_room(
                room_name=room_name,
                privacy="private",
                exp_minutes=525600,  # 1 year (effectively permanent)
                max_participants=4,  # 2 parents + 2 lawyers
                enable_recording=True,
            )

            # Create database record
            room = ParentCallRoom(
                family_file_id=family_file_id,
                daily_room_name=room_name,
                daily_room_url=daily_room["url"],
                recording_enabled=True,
                aria_monitoring_enabled=True,
                max_duration_minutes=120,
                is_active=True,
            )

            db.add(room)
            await db.commit()
            await db.refresh(room)

            logger.info(f"Created permanent room {room_name} for family file {family_file_id}")
            return room

        except Exception as e:
            logger.error(f"Failed to create permanent room: {e}")
            await db.rollback()
            raise

    async def create_call_session(
        self,
        db: AsyncSession,
        family_file_id: str,
        initiator_id: str,
        call_type: str = "video"
    ) -> ParentCallSession:
        """
        Create a new call session.

        Args:
            db: Database session
            family_file_id: Family file ID
            initiator_id: User ID of the parent initiating the call
            call_type: "video" or "audio"

        Returns:
            ParentCallSession instance

        Raises:
            ValueError: If both parents haven't joined the family file
        """
        # Verify both parents have joined
        from app.models.family_file import FamilyFile
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()

        if not family_file:
            raise ValueError("Family file not found")

        if not family_file.parent_b_id or not family_file.parent_b_joined_at:
            raise ValueError(
                "Both parents must join the family file before calling is enabled. "
                "Only messaging is available until both parents have joined."
            )

        # Get or create permanent room
        room = await self.get_or_create_permanent_room(db, family_file_id)

        # Create session
        session = ParentCallSession(
            family_file_id=family_file_id,
            room_id=room.id,
            parent_a_id=initiator_id,
            call_type=call_type,
            status=CallStatus.RINGING.value,
            daily_room_name=room.daily_room_name,
            daily_room_url=room.daily_room_url,
            initiated_by=initiator_id,
            initiated_at=datetime.utcnow(),
            recording_enabled=room.recording_enabled,
            aria_active=room.aria_monitoring_enabled,
        )

        db.add(session)
        await db.commit()
        await db.refresh(session)

        logger.info(f"Created call session {session.id} for family file {family_file_id}")
        return session

    async def join_call(
        self,
        db: AsyncSession,
        session_id: str,
        user_id: str,
        user_name: str
    ) -> Dict[str, Any]:
        """
        Join a call session and get meeting token.

        Args:
            db: Database session
            session_id: Call session ID
            user_id: User ID joining the call
            user_name: Display name for the user

        Returns:
            Dict with room_url and token
        """
        # Get session
        result = await db.execute(
            select(ParentCallSession).where(ParentCallSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Call session {session_id} not found")

        # Generate meeting token
        token = await self.daily_service.create_meeting_token(
            room_name=session.daily_room_name,
            user_name=user_name,
            user_id=user_id,
            is_owner=True,  # All parents are owners
            exp_minutes=session.max_duration_minutes if hasattr(session, 'max_duration_minutes') else 120,
            enable_recording=session.recording_enabled,
        )

        # Update session status
        if session.status == CallStatus.RINGING.value:
            # Second parent joined - mark as active
            session.parent_b_id = user_id
            session.joined_at = datetime.utcnow()
            session.start()  # Sets status to ACTIVE and started_at

        # Store token
        if user_id == session.parent_a_id:
            session.parent_a_token = token
        else:
            session.parent_b_token = token

        await db.commit()
        await db.refresh(session)

        logger.info(f"User {user_id} joined call session {session_id}")

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
    ) -> ParentCallSession:
        """
        End a call session.

        Args:
            db: Database session
            session_id: Call session ID
            terminated_by_aria: Whether ARIA terminated the call
            termination_reason: Reason if ARIA terminated

        Returns:
            Updated ParentCallSession
        """
        # Get session
        result = await db.execute(
            select(ParentCallSession).where(ParentCallSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Call session {session_id} not found")

        # End session
        session.end(terminated_by_aria, termination_reason)

        # Update room stats
        room_result = await db.execute(
            select(ParentCallRoom).where(ParentCallRoom.id == session.room_id)
        )
        room = room_result.scalar_one_or_none()
        if room:
            room.update_last_used()

        await db.commit()
        await db.refresh(session)

        logger.info(
            f"Ended call session {session_id} "
            f"(ARIA terminated: {terminated_by_aria}, duration: {session.duration_seconds}s)"
        )

        return session

    async def process_transcript_chunk(
        self,
        db: AsyncSession,
        session_id: str,
        speaker_id: str,
        speaker_name: str,
        content: str,
        confidence: float,
        start_time: float,
        end_time: float
    ) -> CallTranscriptChunk:
        """
        Process and store a transcript chunk from Daily.co.

        Args:
            db: Database session
            session_id: Call session ID
            speaker_id: User ID of speaker
            speaker_name: Display name of speaker
            content: Transcribed text
            confidence: Transcription confidence (0.0-1.0)
            start_time: Start time in seconds from call start
            end_time: End time in seconds from call start

        Returns:
            CallTranscriptChunk instance
        """
        chunk = CallTranscriptChunk(
            session_id=session_id,
            speaker_id=speaker_id,
            speaker_name=speaker_name,
            content=content,
            confidence=confidence,
            start_time=start_time,
            end_time=end_time,
            timestamp=datetime.utcnow(),
            analyzed=False,
            flagged=False,
        )

        db.add(chunk)
        await db.commit()
        await db.refresh(chunk)

        logger.debug(f"Stored transcript chunk for session {session_id} (confidence: {confidence})")

        return chunk

    async def get_session(
        self,
        db: AsyncSession,
        session_id: str
    ) -> Optional[ParentCallSession]:
        """
        Get a call session by ID.

        Args:
            db: Database session
            session_id: Call session ID

        Returns:
            ParentCallSession or None
        """
        result = await db.execute(
            select(ParentCallSession).where(ParentCallSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_family_call_history(
        self,
        db: AsyncSession,
        family_file_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> list[ParentCallSession]:
        """
        Get call history for a family file.

        Args:
            db: Database session
            family_file_id: Family file ID
            limit: Maximum number of sessions to return
            offset: Pagination offset

        Returns:
            List of ParentCallSession instances
        """
        result = await db.execute(
            select(ParentCallSession)
            .where(ParentCallSession.family_file_id == family_file_id)
            .order_by(ParentCallSession.initiated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())


# Global instance for convenience
parent_call_service = ParentCallService()
