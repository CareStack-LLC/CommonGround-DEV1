"""Case schemas."""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.utils.sanitize import sanitize_case_name, sanitize_text


class CaseParticipantResponse(BaseModel):
    """Case participant response."""

    id: str
    role: str
    parent_type: str
    user_id: str
    is_active: bool

    class Config:
        from_attributes = True


class CaseCreate(BaseModel):
    """Create case request."""

    case_name: str = Field(..., min_length=3, max_length=200)
    other_parent_email: EmailStr
    state: str = Field(..., min_length=2, max_length=2)  # US state codes
    county: str | None = Field(None, max_length=100)
    children: list[dict] = Field(..., min_items=1, max_items=20)

    @field_validator('case_name')
    @classmethod
    def validate_case_name(cls, v: str) -> str:
        """Sanitize and validate case name."""
        try:
            return sanitize_case_name(v)
        except ValueError as e:
            raise ValueError(str(e))

    @field_validator('state')
    @classmethod
    def validate_state(cls, v: str) -> str:
        """Validate US state code."""
        if not v or len(v) != 2:
            raise ValueError('State must be a 2-letter US state code')

        # List of valid US state codes
        valid_states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
            'DC'  # District of Columbia
        ]

        v_upper = v.upper()
        if v_upper not in valid_states:
            raise ValueError(f'Invalid state code: {v}. Must be a valid US state code.')

        return v_upper

    @field_validator('county')
    @classmethod
    def sanitize_county(cls, v: str | None) -> str | None:
        """Sanitize county name if provided."""
        if v is None or not v.strip():
            return None
        sanitized = sanitize_text(v, max_length=100)
        return sanitized if sanitized else None

    @field_validator('children')
    @classmethod
    def validate_children(cls, v: list[dict]) -> list[dict]:
        """Validate children list."""
        if not v:
            raise ValueError('At least one child is required')
        if len(v) > 20:
            raise ValueError('Cannot add more than 20 children')

        # Validate required fields in each child
        for i, child in enumerate(v):
            if 'first_name' not in child:
                raise ValueError(f'Child {i + 1} missing required field: first_name')
            if 'date_of_birth' not in child:
                raise ValueError(f'Child {i + 1} missing required field: date_of_birth')

        return v


class CaseResponse(BaseModel):
    """Case response."""

    id: str
    case_name: str
    case_number: str | None
    state: str
    status: str
    created_at: datetime
    participants: list[CaseParticipantResponse]

    class Config:
        from_attributes = True


class CaseUpdate(BaseModel):
    """Update case request."""

    case_name: str | None = Field(None, min_length=3, max_length=200)
    county: str | None = Field(None, max_length=100)
    court: str | None = Field(None, max_length=200)

    @field_validator('case_name')
    @classmethod
    def validate_case_name(cls, v: str | None) -> str | None:
        """Sanitize and validate case name if provided."""
        if v is None:
            return None
        try:
            return sanitize_case_name(v)
        except ValueError as e:
            raise ValueError(str(e))

    @field_validator('county', 'court')
    @classmethod
    def sanitize_text_fields(cls, v: str | None) -> str | None:
        """Sanitize text fields if provided."""
        if v is None or not v.strip():
            return None
        sanitized = sanitize_text(v, max_length=200)
        return sanitized if sanitized else None
