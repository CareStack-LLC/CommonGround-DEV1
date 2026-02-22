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
    __slots__ = ("id", "name", "description", "icon", "estimated_time", "tier", "form_targets", "sections")

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
    ):
        self.id = id
        self.name = name
        self.description = description
        self.icon = icon
        self.estimated_time = estimated_time
        self.tier = tier  # "free" or "paid"
        self.form_targets = form_targets
        self.sections = sections

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
        IntakeSection("parent-info", "Parent Information", "Basic contact information for both parents", [
            "Your full legal name",
            "Your address",
            "Your phone number and email",
            "Other parent's full legal name",
            "Other parent's address (if known)",
            "Other parent's contact information (if known)",
        ]),
        IntakeSection("children", "Children Information", "Details about all children involved", [
            "How many children are involved in this case?",
            "For each child: Full name, date of birth, age",
            "Where does each child currently live?",
            "What school does each child attend?",
            "Does any child have special needs or medical conditions?",
        ]),
        IntakeSection("legal-custody", "Legal Custody (Decision-Making)", "Who makes major decisions about the children", [
            "What is the current legal custody arrangement?",
            "What are you requesting for legal custody? (joint or sole)",
            "Who should make decisions about education?",
            "Who should make decisions about medical care?",
            "Who should make decisions about religious upbringing?",
            "How should disagreements be resolved?",
        ]),
        IntakeSection("physical-custody", "Physical Custody (Where Children Live)", "Primary residence and living arrangements", [
            "What is the current physical custody arrangement?",
            "Where should the children primarily live?",
            "What percentage split are you seeking? (50/50, 60/40, 70/30, etc.)",
            "Why is this arrangement in the children's best interest?",
        ]),
        IntakeSection("parenting-schedule", "Regular Parenting Schedule", "Weekly schedule during school year", [
            "What schedule do you prefer during the school year?",
            "Which weekdays would you like with the children?",
            "Which weekends would you like?",
            "What time should weekday exchanges happen?",
            "What time should weekend exchanges happen?",
            "Are overnight visits okay for both parents?",
        ]),
        IntakeSection("holidays", "Holiday Schedule", "How to share major holidays", [
            "How should Thanksgiving be shared?",
            "How should Christmas/winter break be divided?",
            "How should New Year's be handled?",
            "How should Easter/spring break be divided?",
            "How should the children's birthdays be celebrated?",
            "How should each parent's birthday be handled?",
            "How should Mother's Day and Father's Day work?",
            "Are there religious holidays to include?",
            "Should the schedule alternate each year?",
        ]),
        IntakeSection("summer", "Summer Schedule", "Parenting time during summer break", [
            "Should the summer schedule be different from school year?",
            "How much vacation time should each parent have?",
            "How much notice is needed for vacation plans?",
            "Should the regular schedule continue during summer?",
        ], required=False),
        IntakeSection("exchanges", "Custody Exchanges", "Where and how children are exchanged", [
            "Where should exchanges happen? (home, school, public location)",
            "Who should transport the children?",
            "What if someone is running late? How much notice is needed?",
            "Should exchanges be contactless?",
            "Are there any safety concerns about exchanges?",
        ]),
        IntakeSection("transportation", "Transportation", "Who drives and distance limits", [
            "Who provides transportation for exchanges?",
            "Should parents split the driving?",
            "Are there distance limits for how far children can be from school?",
            "Who pays for transportation costs?",
            "What about car seats and safety equipment?",
        ], required=False),
        IntakeSection("child-support", "Child Support", "Financial support for children", [
            "What is your current gross monthly income?",
            "What is the other parent's income (if known)?",
            "Is there a current child support order? If yes, what amount?",
            "What are you requesting for child support?",
            "Who pays for health insurance?",
            "How should medical expenses be split?",
            "How should extracurricular activities be paid for?",
            "How should school expenses (supplies, fees) be handled?",
        ]),
        IntakeSection("medical", "Medical Care", "Healthcare and insurance", [
            "Which parent currently provides health insurance?",
            "Who are the children's regular doctors/dentists?",
            "Are there ongoing medical treatments or medications?",
            "How will medical appointments be scheduled?",
            "Who should be notified of medical issues?",
            "How should emergency medical decisions be made?",
        ]),
        IntakeSection("education", "Education", "School and educational decisions", [
            "Where do the children currently attend school?",
            "Should they continue at the same school?",
            "Who should attend parent-teacher conferences?",
            "How should school communications be shared?",
            "Who helps with homework?",
            "How should educational expenses be paid?",
        ]),
        IntakeSection("parent-communication", "Parent-to-Parent Communication", "How parents will communicate with each other", [
            "How should you and the other parent communicate? (text, email, app)",
            "How quickly should messages be answered?",
            "What topics require immediate communication?",
            "How should disagreements be handled?",
            "Should communication be limited to children's topics only?",
        ]),
        IntakeSection("child-contact", "Child Contact", "Phone/video calls with children", [
            "Should the children be able to call/video chat with the other parent?",
            "How often? Daily? A few times per week?",
            "What times are appropriate for calls?",
            "Any restrictions on call length?",
            "What if a call is missed?",
        ]),
        IntakeSection("travel", "Travel", "Domestic and international travel", [
            "Should there be restrictions on travel with the children?",
            "How much advance notice for trips?",
            "Is international travel okay? Any restrictions?",
            "Do both parents need to approve travel?",
            "Who holds the children's passports?",
        ], required=False),
        IntakeSection("relocation", "Relocation", "Rules if a parent wants to move", [
            "How much notice is required if a parent plans to move?",
            "How far can a parent move without court approval?",
            "What happens to the custody schedule if someone moves?",
            "Should there be restrictions on moving out of state?",
        ], required=False),
        IntakeSection("dispute-resolution", "Dispute Resolution", "How to handle disagreements", [
            "How should you and the other parent resolve disagreements?",
            "Should you try mediation before going to court?",
            "Are there specific mediators you'd like to use?",
            "Who pays for mediation?",
        ]),
    ],
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
        IntakeSection("parent-info", "Parent Information", "Basic information", [
            "Your full name and contact information",
            "Other parent's name and contact (if known)",
            "Current relationship status",
        ]),
        IntakeSection("children", "Children", "Children involved", [
            "Names, ages, and birthdates of all children",
            "Where each child currently lives",
            "Current school for each child",
        ]),
        IntakeSection("current-arrangement", "Current Custody Arrangement", "What's happening now", [
            "What is the current custody situation?",
            "Is there a court order in place?",
            "What percentage of time does each parent have?",
            "What's working and what's not working?",
        ]),
        IntakeSection("requested-custody", "Requested Custody", "What you're asking for", [
            "What custody arrangement are you requesting?",
            "Joint or sole legal custody? Why?",
            "What physical custody percentage?",
            "Why is this best for the children?",
        ]),
        IntakeSection("schedule", "Proposed Schedule", "When children would be with each parent", [
            "Preferred weekday schedule",
            "Preferred weekend schedule",
            "Holiday preferences",
            "Summer schedule preferences",
            "Exchange times and locations",
        ]),
        IntakeSection("special-considerations", "Special Considerations", "Important factors", [
            "Any safety concerns?",
            "Special needs of children?",
            "Work schedules affecting availability?",
            "Distance between homes?",
            "Any other important factors?",
        ], required=False),
    ],
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
        IntakeSection("parent-info", "Parent Information", "Contact and basic information", [
            "Your full name and contact information",
            "Other parent's name and contact",
            "Marital status",
        ]),
        IntakeSection("children", "Children", "Children receiving support", [
            "Names and birthdates of all children",
            "Which children are included in this support case?",
            "Where does each child primarily live?",
        ]),
        IntakeSection("current-order", "Current Support Order", "Existing child support", [
            "Is there a current child support order?",
            "What is the current monthly amount?",
            "When was the order last modified?",
            "Is support being paid regularly?",
            "Is there arrears (back child support owed)?",
        ]),
        IntakeSection("your-income", "Your Income & Expenses", "Your financial information", [
            "What is your gross monthly income?",
            "What is your employment? Employer name?",
            "Do you receive bonuses, overtime, or commissions?",
            "Do you have other income sources? (rental, investments, etc.)",
            "What are your monthly childcare costs?",
            "Do you pay health insurance premiums for the children? How much?",
            "Do you have other children you support financially?",
        ]),
        IntakeSection("other-parent-income", "Other Parent's Income", "Their financial information (if known)", [
            "What is their gross monthly income (if known)?",
            "What is their employment?",
            "Do they have other income sources?",
            "Do they pay for childcare?",
            "Do they provide health insurance for the children?",
        ], required=False),
        IntakeSection("custody-time", "Parenting Time", "Time children spend with each parent", [
            "What percentage of time do children spend with you?",
            "What percentage with the other parent?",
            "Is this documented in a custody order?",
        ]),
        IntakeSection("expenses", "Child-Related Expenses", "Costs for the children", [
            "Monthly childcare or daycare costs",
            "Health insurance premium for children",
            "Uninsured medical/dental expenses (monthly average)",
            "School costs (tuition, fees, supplies)",
            "Extracurricular activities costs",
            "Special needs expenses",
            "Any other significant child expenses?",
        ]),
        IntakeSection("request", "Your Request", "What you're asking for", [
            "What are you requesting for child support?",
            "Why is a change needed?",
            "Has there been a significant change in circumstances?",
            "When should the new amount start?",
        ]),
    ],
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
        IntakeSection("case-info", "Existing Case Information", "Current court order details", [
            "What is your case number?",
            "What court issued the original order?",
            "When was the order issued?",
            "Do you have a copy of the order?",
        ]),
        IntakeSection("current-order", "Current Order Terms", "What the order says now", [
            "What does the current order say about custody?",
            "What is the current parenting schedule?",
            "What is the current child support amount?",
            "Any other important terms?",
        ]),
        IntakeSection("what-changed", "Changed Circumstances", "What's different now", [
            "What has changed since the last order?",
            "When did this change occur?",
            "Why does the order need to be modified?",
            "How do these changes affect the children?",
        ]),
        IntakeSection("requested-changes", "Requested Changes", "What you want modified", [
            "What specific changes are you requesting?",
            "To custody? To the schedule? To child support?",
            "Why are these changes in the children's best interest?",
            "When should the changes take effect?",
        ]),
        IntakeSection("supporting-info", "Supporting Information", "Evidence for your request", [
            "Do you have documentation of the changed circumstances?",
            "Are there witnesses who can support your request?",
            "Have you tried to work this out with the other parent?",
            "Is the other parent likely to agree or oppose?",
        ], required=False),
    ],
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
        IntakeSection("relationship", "Your Relationship to Child", "Basic information", [
            "What is your relationship to the child/children?",
            "Are you the legal parent?",
            "Is paternity established?",
            "Do you currently have visitation?",
        ]),
        IntakeSection("current-contact", "Current Contact with Children", "Current situation", [
            "How often do you currently see the children?",
            "When was your last visit?",
            "Where do visits typically occur?",
            "Is anyone supervising visits?",
            "Why are you seeking court-ordered visitation?",
        ]),
        IntakeSection("requested-schedule", "Requested Visitation Schedule", "What you're asking for", [
            "How often would you like to visit?",
            "Which days and times?",
            "Overnight visits?",
            "Holiday and vacation time?",
            "Where should visits take place?",
        ]),
        IntakeSection("barriers", "Barriers to Visitation", "Any obstacles", [
            "Is the other parent preventing contact?",
            "Are there any allegations against you?",
            "Are there any safety concerns?",
            "Do you have stable housing for visits?",
            "Any substance abuse or mental health issues to address?",
        ], required=False),
    ],
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
        IntakeSection("safety-first", "Safety Assessment", "Your immediate safety", [
            "Are you currently in a safe location?",
            "Can you complete this intake privately without the other parent knowing?",
            "Do you have a safety plan if things escalate?",
            "Do you have somewhere safe to go if needed?",
            "Are the children currently safe?",
        ]),
        IntakeSection("protective-orders", "Current Protective Orders", "Existing legal protections", [
            "Do you currently have a restraining order?",
            "If yes, when does it expire?",
            "Have you filed for a restraining order before?",
            "Is the other parent violating any orders?",
        ]),
        IntakeSection("abuse-history", "History of Abuse", "Past incidents (you can share what you're comfortable with)", [
            "How long has the abuse been occurring?",
            "What types of abuse have you experienced? (physical, emotional, sexual, financial)",
            "Has the other parent threatened you or the children?",
            "Have police ever been called? Any reports filed?",
            "Have you or the children been injured? Any medical treatment?",
            "Are there witnesses to the abuse?",
        ]),
        IntakeSection("recent-incidents", "Recent Incidents", "Most recent abuse", [
            "When was the most recent incident?",
            "What happened?",
            "Were the children present or involved?",
            "Did you report it? To police? To anyone else?",
            "Do you have photos, texts, emails, or other evidence?",
        ]),
        IntakeSection("children-exposure", "Children's Exposure to Violence", "Impact on children", [
            "Have the children witnessed violence between you and the other parent?",
            "Has the other parent ever harmed the children?",
            "Are you afraid the other parent might hurt the children?",
            "Have the children shown signs of trauma? (nightmares, anxiety, behavioral changes)",
            "Do the children have a relationship with the other parent?",
        ]),
        IntakeSection("custody-concerns", "Custody & Visitation Concerns", "What you need for safety", [
            "Should visitation with the other parent be supervised? Why?",
            "Are exchanges dangerous? Do they need to be in a public place or police station?",
            "Should the other parent know your address?",
            "Should communication be limited to a specific app or through a third party?",
            "What custody arrangement would keep you and the children safe?",
        ]),
        IntakeSection("support-resources", "Support & Resources", "Help available to you", [
            "Are you working with a domestic violence advocate?",
            "Have you contacted a DV shelter or hotline?",
            "Do you need referrals to DV services?",
            "Are you receiving counseling or therapy?",
            "Do you have supportive family or friends?",
        ], required=False),
    ],
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
        IntakeSection("move-details", "Proposed Move", "Where and when", [
            "Where do you plan to move?",
            "How far is it from your current location?",
            "When do you plan to move?",
            "Is this move definite or conditional?",
            "Have you accepted a job/signed a lease?",
        ]),
        IntakeSection("reason", "Reason for Move", "Why you need to relocate", [
            "Why are you moving?",
            "Employment opportunity?",
            "Family support?",
            "Financial reasons?",
            "Educational opportunity?",
            "Is this the only way to achieve your goals, or are there alternatives?",
        ]),
        IntakeSection("impact-children", "Impact on Children", "How move affects kids", [
            "How will the move benefit the children?",
            "What schools will they attend?",
            "How will their daily lives change?",
            "Will they be closer to family/support system?",
            "What activities/relationships will they lose?",
            "How are the children feeling about the move?",
        ]),
        IntakeSection("impact-other-parent", "Impact on Other Parent's Relationship", "Effect on the other parent", [
            "How will this affect the other parent's time with the children?",
            "What is the current custody schedule?",
            "What custody schedule are you proposing after the move?",
            "How will the other parent maintain a relationship with the children?",
            "Who will pay for travel costs?",
        ]),
        IntakeSection("proposed-plan", "Proposed Parenting Plan", "How custody will work long-distance", [
            "Proposed schedule during school year",
            "Proposed schedule for summers",
            "Proposed schedule for holidays and breaks",
            "Video calls/phone contact plan",
            "Transportation arrangements",
            "Who pays for travel?",
            "Meeting location for exchanges",
        ]),
        IntakeSection("other-parent-position", "Other Parent's Position", "Their response to move", [
            "Have you told the other parent about the move?",
            "What is their reaction?",
            "Are they willing to agree to the move?",
            "Have you tried to negotiate a modified schedule?",
            "Do you expect them to oppose in court?",
        ]),
    ],
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
