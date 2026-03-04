"""
Case models - the container for all co-parenting data between two parents.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Case(Base, UUIDMixin, TimestampMixin):
    """
    Case - The central entity containing all co-parenting data.

    A Case represents the relationship between two parents regarding their children.
    """

    __tablename__ = "cases"

    # Case identification
    case_number: Mapped[Optional[str]] = mapped_column(
        String(50), unique=True, index=True, nullable=True
    )  # Court case number if applicable
    case_name: Mapped[str] = mapped_column(String(200))  # e.g., "Williams v. Williams"

    # Jurisdiction
    state: Mapped[str] = mapped_column(String(2))  # US state code
    county: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    court: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="active"
    )  # active, suspended, closed
    status_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Important dates
    separation_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    filing_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    judgment_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Court Form Workflow Status (extended case activation tracking)
    activation_status: Mapped[str] = mapped_column(
        String(50), default="pending"
    )  # pending, fl300_required, fl300_submitted, fl300_approved, etc.
    forms_workflow_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    forms_workflow_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    assigned_court_professional_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )  # Court professional managing this case

    # Settings
    require_joint_approval: Mapped[bool] = mapped_column(
        Boolean, default=True
    )  # For major changes
    allow_modifications: Mapped[bool] = mapped_column(
        Boolean, default=True
    )  # Can agreement be modified

    # Link to Family File (optional - for migration)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), nullable=True
    )

    # ARIA Settings (Court Documentation Protection)
    aria_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True
    )  # ARIA analysis enabled by default (court protection)
    aria_provider: Mapped[str] = mapped_column(
        String(20), default="claude"
    )  # AI provider: claude, openai, or regex
    aria_disabled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # When ARIA was disabled (tracked for court)
    aria_disabled_by: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )  # Which parent disabled it (user_id)

    # Relationships
    participants: Mapped[list["CaseParticipant"]] = relationship(
        "CaseParticipant", back_populates="case", cascade="all, delete-orphan"
    )
    children: Mapped[list["Child"]] = relationship(
        "Child", back_populates="case", cascade="all, delete-orphan"
    )
    agreements: Mapped[list["Agreement"]] = relationship(
        "Agreement", back_populates="case", cascade="all, delete-orphan"
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="case", cascade="all, delete-orphan"
    )
    schedule_events: Mapped[list["ScheduleEvent"]] = relationship(
        "ScheduleEvent", back_populates="case", cascade="all, delete-orphan"
    )
    my_time_collections: Mapped[list["MyTimeCollection"]] = relationship(
        "MyTimeCollection", back_populates="case", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="case", cascade="all, delete-orphan"
    )
    custody_exchanges: Mapped[list["CustodyExchange"]] = relationship(
        "CustodyExchange", back_populates="case", cascade="all, delete-orphan"
    )
    obligations: Mapped[list["Obligation"]] = relationship(
        "Obligation", back_populates="case", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Case {self.case_name}>"


class CaseParticipant(Base, UUIDMixin, TimestampMixin):
    """
    Participant in a case (parent).

    Links users to cases with their role.
    """

    __tablename__ = "case_participants"

    # Links
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)

    # Role in case
    role: Mapped[str] = mapped_column(
        String(20)
    )  # petitioner, respondent, (future: guardian, attorney)

    # Parent designation
    parent_type: Mapped[str] = mapped_column(
        String(20)
    )  # mother, father, parent_a, parent_b

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    invited_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Permissions
    can_view_financials: Mapped[bool] = mapped_column(Boolean, default=True)
    can_view_messages: Mapped[bool] = mapped_column(Boolean, default=True)
    can_modify_agreement: Mapped[bool] = mapped_column(Boolean, default=True)
    can_invite_legal_access: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="participants")
    user: Mapped["User"] = relationship("User", back_populates="cases_as_participant")

    def __repr__(self) -> str:
        return f"<CaseParticipant {self.role} in case {self.case_id}>"
