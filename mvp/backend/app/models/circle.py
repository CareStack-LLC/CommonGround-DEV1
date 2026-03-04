"""
Circle models for managing approved contacts for children.

The Circle is a list of trusted contacts (grandparents, family friends, etc.)
that a child can communicate with through KidComs.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Index, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class RelationshipType(str, Enum):
    """Types of relationships for circle contacts."""
    GRANDPARENT = "grandparent"
    AUNT = "aunt"
    UNCLE = "uncle"
    COUSIN = "cousin"
    FAMILY_FRIEND = "family_friend"
    GODPARENT = "godparent"
    STEP_PARENT = "step_parent"
    SIBLING = "sibling"
    THERAPIST = "therapist"
    TUTOR = "tutor"
    COACH = "coach"
    OTHER = "other"


class ApprovalMode(str, Enum):
    """Modes for approving circle contacts."""
    BOTH_PARENTS = "both_parents"  # Both parents must approve
    EITHER_PARENT = "either_parent"  # Either parent can approve


class CircleContact(Base, UUIDMixin, TimestampMixin):
    """
    CircleContact - An approved contact in a child's communication circle.

    Circle contacts are trusted individuals that children can video call,
    chat with, and interact with through KidComs features.
    """

    __tablename__ = "circle_contacts"

    # Foreign keys
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # If child_id is NULL, contact is approved for ALL children in the family file

    # Contact information
    contact_name: Mapped[str] = mapped_column(String(100))
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    relationship_type: Mapped[str] = mapped_column(String(50), default=RelationshipType.OTHER.value)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Approval tracking
    added_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    approved_by_parent_a_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_by_parent_b_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)  # Email/phone verified
    verification_token: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Availability (optional per-contact schedule)
    availability_override: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Room assignment (for My Circle communication)
    room_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 3-10
    invite_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    family_file = relationship("FamilyFile", back_populates="circle_contacts")
    child = relationship("Child", back_populates="circle_contacts")
    added_by_user = relationship("User", foreign_keys=[added_by])
    user_account = relationship("CircleUser", back_populates="circle_contact", uselist=False)
    permissions = relationship("CirclePermission", back_populates="circle_contact")

    # Indexes
    __table_args__ = (
        Index("ix_circle_contacts_family_child", "family_file_id", "child_id"),
        Index("ix_circle_contacts_email", "contact_email"),
    )

    def __repr__(self) -> str:
        return f"<CircleContact {self.contact_name} for family {self.family_file_id}>"

    @property
    def is_fully_approved(self) -> bool:
        """Check if contact is approved by both parents (when required)."""
        return self.approved_by_parent_a_at is not None and self.approved_by_parent_b_at is not None

    @property
    def is_partially_approved(self) -> bool:
        """Check if contact has at least one parent approval."""
        return self.approved_by_parent_a_at is not None or self.approved_by_parent_b_at is not None

    def approve(self, is_parent_a: bool) -> None:
        """Mark contact as approved by a parent."""
        now = datetime.utcnow()
        if is_parent_a:
            self.approved_by_parent_a_at = now
        else:
            self.approved_by_parent_b_at = now

    def can_communicate(self, approval_mode: ApprovalMode) -> bool:
        """
        Check if contact can communicate based on approval mode.

        Args:
            approval_mode: The family's approval mode setting

        Returns:
            True if contact meets approval requirements
        """
        if not self.is_active:
            return False

        if approval_mode == ApprovalMode.BOTH_PARENTS:
            return self.is_fully_approved
        else:  # EITHER_PARENT
            return self.is_partially_approved
