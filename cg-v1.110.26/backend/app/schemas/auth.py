"""Authentication schemas."""

from pydantic import BaseModel, EmailStr, Field, field_validator
from app.utils.sanitize import sanitize_text, validate_phone


class RegisterRequest(BaseModel):
    """User registration request."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets security requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 128:
            raise ValueError('Password must be less than 128 characters')

        # Check for at least one letter and one number
        has_letter = any(c.isalpha() for c in v)
        has_number = any(c.isdigit() for c in v)

        if not has_letter:
            raise ValueError('Password must contain at least one letter')
        if not has_number:
            raise ValueError('Password must contain at least one number')

        return v

    @field_validator('first_name', 'last_name')
    @classmethod
    def sanitize_names(cls, v: str) -> str:
        """Sanitize name fields for XSS protection."""
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        sanitized = sanitize_text(v, max_length=100)
        if not sanitized:
            raise ValueError('Name is empty after sanitization')
        # Ensure name is reasonable length
        if len(sanitized) < 1:
            raise ValueError('Name must be at least 1 character')
        return sanitized

    @field_validator('phone')
    @classmethod
    def validate_phone_number(cls, v: str | None) -> str | None:
        """Validate phone number format if provided."""
        if v is None or not v.strip():
            return None
        try:
            return validate_phone(v)
        except ValueError as e:
            raise ValueError(f'Invalid phone number: {str(e)}')


class LoginRequest(BaseModel):
    """Login request."""

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class LoginResponse(BaseModel):
    """Login response with tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    """Basic user response."""

    id: str
    email: str
    email_verified: bool
    first_name: str
    last_name: str

    class Config:
        from_attributes = True
