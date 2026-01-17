"""
Custody Day Record model - tracks daily custody per child.

Records which parent had custody of each child on each day,
determined by schedule, check-ins, or manual override.
"""

from datetime import date, datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.child import Child
    from app.models.family_file import FamilyFile
    from app.models.user import User
    from app.models.custody_exchange import CustodyExchangeInstance
    from app.models.agreement import Agreement


class DeterminationMethod(str, Enum):
    """How custody was determined for this day."""
    SCHEDULED = "scheduled"  # Based on agreed schedule pattern
    CHECK_IN = "check_in"  # Parent checked in at exchange
    EXCHANGE_COMPLETED = "exchange_completed"  # Exchange instance completed
    MANUAL_OVERRIDE = "manual_override"  # Parent clicked "With Me"
    BACKFILLED = "backfilled"  # Retroactively filled from schedule


class CustodyDayRecord(Base, UUIDMixin, TimestampMixin):
    """
    Daily custody record - one per child per day.

    Tracks which parent had custody of each child on each day,
    enabling custody time calculations and parenting reports.
    """

    __tablename__ = "custody_day_records"

    # Core identifiers
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=False
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), index=True, nullable=False
    )
    record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Which parent had custody
    custodial_parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    # How custody was determined
    determination_method: Mapped[str] = mapped_column(
        String(50), default=DeterminationMethod.SCHEDULED.value, nullable=False
    )

    # Source references for traceability
    source_exchange_instance_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("custody_exchange_instances.id"), nullable=True
    )
    source_agreement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("agreements.id"), nullable=True
    )

    # Override tracking (when manual override is used)
    override_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    override_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Flags
    is_disputed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Confidence score for backfilled records (0-100)
    # 100 = confirmed via check-in
    # 80 = backfilled from schedule (high confidence)
    # 50 = inferred (lower confidence)
    confidence_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Additional notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    family_file: Mapped["FamilyFile"] = relationship(
        "FamilyFile", foreign_keys=[family_file_id]
    )
    child: Mapped["Child"] = relationship("Child", foreign_keys=[child_id])
    custodial_parent: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[custodial_parent_id]
    )
    source_exchange_instance: Mapped[Optional["CustodyExchangeInstance"]] = relationship(
        "CustodyExchangeInstance", foreign_keys=[source_exchange_instance_id]
    )
    source_agreement: Mapped[Optional["Agreement"]] = relationship(
        "Agreement", foreign_keys=[source_agreement_id]
    )
    override_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[override_by]
    )

    # Unique constraint: one record per child per day
    __table_args__ = (
        UniqueConstraint('child_id', 'record_date', name='uq_child_date'),
    )

    def __repr__(self) -> str:
        return f"<CustodyDayRecord child={self.child_id} date={self.record_date}>"
