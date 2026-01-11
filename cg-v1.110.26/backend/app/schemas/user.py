"""User schemas."""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserProfileResponse(BaseModel):
    """User profile response."""

    id: str
    user_id: str
    first_name: str
    last_name: str
    preferred_name: str | None
    email: str
    phone: str | None
    avatar_url: str | None
    timezone: str
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    subscription_tier: str
    subscription_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """User profile update request."""

    first_name: str | None = None
    last_name: str | None = None
    preferred_name: str | None = None
    phone: str | None = None
    timezone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None


class NotificationPreferences(BaseModel):
    """Notification preferences."""

    # Email notifications
    email_messages: bool = True
    email_schedule: bool = True
    email_agreements: bool = True
    email_payments: bool = True
    email_court: bool = True
    email_aria: bool = True

    # Push notifications
    push_messages: bool = True
    push_schedule: bool = True
    push_agreements: bool = True
    push_payments: bool = True
    push_court: bool = True
    push_aria: bool = True


class NotificationPreferencesResponse(BaseModel):
    """Notification preferences response."""

    email_messages: bool
    email_schedule: bool
    email_agreements: bool
    email_payments: bool
    email_court: bool
    email_aria: bool
    push_messages: bool
    push_schedule: bool
    push_agreements: bool
    push_payments: bool
    push_court: bool
    push_aria: bool

    class Config:
        from_attributes = True


class PasswordChangeRequest(BaseModel):
    """Password change request."""

    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)


class PasswordChangeResponse(BaseModel):
    """Password change response."""

    message: str
    success: bool
