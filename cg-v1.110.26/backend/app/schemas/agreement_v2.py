"""
SharedCare Agreement v2 Schemas

Simplified 7-section structure (standard) and 5-section (lite) for easier completion.
Original 18-section structure preserved as "professional" tier.

Agreement Version Types:
- v2_standard: 7 sections (default for new agreements)
- v2_lite: 5 sections (for low-conflict situations, ARIA decides)
- v1: 18 sections (ARIA Professional tier)
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from enum import Enum

from app.schemas.agreement import SECTION_TEMPLATES


class AgreementVersionType(str, Enum):
    """Agreement version types."""
    V1 = "v1"  # Original 18-section (ARIA Professional)
    V2_STANDARD = "v2_standard"  # 7 sections
    V2_LITE = "v2_lite"  # 5 sections (low-conflict)


class ConflictLevel(str, Enum):
    """Conflict level assessment."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


# ============================================================================
# V2 STANDARD - 7 Sections
# ============================================================================

SECTION_TEMPLATES_V2_STANDARD = [
    {
        "section_number": "1",
        "section_id": "parties_children",
        "section_title": "Parties & Children",
        "section_type": "parties",
        "display_order": 1,
        "is_required": True,
        "description": "Identifies all parties and children covered by this agreement",
        "template": "This SharedCare Agreement is entered into between the following parents regarding the care of their child(ren).",
        "fields": [
            "parent_a_name", "parent_a_email", "parent_a_phone",
            "parent_b_name", "parent_b_email", "parent_b_phone",
            "children", "current_arrangements"
        ]
    },
    {
        "section_number": "2",
        "section_id": "scope_duration",
        "section_title": "Agreement Scope & Duration",
        "section_type": "scope",
        "display_order": 2,
        "is_required": True,
        "description": "Defines when this agreement takes effect and how long it lasts",
        "template": "This agreement shall be effective as of the date signed and shall remain in effect until modified by mutual written consent.",
        "fields": [
            "effective_date", "duration_type", "end_date",
            "review_schedule", "amendment_process"
        ]
    },
    {
        "section_number": "3",
        "section_id": "parenting_time",
        "section_title": "Parenting Time Structure",
        "section_type": "schedule",
        "display_order": 3,
        "is_required": True,
        "description": "Establishes the baseline parenting schedule",
        "template": "The parties agree to the following parenting time arrangement:",
        "fields": [
            "primary_residence", "schedule_pattern", "transition_day",
            "transition_time", "schedule_notes"
        ]
    },
    {
        "section_number": "4",
        "section_id": "logistics_transitions",
        "section_title": "Logistics & Transitions",
        "section_type": "logistics",
        "display_order": 4,
        "is_required": True,
        "description": "Details for smooth custody exchanges",
        "template": "Custody exchanges shall be conducted as follows:",
        "fields": [
            "exchange_location", "exchange_location_address",
            "transportation_responsibility", "transition_communication",
            "backup_plan"
        ]
    },
    {
        "section_number": "5",
        "section_id": "decision_communication",
        "section_title": "Decision-Making & Communication",
        "section_type": "decision_making",
        "display_order": 5,
        "is_required": True,
        "description": "How parents make decisions and communicate",
        "template": "The parties agree to the following decision-making and communication framework:",
        "fields": [
            "major_decision_authority", "education_decisions",
            "healthcare_decisions", "religion_decisions",
            "extracurricular_decisions", "communication_platform",
            "response_timeframe", "emergency_contact_order"
        ]
    },
    {
        "section_number": "6",
        "section_id": "expenses_financial",
        "section_title": "Expenses & Financial Cooperation",
        "section_type": "financial",
        "display_order": 6,
        "is_required": False,  # Optional - handled via ClearFund if not specified
        "description": "Shared expense management (non-court-ordered)",
        "template": "The parties agree to share expenses for the children as follows:",
        "fields": [
            "expense_categories", "split_ratio",
            "reimbursement_window", "documentation_required",
            "payment_method"
        ]
    },
    {
        "section_number": "7",
        "section_id": "modification_disputes",
        "section_title": "Modification, Disputes & Acknowledgment",
        "section_type": "legal",
        "display_order": 7,
        "is_required": True,
        "description": "How to handle changes and disagreements",
        "template": "The parties acknowledge this agreement and agree to the following modification and dispute resolution process:",
        "fields": [
            "modification_triggers", "dispute_resolution_steps",
            "escalation_timeframe", "parent_a_acknowledgment",
            "parent_b_acknowledgment", "acknowledgment_date"
        ]
    }
]


# ============================================================================
# V2 LITE - 5 Sections (Low-Conflict)
# ============================================================================

SECTION_TEMPLATES_V2_LITE = [
    {
        "section_number": "1",
        "section_id": "parties_children",
        "section_title": "Parties & Children",
        "section_type": "parties",
        "display_order": 1,
        "is_required": True,
        "description": "Identifies all parties and children covered by this agreement",
        "template": "This SharedCare Agreement is entered into between the following parents regarding the care of their child(ren).",
        "fields": [
            "parent_a_name", "parent_b_name", "children"
        ]
    },
    {
        "section_number": "2",
        "section_id": "scope_duration",
        "section_title": "Scope & Duration",
        "section_type": "scope",
        "display_order": 2,
        "is_required": True,
        "description": "When this agreement is effective",
        "template": "This agreement is effective immediately and remains in effect until modified by mutual consent.",
        "fields": [
            "effective_date", "review_schedule"
        ]
    },
    {
        "section_number": "3",
        "section_id": "parenting_time",
        "section_title": "Parenting Time Structure",
        "section_type": "schedule",
        "display_order": 3,
        "is_required": True,
        "description": "Baseline parenting schedule",
        "template": "The parties agree to the following parenting time arrangement:",
        "fields": [
            "primary_residence", "schedule_pattern",
            "transition_day", "transition_time"
        ]
    },
    {
        "section_number": "4",
        "section_id": "logistics_expenses",
        "section_title": "Logistics & Expenses",
        "section_type": "logistics",
        "display_order": 4,
        "is_required": True,
        "description": "Exchange details and expense sharing",
        "template": "The parties agree to the following logistics and expense arrangements:",
        "fields": [
            "exchange_location", "transportation_responsibility",
            "expense_split", "communication_method"
        ]
    },
    {
        "section_number": "5",
        "section_id": "acknowledgment",
        "section_title": "Acknowledgment",
        "section_type": "legal",
        "display_order": 5,
        "is_required": True,
        "description": "Parent signatures and acknowledgment",
        "template": "Both parties acknowledge this agreement and commit to following its terms in good faith.",
        "fields": [
            "parent_a_acknowledgment", "parent_b_acknowledgment",
            "acknowledgment_date"
        ]
    }
]


# ============================================================================
# Combined Templates Dictionary
# ============================================================================

SECTION_TEMPLATES_V2 = {
    "v2_standard": SECTION_TEMPLATES_V2_STANDARD,
    "v2_lite": SECTION_TEMPLATES_V2_LITE,
    "v1": SECTION_TEMPLATES,  # Original 18-section format (ARIA Professional)
}


# ============================================================================
# Conflict Signal Detection
# ============================================================================

CONFLICT_SIGNALS = {
    "high": [
        "lawyer", "attorney", "court order", "custody battle",
        "refuses", "won't agree", "hostile", "threatened",
        "police", "restraining", "abuse", "safety", "supervised",
        "emergency", "violence", "dangerous", "fear"
    ],
    "moderate": [
        "disagree", "argument", "difficult", "frustrated",
        "won't communicate", "ignores", "late", "unreliable",
        "never", "always", "doesn't care", "unresponsive"
    ],
    "low": [
        "amicable", "friendly", "cooperative", "flexible",
        "works well", "agrees", "supportive", "reasonable",
        "good relationship", "communicate well", "no issues"
    ]
}


# ============================================================================
# Request/Response Schemas
# ============================================================================

class AgreementCreateV2(BaseModel):
    """Create a new v2 SharedCare Agreement."""
    title: str = "SharedCare Agreement"
    agreement_version: AgreementVersionType = AgreementVersionType.V2_STANDARD


class SectionTemplateResponse(BaseModel):
    """Section template information."""
    section_number: str
    section_id: str
    section_title: str
    section_type: str
    display_order: int
    is_required: bool
    description: str
    template: str
    fields: List[str]


class AgreementTemplatesResponse(BaseModel):
    """Response with available agreement templates."""
    version: str
    section_count: int
    sections: List[SectionTemplateResponse]


class ConflictAssessmentRequest(BaseModel):
    """Request to assess conflict level from conversation."""
    conversation_history: List[Dict[str, Any]]
    has_financial_disputes: bool = False


class ConflictAssessmentResponse(BaseModel):
    """Response with conflict assessment results."""
    conflict_level: ConflictLevel
    recommended_version: AgreementVersionType
    signals_detected: List[str]
    recommendation_reason: str


# ============================================================================
# Quick Accord Suggestions
# ============================================================================

QUICK_ACCORD_SUGGESTIONS = [
    {
        "id": "holiday_schedule",
        "title": "Holiday Schedule",
        "description": "Detailed day/time allocations for holidays throughout the year",
        "when_to_suggest": "After completing Section 3 (Parenting Time)"
    },
    {
        "id": "summer_vacation",
        "title": "Summer Vacation Plan",
        "description": "Extended vacation time during summer break",
        "when_to_suggest": "After completing Section 3 (Parenting Time)"
    },
    {
        "id": "travel_consent",
        "title": "Travel Consent Agreement",
        "description": "Procedures for travel outside the area with children",
        "when_to_suggest": "After completing Section 4 (Logistics)"
    },
    {
        "id": "school_breaks",
        "title": "School Break Schedule",
        "description": "Winter, spring, and other school break arrangements",
        "when_to_suggest": "After completing Section 3 (Parenting Time)"
    },
    {
        "id": "special_occasions",
        "title": "Special Occasions",
        "description": "Birthdays, Mother's/Father's Day, and family events",
        "when_to_suggest": "After completing Section 3 (Parenting Time)"
    },
    {
        "id": "extracurricular_commitment",
        "title": "Extracurricular Activities Agreement",
        "description": "Sports, lessons, and activity commitments",
        "when_to_suggest": "After completing Section 5 (Decision-Making)"
    }
]


def get_section_templates(version: str) -> List[Dict[str, Any]]:
    """Get section templates for a specific agreement version."""
    if version not in SECTION_TEMPLATES_V2:
        version = "v2_standard"
    return SECTION_TEMPLATES_V2[version]


def get_section_count(version: str) -> int:
    """Get the number of sections for a specific version."""
    templates = get_section_templates(version)
    return len(templates)


def get_required_sections(version: str) -> List[Dict[str, Any]]:
    """Get only required sections for a version."""
    templates = get_section_templates(version)
    return [t for t in templates if t.get("is_required", False)]


def suggest_quick_accords(completed_section_id: str) -> List[Dict[str, Any]]:
    """Suggest relevant Quick Accords based on completed section."""
    suggestions = []
    for accord in QUICK_ACCORD_SUGGESTIONS:
        # Check if this section triggers the suggestion
        trigger = accord.get("when_to_suggest", "")
        if completed_section_id in trigger.lower():
            suggestions.append(accord)
    return suggestions
