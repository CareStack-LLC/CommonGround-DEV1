"""
ARIA Intake Templates Configuration.

Defines all pre-built intake templates that drive ARIA's conversation flow.
Each template has sections with specific questions, estimated time,
tier requirements, and target court form mappings.
"""

from typing import Optional


# =============================================================================
# Template Data Structures
# =============================================================================

class IntakeSection:
    """A section within an intake template."""
    __slots__ = ("id", "title", "description", "questions", "required")

    def __init__(self, id: str, title: str, description: str, questions: list[str], required: bool = True):
        self.id = id
        self.title = title
        self.description = description
        self.questions = questions
        self.required = required

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "questions": self.questions,
            "required": self.required,
        }


class IntakeTemplate:
    """A complete intake template definition."""
    __slots__ = ("id", "name", "description", "icon", "estimated_time", "tier", "form_targets", "sections", "required_fields")

    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        icon: str,
        estimated_time: int,
        tier: str,
        form_targets: list[str],
        sections: list[IntakeSection],
        required_fields: Optional[list[dict]] = None,
    ):
        self.id = id
        self.name = name
        self.description = description
        self.icon = icon
        self.estimated_time = estimated_time
        self.tier = tier  # "free" or "paid"
        self.form_targets = form_targets
        self.sections = sections
        self.required_fields = required_fields or []

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "estimated_time": self.estimated_time,
            "tier": self.tier,
            "form_targets": self.form_targets,
            "sections": [s.to_dict() for s in self.sections],
            "required_fields": self.required_fields,
        }


# =============================================================================
# Template Definitions
# =============================================================================

INTAKE_TEMPLATES: dict[str, IntakeTemplate] = {}


def _register(template: IntakeTemplate):
    INTAKE_TEMPLATES[template.id] = template


# ── 1. Comprehensive Custody Agreement ────────────────────────────

_register(IntakeTemplate(
    id="comprehensive-custody",
    name="Comprehensive Custody Agreement",
    description="Complete 17-section intake covering all aspects of custody, parenting time, support, and co-parenting",
    icon="📋",
    estimated_time=45,
    tier="free",
    form_targets=["FL-341", "FL-311", "FL-312", "FL-150", "FL-342"],
    sections=[
        # ... (sections content)
    ],
    required_fields=[
        {"name": "parent_full_name", "type": "string", "description": "Legal name of the parent providing the intake"},
        {"name": "parent_address", "type": "string", "description": "Current residential address"},
        {"name": "other_parent_name", "type": "string", "description": "Legal name of the co-parent"},
        {"name": "children_list", "type": "array", "description": "Full name, DOB, and current school for each child"},
        {"name": "agreement_date", "type": "date", "description": "Date informal agreement started (if any)"},
        {"name": "legal_custody", "type": "enum", "description": "Joint or Sole decision-making authority"},
        {"name": "physical_custody", "type": "string", "description": "Requested physical custody split"},
        {"name": "parenting_schedule", "type": "string", "description": "Specific weekly rotation"},
        {"name": "holiday_rotation", "type": "string", "description": "Logic for alternating major holidays"},
        {"name": "exchange_location", "type": "string", "description": "Public or private location for handovers"},
        {"name": "concerns", "type": "string", "description": "Specific background or worries affecting the plan"}
    ]
))
))


# ── 2. Custody & Visitation Only ──────────────────────────────────

_register(IntakeTemplate(
    id="custody-only",
    name="Custody & Visitation Only",
    description="Focused intake for custody and parenting time (no financial support)",
    icon="👨‍👩‍👧‍👦",
    estimated_time=25,
    tier="free",
    form_targets=["FL-341", "FL-311"],
    sections=[
        # ... (sections content)
    ],
    required_fields=[
        {"name": "parent_full_name", "type": "string", "description": "Full name"},
        {"name": "children_list", "type": "array", "description": "Children info"},
        {"name": "current_access_pattern", "type": "string", "description": "Narrative of current time spend"},
        {"name": "proposed_schedule", "type": "string", "description": "Specific request for days/times"},
        {"name": "paternity_established", "type": "boolean", "description": "Legal determination of parentage"},
        {"name": "transportation_plan", "type": "string", "description": "Who is responsible for pick-ups/drop-offs"}
    ]
))
))


# ── 3. Child Support Only ─────────────────────────────────────────

_register(IntakeTemplate(
    id="child-support",
    name="Child Support Only",
    description="Financial support calculation and modification",
    icon="💰",
    estimated_time=20,
    tier="free",
    form_targets=["FL-150", "FL-342"],
    sections=[
        # ... (sections content)
    ],
    required_fields=[
        {"name": "parent_gross_pay", "type": "number", "description": "Monthly pre-tax income"},
        {"name": "employer_details", "type": "string", "description": "Employer name and city"},
        {"name": "childcare_costs", "type": "number", "description": "Monthly out-of-pocket childcare spending"},
        {"name": "health_premium", "type": "number", "description": "Insurance portion for children"},
        {"name": "custody_percentage", "type": "number", "description": "Current time spent with children (%)"}
    ]
))
))


# ── 4. Modification of Existing Order ─────────────────────────────

_register(IntakeTemplate(
    id="modification",
    name="Modification of Existing Order",
    description="Request to change an existing custody or support order",
    icon="📝",
    estimated_time=20,
    tier="paid",
    form_targets=["FL-300"],
    sections=[
        # ... (sections content)
    ],
    required_fields=[
        {"name": "original_order_date", "type": "date", "description": "Date current order was signed"},
        {"name": "existing_case_id", "type": "string", "description": "Court case number"},
        {"name": "circumstances_change", "type": "string", "description": "Change triggering the request"},
        {"name": "requested_updates", "type": "string", "description": "Terms to be modified"},
        {"name": "children_impact", "type": "string", "description": "How the change benefits the children"}
    ]
))
))


# ── 5. Visitation Rights ──────────────────────────────────────────

_register(IntakeTemplate(
    id="visitation-only",
    name="Visitation Rights",
    description="Establish or modify visitation schedule (for non-custodial parent)",
    icon="🗓️",
    estimated_time=15,
    tier="paid",
    form_targets=["FL-311"],
    sections=[
        # ... (sections content)
    ],
    required_fields=[
        {"name": "parent_full_name", "type": "string", "description": "Full name"},
        {"name": "children_list", "type": "array", "description": "Children info"},
        {"name": "current_access_pattern", "type": "string", "description": "Narrative of current time spend"},
        {"name": "proposed_schedule", "type": "string", "description": "Specific request for days/times"},
        {"name": "paternity_established", "type": "boolean", "description": "Legal determination of parentage"},
        {"name": "transportation_plan", "type": "string", "description": "Who is responsible for pick-ups/drop-offs"}
    ]
))
))


# ── 6. Domestic Violence Case Screening ───────────────────────────

_register(IntakeTemplate(
    id="domestic-violence-screening",
    name="Domestic Violence Case Screening",
    description="Sensitive intake for cases involving domestic violence (DV)",
    icon="🛡️",
    estimated_time=30,
    tier="paid",
    form_targets=["DV-100", "DV-110"],
    sections=[
        # ... (sections content)
    ],
    required_fields=[
        {"name": "immediate_safety", "type": "boolean", "description": "Immediate safety confirmation"},
        {"name": "incident_chronology", "type": "array", "description": "Dates and summaries of safety incidents"},
        {"name": "police_involvement", "type": "boolean", "description": "Presence of law enforcement records"},
        {"name": "address_protection", "type": "boolean", "description": "Request for residential confidentiality"},
        {"name": "supervised_handovers", "type": "string", "description": "Need for supervision"}
    ]
))
))


# ── 7. Move-Away / Relocation ─────────────────────────────────────

_register(IntakeTemplate(
    id="relocation",
    name="Move-Away / Relocation",
    description="Request to relocate with children to a new area",
    icon="🚚",
    estimated_time=25,
    tier="paid",
    form_targets=["FL-300"],
    sections=[
        # ... (sections content)
    ],
    required_fields=[
        {"name": "destination_details", "type": "string", "description": "Targeted city and state"},
        {"name": "proposed_move_date", "type": "date", "description": "Anticipated relocation date"},
        {"name": "move_justification", "type": "string", "description": "Reason for move"},
        {"name": "long_distance_plan", "type": "string", "description": "Plan for long-distance contact"}
    ]
))
))


# ── 8. Initial Consultation Intake ────────────────────────────────

_register(IntakeTemplate(
    id="initial-consultation",
    name="Initial Consultation Intake",
    description="Quick intake for first meeting with attorney",
    icon="👋",
    estimated_time=10,
    tier="free",
    form_targets=[],
    sections=[
        IntakeSection("contact", "Contact Information", "How to reach you", [
            "Your full name",
            "Phone number",
            "Email address",
            "Preferred contact method",
            "Best times to reach you",
        ]),
        IntakeSection("situation-overview", "Your Situation", "Quick overview", [
            "Are you married, divorced, separated, or never married?",
            "Do you have children? How many?",
            "Ages of children",
            "Where do the children currently live?",
            "Is there a current court case? If yes, what county/case number?",
        ]),
        IntakeSection("main-issues", "Main Issues", "What brings you here", [
            "What is the main issue you need help with?",
            "Is this about custody? Child support? Divorce? Domestic violence?",
            "Is this urgent?",
            "What is your main goal?",
        ]),
        IntakeSection("timeline", "Timeline & Urgency", "When you need help", [
            "When do you need to take action?",
            "Do you have upcoming court dates?",
            "Are there safety concerns?",
            "Is the other parent represented by an attorney?",
        ]),
        IntakeSection("additional-info", "Anything Else", "Other important information", [
            "Is there anything else the attorney should know before your consultation?",
            "Do you have any specific questions you want to make sure are addressed?",
        ], required=False),
    ],
))


# =============================================================================
# Helper Functions
# =============================================================================

def get_intake_template(template_id: str) -> Optional[IntakeTemplate]:
    """Get a template by ID. Returns None if not found."""
    return INTAKE_TEMPLATES.get(template_id)


def get_available_templates(professional_tier: str) -> list[IntakeTemplate]:
    """
    Get templates available for a given professional tier.
    
    Free-tier templates are available to everyone.
    Paid templates require 'solo', 'small-firm', 'mid-size', or 'enterprise'.
    """
    is_paid_tier = professional_tier not in ("starter", None, "")
    return [
        t for t in INTAKE_TEMPLATES.values()
        if t.tier == "free" or (t.tier == "paid" and is_paid_tier)
    ]


def get_all_templates() -> list[IntakeTemplate]:
    """Return all templates regardless of tier."""
    return list(INTAKE_TEMPLATES.values())


def build_sections_prompt(template: IntakeTemplate) -> str:
    """
    Build the SECTIONS TO COVER block for the system prompt.
    
    This generates a numbered overview of all sections with their 
    questions, which gets injected into the ARIA system prompt.
    """
    lines = []
    for i, section in enumerate(template.sections, 1):
        required_tag = " [REQUIRED]" if section.required else " [OPTIONAL]"
        lines.append(f"{i}. {section.title}{required_tag}: {section.description}")
        for q in section.questions:
            lines.append(f"   - {q}")
    return "\n".join(lines)
