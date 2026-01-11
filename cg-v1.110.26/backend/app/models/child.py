"""
Child model - represents children in custody agreements.

Enhanced with:
- Dual-parent approval workflow (like case creation)
- Collaborative editing with field attribution
- Court access controls
- Extended profile fields (favorites, sizes, emergency contacts)
- Photo gallery support
"""

from datetime import date, datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.cubbie import CubbieItem, ChildPhoto
    from app.models.case import Case
    from app.models.family_file import FamilyFile
    from app.models.user import User
    from app.models.circle import CircleContact
    from app.models.kidcoms import KidComsSession, ChildUser, CirclePermission


class ChildProfileStatus(str, Enum):
    """Status of child profile approval."""
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    ARCHIVED = "archived"


class Child(Base, UUIDMixin, TimestampMixin):
    """
    Child entity - the focus of the co-parenting arrangement.

    Child profiles require dual-parent approval:
    1. Parent A creates profile → status = pending_approval
    2. Parent B approves → status = active
    3. Both parents can then collaboratively edit
    """

    __tablename__ = "children"

    # Case link (legacy - for backwards compatibility)
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True, nullable=True
    )

    # Family File link (new)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )

    # === APPROVAL WORKFLOW ===
    status: Mapped[str] = mapped_column(
        String(50), default=ChildProfileStatus.PENDING_APPROVAL.value, index=True
    )
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    approved_by_a: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    approved_by_b: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    approved_at_a: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_at_b: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # === BASIC INFORMATION ===
    first_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100))
    preferred_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Birth information
    date_of_birth: Mapped[date] = mapped_column(Date)
    birth_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    birth_state: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)

    # Gender/pronouns
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pronouns: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Photo
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # === SPECIAL NEEDS ===
    has_special_needs: Mapped[bool] = mapped_column(Boolean, default=False)
    special_needs_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # === MEDICAL INFORMATION ===
    allergies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    medications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    medical_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    blood_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Healthcare providers
    pediatrician_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    pediatrician_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    dentist_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    dentist_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    therapist_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    therapist_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    insurance_provider: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    insurance_policy_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # === EDUCATION ===
    school_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    school_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    grade_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    teacher_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    teacher_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    has_iep: Mapped[bool] = mapped_column(Boolean, default=False)
    has_504: Mapped[bool] = mapped_column(Boolean, default=False)

    # === PREFERENCES & FAVORITES ===
    favorite_foods: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    food_dislikes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    favorite_activities: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    comfort_items: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bedtime_routine: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # === SIZES ===
    clothing_size: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    shoe_size: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sizes_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # === PERSONALITY & NEEDS ===
    temperament_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fears_anxieties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    calming_strategies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # === EMERGENCY CONTACTS ===
    # JSON array: [{"name": "...", "phone": "...", "relationship": "..."}]
    emergency_contacts: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # === FIELD ATTRIBUTION ===
    # JSON object tracking who added/updated each field
    # Example: {"allergies": "user_id_1", "school_name": "user_id_2"}
    field_contributors: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # === COURT ACCESS CONTROLS ===
    # JSON array of field names hidden from restricted parent
    court_restricted_fields: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    restricted_parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # === RELATIONSHIPS ===
    case: Mapped[Optional["Case"]] = relationship("Case", back_populates="children")
    family_file: Mapped[Optional["FamilyFile"]] = relationship(
        "FamilyFile", back_populates="children", foreign_keys=[family_file_id]
    )
    creator: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[created_by]
    )
    cubbie_items: Mapped[list["CubbieItem"]] = relationship(
        "CubbieItem", back_populates="child"
    )
    photos: Mapped[list["ChildPhoto"]] = relationship(
        "ChildPhoto", back_populates="child"
    )

    # KidComs - Circle contacts (people this child can communicate with)
    circle_contacts: Mapped[list["CircleContact"]] = relationship(
        "CircleContact", back_populates="child"
    )

    # KidComs - Sessions (video calls, theater, arcade, etc.)
    kidcoms_sessions: Mapped[list["KidComsSession"]] = relationship(
        "KidComsSession", back_populates="child"
    )

    # My Circle - Child login account
    user_account: Mapped[Optional["ChildUser"]] = relationship(
        "ChildUser", back_populates="child", uselist=False
    )

    # My Circle - Permissions for contacts to communicate with this child
    circle_permissions: Mapped[list["CirclePermission"]] = relationship(
        "CirclePermission", back_populates="child"
    )

    def __repr__(self) -> str:
        return f"<Child {self.first_name} {self.last_name}>"

    @property
    def full_name(self) -> str:
        """Get child's full name."""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(parts)

    @property
    def display_name(self) -> str:
        """Get display name (preferred or first name)."""
        return self.preferred_name or self.first_name

    @property
    def age(self) -> int:
        """Calculate current age."""
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
