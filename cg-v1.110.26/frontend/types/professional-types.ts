/**
 * Professional Portal TypeScript Types (Phase 1)
 *
 * Mirrors the backend Python models in professional.py.
 * These types are used across the professional portal frontend.
 */

// =============================================================================
// Enums
// =============================================================================

/** Professional subscription tiers - maps to 5-tier pricing structure */
export enum ProfessionalTier {
    STARTER = 'starter',       // Free — 3 active cases
    SOLO = 'solo',             // $99/mo — 15 active cases
    SMALL_FIRM = 'small_firm', // $299/mo — 50 active cases, 3 team members
    MID_SIZE = 'mid_size',     // $799/mo — 150 active cases, 10 team members
    ENTERPRISE = 'enterprise', // Custom — unlimited
}

/** Case limits per tier */
export const TIER_CASE_LIMITS: Record<ProfessionalTier, number> = {
    [ProfessionalTier.STARTER]: 3,
    [ProfessionalTier.SOLO]: 15,
    [ProfessionalTier.SMALL_FIRM]: 50,
    [ProfessionalTier.MID_SIZE]: 150,
    [ProfessionalTier.ENTERPRISE]: 999999,
};

/** Team member limits per tier (firm-level) */
export const TIER_TEAM_LIMITS: Record<ProfessionalTier, number> = {
    [ProfessionalTier.STARTER]: 0,
    [ProfessionalTier.SOLO]: 0,
    [ProfessionalTier.SMALL_FIRM]: 3,
    [ProfessionalTier.MID_SIZE]: 10,
    [ProfessionalTier.ENTERPRISE]: 999999,
};

/** Tier display info for UI */
export const TIER_INFO: Record<ProfessionalTier, {
    name: string;
    price: string;
    description: string;
}> = {
    [ProfessionalTier.STARTER]: {
        name: 'Starter',
        price: 'Free',
        description: 'Up to 3 active cases',
    },
    [ProfessionalTier.SOLO]: {
        name: 'Solo Practitioner',
        price: '$99/mo',
        description: 'Up to 15 active cases',
    },
    [ProfessionalTier.SMALL_FIRM]: {
        name: 'Small Firm',
        price: '$299/mo',
        description: 'Up to 50 cases, 3 team members',
    },
    [ProfessionalTier.MID_SIZE]: {
        name: 'Mid-Size Firm',
        price: '$799/mo',
        description: 'Up to 150 cases, 10 team members',
    },
    [ProfessionalTier.ENTERPRISE]: {
        name: 'Enterprise',
        price: 'Custom',
        description: 'Unlimited cases and team members',
    },
};

export enum ProfessionalType {
    PRACTICE_ADMIN = 'practice_admin',
    INTAKE_COORDINATOR = 'intake_coordinator',
    ATTORNEY = 'attorney',
    PARALEGAL = 'paralegal',
    MEDIATOR = 'mediator',
    PARENTING_COORDINATOR = 'parenting_coordinator',
}

export enum FirmRole {
    OWNER = 'owner',
    DISPATCHER = 'dispatcher',
    LEAD_ATTORNEY = 'lead_attorney',
    ADMIN = 'admin',
    ATTORNEY = 'attorney',
    PARALEGAL = 'paralegal',
    INTAKE = 'intake',
    READONLY = 'readonly',
}

export enum AssignmentRole {
    LEAD_ATTORNEY = 'lead_attorney',
    ASSOCIATE = 'associate',
    PARALEGAL = 'paralegal',
    MEDIATOR = 'mediator',
    PARENTING_COORDINATOR = 'parenting_coordinator',
    INTAKE_COORDINATOR = 'intake_coordinator',
}

export enum AssignmentStatus {
    ACTIVE = 'active',
    ON_HOLD = 'on_hold',
    COMPLETED = 'completed',
    WITHDRAWN = 'withdrawn',
}

export enum MembershipStatus {
    ACTIVE = 'active',
    INVITED = 'invited',
    SUSPENDED = 'suspended',
    REMOVED = 'removed',
}

export enum AccessRequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    DECLINED = 'declined',
    EXPIRED = 'expired',
}

export enum OCRExtractionStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    REVIEW = 'review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    FAILED = 'failed',
}

export enum ReportExportFormat {
    PDF = 'pdf',
    WORD = 'word',
    EXCEL = 'excel',
}

export enum EventType {
    MEETING = 'meeting',
    COURT_HEARING = 'court_hearing',
    VIDEO_CALL = 'video_call',
    DOCUMENT_DEADLINE = 'document_deadline',
    CONSULTATION = 'consultation',
    DEPOSITION = 'deposition',
    MEDIATION = 'mediation',
    OTHER = 'other',
}

export enum EventVisibility {
    NONE = 'none',
    REQUIRED_PARENT = 'required_parent',
    BOTH_PARENTS = 'both_parents',
}

// =============================================================================
// Interfaces — Core Models
// =============================================================================

/** Office address for directory search */
export interface OfficeAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
}

/** Professional profile (linked to User via user_id) */
export interface ProfessionalProfile {
    id: string;
    user_id: string;
    professional_type: ProfessionalType;

    // License
    license_number?: string;
    license_state?: string;
    license_verified: boolean;
    license_verified_at?: string;

    // Credentials & specializations
    credentials?: Record<string, string>;
    practice_areas?: string[];

    // Contact
    professional_email?: string;
    professional_phone?: string;

    // Directory profile
    headline?: string;
    bio?: string;
    headshot_url?: string;
    video_url?: string;
    languages?: string[];
    hourly_rate?: string;
    years_experience?: number;
    education?: string[];
    awards?: string[];
    consultation_fee?: string;
    accepted_payment_methods?: string[];
    service_location?: string;

    // Subscription & tier gating (Phase 1)
    subscription_tier: ProfessionalTier;
    max_active_cases: number;
    active_case_count: number;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled';
    subscription_ends_at?: string;

    // Directory visibility (Phase 1)
    is_public: boolean;
    is_featured: boolean;
    featured_approved_at?: string;

    // Location (Phase 1)
    jurisdictions?: string[];
    office_address?: OfficeAddress;

    // Status
    is_active: boolean;
    onboarded_at?: string;

    // Timestamps
    created_at: string;
    updated_at: string;
}

/** Law firm or practice organization */
export interface Firm {
    id: string;
    name: string;
    slug: string;
    firm_type: string;
    email: string;
    phone?: string;
    website?: string;

    // Address
    address_line1?: string;
    city?: string;
    state: string;
    zip_code?: string;

    // Branding
    logo_url?: string;
    primary_color?: string;
    description?: string;
    practice_areas?: string[];

    // Directory
    headline?: string;
    is_public: boolean;

    // Financials & Service
    accepted_payment_methods?: string[];
    payment_plans_available?: boolean;
    works_with_nonprofits?: boolean;
    service_location?: string;

    // Subscription
    subscription_tier: string;
    subscription_status: string;

    // Status
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/** Case assignment — links professional to family file */
export interface CaseAssignment {
    id: string;
    professional_id: string;
    firm_id: string;
    family_file_id: string;
    assignment_role: AssignmentRole;
    representing?: 'parent_a' | 'parent_b' | 'both' | 'court';
    access_scopes: string[];
    can_control_aria: boolean;
    can_message_client: boolean;
    status: AssignmentStatus;
    assigned_at: string;
    internal_notes?: string;
    created_at: string;
    updated_at: string;
}

// =============================================================================
// Interfaces — Phase 1 New Models
// =============================================================================

/** OCR document processing pipeline */
export interface OCRDocument {
    id: string;
    case_assignment_id?: string;
    family_file_id: string;
    uploaded_by_id: string;

    // Source document
    file_url: string;
    original_filename: string;
    file_size_bytes?: number;
    mime_type: string;

    // Detection
    detected_form_type?: string; // FL-341, FL-311, FL-312, FL-150, FL-342
    detection_confidence?: number;

    // Pipeline
    extraction_status: OCRExtractionStatus;

    // Extraction results
    extracted_data?: Record<string, unknown>;
    confidence_scores?: Record<string, number>;
    low_confidence_fields?: string[];
    professional_corrections?: Record<string, {
        original: string;
        corrected: string;
    }>;

    // Processing
    processing_started_at?: string;
    processing_completed_at?: string;
    processing_error?: string;

    // Approval
    approved_at?: string;
    approved_by_id?: string;
    rejected_at?: string;
    rejection_reason?: string;

    // Output
    created_agreement_id?: string;

    // Timestamps
    created_at: string;
    updated_at: string;
}

/**
 * Field lock — court-order-locked field
 *
 * Display: 🔒 Locked by Case-[case_number]
 * Tooltip: "This field is set by court order. Contact your attorney to request changes."
 */
export interface FieldLock {
    id: string;
    family_file_id: string;
    agreement_id: string;
    ocr_document_id?: string;
    locked_by_professional_id: string;

    /** JSONPath-style field identifier, e.g. "custody.schedule.weekday" */
    field_path: string;

    /** For display: "🔒 Locked by Case-[case_number]" */
    case_number: string;

    locked_at: string;
    is_locked: boolean;
    unlocked_at?: string;
    unlocked_by_id?: string;
    unlock_reason?: string;

    created_at: string;
    updated_at: string;
}

/** Compliance report with SHA-256 verification */
export interface ComplianceReport {
    id: string;
    case_assignment_id?: string;
    family_file_id: string;
    generated_by_id: string;
    title?: string;
    report_type: 'exchange_compliance' | 'communication_analysis' | 'financial_disputes' | 'full_timeline' | 'custom';
    date_range_start?: string;
    date_range_end?: string;
    parameters?: Record<string, unknown>;

    // Export & verification (Phase 1)
    export_format: ReportExportFormat;
    sha256_hash?: string;
    signature_line?: string;
    raw_data_included: boolean;

    // Result
    file_url?: string;
    file_size_bytes?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    download_count: number;
    last_downloaded_at?: string;

    created_at: string;
    updated_at: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/** Check if professional can upgrade to a higher tier */
export function canUpgrade(currentTier: ProfessionalTier): boolean {
    return currentTier !== ProfessionalTier.ENTERPRISE;
}

/** Check if professional has reached their case limit */
export function isAtCaseLimit(profile: ProfessionalProfile): boolean {
    return profile.active_case_count >= profile.max_active_cases;
}

/** Check if tier supports firm features (Small Firm+) */
export function supportsFirmFeatures(tier: ProfessionalTier): boolean {
    return [
        ProfessionalTier.SMALL_FIRM,
        ProfessionalTier.MID_SIZE,
        ProfessionalTier.ENTERPRISE,
    ].includes(tier);
}

/** Check if tier supports custom intake questionnaires (Solo+) */
export function supportsCustomIntake(tier: ProfessionalTier): boolean {
    return tier !== ProfessionalTier.STARTER;
}

/** Check if tier supports OCR document processing (Solo+) */
export function supportsOCR(tier: ProfessionalTier): boolean {
    return tier !== ProfessionalTier.STARTER;
}

/** Check if tier supports featured directory placement (Mid-Size+) */
export function supportsFeaturedPlacement(tier: ProfessionalTier): boolean {
    return [
        ProfessionalTier.MID_SIZE,
        ProfessionalTier.ENTERPRISE,
    ].includes(tier);
}

/** Get the lock display text for a field */
export function getFieldLockDisplay(lock: FieldLock): string {
    return `🔒 Locked by Case-${lock.case_number}`;
}

/** Get the lock tooltip text */
export function getFieldLockTooltip(): string {
    return 'This field is set by court order. Contact your attorney to request changes.';
}
