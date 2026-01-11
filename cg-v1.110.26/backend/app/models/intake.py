"""
ARIA Paralegal - Legal Intake Models.

Enables attorneys and mediators to gather information from parents
through conversational AI, translating plain English responses into
California court form fields (FL-300, FL-311, FL-320).
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


# =============================================================================
# Enums
# =============================================================================

class IntakeStatus(str, Enum):
    """Status of an intake session."""
    PENDING = "pending"              # Link sent, parent hasn't started
    IN_PROGRESS = "in_progress"      # Parent is actively conversing
    COMPLETED = "completed"          # Parent confirmed, ready for review
    EXPIRED = "expired"              # Link expired before completion
    CANCELLED = "cancelled"          # Professional cancelled


class IntakeFormType(str, Enum):
    """Target court forms for intake."""
    FL_300 = "FL-300"    # Request for Order
    FL_311 = "FL-311"    # Child Custody and Visitation Application
    FL_320 = "FL-320"    # Responsive Declaration


class IntakeQuestionCategory(str, Enum):
    """Categories for custom intake questions."""
    CUSTODY = "custody"
    SCHEDULE = "schedule"
    SAFETY = "safety"
    FINANCIAL = "financial"
    COMMUNICATION = "communication"
    OTHER = "other"


class IntakeQuestionType(str, Enum):
    """Expected response types for questions."""
    TEXT = "text"
    YES_NO = "yes_no"
    DATE = "date"
    NUMBER = "number"
    MULTIPLE_CHOICE = "multiple_choice"


# =============================================================================
# Helper Functions
# =============================================================================

def generate_session_number() -> str:
    """Generate unique intake session number (INT-XXXXXX)."""
    import random
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    suffix = "".join(random.choices(chars, k=6))
    return f"INT-{suffix}"


def generate_access_token() -> str:
    """Generate secure 256-bit access token."""
    return secrets.token_urlsafe(32)


# =============================================================================
# Models
# =============================================================================

class IntakeSession(Base, UUIDMixin, TimestampMixin):
    """
    A legal intake session initiated by a professional.

    Tracks the conversational intake from link generation through
    parent confirmation, storing messages, extracted data, and outputs.
    """

    __tablename__ = "intake_sessions"

    # Identity
    session_number: Mapped[str] = mapped_column(
        String(20), unique=True, default=generate_session_number
    )

    # Links
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True
    )
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), nullable=True, index=True
    )
    professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("court_professionals.id"), index=True
    )
    parent_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )

    # Access
    access_token: Mapped[str] = mapped_column(
        String(64), unique=True, default=generate_access_token
    )
    access_link_expires_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.utcnow() + timedelta(days=7)
    )
    access_link_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Form targets
    target_forms: Mapped[list] = mapped_column(
        JSON, default=list
    )  # ["FL-300", "FL-311"]

    custom_questions: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True
    )  # Custom questions from professional

    # Status tracking
    status: Mapped[str] = mapped_column(
        String(30), default=IntakeStatus.PENDING.value
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Conversation
    messages: Mapped[list] = mapped_column(
        JSON, default=list
    )  # Full conversation history
    aria_provider: Mapped[str] = mapped_column(
        String(20), default="claude"
    )  # claude | openai
    message_count: Mapped[int] = mapped_column(
        Integer, default=0
    )

    # Outputs - Extracted data
    extracted_data: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Structured form field data

    # Outputs - ARIA Summary
    aria_summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # Plain English summary

    # Outputs - Draft form
    draft_form_url: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # URL to generated draft PDF
    draft_form_generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Parent confirmation
    parent_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    parent_edits: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True
    )  # Any corrections parent made

    # Professional review
    professional_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    professional_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    professional_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Clarification flow
    clarification_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    clarification_request: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # What professional wants clarified
    clarification_response: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # Parent's response

    # Audit
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return f"<IntakeSession {self.session_number} ({self.status})>"

    @property
    def is_expired(self) -> bool:
        """Check if the access link has expired."""
        return datetime.utcnow() > self.access_link_expires_at

    @property
    def is_accessible(self) -> bool:
        """Check if parent can access this intake."""
        return (
            self.status in [IntakeStatus.PENDING.value, IntakeStatus.IN_PROGRESS.value]
            and not self.is_expired
        )

    @property
    def intake_link(self) -> str:
        """Generate the full intake URL."""
        from app.core.config import settings
        return f"{settings.FRONTEND_URL}/intake/{self.access_token}"


class IntakeQuestion(Base, UUIDMixin, TimestampMixin):
    """
    Custom intake questions created by professionals.

    Professionals can save questions as templates for reuse across cases,
    or add case-specific questions.
    """

    __tablename__ = "intake_questions"

    # Owner
    professional_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("court_professionals.id"), index=True
    )

    # Question content
    question_text: Mapped[str] = mapped_column(Text)
    question_category: Mapped[str] = mapped_column(
        String(30), default=IntakeQuestionCategory.OTHER.value
    )
    expected_response_type: Mapped[str] = mapped_column(
        String(30), default=IntakeQuestionType.TEXT.value
    )

    # For multiple choice
    choices: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Flags
    is_template: Mapped[bool] = mapped_column(Boolean, default=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Usage tracking
    use_count: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<IntakeQuestion {self.id[:8]} ({self.question_category})>"


class IntakeExtraction(Base, UUIDMixin, TimestampMixin):
    """
    Tracks extraction attempts and results.

    Stores individual extraction runs so we can retry or improve
    without losing previous attempts.
    """

    __tablename__ = "intake_extractions"

    # Links
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("intake_sessions.id"), index=True
    )

    # Extraction details
    target_form: Mapped[str] = mapped_column(String(20))  # FL-300, FL-311, etc.
    extraction_version: Mapped[int] = mapped_column(Integer, default=1)
    extracted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Results
    raw_extraction: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    validated_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Errors
    extraction_errors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    missing_fields: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # AI details
    ai_provider: Mapped[str] = mapped_column(String(20), default="claude")
    model_used: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<IntakeExtraction {self.target_form} v{self.extraction_version}>"
