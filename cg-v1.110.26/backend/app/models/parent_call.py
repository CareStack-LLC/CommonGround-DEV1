"""
Parent call models - Daily.co video/audio calls between parents.

Supports permanent rooms per family file with ARIA real-time monitoring,
recording, and transcription for court documentation.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.family_file import FamilyFile
    from app.models.user import User


class CallType(str, Enum):
    """Types of parent calls."""

    VIDEO = "video"
    AUDIO = "audio"


class CallStatus(str, Enum):
    """Status of a parent call session."""

    SCHEDULED = "scheduled"  # Scheduled for future
    RINGING = "ringing"  # Call initiated, waiting for other parent
    ACTIVE = "active"  # Call in progress
    COMPLETED = "completed"  # Call ended normally
    MISSED = "missed"  # Call not answered
    CANCELLED = "cancelled"  # Call cancelled before starting
    TERMINATED = "terminated"  # Call ended by ARIA or system


class CallSeverity(str, Enum):
    """Severity levels for ARIA call flags."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    SEVERE = "severe"


class ParentCallRoom(Base, UUIDMixin, TimestampMixin):
    """
    Permanent Daily.co room for parent-to-parent communication.

    Each family file has ONE permanent room that is always available.
    Room is created when family file is created and persists indefinitely.
    """

    __tablename__ = "parent_call_rooms"

    # Foreign key (unique - one room per family file)
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), unique=True, index=True
    )

    # Daily.co permanent room
    daily_room_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    daily_room_url: Mapped[str] = mapped_column(String(500))

    # Settings
    recording_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    aria_monitoring_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_duration_minutes: Mapped[int] = mapped_column(Integer, default=120)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", back_populates="parent_call_room"
    )
    sessions: Mapped[list["ParentCallSession"]] = relationship(
        "ParentCallSession", back_populates="room", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ParentCallRoom {self.daily_room_name} (family {self.family_file_id})>"

    def update_last_used(self) -> None:
        """Update last used timestamp and increment session count."""
        self.last_used_at = datetime.utcnow()
        self.total_sessions += 1


class ParentCallSession(Base, UUIDMixin, TimestampMixin):
    """
    Individual call session between parents using the permanent room.

    Each call gets fresh meeting tokens for security while reusing the same room.
    All calls are recorded and transcribed for court documentation.
    """

    __tablename__ = "parent_call_sessions"

    # Foreign keys
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parent_call_rooms.id", ondelete="CASCADE"), index=True
    )

    # Participants
    parent_a_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )
    parent_b_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )

    # Session metadata
    call_type: Mapped[str] = mapped_column(
        String(20), default=CallType.VIDEO.value
    )  # video, audio
    status: Mapped[str] = mapped_column(
        String(20), default=CallStatus.RINGING.value, index=True
    )

    # Daily.co room reference (permanent room)
    daily_room_name: Mapped[str] = mapped_column(String(100), index=True)
    daily_room_url: Mapped[str] = mapped_column(String(500))

    # Meeting tokens (regenerated per session for security)
    parent_a_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_b_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timing
    initiated_by: Mapped[str] = mapped_column(String(36))  # User ID
    initiated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    joined_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # When second parent joined
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # When call actually started
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Recording & transcription
    recording_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    recording_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recording_storage_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )  # Supabase path
    transcript_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript_storage_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # ARIA monitoring
    aria_active: Mapped[bool] = mapped_column(Boolean, default=True)
    aria_intervention_count: Mapped[int] = mapped_column(Integer, default=0)
    aria_terminated_call: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_termination_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Overall ARIA metrics (calculated post-call)
    overall_toxicity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    compliance_rating: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # excellent, good, fair, poor

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", back_populates="parent_call_sessions"
    )
    room: Mapped["ParentCallRoom"] = relationship("ParentCallRoom", back_populates="sessions")
    parent_a: Mapped["User"] = relationship("User", foreign_keys=[parent_a_id])
    parent_b: Mapped[Optional["User"]] = relationship("User", foreign_keys=[parent_b_id])
    transcript_chunks: Mapped[list["CallTranscriptChunk"]] = relationship(
        "CallTranscriptChunk", back_populates="session", cascade="all, delete-orphan"
    )
    flags: Mapped[list["CallFlag"]] = relationship(
        "CallFlag", back_populates="session", cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index("ix_parent_call_sessions_family_status", "family_file_id", "status"),
        Index("ix_parent_call_sessions_parent_a_date", "parent_a_id", "initiated_at"),
        Index("ix_parent_call_sessions_parent_b_date", "parent_b_id", "initiated_at"),
    )

    def __repr__(self) -> str:
        return f"<ParentCallSession {self.id} ({self.call_type}) - {self.status}>"

    def start(self) -> None:
        """Mark call as started (both parents joined)."""
        self.status = CallStatus.ACTIVE.value
        self.started_at = datetime.utcnow()

    def end(self, terminated_by_aria: bool = False, reason: Optional[str] = None) -> None:
        """
        Mark call as ended and calculate duration.

        Args:
            terminated_by_aria: Whether ARIA terminated the call
            reason: Termination reason if ARIA terminated
        """
        if terminated_by_aria:
            self.status = CallStatus.TERMINATED.value
            self.aria_terminated_call = True
            self.aria_termination_reason = reason
        else:
            self.status = CallStatus.COMPLETED.value

        self.ended_at = datetime.utcnow()
        if self.started_at:
            self.duration_seconds = int((self.ended_at - self.started_at).total_seconds())

    def mark_missed(self) -> None:
        """Mark call as missed (not answered)."""
        self.status = CallStatus.MISSED.value
        self.ended_at = datetime.utcnow()

    def increment_aria_intervention(self) -> None:
        """Increment ARIA intervention counter."""
        self.aria_intervention_count += 1


class CallTranscriptChunk(Base, UUIDMixin):
    """
    Real-time transcription chunk from Daily.co.

    Each chunk represents a segment of speech from one participant.
    Analyzed by ARIA in real-time for severe violations.
    """

    __tablename__ = "call_transcript_chunks"

    # Foreign key
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parent_call_sessions.id", ondelete="CASCADE"), index=True
    )

    # Speaker
    speaker_id: Mapped[str] = mapped_column(String(36), index=True)  # User ID
    speaker_name: Mapped[str] = mapped_column(String(100))

    # Transcript
    content: Mapped[str] = mapped_column(Text)  # Spoken text
    confidence: Mapped[float] = mapped_column(Float)  # 0.0-1.0 from transcription service

    # Timing
    start_time: Mapped[float] = mapped_column(Float)  # Seconds from call start
    end_time: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # ARIA analysis
    analyzed: Mapped[bool] = mapped_column(Boolean, default=False)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    toxicity_score: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )  # 0.0-1.0

    # Relationships
    session: Mapped["ParentCallSession"] = relationship(
        "ParentCallSession", back_populates="transcript_chunks"
    )

    # Indexes
    __table_args__ = (
        Index("ix_call_transcript_chunks_session_time", "session_id", "start_time"),
        Index("ix_call_transcript_chunks_flagged", "session_id", "flagged"),
    )

    def __repr__(self) -> str:
        return f"<CallTranscriptChunk {self.id} (speaker: {self.speaker_name})>"


class CallFlag(Base, UUIDMixin, TimestampMixin):
    """
    ARIA intervention flag on a call.

    Created for real-time severe violations or post-call comprehensive analysis.
    Tracks intervention actions (warning, mute, terminate).
    """

    __tablename__ = "call_flags"

    # Foreign keys
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parent_call_sessions.id", ondelete="CASCADE"), index=True
    )
    transcript_chunk_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("call_transcript_chunks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ARIA analysis
    flag_type: Mapped[str] = mapped_column(
        String(20), index=True
    )  # real_time, post_call
    toxicity_score: Mapped[float] = mapped_column(Float)  # 0.0-1.0
    severity: Mapped[str] = mapped_column(
        String(20), index=True
    )  # low, medium, high, severe

    # Categories and triggers
    categories: Mapped[list] = mapped_column(
        JSON
    )  # e.g., ["hostility", "threats", "profanity"]
    triggers: Mapped[list] = mapped_column(
        JSON
    )  # Specific phrases that triggered the flag

    # Intervention
    intervention_taken: Mapped[bool] = mapped_column(Boolean, default=False)
    intervention_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # warning, mute, terminate
    intervention_message: Mapped[str] = mapped_column(
        Text
    )  # Message shown to parents

    # Timing
    flagged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    call_time_seconds: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )  # Time in call when flagged

    # Relationships
    session: Mapped["ParentCallSession"] = relationship(
        "ParentCallSession", back_populates="flags"
    )
    transcript_chunk: Mapped[Optional["CallTranscriptChunk"]] = relationship(
        "CallTranscriptChunk"
    )

    # Indexes
    __table_args__ = (
        Index("ix_call_flags_session_severity", "session_id", "severity"),
        Index("ix_call_flags_type_flagged_at", "flag_type", "flagged_at"),
    )

    def __repr__(self) -> str:
        return f"<CallFlag {self.severity} on session {self.session_id}>"

    @property
    def is_severe(self) -> bool:
        """Check if flag is severe (requires immediate action)."""
        return self.severity == CallSeverity.SEVERE.value

    @property
    def is_high_or_severe(self) -> bool:
        """Check if flag is high or severe."""
        return self.severity in [CallSeverity.HIGH.value, CallSeverity.SEVERE.value]
