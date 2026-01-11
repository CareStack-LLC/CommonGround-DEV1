"""
Pydantic schemas for Circle (approved child contacts).

The Circle is a list of trusted contacts (grandparents, family friends, etc.)
that a child can communicate with through KidComs.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


class CircleContactCreate(BaseModel):
    """Schema for adding a contact to a child's circle."""
    family_file_id: str
    child_id: Optional[str] = Field(
        default=None,
        description="If null, contact is approved for ALL children in the family"
    )

    # Contact information
    contact_name: str = Field(..., min_length=1, max_length=100)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    relationship_type: str = Field(
        default="other",
        pattern=r"^(grandparent|aunt|uncle|cousin|family_friend|godparent|step_parent|sibling|therapist|tutor|coach|other)$",
        description="Relationship to the child"
    )
    photo_url: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = None

    # Availability override (optional per-contact schedule)
    availability_override: Optional[dict] = Field(
        default=None,
        description="Override availability schedule. Format: {'monday': {'start': '09:00', 'end': '20:00'}, ...}"
    )


class CircleContactUpdate(BaseModel):
    """Schema for updating a circle contact."""
    contact_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    relationship_type: Optional[str] = Field(
        default=None,
        pattern=r"^(grandparent|aunt|uncle|cousin|family_friend|godparent|step_parent|sibling|therapist|tutor|coach|other)$"
    )
    photo_url: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    availability_override: Optional[dict] = None


class CircleContactApproval(BaseModel):
    """Schema for parent approval of a circle contact."""
    approved: bool = Field(..., description="Whether the parent approves this contact")
    notes: Optional[str] = Field(default=None, description="Optional notes about the approval")


class CircleContactVerify(BaseModel):
    """Schema for verifying a circle contact's email/phone."""
    verification_token: str = Field(..., min_length=1)


class CircleContactResponse(BaseModel):
    """Schema for circle contact response."""
    id: str
    family_file_id: str
    child_id: Optional[str] = None

    # Contact information
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    relationship_type: str
    photo_url: Optional[str] = None
    notes: Optional[str] = None

    # Approval tracking
    added_by: str
    approved_by_parent_a_at: Optional[datetime] = None
    approved_by_parent_b_at: Optional[datetime] = None

    # Computed approval status
    is_fully_approved: bool = False
    is_partially_approved: bool = False
    can_communicate: bool = False  # Based on family approval mode

    # Status
    is_active: bool
    is_verified: bool
    verified_at: Optional[datetime] = None

    # Availability
    availability_override: Optional[dict] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CircleContactListResponse(BaseModel):
    """Schema for listing circle contacts."""
    items: List[CircleContactResponse]
    total: int

    # Summary stats
    fully_approved_count: int = 0
    pending_approval_count: int = 0


class CircleContactInvite(BaseModel):
    """Schema for inviting a contact to verify their identity."""
    contact_id: str
    send_email: bool = True
    send_sms: bool = False
    custom_message: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional personalized message to include in invitation"
    )


class CircleContactInviteResponse(BaseModel):
    """Response after sending an invite."""
    success: bool
    message: str
    email_sent: bool = False
    sms_sent: bool = False
    verification_expires_at: Optional[datetime] = None


# Relationship type choices for frontend
RELATIONSHIP_CHOICES = [
    {"value": "grandparent", "label": "Grandparent"},
    {"value": "aunt", "label": "Aunt"},
    {"value": "uncle", "label": "Uncle"},
    {"value": "cousin", "label": "Cousin"},
    {"value": "family_friend", "label": "Family Friend"},
    {"value": "godparent", "label": "Godparent"},
    {"value": "step_parent", "label": "Step-Parent"},
    {"value": "sibling", "label": "Sibling"},
    {"value": "therapist", "label": "Therapist"},
    {"value": "tutor", "label": "Tutor"},
    {"value": "coach", "label": "Coach"},
    {"value": "other", "label": "Other"},
]
