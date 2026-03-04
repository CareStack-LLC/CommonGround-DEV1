"""
Child Profile Schemas - Pydantic models for child profile API.

Child profiles feature dual-parent approval workflow where Parent A creates
a profile and Parent B must approve it before it becomes active.
"""

from datetime import date, datetime
from typing import Optional, List, Any
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class ChildProfileStatus(str, Enum):
    """Status of child profile approval."""
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    ARCHIVED = "archived"


class EmergencyContact(BaseModel):
    """Emergency contact for a child."""
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=7, max_length=20)
    relationship: str = Field(..., min_length=1, max_length=50)


# === CHILD CREATE/UPDATE SCHEMAS ===

class ChildCreateBasic(BaseModel):
    """Basic child creation - minimal fields to start approval."""
    case_id: str = Field(..., min_length=36, max_length=36)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: Optional[str] = Field(None, max_length=20)

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Clean and validate names."""
        if not v or not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class ChildUpdateBasic(BaseModel):
    """Update basic information."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    preferred_name: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=20)
    pronouns: Optional[str] = Field(None, max_length=50)


class ChildUpdateMedical(BaseModel):
    """Update medical information."""
    allergies: Optional[str] = Field(None, max_length=1000)
    medications: Optional[str] = Field(None, max_length=1000)
    medical_conditions: Optional[str] = Field(None, max_length=1000)
    blood_type: Optional[str] = Field(None, max_length=10)
    has_special_needs: Optional[bool] = None
    special_needs_notes: Optional[str] = Field(None, max_length=2000)
    pediatrician_name: Optional[str] = Field(None, max_length=200)
    pediatrician_phone: Optional[str] = Field(None, max_length=20)
    dentist_name: Optional[str] = Field(None, max_length=200)
    dentist_phone: Optional[str] = Field(None, max_length=20)
    therapist_name: Optional[str] = Field(None, max_length=200)
    therapist_phone: Optional[str] = Field(None, max_length=20)
    insurance_provider: Optional[str] = Field(None, max_length=200)
    insurance_policy_number: Optional[str] = Field(None, max_length=100)


class ChildUpdateEducation(BaseModel):
    """Update education information."""
    school_name: Optional[str] = Field(None, max_length=200)
    school_address: Optional[str] = Field(None, max_length=500)
    grade_level: Optional[str] = Field(None, max_length=20)
    teacher_name: Optional[str] = Field(None, max_length=200)
    teacher_email: Optional[str] = Field(None, max_length=255)
    has_iep: Optional[bool] = None
    has_504: Optional[bool] = None


class ChildUpdatePreferences(BaseModel):
    """Update preferences and favorites."""
    favorite_foods: Optional[str] = Field(None, max_length=500)
    food_dislikes: Optional[str] = Field(None, max_length=500)
    favorite_activities: Optional[str] = Field(None, max_length=500)
    comfort_items: Optional[str] = Field(None, max_length=500)
    bedtime_routine: Optional[str] = Field(None, max_length=1000)
    clothing_size: Optional[str] = Field(None, max_length=20)
    shoe_size: Optional[str] = Field(None, max_length=20)
    temperament_notes: Optional[str] = Field(None, max_length=1000)
    fears_anxieties: Optional[str] = Field(None, max_length=500)
    calming_strategies: Optional[str] = Field(None, max_length=1000)


class ChildUpdateEmergencyContacts(BaseModel):
    """Update emergency contacts."""
    emergency_contacts: List[EmergencyContact] = Field(default_factory=list, max_items=10)


# === RESPONSE SCHEMAS ===

class ChildBasicResponse(BaseModel):
    """Basic child response for lists."""
    id: str
    case_id: Optional[str] = None
    family_file_id: Optional[str] = None
    first_name: str
    last_name: str
    preferred_name: Optional[str] = None
    date_of_birth: date
    age: int
    photo_url: Optional[str] = None
    status: str
    created_by: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChildProfileResponse(BaseModel):
    """Full child profile response."""
    id: str
    case_id: Optional[str] = None
    family_file_id: Optional[str] = None

    # Status & Approval
    status: str
    created_by: Optional[str] = None
    approved_by_a: Optional[str] = None
    approved_by_b: Optional[str] = None
    approved_at_a: Optional[datetime] = None
    approved_at_b: Optional[datetime] = None

    # Basic Info
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    preferred_name: Optional[str] = None
    date_of_birth: date
    birth_city: Optional[str] = None
    birth_state: Optional[str] = None
    gender: Optional[str] = None
    pronouns: Optional[str] = None
    photo_url: Optional[str] = None

    # Special Needs
    has_special_needs: bool = False
    special_needs_notes: Optional[str] = None

    # Medical
    allergies: Optional[str] = None
    medications: Optional[str] = None
    medical_conditions: Optional[str] = None
    blood_type: Optional[str] = None
    pediatrician_name: Optional[str] = None
    pediatrician_phone: Optional[str] = None
    dentist_name: Optional[str] = None
    dentist_phone: Optional[str] = None
    therapist_name: Optional[str] = None
    therapist_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None

    # Education
    school_name: Optional[str] = None
    school_address: Optional[str] = None
    grade_level: Optional[str] = None
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    has_iep: bool = False
    has_504: bool = False

    # Preferences
    favorite_foods: Optional[str] = None
    food_dislikes: Optional[str] = None
    favorite_activities: Optional[str] = None
    comfort_items: Optional[str] = None
    bedtime_routine: Optional[str] = None

    # Sizes
    clothing_size: Optional[str] = None
    shoe_size: Optional[str] = None
    sizes_updated_at: Optional[datetime] = None

    # Personality
    temperament_notes: Optional[str] = None
    fears_anxieties: Optional[str] = None
    calming_strategies: Optional[str] = None

    # Emergency Contacts (parsed JSON)
    emergency_contacts: Optional[List[EmergencyContact]] = None

    # Attribution
    field_contributors: Optional[dict] = None

    # Court Access Controls
    court_restricted_fields: Optional[List[str]] = None

    # Status
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Computed
    age: int
    full_name: str
    display_name: str

    class Config:
        from_attributes = True


class ChildApprovalResponse(BaseModel):
    """Response after approving a child profile."""
    id: str
    status: str
    approved_by_a: Optional[str] = None
    approved_by_b: Optional[str] = None
    approved_at_a: Optional[datetime] = None
    approved_at_b: Optional[datetime] = None
    message: str

    class Config:
        from_attributes = True


class ChildListResponse(BaseModel):
    """List of children for a case."""
    case_id: str
    children: List[ChildBasicResponse]
    pending_approval_count: int
    active_count: int


# === FIELD ATTRIBUTION ===

class FieldContribution(BaseModel):
    """Who contributed a specific field."""
    field_name: str
    contributed_by: str
    contributed_at: datetime


class ChildAuditEntry(BaseModel):
    """Audit log entry for child profile changes."""
    id: str
    child_id: str
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: str
    changed_at: datetime
    reason: Optional[str] = None


# === COURT RESTRICTIONS ===

class CourtRestrictionUpdate(BaseModel):
    """Update court-mandated field restrictions."""
    restricted_parent_id: str
    restricted_fields: List[str] = Field(..., min_items=1, max_items=50)
