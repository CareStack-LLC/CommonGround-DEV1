"""
ARIA Video Frame Analysis and Call Violation Tracking models.

VideoFrameAnalysis: Stores each analyzed video frame with Claude Vision results.
CallViolationTracker: Per-participant cumulative violation tracker with 3-strike system.
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
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.parent_call import ParentCallSession
    from app.models.circle_call import CircleCallSession
    from app.models.user import User


class VideoViolationType(str, Enum):
    """Types of video frame violations detected by ARIA Vision."""

    NUDITY = "nudity"
    HATE_SYMBOL = "hate_symbol"
    VIOLENCE = "violence"
    GESTURE = "gesture"
    UNSAFE_ENVIRONMENT = "unsafe_environment"


class VideoFrameAnalysis(Base, UUIDMixin, TimestampMixin):
    """
    Stores analysis results for individual video frames captured during calls.

    Frames are captured client-side at configurable intervals and sent to
    the backend for Claude Vision analysis. Only flagged frames are stored
    in Supabase Storage for court evidence.
    """

    __tablename__ = "video_frame_analyses"

    # Session reference (one of these will be set)
    session_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("parent_call_sessions.id", ondelete="CASCADE"),
        nullable=True, index=True
    )
    circle_session_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("circle_call_sessions.id", ondelete="CASCADE"),
        nullable=True, index=True
    )

    # Participant who was in the frame
    participant_id: Mapped[str] = mapped_column(
        String(36), index=True
    )

    # Frame metadata
    frame_number: Mapped[int] = mapped_column(Integer)
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    call_time_seconds: Mapped[float] = mapped_column(Float)
    frame_hash: Mapped[str] = mapped_column(String(64))  # SHA-256 of raw frame
    resolution: Mapped[str] = mapped_column(String(20), default="640x480")

    # Storage (only for flagged frames - Supabase Storage bucket)
    frame_storage_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Analysis
    analysis_model: Mapped[str] = mapped_column(
        String(50), default="claude-sonnet-4-5-20250514"
    )
    analysis_result: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Violation details
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    violation_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # nudity, hate_symbol, violence, gesture, unsafe_environment
    violation_score: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )  # 0.0-1.0
    violation_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Intervention
    intervention_taken: Mapped[bool] = mapped_column(Boolean, default=False)
    intervention_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # warning, video_mute, terminate

    # Performance
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    parent_session: Mapped[Optional["ParentCallSession"]] = relationship(
        "ParentCallSession", foreign_keys=[session_id]
    )
    circle_session: Mapped[Optional["CircleCallSession"]] = relationship(
        "CircleCallSession", foreign_keys=[circle_session_id]
    )

    # Indexes
    __table_args__ = (
        Index("ix_video_frame_session_time", "session_id", "captured_at"),
        Index("ix_video_frame_circle_session_time", "circle_session_id", "captured_at"),
        Index("ix_video_frame_flagged", "is_flagged", "captured_at"),
        Index("ix_video_frame_participant", "participant_id", "captured_at"),
    )

    def __repr__(self) -> str:
        flagged = " FLAGGED" if self.is_flagged else ""
        return f"<VideoFrameAnalysis frame#{self.frame_number}{flagged}>"


class CallViolationTracker(Base, UUIDMixin, TimestampMixin):
    """
    Per-participant cumulative violation tracker for the 3-strike system.

    Tracks audio and video violations separately and combined.
    Manages the acknowledgment-gated mute flow.

    Strike logic:
    - Strike 1: Warning + mute until acknowledged
    - Strike 2: Warning + mute until acknowledged + escalate severity
    - Strike 3: Immediate call termination
    - Severe violations (hate speech, threats, nudity): Immediate termination
    """

    __tablename__ = "call_violation_trackers"

    # Session reference (one of these will be set)
    session_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("parent_call_sessions.id", ondelete="CASCADE"),
        nullable=True, index=True
    )
    circle_session_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("circle_call_sessions.id", ondelete="CASCADE"),
        nullable=True, index=True
    )

    # Participant being tracked
    participant_id: Mapped[str] = mapped_column(
        String(36), index=True
    )

    # Violation counts
    audio_violation_count: Mapped[int] = mapped_column(Integer, default=0)
    video_violation_count: Mapped[int] = mapped_column(Integer, default=0)
    total_violation_count: Mapped[int] = mapped_column(Integer, default=0)

    # Intervention counts
    audio_warning_count: Mapped[int] = mapped_column(Integer, default=0)
    audio_mute_count: Mapped[int] = mapped_column(Integer, default=0)
    video_warning_count: Mapped[int] = mapped_column(Integer, default=0)
    video_mute_count: Mapped[int] = mapped_column(Integer, default=0)

    # Severity tracking
    has_severe_violation: Mapped[bool] = mapped_column(Boolean, default=False)
    is_terminated: Mapped[bool] = mapped_column(Boolean, default=False)
    termination_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Acknowledgment state
    last_violation_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    last_acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    pending_acknowledgment_flag_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )

    # Relationships
    parent_session: Mapped[Optional["ParentCallSession"]] = relationship(
        "ParentCallSession", foreign_keys=[session_id]
    )
    circle_session: Mapped[Optional["CircleCallSession"]] = relationship(
        "CircleCallSession", foreign_keys=[circle_session_id]
    )

    # Indexes and constraints
    __table_args__ = (
        UniqueConstraint("session_id", "participant_id", name="uq_tracker_session_participant"),
        UniqueConstraint("circle_session_id", "participant_id", name="uq_tracker_circle_session_participant"),
        Index("ix_tracker_session_participant", "session_id", "participant_id"),
        Index("ix_tracker_circle_session_participant", "circle_session_id", "participant_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<CallViolationTracker participant={self.participant_id[:8]}... "
            f"violations={self.total_violation_count}>"
        )

    @property
    def strike_count(self) -> int:
        """Current strike count (same as total_violation_count)."""
        return self.total_violation_count

    @property
    def has_pending_acknowledgment(self) -> bool:
        """Check if participant has an unacknowledged violation."""
        return self.pending_acknowledgment_flag_id is not None
