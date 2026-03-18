"""User schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserProfileResponse(BaseModel):
    """User profile response."""

    id: str
    user_id: str
    first_name: str
    last_name: str
    preferred_name: Optional[str]
    email: str
    phone: Optional[str]
    avatar_url: Optional[str]
    timezone: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    subscription_tier: str
    subscription_status: str
    created_at: datetime
    is_professional: bool = False

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """User profile update request."""

    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    preferred_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    timezone: Optional[str] = Field(None, max_length=50)
    address_line1: Optional[str] = Field(None, max_length=200)
    address_line2: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=50)
    zip_code: Optional[str] = Field(None, max_length=20)

    @field_validator('first_name', 'last_name', 'preferred_name', 'city', 'state', 'address_line1', 'address_line2', mode='before')
    @classmethod
    def sanitize_fields(cls, v):
        if v is None:
            return v
        from app.utils.sanitize import sanitize_text
        return sanitize_text(v, max_length=200)


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


class PrivacySettings(BaseModel):
    """Privacy settings for communication features."""

    read_receipts: bool = True
    typing_indicator: bool = True
    last_seen: bool = True
    analytics_enabled: bool = True
    crash_reporting: bool = True


class PrivacySettingsResponse(PrivacySettings):
    """Privacy settings response."""

    class Config:
        from_attributes = True
