"""
KidsCubbie models - high-value item tracking for children.

This module contains models for tracking valuable items that travel
with children between homes (Nintendo Switch, school laptops, etc.)
and photo galleries for children.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ItemCategory(str, Enum):
    """Categories for cubbie items."""
    ELECTRONICS = "electronics"     # Gaming devices, tablets, laptops, phones
    SCHOOL = "school"               # School-issued devices, supplies
    SPORTS = "sports"               # Expensive equipment
    MEDICAL = "medical"             # Glasses, hearing aids, medical devices
    MUSICAL = "musical"             # Instruments
    OTHER = "other"                 # Other high-value items


class ItemLocation(str, Enum):
    """Where the item currently is."""
    PARENT_A = "parent_a"
    PARENT_B = "parent_b"
    CHILD_TRAVELING = "child_traveling"


class ItemCondition(str, Enum):
    """Condition of an item."""
    EXCELLENT = "excellent"
    GOOD = "good"
    MINOR_WEAR = "minor_wear"
    NEEDS_REPAIR = "needs_repair"


class CubbieItem(Base, UUIDMixin, TimestampMixin):
    """
    High-value item that travels with a child between homes.

    Examples: Nintendo Switch, school laptop, iPad, musical instruments.
    These are items parents would want documented for court if lost/damaged.
    """

    __tablename__ = "cubbie_items"

    # Relationships
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), index=True
    )
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True, nullable=True
    )
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )

    # Item details
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(
        String(50), default=ItemCategory.OTHER.value
    )

    # Value & Documentation
    estimated_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    serial_number: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Tracking
    added_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Current location tracking
    current_location: Mapped[str] = mapped_column(
        String(50), default=ItemLocation.PARENT_A.value
    )
    last_location_update: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Relationships
    child: Mapped["Child"] = relationship("Child", back_populates="cubbie_items")
    case: Mapped[Optional["Case"]] = relationship("Case")
    family_file: Mapped[Optional["FamilyFile"]] = relationship("FamilyFile")
    added_by_user: Mapped["User"] = relationship("User")
    exchange_items: Mapped[list["CubbieExchangeItem"]] = relationship(
        "CubbieExchangeItem", back_populates="cubbie_item"
    )

    def __repr__(self) -> str:
        return f"<CubbieItem {self.name} (${self.estimated_value})>"


class CubbieExchangeItem(Base, UUIDMixin, TimestampMixin):
    """
    Items selected for a specific custody exchange.

    Tracks which items are traveling with the child during an exchange,
    acknowledgment by receiving parent, and condition reporting.
    """

    __tablename__ = "cubbie_exchange_items"

    # Relationships
    exchange_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("custody_exchange_instances.id"), index=True
    )
    cubbie_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cubbie_items.id"), index=True
    )

    # Status tracking
    sent_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Condition tracking
    condition_sent: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    condition_received: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    condition_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Photo documentation
    photo_sent_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    photo_received_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Dispute tracking
    is_disputed: Mapped[bool] = mapped_column(Boolean, default=False)
    dispute_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dispute_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    dispute_resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Relationships
    exchange: Mapped["CustodyExchangeInstance"] = relationship("CustodyExchangeInstance")
    cubbie_item: Mapped["CubbieItem"] = relationship(
        "CubbieItem", back_populates="exchange_items"
    )
    sender: Mapped["User"] = relationship("User", foreign_keys=[sent_by])
    acknowledger: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[acknowledged_by]
    )

    def __repr__(self) -> str:
        return f"<CubbieExchangeItem {self.cubbie_item_id} in exchange {self.exchange_id}>"


class ChildPhoto(Base, UUIDMixin, TimestampMixin):
    """
    Photo gallery for children.

    Stores photos uploaded by either parent, with attribution
    and optional profile photo designation.
    """

    __tablename__ = "child_photos"

    # Relationships
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), index=True
    )
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    # Photo details
    photo_url: Mapped[str] = mapped_column(String(500))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    caption: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Metadata
    is_profile_photo: Mapped[bool] = mapped_column(Boolean, default=False)
    taken_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    child: Mapped["Child"] = relationship("Child", back_populates="photos")
    uploader: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<ChildPhoto {self.id} for child {self.child_id}>"
