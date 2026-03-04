"""
My Time Collection model - Private organizational containers for scheduling.
Each parent creates collections to organize their time (e.g., "Time with Dad", "Work Schedule").
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.family_file import FamilyFile
    from app.models.user import User
    from app.models.time_block import TimeBlock
    from app.models.schedule import ScheduleEvent


class MyTimeCollection(Base, UUIDMixin, TimestampMixin):
    """
    Private organizational container for a parent's schedule.

    Privacy Rules:
    - Owner sees the real collection name (e.g., "Time with Dad")
    - Other parent sees only a generic label (e.g., "Dad's Time")
    - Collections are never shared across cases

    Contains:
    - Time Blocks (availability constraints)
    - Events (real scheduled activities)
    """

    __tablename__ = "my_time_collections"

    # Ownership - at least one of case_id or family_file_id should be set
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True, nullable=True
    )  # Court case context (legacy)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )  # Family file context (preferred)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)

    # Collection details (PRIVATE to owner)
    name: Mapped[str] = mapped_column(String(100))  # "Time with Dad", "Work Schedule"
    color: Mapped[str] = mapped_column(String(7), default="#3B82F6")  # Hex color for calendar display

    # Settings
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)  # Default collection for new items
    display_order: Mapped[int] = mapped_column(Integer, default=0)  # Sort order in UI

    # Relationships
    case: Mapped[Optional["Case"]] = relationship("Case", back_populates="my_time_collections")
    family_file: Mapped[Optional["FamilyFile"]] = relationship("FamilyFile", back_populates="my_time_collections")
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    time_blocks: Mapped[list["TimeBlock"]] = relationship(
        "TimeBlock",
        back_populates="collection",
        cascade="all, delete-orphan"
    )
    events: Mapped[list["ScheduleEvent"]] = relationship(
        "ScheduleEvent",
        back_populates="collection",
        foreign_keys="[ScheduleEvent.collection_id]"
    )

    def __repr__(self) -> str:
        return f"<MyTimeCollection '{self.name}' owned by {self.owner_id}>"
