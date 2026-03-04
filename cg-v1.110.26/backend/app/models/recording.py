"""
Recording models for video call recordings and transcriptions.

Supports both KidComs sessions and parent-to-parent calls.
Integrates with Daily.co cloud recording and Supabase Storage.
Includes court-admissible audit logging and chain of custody.
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


class RecordingAccessAction(str, Enum):
    """Types of access actions for recording audit trail."""

    VIEW_METADATA = "view_metadata"  # Viewed recording details
    GENERATE_URL = "generate_url"  # Generated download URL
    DOWNLOAD = "download"  # Downloaded recording file
    STREAM = "stream"  # Streamed recording
    EXPORT = "export"  # Exported in court package
    SHARE = "share"  # Shared with professional
    TRANSCRIPTION_VIEW = "transcription_view"  # Viewed transcription
    TRANSCRIPTION_EXPORT = "transcription_export"  # Exported transcription
    LEGAL_HOLD_SET = "legal_hold_set"  # Placed legal hold
    LEGAL_HOLD_RELEASE = "legal_hold_release"  # Released legal hold
    VERIFY_INTEGRITY = "verify_integrity"  # Verified file integrity


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

    # Integrity verification (court-admissible evidence)
    file_hash: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, index=True
    )  # SHA-256 hash of recording file
    file_hash_algorithm: Mapped[str] = mapped_column(String(20), default="sha256")
    integrity_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    integrity_status: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # verified, failed, pending

    # Retention and legal hold
    retain_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_protected: Mapped[bool] = mapped_column(Boolean, default=False)  # Legal hold
    legal_hold_set_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    legal_hold_set_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    legal_hold_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    legal_hold_case_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

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
        file_size_bytes: Optional[int] = None,
        file_hash: Optional[str] = None
    ) -> None:
        """Mark recording as completed with storage location and integrity hash."""
        self.status = RecordingStatus.COMPLETED.value
        self.s3_bucket = s3_bucket
        self.s3_key = s3_key
        self.s3_region = s3_region
        self.duration_seconds = duration_seconds
        self.file_size_bytes = file_size_bytes
        self.processed_at = datetime.utcnow()
        if file_hash:
            self.file_hash = file_hash
            self.integrity_verified_at = datetime.utcnow()
            self.integrity_status = "verified"

    def set_legal_hold(
        self,
        user_id: str,
        reason: str,
        case_number: Optional[str] = None,
        retain_years: int = 10
    ) -> None:
        """Place recording under legal hold - cannot be deleted."""
        from datetime import timedelta
        self.is_protected = True
        self.legal_hold_set_by = user_id
        self.legal_hold_set_at = datetime.utcnow()
        self.legal_hold_reason = reason
        self.legal_hold_case_number = case_number
        self.retain_until = datetime.utcnow() + timedelta(days=retain_years * 365)

    def release_legal_hold(self) -> None:
        """Release legal hold on recording."""
        self.is_protected = False
        # Note: We don't clear the audit fields to maintain history

    def verify_integrity(self, computed_hash: str) -> bool:
        """Verify file integrity against stored hash."""
        if not self.file_hash:
            return False
        is_valid = self.file_hash == computed_hash
        self.integrity_verified_at = datetime.utcnow()
        self.integrity_status = "verified" if is_valid else "failed"
        return is_valid

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


class RecordingAccessLog(Base, UUIDMixin):
    """
    RecordingAccessLog - Immutable audit trail for recording access.

    Tracks every access to recordings for court-admissible chain of custody.
    This log is append-only and cannot be modified after creation.
    """

    __tablename__ = "recording_access_logs"

    # Recording reference
    recording_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("recordings.id", ondelete="CASCADE"), index=True
    )
    family_file_id: Mapped[str] = mapped_column(String(36), index=True)

    # Who accessed
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    user_role: Mapped[str] = mapped_column(String(50))  # parent, professional, court
    professional_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # What action was taken
    action: Mapped[str] = mapped_column(String(50), index=True)  # RecordingAccessAction
    action_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # When and from where
    accessed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Request context
    request_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Result
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Integrity verification at time of access
    file_hash_at_access: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    integrity_verified: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Chain of custody linking
    content_hash: Mapped[str] = mapped_column(String(64), index=True)  # SHA-256 of log entry
    previous_log_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    sequence_number: Mapped[int] = mapped_column(Integer, index=True)  # Order for this recording

    # Export/legal context
    export_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    case_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    court_order_reference: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Relationships
    recording: Mapped["Recording"] = relationship("Recording", backref="access_logs")

    # Indexes for audit queries
    __table_args__ = (
        Index("ix_recording_access_user_date", "user_id", "accessed_at"),
        Index("ix_recording_access_recording_date", "recording_id", "accessed_at"),
        Index("ix_recording_access_family_date", "family_file_id", "accessed_at"),
        Index("ix_recording_access_action", "action", "accessed_at"),
    )

    def __repr__(self) -> str:
        return f"<RecordingAccessLog {self.action} by {self.user_id} at {self.accessed_at}>"

    @classmethod
    def compute_content_hash(cls, log_data: dict) -> str:
        """Compute SHA-256 hash of log entry for chain integrity."""
        import hashlib
        import json
        # Sort keys for consistent hashing
        content = json.dumps(log_data, sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()


class RecordingExportLog(Base, UUIDMixin, TimestampMixin):
    """
    RecordingExportLog - Tracks when recordings are exported for legal purposes.

    Maintains chain of custody for court-admissible evidence packages.
    """

    __tablename__ = "recording_export_logs"

    # Recording reference
    recording_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("recordings.id", ondelete="CASCADE"), index=True
    )

    # Export context
    export_id: Mapped[str] = mapped_column(String(36), index=True)  # Reference to CaseExport
    export_type: Mapped[str] = mapped_column(String(50))  # court_package, investigation, discovery

    # Who requested
    requested_by_user_id: Mapped[str] = mapped_column(String(36), index=True)
    requested_by_role: Mapped[str] = mapped_column(String(50))  # parent, attorney, court
    professional_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Legal context
    case_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    court_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    court_order_reference: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    discovery_request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Exported file details
    exported_format: Mapped[str] = mapped_column(String(20), default="mp4")
    exported_file_hash: Mapped[str] = mapped_column(String(64))  # SHA-256 of exported file
    exported_file_size: Mapped[int] = mapped_column(Integer)
    includes_transcription: Mapped[bool] = mapped_column(Boolean, default=False)
    transcription_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Timing
    exported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    export_started_at: Mapped[datetime] = mapped_column(DateTime)
    export_completed_at: Mapped[datetime] = mapped_column(DateTime)

    # Chain of custody certificate
    certificate_number: Mapped[str] = mapped_column(String(50), unique=True)
    certificate_hash: Mapped[str] = mapped_column(String(64))  # Hash of certificate content

    # Request metadata
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Relationships
    recording: Mapped["Recording"] = relationship("Recording", backref="export_logs")

    # Indexes
    __table_args__ = (
        Index("ix_export_log_export_id", "export_id"),
        Index("ix_export_log_case", "case_number"),
        Index("ix_export_log_certificate", "certificate_number"),
    )

    def __repr__(self) -> str:
        return f"<RecordingExportLog {self.certificate_number} for recording {self.recording_id}>"
