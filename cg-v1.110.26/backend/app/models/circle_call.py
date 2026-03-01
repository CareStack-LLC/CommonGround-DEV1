"""
Circle call models - Daily.co video/audio calls between circle contacts and children.

Supports permanent rooms per (circle_contact, child) relationship with ARIA
child safety monitoring, recording, and transcription for court documentation.
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
    from app.models.child import Child
    from app.models.circle import CircleContact
    from app.models.user import User


class CircleCallType(str, Enum):
    """Types of circle calls."""

    VIDEO = "video"
    AUDIO = "audio"


class CircleCallStatus(str, Enum):
    """Status of a circle call session."""

    RINGING = "ringing"  # Call initiated, waiting for answer
    ACTIVE = "active"  # Call in progress
    COMPLETED = "completed"  # Call ended normally
    MISSED = "missed"  # Call not answered
    CANCELLED = "cancelled"  # Call cancelled before starting
    TERMINATED = "terminated"  # Call ended by ARIA for safety


class CircleCallSeverity(str, Enum):
    """Severity levels for ARIA child safety flags."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    SEVERE = "severe"


class InitiatorType(str, Enum):
    """Who initiated the call."""

    CIRCLE_CONTACT = "circle_contact"
    CHILD = "child"


class CircleCallRoom(Base, UUIDMixin, TimestampMixin):
    """
    Permanent Daily.co room for circle contact-child communication.

    Each (circle_contact, child) relationship has ONE permanent room.
    Room is created when CirclePermission grants video/voice access.
    """

    __tablename__ = "circle_call_rooms"

    # Foreign keys
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )
    circle_contact_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("circle_contacts.id", ondelete="CASCADE"), index=True
    )

    # Daily.co permanent room
    daily_room_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    daily_room_url: Mapped[str] = mapped_column(String(500))

    # Settings (always enabled for child safety)
    recording_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    aria_monitoring_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_duration_minutes: Mapped[int] = mapped_column(Integer, default=60)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship("FamilyFile", back_populates="circle_call_rooms")
    child: Mapped["Child"] = relationship("Child", back_populates="circle_call_rooms")
    circle_contact: Mapped["CircleContact"] = relationship(
        "CircleContact", back_populates="circle_call_rooms"
    )
    sessions: Mapped[list["CircleCallSession"]] = relationship(
        "CircleCallSession", back_populates="room", cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index(
            "ix_circle_call_rooms_contact_child",
            "circle_contact_id",
            "child_id",
            unique=True,
        ),
        Index("ix_circle_call_rooms_family", "family_file_id"),
    )

    def __repr__(self) -> str:
        return f"<CircleCallRoom {self.daily_room_name} (contact {self.circle_contact_id[:8]} → child {self.child_id[:8]})>"

    def update_last_used(self) -> None:
        """Update last used timestamp and increment session count."""
        self.last_used_at = datetime.utcnow()
        self.total_sessions += 1


class CircleCallSession(Base, UUIDMixin, TimestampMixin):
    """
    Individual call session between circle contact and child.

    Bidirectional - can be initiated by either circle contact or child.
    All calls are recorded and monitored for child safety.
    """

    __tablename__ = "circle_call_sessions"

    # Foreign keys
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("circle_call_rooms.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )
    circle_contact_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("circle_contacts.id", ondelete="CASCADE"), index=True
    )

    # Session metadata
    call_type: Mapped[str] = mapped_column(
        String(20), default=CircleCallType.VIDEO.value
    )  # video, audio
    status: Mapped[str] = mapped_column(
        String(20), default=CircleCallStatus.RINGING.value, index=True
    )

    # Bidirectional initiation
    initiated_by_id: Mapped[str] = mapped_column(String(36), index=True)  # circle_contact_id or child_id
    initiated_by_type: Mapped[str] = mapped_column(
        String(20)
    )  # circle_contact, child

    # Daily.co room reference (permanent room)
    daily_room_name: Mapped[str] = mapped_column(String(100), index=True)
    daily_room_url: Mapped[str] = mapped_column(String(500))

    # Meeting tokens (regenerated per session for security)
    circle_contact_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    child_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timing
    initiated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    joined_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # When recipient joined
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # When call actually started
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Recording & transcription (always enabled for child safety)
    recording_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recording_storage_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )  # Supabase path
    transcript_storage_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # ARIA child safety monitoring (always active)
    aria_active: Mapped[bool] = mapped_column(Boolean, default=True)
    aria_intervention_count: Mapped[int] = mapped_column(Integer, default=0)
    aria_terminated_call: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_termination_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ARIA threshold (stricter for child safety: 0.3 vs 0.5 for parent calls)
    aria_threshold: Mapped[float] = mapped_column(Float, default=0.3)

    # Permission snapshot (audit trail - what permissions were at call time)
    permission_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Overall ARIA metrics (calculated post-call)
    overall_safety_score: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )  # 0.0-1.0

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", back_populates="circle_call_sessions"
    )
    room: Mapped["CircleCallRoom"] = relationship("CircleCallRoom", back_populates="sessions")
    child: Mapped["Child"] = relationship("Child", back_populates="circle_call_sessions")
    circle_contact: Mapped["CircleContact"] = relationship(
        "CircleContact", back_populates="circle_call_sessions"
    )
    transcript_chunks: Mapped[list["CircleCallTranscriptChunk"]] = relationship(
        "CircleCallTranscriptChunk", back_populates="session", cascade="all, delete-orphan"
    )
    flags: Mapped[list["CircleCallFlag"]] = relationship(
        "CircleCallFlag", back_populates="session", cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index("ix_circle_call_sessions_family_status", "family_file_id", "status"),
        Index("ix_circle_call_sessions_child_date", "child_id", "initiated_at"),
        Index("ix_circle_call_sessions_contact_date", "circle_contact_id", "initiated_at"),
    )

    def __repr__(self) -> str:
        return f"<CircleCallSession {self.id} ({self.call_type}) - {self.status}>"

    def start(self) -> None:
        """Mark call as started (recipient joined)."""
        self.status = CircleCallStatus.ACTIVE.value
        self.started_at = datetime.utcnow()

    def end(self, terminated_by_aria: bool = False, reason: Optional[str] = None) -> None:
        """
        Mark call as ended and calculate duration.

        Args:
            terminated_by_aria: Whether ARIA terminated the call for safety
            reason: Termination reason if ARIA terminated
        """
        if terminated_by_aria:
            self.status = CircleCallStatus.TERMINATED.value
            self.aria_terminated_call = True
            self.aria_termination_reason = reason
        else:
            self.status = CircleCallStatus.COMPLETED.value

        self.ended_at = datetime.utcnow()
        if self.started_at:
            self.duration_seconds = int((self.ended_at - self.started_at).total_seconds())

    def mark_missed(self) -> None:
        """Mark call as missed (not answered)."""
        self.status = CircleCallStatus.MISSED.value
        self.ended_at = datetime.utcnow()

    def increment_aria_intervention(self) -> None:
        """Increment ARIA intervention counter."""
        self.aria_intervention_count += 1


class CircleCallTranscriptChunk(Base, UUIDMixin):
    """
    Real-time transcription chunk from Daily.co.

    Each chunk represents a segment of speech from circle contact or child.
    Analyzed by ARIA in real-time for child safety violations.
    """

    __tablename__ = "circle_call_transcript_chunks"

    # Foreign key
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("circle_call_sessions.id", ondelete="CASCADE"), index=True
    )

    # Speaker (circle_contact_id or child_id)
    speaker_id: Mapped[str] = mapped_column(String(36), index=True)
    speaker_name: Mapped[str] = mapped_column(String(100))
    speaker_type: Mapped[str] = mapped_column(String(20))  # circle_contact, child

    # Transcript
    content: Mapped[str] = mapped_column(Text)  # Spoken text
    confidence: Mapped[float] = mapped_column(Float)  # 0.0-1.0 from transcription service

    # Timing
    start_time: Mapped[float] = mapped_column(Float)  # Seconds from call start
    end_time: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # ARIA child safety analysis
    analyzed: Mapped[bool] = mapped_column(Boolean, default=False)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    toxicity_score: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )  # 0.0-1.0

    # Relationships
    session: Mapped["CircleCallSession"] = relationship(
        "CircleCallSession", back_populates="transcript_chunks"
    )

    # Indexes
    __table_args__ = (
        Index("ix_circle_call_transcript_chunks_session_time", "session_id", "start_time"),
        Index("ix_circle_call_transcript_chunks_flagged", "session_id", "flagged"),
    )

    def __repr__(self) -> str:
        return f"<CircleCallTranscriptChunk {self.id} (speaker: {self.speaker_name})>"


class CircleCallFlag(Base, UUIDMixin, TimestampMixin):
    """
    ARIA child safety flag on a circle call.

    Created for real-time safety violations or post-call analysis.
    Focuses on child protection: inappropriate content, stranger danger,
    grooming, bullying.
    """

    __tablename__ = "circle_call_flags"

    # Foreign keys
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("circle_call_sessions.id", ondelete="CASCADE"), index=True
    )
    transcript_chunk_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("circle_call_transcript_chunks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ARIA child safety analysis
    flag_type: Mapped[str] = mapped_column(
        String(20), index=True
    )  # real_time, post_call
    toxicity_score: Mapped[float] = mapped_column(Float)  # 0.0-1.0
    severity: Mapped[str] = mapped_column(
        String(20), index=True
    )  # low, medium, high, severe

    # Child safety categories
    categories: Mapped[list] = mapped_column(
        JSON
    )  # ["inappropriate_content", "stranger_danger", "grooming", "bullying"]
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
    )  # Message shown to participants/parents

    # Timing
    flagged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    call_time_seconds: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )  # Time in call when flagged

    # Speaker tracking (circle_contact_id or child_id)
    offending_speaker_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )
    offending_speaker_type: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # circle_contact, child

    # Relationships
    session: Mapped["CircleCallSession"] = relationship(
        "CircleCallSession", back_populates="flags"
    )
    transcript_chunk: Mapped[Optional["CircleCallTranscriptChunk"]] = relationship(
        "CircleCallTranscriptChunk"
    )

    # Indexes
    __table_args__ = (
        Index("ix_circle_call_flags_session_severity", "session_id", "severity"),
        Index("ix_circle_call_flags_type_flagged_at", "flag_type", "flagged_at"),
    )

    def __repr__(self) -> str:
        return f"<CircleCallFlag {self.severity} on session {self.session_id}>"

    @property
    def is_severe(self) -> bool:
        """Check if flag is severe (requires immediate termination)."""
        return self.severity == CircleCallSeverity.SEVERE.value

    @property
    def is_high_or_severe(self) -> bool:
        """Check if flag is high or severe (urgent parent notification)."""
        return self.severity in [
            CircleCallSeverity.HIGH.value,
            CircleCallSeverity.SEVERE.value,
        ]
