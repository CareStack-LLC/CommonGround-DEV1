"""Agreement schemas for request/response validation."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class AgreementSectionUpdate(BaseModel):
    """Update data for a specific agreement section."""

    section_number: str
    section_title: str
    content: str
    structured_data: Optional[Dict[str, Any]] = None


class AgreementSectionCreate(BaseModel):
    """Create a new agreement section."""

    agreement_id: str
    section_type: str
    content: Dict[str, Any]
    section_number: str = ""
    section_title: str = ""
    structured_data: Optional[Dict[str, Any]] = None


class AgreementCreate(BaseModel):
    """Create a new agreement for a case (legacy support)."""

    case_id: str
    title: str = "Parenting Agreement"
    agreement_type: str = "parenting"


class AgreementCreateForFamilyFile(BaseModel):
    """Create a new SharedCare Agreement for a Family File."""

    title: str = "SharedCare Agreement"
    agreement_type: str = "shared_care"


class AgreementResponse(BaseModel):
    """Agreement response with all details."""

    id: str
    case_id: Optional[str] = None  # Optional for Family File-based agreements
    family_file_id: Optional[str] = None  # Primary container for SharedCare Agreements
    title: str
    version: int
    status: str
    petitioner_approved: bool
    respondent_approved: bool
    effective_date: Optional[datetime]
    pdf_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgreementSectionResponse(BaseModel):
    """Agreement section response."""

    id: str
    agreement_id: str
    section_number: str
    section_title: str
    section_type: str
    content: str
    structured_data: Optional[Dict[str, Any]]
    display_order: int
    is_required: bool
    is_completed: bool

    class Config:
        from_attributes = True


class AgreementWithSections(BaseModel):
    """Agreement with all sections."""

    agreement: AgreementResponse
    sections: List[AgreementSectionResponse]
    completion_percentage: float


class ApprovalRequest(BaseModel):
    """Request to approve an agreement."""

    notes: Optional[str] = None


# Section templates - defines all 18 sections
SECTION_TEMPLATES = [
    {
        "section_number": "1",
        "section_title": "Basic Information",
        "section_type": "basic_info",
        "display_order": 1,
        "is_required": True,
        "template": "This Parenting Agreement is entered into by and between the parties regarding the care and custody of their child(ren)."
    },
    {
        "section_number": "2",
        "section_title": "Legal Custody",
        "section_type": "custody",
        "display_order": 2,
        "is_required": True,
        "template": "The parties shall share joint legal custody, meaning both parents have equal rights and responsibilities to make major decisions affecting the children's welfare, education, health, and religious upbringing."
    },
    {
        "section_number": "3",
        "section_title": "Physical Custody",
        "section_type": "custody",
        "display_order": 3,
        "is_required": True,
        "template": "The parties agree to the following physical custody arrangement:"
    },
    {
        "section_number": "4",
        "section_title": "Parenting Time Schedule",
        "section_type": "schedule",
        "display_order": 4,
        "is_required": True,
        "template": "Regular parenting time schedule:"
    },
    {
        "section_number": "5",
        "section_title": "Holiday Schedule",
        "section_type": "schedule",
        "display_order": 5,
        "is_required": True,
        "template": "Holiday parenting time shall be allocated as follows:"
    },
    {
        "section_number": "6",
        "section_title": "Vacation Time",
        "section_type": "schedule",
        "display_order": 6,
        "is_required": False,
        "template": "Each parent shall be entitled to vacation time with the children:"
    },
    {
        "section_number": "7",
        "section_title": "School Breaks",
        "section_type": "schedule",
        "display_order": 7,
        "is_required": False,
        "template": "School break schedule (spring break, winter break, etc.):"
    },
    {
        "section_number": "8",
        "section_title": "Transportation",
        "section_type": "logistics",
        "display_order": 8,
        "is_required": True,
        "template": "Transportation and exchange locations:"
    },
    {
        "section_number": "9",
        "section_title": "Decision-Making Authority",
        "section_type": "decision_making",
        "display_order": 9,
        "is_required": True,
        "template": "Major decisions require mutual consent of both parents. In case of disagreement, the parties agree to:"
    },
    {
        "section_number": "10",
        "section_title": "Education Decisions",
        "section_type": "decision_making",
        "display_order": 10,
        "is_required": True,
        "template": "Educational decisions including school selection, special education, tutoring:"
    },
    {
        "section_number": "11",
        "section_title": "Healthcare Decisions",
        "section_type": "decision_making",
        "display_order": 11,
        "is_required": True,
        "template": "Medical and healthcare decisions:"
    },
    {
        "section_number": "12",
        "section_title": "Religious Upbringing",
        "section_type": "decision_making",
        "display_order": 12,
        "is_required": False,
        "template": "Religious education and participation:"
    },
    {
        "section_number": "13",
        "section_title": "Extracurricular Activities",
        "section_type": "activities",
        "display_order": 13,
        "is_required": False,
        "template": "Participation in extracurricular activities:"
    },
    {
        "section_number": "14",
        "section_title": "Child Support",
        "section_type": "financial",
        "display_order": 14,
        "is_required": True,
        "template": "Child support obligations:"
    },
    {
        "section_number": "15",
        "section_title": "Expense Sharing",
        "section_type": "financial",
        "display_order": 15,
        "is_required": True,
        "template": "Sharing of additional expenses (medical, educational, extracurricular):"
    },
    {
        "section_number": "16",
        "section_title": "Communication Guidelines",
        "section_type": "communication",
        "display_order": 16,
        "is_required": True,
        "template": "Communication between parents and with children:"
    },
    {
        "section_number": "17",
        "section_title": "Dispute Resolution",
        "section_type": "legal",
        "display_order": 17,
        "is_required": True,
        "template": "In the event of disputes, the parties agree to first attempt mediation before seeking court intervention."
    },
    {
        "section_number": "18",
        "section_title": "Modification Process",
        "section_type": "legal",
        "display_order": 18,
        "is_required": True,
        "template": "This agreement may be modified by mutual written consent of both parties or by court order."
    }
]
