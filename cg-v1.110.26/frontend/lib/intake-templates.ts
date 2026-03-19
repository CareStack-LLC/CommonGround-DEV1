/**
 * ARIA Intake Template Definitions
 *
 * Mirrors the backend intake_templates.py configuration.
 * Provides client-side type safety, template data for the
 * selector UI, and helpers for tier gating.
 */

// ── Types ──────────────────────────────────────────────────────────

export type IntakeTemplateId =
    | "comprehensive-custody"
    | "custody-only"
    | "child-support"
    | "modification"
    | "visitation-only"
    | "domestic-violence-screening"
    | "relocation"
    | "high-conflict"
    | "gal-investigation"
    | "initial-consultation";

export type ProfessionalRole = "Attorney" | "Mediator" | "GAL" | "Paralegal" | "Therapist";

export interface IntakeSection {
    id: string;
    title: string;
    description: string;
    questions: string[];
    required: boolean;
}

export interface IntakeTemplate {
    id: IntakeTemplateId;
    name: string;
    description: string;
    icon: string;
    estimatedTime: number; // minutes
    tier: "free" | "paid";
    bestFor: ProfessionalRole[];
    formTargets: string[];
    sections: IntakeSection[];
}

// ── Template Definitions ───────────────────────────────────────────

export const INTAKE_TEMPLATES: IntakeTemplate[] = [
    {
        id: "comprehensive-custody",
        name: "Comprehensive Custody Agreement",
        description:
            "Full 17-section intake covering custody, parenting time, support, and co-parenting. Produces a complete case summary with FL-341/311/312 data extraction.",
        icon: "📋",
        estimatedTime: 45,
        tier: "free",
        bestFor: ["Attorney", "Mediator"],
        formTargets: ["FL-341", "FL-311", "FL-312", "FL-150", "FL-342"],
        sections: [
            { id: "parent-info", title: "Parent Information", description: "Basic contact information for both parents", questions: ["Your full legal name", "Your address", "Other parent's name & contact"], required: true },
            { id: "children", title: "Children Information", description: "Details about all children involved", questions: ["Name, DOB, age for each child", "Current living situation", "School info & special needs"], required: true },
            { id: "legal-custody", title: "Legal Custody (Decision-Making)", description: "Who makes major decisions about the children", questions: ["Current arrangement", "Requested arrangement", "Education, medical, religious decisions"], required: true },
            { id: "physical-custody", title: "Physical Custody", description: "Primary residence and living arrangements", questions: ["Current arrangement", "Requested percentage split", "Justification"], required: true },
            { id: "parenting-schedule", title: "Regular Parenting Schedule", description: "Weekly schedule during school year", questions: ["Weekday preferences", "Weekend preferences", "Exchange times"], required: true },
            { id: "holidays", title: "Holiday Schedule", description: "How to share major holidays", questions: ["Thanksgiving, Christmas, New Year's", "Birthdays", "Alternating years"], required: true },
            { id: "summer", title: "Summer Schedule", description: "Parenting time during summer break", questions: ["Different from school year?", "Vacation time", "Notice required"], required: false },
            { id: "exchanges", title: "Custody Exchanges", description: "Where and how children are exchanged", questions: ["Location", "Transportation", "Safety concerns"], required: true },
            { id: "transportation", title: "Transportation", description: "Who drives and distance limits", questions: ["Split driving", "Distance limits", "Cost sharing"], required: false },
            { id: "child-support", title: "Child Support", description: "Financial support for children", questions: ["Income details", "Current order", "Insurance & expenses"], required: true },
            { id: "medical", title: "Medical Care", description: "Healthcare and insurance", questions: ["Insurance provider", "Ongoing treatments", "Emergency decisions"], required: true },
            { id: "education", title: "Education", description: "School and educational decisions", questions: ["Current school", "Conferences", "Expenses"], required: true },
            { id: "parent-communication", title: "Parent Communication", description: "How parents will communicate", questions: ["Method (text, email, app)", "Response time", "Topics requiring immediate communication"], required: true },
            { id: "child-contact", title: "Child Contact", description: "Phone/video calls with children", questions: ["Frequency", "Appropriate times", "Restrictions"], required: true },
            { id: "travel", title: "Travel", description: "Domestic and international travel", questions: ["Restrictions", "Notice required", "Passport holder"], required: false },
            { id: "relocation", title: "Relocation", description: "Rules if a parent wants to move", questions: ["Notice period", "Distance limits", "Out-of-state restrictions"], required: false },
            { id: "dispute-resolution", title: "Dispute Resolution", description: "How to handle disagreements", questions: ["Mediation first?", "Preferred mediators", "Cost sharing"], required: true },
        ],
    },
    {
        id: "custody-only",
        name: "Custody & Visitation Only",
        description: "Focused 6-section intake for custody and parenting time without financial components. Ideal for straightforward custody arrangements.",
        icon: "👨‍👩‍👧‍👦",
        estimatedTime: 25,
        tier: "free",
        bestFor: ["Attorney", "Mediator", "GAL"],
        formTargets: ["FL-341", "FL-311"],
        sections: [
            { id: "parent-info", title: "Parent Information", description: "Basic information", questions: ["Your name & contact", "Other parent's name & contact"], required: true },
            { id: "children", title: "Children", description: "Children involved", questions: ["Names, ages, birthdates", "Current living situation", "School info"], required: true },
            { id: "current-arrangement", title: "Current Custody Arrangement", description: "What's happening now", questions: ["Current situation", "Court order in place?", "What's working / not working"], required: true },
            { id: "requested-custody", title: "Requested Custody", description: "What you're asking for", questions: ["Joint or sole?", "Physical custody %", "Best interest justification"], required: true },
            { id: "schedule", title: "Proposed Schedule", description: "When children would be with each parent", questions: ["Weekdays", "Weekends", "Holidays", "Exchanges"], required: true },
            { id: "special-considerations", title: "Special Considerations", description: "Important factors", questions: ["Safety concerns", "Special needs", "Work schedules", "Distance"], required: false },
        ],
    },
    {
        id: "child-support",
        name: "Child Support Only",
        description: "Financial support calculation with income details, expenses, and arrears tracking. Generates FL-150/FL-342 data for guideline calculations.",
        icon: "💰",
        estimatedTime: 20,
        tier: "free",
        bestFor: ["Attorney", "Paralegal"],
        formTargets: ["FL-150", "FL-342"],
        sections: [
            { id: "parent-info", title: "Parent Information", description: "Contact and basic information", questions: ["Your name & contact", "Other parent's name & contact"], required: true },
            { id: "children", title: "Children", description: "Children receiving support", questions: ["Names & birthdates", "Primary residence"], required: true },
            { id: "current-order", title: "Current Support Order", description: "Existing child support", questions: ["Current amount", "Last modified", "Payment status", "Arrears"], required: true },
            { id: "your-income", title: "Your Income & Expenses", description: "Your financial information", questions: ["Gross monthly income", "Employment details", "Other income sources", "Childcare costs"], required: true },
            { id: "other-parent-income", title: "Other Parent's Income", description: "Their financial information (if known)", questions: ["Gross monthly income", "Employment", "Other income"], required: false },
            { id: "custody-time", title: "Parenting Time", description: "Time children spend with each parent", questions: ["% of time with you", "% with other parent", "Documented in order?"], required: true },
            { id: "expenses", title: "Child-Related Expenses", description: "Costs for the children", questions: ["Childcare", "Health insurance", "Medical/dental", "School costs", "Activities"], required: true },
            { id: "request", title: "Your Request", description: "What you're asking for", questions: ["Requested amount", "Reason for change", "Changed circumstances", "Start date"], required: true },
        ],
    },
    {
        id: "initial-consultation",
        name: "Initial Consultation",
        description: "Quick 5-section intake for first meetings. Captures the essentials so you can hit the ground running with a new client.",
        icon: "👋",
        estimatedTime: 10,
        tier: "free",
        bestFor: ["Attorney", "Paralegal", "Mediator"],
        formTargets: [],
        sections: [
            { id: "contact", title: "Contact Information", description: "How to reach you", questions: ["Full name", "Phone", "Email", "Preferred contact method"], required: true },
            { id: "situation-overview", title: "Your Situation", description: "Quick overview", questions: ["Marital status", "Number of children", "Current court case?"], required: true },
            { id: "main-issues", title: "Main Issues", description: "What brings you here", questions: ["Main issue", "Custody? Support? Divorce? DV?", "Urgency", "Main goal"], required: true },
            { id: "timeline", title: "Timeline & Urgency", description: "When you need help", questions: ["When action needed", "Upcoming court dates", "Safety concerns", "Other parent represented?"], required: true },
            { id: "additional-info", title: "Anything Else", description: "Other important information", questions: ["Anything else attorney should know?", "Specific questions?"], required: false },
        ],
    },
    {
        id: "high-conflict",
        name: "High-Conflict Case Intake",
        description: "Structured intake for contentious cases. Documents communication patterns, boundary violations, and conflict history to build an evidence-based strategy.",
        icon: "⚠️",
        estimatedTime: 30,
        tier: "free",
        bestFor: ["Attorney", "GAL", "Therapist"],
        formTargets: ["FL-341", "FL-311"],
        sections: [
            { id: "parent-info", title: "Parent Information", description: "Both parents' contact details", questions: ["Your name & contact", "Other parent's name & contact", "Attorneys involved"], required: true },
            { id: "children", title: "Children", description: "Children involved", questions: ["Names, ages, birthdates", "Special needs", "Therapy or counseling"], required: true },
            { id: "conflict-history", title: "Conflict History", description: "Pattern of conflict between parents", questions: ["How long has conflict been high?", "Main sources of disagreement", "Prior mediation attempts", "Police involvement?"], required: true },
            { id: "communication-issues", title: "Communication Breakdown", description: "How parent communication has deteriorated", questions: ["Current communication method", "Blocked or restricted?", "Hostile messages?", "Using children as messengers?"], required: true },
            { id: "boundary-violations", title: "Boundary Violations", description: "Instances where boundaries were crossed", questions: ["Schedule violations", "Unilateral decisions", "Interference with parenting time", "False allegations"], required: true },
            { id: "impact-on-children", title: "Impact on Children", description: "How conflict affects the children", questions: ["Behavioral changes", "School performance", "Anxiety or distress", "Children expressing preferences"], required: true },
            { id: "current-orders", title: "Current Orders & Compliance", description: "Existing court orders and adherence", questions: ["Current custody order", "Compliance by both parties", "Contempt filings", "Modifications pending"], required: true },
            { id: "safety-concerns", title: "Safety Concerns", description: "Any safety issues", questions: ["DV history", "Substance abuse", "Mental health concerns", "Supervised visitation needed?"], required: false },
            { id: "goals", title: "Goals & Strategy", description: "What outcome you're seeking", questions: ["Primary goal", "Willing to mediate?", "Open to parallel parenting?", "Timeline expectations"], required: true },
        ],
    },
    {
        id: "modification",
        name: "Modification of Existing Order",
        description: "Structured intake for order modifications. Documents changed circumstances and builds the case for why a modification serves the children's best interests.",
        icon: "📝",
        estimatedTime: 20,
        tier: "paid",
        bestFor: ["Attorney", "Paralegal"],
        formTargets: ["FL-300"],
        sections: [
            { id: "case-info", title: "Existing Case Information", description: "Current court order details", questions: ["Case number", "Court", "Order date", "Copy available?"], required: true },
            { id: "current-order", title: "Current Order Terms", description: "What the order says now", questions: ["Custody terms", "Parenting schedule", "Support amount"], required: true },
            { id: "what-changed", title: "Changed Circumstances", description: "What's different now", questions: ["What changed", "When", "Why modification needed", "Impact on children"], required: true },
            { id: "requested-changes", title: "Requested Changes", description: "What you want modified", questions: ["Specific changes requested", "Best interest justification", "Effective date"], required: true },
            { id: "supporting-info", title: "Supporting Information", description: "Evidence for your request", questions: ["Documentation", "Witnesses", "Other parent's position"], required: false },
        ],
    },
    {
        id: "visitation-only",
        name: "Visitation Rights",
        description: "Establish or modify visitation for non-custodial parents. Covers current contact, requested schedule, and any barriers to visitation.",
        icon: "🗓️",
        estimatedTime: 15,
        tier: "paid",
        bestFor: ["Attorney", "GAL"],
        formTargets: ["FL-311"],
        sections: [
            { id: "relationship", title: "Relationship to Child", description: "Basic information", questions: ["Relationship", "Legal parent?", "Paternity established?", "Current visitation?"], required: true },
            { id: "current-contact", title: "Current Contact", description: "Current situation", questions: ["How often", "Last visit", "Where", "Supervised?", "Why seeking court order"], required: true },
            { id: "requested-schedule", title: "Requested Visitation", description: "What you're asking for", questions: ["Frequency", "Days/times", "Overnights", "Holidays", "Location"], required: true },
            { id: "barriers", title: "Barriers to Visitation", description: "Any obstacles", questions: ["Other parent preventing contact?", "Allegations", "Safety concerns", "Housing stability"], required: false },
        ],
    },
    {
        id: "domestic-violence-screening",
        name: "Domestic Violence Screening",
        description: "Trauma-informed intake for DV cases. Includes safety assessment, protective order status, and custody safety planning. Handles sensitive disclosures.",
        icon: "🛡️",
        estimatedTime: 30,
        tier: "paid",
        bestFor: ["Attorney", "GAL", "Therapist"],
        formTargets: ["DV-100", "DV-110"],
        sections: [
            { id: "safety-first", title: "Safety Assessment", description: "Your immediate safety", questions: ["Safe location?", "Completing privately?", "Safety plan?", "Children safe?"], required: true },
            { id: "protective-orders", title: "Current Protective Orders", description: "Existing legal protections", questions: ["Current restraining order?", "Expiration date", "Violations"], required: true },
            { id: "abuse-history", title: "History of Abuse", description: "Past incidents (share what you're comfortable with)", questions: ["Duration", "Types of abuse", "Threats", "Police reports", "Medical treatment"], required: true },
            { id: "recent-incidents", title: "Recent Incidents", description: "Most recent abuse", questions: ["When", "What happened", "Children present?", "Evidence available?"], required: true },
            { id: "children-exposure", title: "Children's Exposure", description: "Impact on children", questions: ["Witnessed violence?", "Harmed?", "Trauma signs", "Relationship with other parent"], required: true },
            { id: "custody-concerns", title: "Custody & Safety Concerns", description: "What you need for safety", questions: ["Supervised visitation?", "Safe exchanges", "Address confidentiality", "Communication limits"], required: true },
            { id: "support-resources", title: "Support & Resources", description: "Help available to you", questions: ["DV advocate?", "Shelter/hotline?", "Counseling", "Support system"], required: false },
        ],
    },
    {
        id: "relocation",
        name: "Move-Away / Relocation",
        description: "Builds the case for or against relocation. Covers move-away factors, impact on both parents, and a proposed long-distance parenting plan.",
        icon: "🚚",
        estimatedTime: 25,
        tier: "paid",
        bestFor: ["Attorney"],
        formTargets: ["FL-300"],
        sections: [
            { id: "move-details", title: "Proposed Move", description: "Where and when", questions: ["Destination", "Distance", "Timeline", "Definite or conditional?", "Job/lease signed?"], required: true },
            { id: "reason", title: "Reason for Move", description: "Why you need to relocate", questions: ["Employment", "Family support", "Financial reasons", "Alternatives?"], required: true },
            { id: "impact-children", title: "Impact on Children", description: "How move affects kids", questions: ["Benefits", "New school", "Activities lost", "Children's feelings"], required: true },
            { id: "impact-other-parent", title: "Impact on Other Parent", description: "Effect on the other parent", questions: ["Effect on time", "Proposed schedule", "Travel costs"], required: true },
            { id: "proposed-plan", title: "Proposed Parenting Plan", description: "How custody will work long-distance", questions: ["School year", "Summers", "Holidays", "Video calls", "Transportation"], required: true },
            { id: "other-parent-position", title: "Other Parent's Position", description: "Their response to move", questions: ["Told them?", "Reaction", "Willing to agree?", "Expect opposition?"], required: true },
        ],
    },
    {
        id: "gal-investigation",
        name: "GAL / Child Advocate Investigation",
        description: "Comprehensive intake for Guardian ad Litem investigations. Covers both parents' perspectives, child observations, home environment, and professional recommendations.",
        icon: "⚖️",
        estimatedTime: 35,
        tier: "paid",
        bestFor: ["GAL"],
        formTargets: [],
        sections: [
            { id: "case-overview", title: "Case Overview", description: "Court case background", questions: ["Case number", "Appointing judge", "Appointment date", "Scope of investigation"], required: true },
            { id: "parent-a", title: "Parent A Information", description: "First parent's details and perspective", questions: ["Name & contact", "Employment", "Living situation", "Relationship with children", "Concerns about other parent"], required: true },
            { id: "parent-b", title: "Parent B Information", description: "Second parent's details and perspective", questions: ["Name & contact", "Employment", "Living situation", "Relationship with children", "Concerns about other parent"], required: true },
            { id: "children-info", title: "Children's Information", description: "Each child's details", questions: ["Names & ages", "School performance", "Health issues", "Behavioral concerns", "Expressed preferences"], required: true },
            { id: "home-observations", title: "Home Environment", description: "Living conditions for each household", questions: ["Parent A home", "Parent B home", "Children's rooms", "Safety concerns", "Other residents"], required: true },
            { id: "collateral-contacts", title: "Collateral Contacts", description: "Third-party sources to interview", questions: ["Teachers", "Therapists", "Pediatrician", "Family members", "Coaches/mentors"], required: true },
            { id: "allegations", title: "Allegations & Concerns", description: "Issues raised by either party", questions: ["Substance abuse", "DV history", "Mental health", "Parenting capacity", "Alienation concerns"], required: true },
            { id: "prior-evaluations", title: "Prior Evaluations", description: "Previous professional assessments", questions: ["Custody evaluations", "Psychological evaluations", "Drug tests", "CPS reports"], required: false },
        ],
    },
];

// ── Helpers ─────────────────────────────────────────────────────────

export function getIntakeTemplate(id: string): IntakeTemplate | undefined {
    return INTAKE_TEMPLATES.find((t) => t.id === id);
}

export function getAvailableTemplates(tier: string): IntakeTemplate[] {
    const isPaid = !["starter", "", undefined, null].includes(tier);
    return INTAKE_TEMPLATES.filter((t) => t.tier === "free" || (t.tier === "paid" && isPaid));
}

export function getLockedTemplates(tier: string): IntakeTemplate[] {
    const isPaid = !["starter", "", undefined, null].includes(tier);
    if (isPaid) return [];
    return INTAKE_TEMPLATES.filter((t) => t.tier === "paid");
}
