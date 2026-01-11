"""
FamilyFile and related schemas.

FamilyFile is the root container for family data, replacing "Case" for parent-created records.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.sanitize import sanitize_text


# ============================================================
# Enums (as string literals for JSON compatibility)
# ============================================================

FAMILY_FILE_STATUSES = ["active", "archived", "court_linked"]
CONFLICT_LEVELS = ["low", "moderate", "high"]
PARENT_ROLES = ["mother", "father", "parent_a", "parent_b"]
QUICK_ACCORD_CATEGORIES = [
    "travel", "schedule_swap", "special_event", "overnight", "expense", "other"
]
QUICK_ACCORD_STATUSES = [
    "draft", "pending_approval", "active", "completed", "revoked", "expired"
]


# ============================================================
# Child Schemas (embedded in Family File)
# ============================================================

class ChildBasic(BaseModel):
    """Basic child information for Family File creation."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: str  # ISO date string
    middle_name: Optional[str] = Field(None, max_length=100)
    gender: Optional[str] = Field(None, max_length=20)

    @field_validator('first_name', 'last_name', 'middle_name')
    @classmethod
    def sanitize_names(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_text(v, max_length=100)


class ChildResponse(BaseModel):
    """Child response in Family File context."""
    id: str
    first_name: str
    last_name: str
    date_of_birth: str
    middle_name: Optional[str] = None
    preferred_name: Optional[str] = None
    gender: Optional[str] = None
    photo_url: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


# ============================================================
# Parent Info Schemas
# ============================================================

class ParentInfo(BaseModel):
    """Parent information in Family File context."""
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str  # mother, father, parent_a, parent_b

    class Config:
        from_attributes = True


# ============================================================
# Family File Schemas
# ============================================================

class FamilyFileCreate(BaseModel):
    """Create a new Family File."""
    title: str = Field(..., min_length=3, max_length=200)
    parent_a_role: str = Field(default="parent_a")
    parent_b_email: Optional[EmailStr] = None
    parent_b_role: Optional[str] = None
    state: Optional[str] = Field(None, min_length=2, max_length=2)
    county: Optional[str] = Field(None, max_length=100)
    children: List[ChildBasic] = Field(default_factory=list)

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        return sanitize_text(v, max_length=200)

    @field_validator('parent_a_role', 'parent_b_role')
    @classmethod
    def validate_roles(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in PARENT_ROLES:
            raise ValueError(f'Invalid role. Must be one of: {PARENT_ROLES}')
        return v

    @field_validator('state')
    @classmethod
    def validate_state(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        valid_states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
        ]
        v_upper = v.upper()
        if v_upper not in valid_states:
            raise ValueError(f'Invalid state code: {v}')
        return v_upper


class FamilyFileUpdate(BaseModel):
    """Update a Family File."""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    state: Optional[str] = Field(None, min_length=2, max_length=2)
    county: Optional[str] = Field(None, max_length=100)
    aria_enabled: Optional[bool] = None
    aria_provider: Optional[str] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_text(v, max_length=200)


class FamilyFileResponse(BaseModel):
    """Family File response."""
    id: str
    family_file_number: str
    title: str
    status: str
    conflict_level: str
    state: Optional[str] = None
    county: Optional[str] = None
    aria_enabled: bool
    aria_provider: str
    require_joint_approval: bool
    created_at: datetime
    updated_at: datetime

    # Parent A info
    parent_a_id: str
    parent_a_role: str

    # Parent B info (may be null if not joined yet)
    parent_b_id: Optional[str] = None
    parent_b_role: Optional[str] = None
    parent_b_email: Optional[str] = None
    parent_b_invited_at: Optional[datetime] = None
    parent_b_joined_at: Optional[datetime] = None

    # Flags
    is_complete: bool  # Both parents joined
    has_court_case: bool  # Has linked court custody case
    can_create_shared_care_agreement: bool

    class Config:
        from_attributes = True


class FamilyFileDetail(FamilyFileResponse):
    """Detailed Family File response with children and related data."""
    children: List[ChildResponse] = []
    active_agreement_count: int = 0
    quick_accord_count: int = 0

    class Config:
        from_attributes = True


class FamilyFileList(BaseModel):
    """List of Family Files."""
    items: List[FamilyFileResponse]
    total: int


# ============================================================
# Invitation Schemas
# ============================================================

class InviteParentB(BaseModel):
    """Invite Parent B to join the Family File."""
    email: EmailStr
    role: str = Field(default="parent_b")

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in PARENT_ROLES:
            raise ValueError(f'Invalid role. Must be one of: {PARENT_ROLES}')
        return v


class AcceptInvitation(BaseModel):
    """Accept an invitation to join a Family File."""
    family_file_id: str


# ============================================================
# Quick Accord Schemas
# ============================================================

class QuickAccordCreate(BaseModel):
    """Create a new QuickAccord."""
    title: str = Field(..., min_length=3, max_length=200)
    purpose_category: str = Field(...)
    purpose_description: Optional[str] = Field(None, max_length=2000)
    is_single_event: bool = True

    # Dates
    event_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    # Children
    child_ids: List[str] = Field(default_factory=list)

    # Logistics
    location: Optional[str] = Field(None, max_length=500)
    pickup_responsibility: Optional[str] = Field(None, max_length=100)
    dropoff_responsibility: Optional[str] = Field(None, max_length=100)
    transportation_notes: Optional[str] = Field(None, max_length=2000)

    # Financial
    has_shared_expense: bool = False
    estimated_amount: Optional[float] = None
    expense_category: Optional[str] = Field(None, max_length=50)
    receipt_required: bool = False

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        return sanitize_text(v, max_length=200)

    @field_validator('purpose_category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in QUICK_ACCORD_CATEGORIES:
            raise ValueError(f'Invalid category. Must be one of: {QUICK_ACCORD_CATEGORIES}')
        return v


class QuickAccordUpdate(BaseModel):
    """Update a QuickAccord (only in draft status)."""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    purpose_description: Optional[str] = Field(None, max_length=2000)
    event_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = Field(None, max_length=500)
    pickup_responsibility: Optional[str] = Field(None, max_length=100)
    dropoff_responsibility: Optional[str] = Field(None, max_length=100)
    transportation_notes: Optional[str] = Field(None, max_length=2000)
    has_shared_expense: Optional[bool] = None
    estimated_amount: Optional[float] = None
    expense_category: Optional[str] = Field(None, max_length=50)
    receipt_required: Optional[bool] = None


class QuickAccordResponse(BaseModel):
    """QuickAccord response."""
    id: str
    family_file_id: str
    accord_number: str
    title: str
    purpose_category: str
    purpose_description: Optional[str] = None
    is_single_event: bool
    status: str

    # Dates
    event_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    # Children
    child_ids: List[str] = []

    # Logistics
    location: Optional[str] = None
    pickup_responsibility: Optional[str] = None
    dropoff_responsibility: Optional[str] = None
    transportation_notes: Optional[str] = None

    # Financial
    has_shared_expense: bool = False
    estimated_amount: Optional[float] = None
    expense_category: Optional[str] = None
    receipt_required: bool = False

    # Approval
    parent_a_approved: bool = False
    parent_a_approved_at: Optional[datetime] = None
    parent_b_approved: bool = False
    parent_b_approved_at: Optional[datetime] = None

    # ARIA
    ai_summary: Optional[str] = None

    # Metadata
    initiated_by: str
    created_at: datetime
    updated_at: datetime

    # Computed
    is_approved: bool
    is_active: bool
    is_expired: bool

    class Config:
        from_attributes = True


class QuickAccordList(BaseModel):
    """List of QuickAccords."""
    items: List[QuickAccordResponse]
    total: int


class QuickAccordApproval(BaseModel):
    """Approve or reject a QuickAccord."""
    approved: bool = True
    notes: Optional[str] = Field(None, max_length=1000)


# ============================================================
# Court Custody Case Schemas
# ============================================================

class CourtCustodyCaseCreate(BaseModel):
    """Create a Court Custody Case (linked to a Family File)."""
    case_number: str = Field(..., min_length=1, max_length=50)
    case_type: str = Field(default="custody")
    jurisdiction_state: str = Field(..., min_length=2, max_length=2)
    jurisdiction_county: Optional[str] = Field(None, max_length=100)
    court_name: Optional[str] = Field(None, max_length=200)
    filing_date: Optional[datetime] = None

    @field_validator('case_number')
    @classmethod
    def validate_case_number(cls, v: str) -> str:
        return sanitize_text(v, max_length=50)


class CourtCustodyCaseResponse(BaseModel):
    """Court Custody Case response."""
    id: str
    family_file_id: str
    case_number: str
    case_type: str
    jurisdiction_state: str
    jurisdiction_county: Optional[str] = None
    court_name: Optional[str] = None
    petitioner_id: str
    respondent_id: Optional[str] = None
    filing_date: Optional[datetime] = None
    last_court_date: Optional[datetime] = None
    next_court_date: Optional[datetime] = None
    status: str
    gps_checkin_required: bool
    supervised_exchange_required: bool
    aria_enforcement_locked: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# ARIA QuickAccord Creation
# ============================================================

class ARIAQuickAccordMessage(BaseModel):
    """Message in ARIA QuickAccord creation flow."""
    message: str = Field(..., min_length=1, max_length=5000)


class ARIAQuickAccordResponse(BaseModel):
    """Response from ARIA in QuickAccord creation."""
    response: str
    conversation_id: str
    extracted_data: Optional[dict] = None
    is_ready_to_create: bool = False


class ARIAQuickAccordCreate(BaseModel):
    """Create QuickAccord from ARIA conversation."""
    conversation_id: str
    confirm: bool = True
