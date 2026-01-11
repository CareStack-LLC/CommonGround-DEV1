"""
User and UserProfile models for authentication and user data.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    """
    User model - maps to Supabase Auth users.

    This is the authentication entity. Profile data is in UserProfile.
    """

    __tablename__ = "users"

    # Supabase Auth ID (synced from Supabase auth.users)
    supabase_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)

    # Basic auth fields
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Name fields (duplicated for easy access, also in UserProfile)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))

    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # MFA
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Last activity
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_active: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    profile: Mapped["UserProfile"] = relationship(
        "UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    cases_as_participant: Mapped[list["CaseParticipant"]] = relationship(
        "CaseParticipant", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class UserProfile(Base, UUIDMixin, TimestampMixin):
    """
    User profile information separate from authentication.
    """

    __tablename__ = "user_profiles"

    # Link to User
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    # Personal information
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    preferred_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Profile
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="America/Los_Angeles")
    locale: Mapped[str] = mapped_column(String(10), default="en-US")

    # Address (optional)
    address_line1: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="US")  # ISO country code

    # Emergency contact
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Subscription
    subscription_tier: Mapped[str] = mapped_column(
        String(20), default="essential"
    )  # essential, complete, premium
    subscription_status: Mapped[str] = mapped_column(
        String(20), default="trial"
    )  # trial, active, past_due, cancelled
    subscription_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Preferences
    notification_email: Mapped[bool] = mapped_column(Boolean, default=True)
    notification_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_push: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")

    def __repr__(self) -> str:
        return f"<UserProfile {self.first_name} {self.last_name}>"

    @property
    def full_name(self) -> str:
        """Get full name."""
        return f"{self.first_name} {self.last_name}"

    @property
    def display_name(self) -> str:
        """Get display name (preferred or first name)."""
        return self.preferred_name or self.first_name
