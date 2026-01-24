"""
Recording models for video call recordings and transcriptions.

Supports both KidComs sessions and parent-to-parent calls.
Integrates with Daily.co cloud recording and AWS S3 storage.
"""

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
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
    from app.models.kidcoms import KidComsSession
    from app.models.parent_call import ParentCallSession


class RecordingStatus(str, Enum):
    """Status of a recording."""

    PENDING = "pending"  # Recording requested, not yet started
    RECORDING = "recording"  # Currently recording
    PROCESSING = "processing"  # Recording complete, being processed
    COMPLETED = "completed"  # Recording available
    FAILED = "failed"  # Recording failed
    DELETED = "deleted"  # Recording deleted


class RecordingType(str, Enum):
    """Type of recording."""

    KIDCOMS = "kidcoms"  # Child communication session
    PARENT_CALL = "parent_call"  # Parent-to-parent call


class TranscriptionStatus(str, Enum):
    """Status of transcription processing."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Recording(Base, UUIDMixin, TimestampMixin):
    """
    Recording - Video/audio recording from a call session.

    Stores metadata and S3 location for recordings from both
    KidComs sessions and parent-to-parent calls.
    """

    __tablename__ = "recordings"

    # Links to session (one of these will be set)
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    kidcoms_session_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("kidcoms_sessions.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    parent_call_session_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("parent_call_sessions.id", ondelete="SET NULL"),
        nullable=True, index=True
    )

    # Recording type
    recording_type: Mapped[str] = mapped_column(
        String(20), default=RecordingType.KIDCOMS.value
    )

    # Daily.co recording info
    daily_recording_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, nullable=True, index=True
    )
    daily_room_name: Mapped[str] = mapped_column(String(100), index=True)

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default=RecordingStatus.PENDING.value, index=True
    )

    # Recording metadata
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    format: Mapped[str] = mapped_column(String(20), default="mp4")

    # S3 storage
    s3_bucket: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    s3_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    s3_region: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Access URLs (generated on demand, short-lived)
    download_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    download_url_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Error info
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Retention
    retain_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_protected: Mapped[bool] = mapped_column(Boolean, default=False)  # Legal hold

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", back_populates="recordings"
    )
    kidcoms_session: Mapped[Optional["KidComsSession"]] = relationship(
        "KidComsSession", back_populates="recording"
    )
    parent_call_session: Mapped[Optional["ParentCallSession"]] = relationship(
        "ParentCallSession", back_populates="recording"
    )
    transcription: Mapped[Optional["Transcription"]] = relationship(
        "Transcription", back_populates="recording", uselist=False
    )

    # Indexes
    __table_args__ = (
        Index("ix_recordings_family_status", "family_file_id", "status"),
        Index("ix_recordings_family_date", "family_file_id", "started_at"),
    )

    def __repr__(self) -> str:
        return f"<Recording {self.id} ({self.recording_type}) - {self.status}>"

    @property
    def s3_path(self) -> Optional[str]:
        """Get full S3 path."""
        if self.s3_bucket and self.s3_key:
            return f"s3://{self.s3_bucket}/{self.s3_key}"
        return None

    @property
    def is_available(self) -> bool:
        """Check if recording is available for playback."""
        return self.status == RecordingStatus.COMPLETED.value

    def mark_recording(self) -> None:
        """Mark recording as started."""
        self.status = RecordingStatus.RECORDING.value
        self.started_at = datetime.utcnow()

    def mark_processing(self) -> None:
        """Mark recording as processing."""
        self.status = RecordingStatus.PROCESSING.value
        self.ended_at = datetime.utcnow()

    def mark_completed(
        self,
        s3_bucket: str,
        s3_key: str,
        s3_region: str,
        duration_seconds: Optional[int] = None,
        file_size_bytes: Optional[int] = None
    ) -> None:
        """Mark recording as completed with S3 location."""
        self.status = RecordingStatus.COMPLETED.value
        self.s3_bucket = s3_bucket
        self.s3_key = s3_key
        self.s3_region = s3_region
        self.duration_seconds = duration_seconds
        self.file_size_bytes = file_size_bytes
        self.processed_at = datetime.utcnow()

    def mark_failed(self, error_message: str) -> None:
        """Mark recording as failed."""
        self.status = RecordingStatus.FAILED.value
        self.error_message = error_message


class Transcription(Base, UUIDMixin, TimestampMixin):
    """
    Transcription - Text transcription of a recording.

    Contains speaker-diarized transcript with timestamps.
    """

    __tablename__ = "transcriptions"

    # Link to recording
    recording_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("recordings.id", ondelete="CASCADE"),
        unique=True, index=True
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default=TranscriptionStatus.PENDING.value
    )

    # Transcription metadata
    language: Mapped[str] = mapped_column(String(10), default="en")
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    speaker_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Storage
    s3_bucket: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    s3_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Full text (for quick access and search)
    full_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Error info
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    recording: Mapped["Recording"] = relationship(
        "Recording", back_populates="transcription"
    )
    chunks: Mapped[List["TranscriptionChunk"]] = relationship(
        "TranscriptionChunk", back_populates="transcription",
        cascade="all, delete-orphan", order_by="TranscriptionChunk.start_time"
    )

    def __repr__(self) -> str:
        return f"<Transcription for recording {self.recording_id} - {self.status}>"


class TranscriptionChunk(Base, UUIDMixin):
    """
    TranscriptionChunk - A segment of transcription with speaker info.

    Real-time chunks from Daily.co's Deepgram integration.
    """

    __tablename__ = "transcription_chunks"

    # Link to transcription
    transcription_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("transcriptions.id", ondelete="CASCADE"), index=True
    )

    # Speaker info
    speaker_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    speaker_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    speaker_label: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # e.g., "Speaker 1"

    # Content
    content: Mapped[str] = mapped_column(Text)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Timing
    start_time: Mapped[float] = mapped_column(Float)  # Seconds from recording start
    end_time: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # ARIA analysis (for real-time monitoring)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    toxicity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    transcription: Mapped["Transcription"] = relationship(
        "Transcription", back_populates="chunks"
    )

    # Indexes
    __table_args__ = (
        Index("ix_transcription_chunks_time", "transcription_id", "start_time"),
        Index("ix_transcription_chunks_flagged", "transcription_id", "is_flagged"),
    )

    def __repr__(self) -> str:
        speaker = self.speaker_name or self.speaker_label or "Unknown"
        return f"<TranscriptionChunk {speaker}: {self.content[:50]}...>"
