"""
Message attachment models - file attachments for parent-to-parent communication.

All attachments are immutable once uploaded and stored for court documentation.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.family_file import FamilyFile


class MessageAttachment(Base, UUIDMixin, TimestampMixin):
    """
    File attachment for a message.

    Supports images, documents, audio, and video files.
    All attachments are immutable and stored permanently for court records.
    """

    __tablename__ = "message_attachments"

    # Links
    message_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("messages.id"), index=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # File metadata
    file_name: Mapped[str] = mapped_column(String(255))  # Original filename
    file_type: Mapped[str] = mapped_column(String(100))  # MIME type (e.g., image/jpeg)
    file_size: Mapped[int] = mapped_column(Integer)  # Size in bytes
    file_category: Mapped[str] = mapped_column(
        String(50)
    )  # image, document, audio, video

    # Storage (Supabase)
    storage_path: Mapped[str] = mapped_column(String(500))  # Bucket path
    storage_url: Mapped[str] = mapped_column(Text)  # Signed URL (1-year expiration)

    # Security
    sha256_hash: Mapped[str] = mapped_column(
        String(64)
    )  # File hash for court integrity verification
    virus_scanned: Mapped[bool] = mapped_column(Boolean, default=False)
    scan_result: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # clean, infected, error

    # Audit
    uploaded_by: Mapped[str] = mapped_column(String(36), index=True)  # User ID
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    message: Mapped["Message"] = relationship("Message", back_populates="attachments")
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", back_populates="message_attachments"
    )

    def __repr__(self) -> str:
        return f"<MessageAttachment {self.file_name} ({self.file_size} bytes)>"

    @property
    def is_image(self) -> bool:
        """Check if attachment is an image."""
        return self.file_category == "image"

    @property
    def is_document(self) -> bool:
        """Check if attachment is a document."""
        return self.file_category == "document"

    @property
    def is_audio(self) -> bool:
        """Check if attachment is audio."""
        return self.file_category == "audio"

    @property
    def is_video(self) -> bool:
        """Check if attachment is video."""
        return self.file_category == "video"

    @property
    def size_mb(self) -> float:
        """Get file size in megabytes."""
        return round(self.file_size / (1024 * 1024), 2)
