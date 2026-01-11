"""
Court Form Workflow schemas.

Pydantic schemas for California family court form workflow:
FL-300, FL-311, FL-320, FL-340, FL-341, FL-342
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.court_form import (
    CourtFormType,
    CourtFormStatus,
    FormSubmissionSource,
    CaseActivationStatus,
    ServiceType,
    HearingType,
    HearingOutcome,
)


# =============================================================================
# Court Form Submission Schemas
# =============================================================================

class CourtFormSubmissionBase(BaseModel):
    """Base schema for court form submission."""
    form_type: CourtFormType
    form_state: str = Field(default="CA", max_length=2)


class CourtFormSubmissionCreate(CourtFormSubmissionBase):
    """Schema for creating a form submission."""
    case_id: str
    form_data: Optional[dict] = None
    aria_assisted: bool = False


class CourtFormSubmissionUpdate(BaseModel):
    """Schema for updating a form submission."""
    form_data: Optional[dict] = None
    aria_assisted: Optional[bool] = None
    aria_conversation_id: Optional[str] = None


class CourtFormSubmissionResponse(CourtFormSubmissionBase):
    """Schema for form submission response."""
    id: str
    case_id: str
    parent_id: Optional[str] = None
    status: str
    status_history: Optional[list] = None
    submission_source: str
    submitted_at: Optional[datetime] = None
    form_data: Optional[dict] = None
    pdf_url: Optional[str] = None
    aria_assisted: bool
    aria_conversation_id: Optional[str] = None
    responds_to_form_id: Optional[str] = None
    parent_form_id: Optional[str] = None
    hearing_id: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    extraction_confidence: Optional[float] = None
    requires_review: bool
    custody_order_id: Optional[str] = None
    # Edit permission fields
    edits_allowed: bool = False
    edits_allowed_by: Optional[str] = None
    edits_allowed_at: Optional[datetime] = None
    edits_allowed_notes: Optional[str] = None
    edits_allowed_sections: Optional[list] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CourtFormSubmissionSummary(BaseModel):
    """Summary schema for form listing."""
    id: str
    form_type: str
    status: str
    parent_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    requires_review: bool
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Form Submission Actions
# =============================================================================

class FormSubmitRequest(BaseModel):
    """Schema for submitting a form for review."""
    pass  # Just a trigger, no additional data needed


class FormApproveRequest(BaseModel):
    """Schema for approving a form."""
    notes: Optional[str] = None


class FormRejectRequest(BaseModel):
    """Schema for rejecting a form."""
    reason: str = Field(..., min_length=10, max_length=1000)


class FormResubmitRequest(BaseModel):
    """Schema for requesting form resubmission."""
    issues: list[str] = Field(..., min_items=1)
    notes: Optional[str] = None


class FormMarkServedRequest(BaseModel):
    """Schema for marking form as served."""
    service_type: ServiceType
    served_on_date: date
    notes: Optional[str] = None


class FormAllowEditsRequest(BaseModel):
    """Schema for clerk allowing parent edits."""
    notes: str = Field(..., min_length=1, description="Explanation of what needs to be corrected")
    sections: Optional[list[str]] = Field(None, description="Specific sections to allow edits for (optional)")


class FormRevokeEditsRequest(BaseModel):
    """Schema for clerk revoking parent edit permission."""
    notes: Optional[str] = Field(None, description="Reason for revoking edit permission")


# =============================================================================
# FL-300 Specific Schemas (Request for Order - CA Judicial Council Rev. July 1, 2025)
# =============================================================================

class FL300Child(BaseModel):
    """Child information for FL-300 Item 2."""
    name: str
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    physical_custody_to: Optional[str] = None  # petitioner, respondent, joint, other
    legal_custody_to: Optional[str] = None  # petitioner, respondent, joint, other


class FL300RestrainingOrderInfo(BaseModel):
    """Restraining order information for FL-300 Item 1."""
    has_existing_orders: bool = False
    between_parties: list[str] = []  # petitioner, respondent, other_parent_party
    criminal_order: Optional[dict] = None  # county_state, case_number
    family_order: Optional[dict] = None
    juvenile_order: Optional[dict] = None
    other_order: Optional[dict] = None


class FL300ChildSupportRequest(BaseModel):
    """Child support request for FL-300 Item 3."""
    child_name: str
    child_age: Optional[int] = None
    use_guideline: bool = True
    monthly_amount_requested: Optional[float] = None


class FL300DebtPayment(BaseModel):
    """Debt payment request for FL-300 Item 5b."""
    pay_to: str
    for_description: str
    amount: float
    due_date: Optional[date] = None


class FL300FormData(BaseModel):
    """
    Structured data for FL-300 (Request for Order).
    Matches official CA Judicial Council form FL-300 [Rev. July 1, 2025].
    """
    # === HEADER SECTION ===
    # Party filing the request
    filing_party: str = "petitioner"  # petitioner, respondent, other_parent_party

    # Attorney/Party information
    party_name: Optional[str] = None
    firm_name: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: str = "CA"
    zip_code: Optional[str] = None
    telephone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    attorney_for: Optional[str] = None
    state_bar_number: Optional[str] = None

    # Court information
    court_county: Optional[str] = None
    court_street_address: Optional[str] = None
    court_mailing_address: Optional[str] = None
    court_city_zip: Optional[str] = None
    court_branch_name: Optional[str] = None

    # Case parties
    petitioner_name: str
    respondent_name: str
    other_parent_party_name: Optional[str] = None
    case_number: Optional[str] = None

    # === REQUEST TYPE CHECKBOXES ===
    is_request_for_order: bool = True
    is_change_request: bool = False
    is_temporary_emergency: bool = False

    # Specific requests
    request_child_custody: bool = False
    request_child_visitation: bool = False
    request_child_support: bool = False
    request_spousal_support: bool = False
    request_property_control: bool = False
    request_attorney_fees: bool = False
    request_other: bool = False
    request_other_specify: Optional[str] = None

    # === NOTICE OF HEARING (Item 1-3, partly court-filled) ===
    notice_to_name: Optional[str] = None
    notice_to_party: Optional[str] = None  # petitioner, respondent, other_parent_party, other
    notice_to_other_specify: Optional[str] = None

    # Hearing details (court fills in)
    hearing_date: Optional[date] = None
    hearing_time: Optional[str] = None
    hearing_dept: Optional[str] = None
    hearing_room: Optional[str] = None
    hearing_address_same: bool = True
    hearing_address_other: Optional[str] = None

    # === ITEM 1: RESTRAINING ORDER INFORMATION ===
    restraining_order_info: Optional[FL300RestrainingOrderInfo] = None

    # === ITEM 2: CHILD CUSTODY / VISITATION ===
    custody_visitation_enabled: bool = False
    custody_request_temporary_emergency: bool = False

    # 2a: Children
    children: list[FL300Child] = []

    # 2b: Orders requested
    custody_orders_for: Optional[str] = None  # child_custody, visitation, both
    custody_orders_in_attached_forms: bool = False
    custody_attached_forms: list[str] = []  # FL-305, FL-311, FL-312, FL-341(C), FL-341(D), FL-341(E)
    custody_orders_as_follows: bool = False
    custody_orders_specify: Optional[str] = None
    custody_attachment_2b: bool = False

    # 2c: Best interest reasons
    custody_best_interest_reasons: Optional[str] = None
    custody_attachment_2c: bool = False

    # 2d: Change from current order
    custody_is_change: bool = False
    custody_change_custody_date: Optional[date] = None
    custody_change_custody_ordered: Optional[str] = None
    custody_change_visitation_date: Optional[date] = None
    custody_change_visitation_ordered: Optional[str] = None
    custody_attachment_2d: bool = False

    # === ITEM 3: CHILD SUPPORT ===
    child_support_enabled: bool = False
    child_support_requests: list[FL300ChildSupportRequest] = []
    child_support_attachment_3a: bool = False

    # 3b: Change current order
    child_support_is_change: bool = False
    child_support_change_date: Optional[date] = None
    child_support_change_ordered: Optional[str] = None

    # 3c: Income declaration filed
    child_support_income_declaration_filed: bool = False
    child_support_financial_statement_filed: bool = False

    # 3d: Reasons
    child_support_reasons: Optional[str] = None
    child_support_attachment_3d: bool = False

    # === ITEM 4: SPOUSAL OR DOMESTIC PARTNER SUPPORT ===
    spousal_support_enabled: bool = False
    spousal_support_amount_monthly: Optional[float] = None

    # 4b: Change/end current order
    spousal_support_change: bool = False
    spousal_support_end: bool = False
    spousal_support_order_date: Optional[date] = None
    spousal_support_current_amount: Optional[float] = None

    # 4c: Post-judgment modification
    spousal_support_post_judgment: bool = False
    spousal_support_fl157_attached: bool = False

    # 4d: Income declaration filed
    spousal_support_income_declaration_filed: bool = False

    # 4e: Reasons
    spousal_support_reasons: Optional[str] = None
    spousal_support_attachment_4e: bool = False

    # === ITEM 5: PROPERTY CONTROL ===
    property_control_enabled: bool = False
    property_request_temporary_emergency: bool = False

    # 5a: Exclusive use request
    property_exclusive_use_party: Optional[str] = None  # petitioner, respondent, other_parent_party
    property_type: Optional[str] = None  # own_buying, lease_rent
    property_description: Optional[str] = None

    # 5b: Payment orders on debts
    property_debt_payments: list[FL300DebtPayment] = []

    # 5c: Change from current order
    property_is_change: bool = False
    property_change_date: Optional[date] = None

    # 5d: Reasons
    property_reasons: Optional[str] = None
    property_attachment_5d: bool = False

    # === ITEM 6: ATTORNEY'S FEES AND COSTS ===
    attorney_fees_enabled: bool = False
    attorney_fees_amount: Optional[float] = None
    attorney_fees_income_declaration_filed: bool = False
    attorney_fees_fl319_attached: bool = False
    attorney_fees_fl158_attached: bool = False

    # === ITEM 7: OTHER ORDERS REQUESTED ===
    other_orders_enabled: bool = False
    other_orders_specify: Optional[str] = None
    other_orders_attachment_7: bool = False

    # === ITEM 8: TIME FOR SERVICE / URGENCY ===
    urgency_enabled: bool = False
    urgency_service_days: Optional[int] = None
    urgency_hearing_sooner: bool = False
    urgency_reasons: Optional[str] = None
    urgency_attachment_8: bool = False

    # === ITEM 9: FACTS TO SUPPORT ===
    facts_to_support: Optional[str] = None
    facts_attachment_9: bool = False

    # === SIGNATURE ===
    signature_date: Optional[date] = None
    signatory_name: Optional[str] = None


class FL300CreateRequest(BaseModel):
    """Request to create FL-300 submission."""
    # case_id is taken from URL path, not body
    form_data: Optional[FL300FormData] = None  # Optional for starting a draft
    aria_assisted: bool = False


# =============================================================================
# FL-311 Specific Schemas (Uses existing CustodyExtractionSchema)
# =============================================================================

class FL311FormData(BaseModel):
    """Structured data for FL-311 (Child Custody and Visitation Application)."""
    # Children
    children: list[dict] = Field(default_factory=list)

    # Custody arrangements
    physical_custody: str  # joint, sole_petitioner, sole_respondent
    legal_custody: str  # joint, sole_petitioner, sole_respondent

    # Visitation schedule
    visitation_type: str  # reasonable, scheduled, supervised, none
    visitation_schedule: Optional[dict] = None

    # Holiday schedule
    holiday_schedule: Optional[list[dict]] = None

    # Transportation
    transportation_arrangements: Optional[dict] = None

    # Supervised visitation
    supervised_visitation: Optional[dict] = None

    # Special considerations
    abuse_allegations: bool = False
    substance_abuse_allegations: bool = False
    travel_restrictions: Optional[dict] = None

    # Other provisions
    other_provisions: Optional[str] = None


class FL311CreateRequest(BaseModel):
    """Request to create FL-311 submission."""
    # case_id is taken from URL path, not body
    form_data: Optional[FL311FormData] = None  # Optional for starting a draft
    aria_assisted: bool = False


# =============================================================================
# FL-320 Specific Schemas (CA Judicial Council Rev. July 1, 2025)
# =============================================================================

class FL320FormData(BaseModel):
    """
    Structured data for FL-320 (Responsive Declaration to Request for Order).
    Matches official CA Judicial Council form FL-320 [Rev. July 1, 2025].
    """
    # === HEADER SECTION ===
    # Party filing the response
    filing_party: str = "respondent"  # petitioner, respondent, other_parent_party

    # Attorney/Party information
    party_name: Optional[str] = None
    firm_name: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: str = "CA"
    zip_code: Optional[str] = None
    telephone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    attorney_for: Optional[str] = None
    state_bar_number: Optional[str] = None

    # Court information
    court_county: Optional[str] = None
    court_street_address: Optional[str] = None
    court_mailing_address: Optional[str] = None
    court_city_zip: Optional[str] = None
    court_branch_name: Optional[str] = None

    # Case parties
    petitioner_name: Optional[str] = None
    respondent_name: Optional[str] = None
    other_parent_party_name: Optional[str] = None
    case_number: Optional[str] = None

    # Hearing information
    hearing_date: Optional[date] = None
    hearing_time: Optional[str] = None
    hearing_dept_room: Optional[str] = None

    # Link to FL-300
    responds_to_fl300_id: Optional[str] = None

    # === ITEM 1: RESTRAINING ORDER INFORMATION ===
    restraining_no_orders_in_effect: bool = False  # 1a. No domestic violence orders in effect
    restraining_orders_in_effect: bool = False  # 1b. I agree that orders are in effect

    # === ITEM 2: CHILD CUSTODY / VISITATION (PARENTING TIME) ===
    custody_enabled: bool = False  # Checkbox for item 2
    custody_consent_legal_physical: bool = False  # 2a. I consent to legal and physical custody
    custody_consent_visitation: bool = False  # 2b. I consent to visitation (parenting time)
    custody_do_not_consent: bool = False  # 2c. I do not consent to the order requested
    custody_do_not_consent_custody: bool = False  # for child custody
    custody_do_not_consent_visitation: bool = False  # for visitation (parenting time)
    custody_counter_proposal: Optional[str] = None  # but I consent to the following order

    # === ITEM 3: CHILD SUPPORT ===
    child_support_enabled: bool = False  # Checkbox for item 3
    child_support_income_declaration_filed: bool = False  # 3a. I have completed and filed FL-150 or FL-155
    child_support_consent: bool = False  # 3b. I consent to the order requested
    child_support_consent_guideline: bool = False  # 3c. I consent to guideline support
    child_support_do_not_consent: bool = False  # 3d. I do not consent to the order requested
    child_support_counter_proposal: Optional[str] = None  # but I consent to the following order

    # === ITEM 4: SPOUSAL OR DOMESTIC PARTNER SUPPORT ===
    spousal_support_enabled: bool = False  # Checkbox for item 4
    spousal_support_income_declaration_filed: bool = False  # 4a. I have completed and filed FL-150
    spousal_support_consent: bool = False  # 4b. I consent to the order requested
    spousal_support_do_not_consent: bool = False  # 4c. I do not consent to the order requested
    spousal_support_counter_proposal: Optional[str] = None  # but I consent to the following order

    # === ITEM 5: PROPERTY CONTROL ===
    property_control_enabled: bool = False  # Checkbox for item 5
    property_control_consent: bool = False  # 5a. I consent to the order requested
    property_control_do_not_consent: bool = False  # 5b. I do not consent to the order requested
    property_control_counter_proposal: Optional[str] = None  # but I consent to the following order

    # === ITEM 6: ATTORNEY'S FEES AND COSTS ===
    attorney_fees_enabled: bool = False  # Checkbox for item 6
    attorney_fees_income_declaration_filed: bool = False  # 6a. I have completed and filed FL-150
    attorney_fees_fl158_attached: bool = False  # 6b. I have completed and filed FL-158
    attorney_fees_consent: bool = False  # 6c. I consent to the order requested
    attorney_fees_do_not_consent: bool = False  # 6d. I do not consent to the order requested
    attorney_fees_counter_proposal: Optional[str] = None  # but I consent to the following order

    # === ITEM 7: OTHER ORDERS REQUESTED ===
    other_orders_enabled: bool = False  # Checkbox for item 7
    other_orders_consent: bool = False  # 7a. I consent to the order requested
    other_orders_do_not_consent: bool = False  # 7b. I do not consent to the order requested
    other_orders_counter_proposal: Optional[str] = None  # but I consent to the following order

    # === ITEM 8: TIME FOR SERVICE / TIME UNTIL HEARING ===
    time_service_enabled: bool = False  # Checkbox for item 8
    time_service_consent: bool = False  # 8a. I consent to the order requested
    time_service_do_not_consent: bool = False  # 8b. I do not consent to the order requested
    time_service_counter_proposal: Optional[str] = None  # but I consent to the following order

    # === ITEM 9: FACTS TO SUPPORT ===
    facts_to_support: Optional[str] = None  # Facts to support my responsive declaration
    facts_attachment_9: bool = False  # Attachment 9

    # === SIGNATURE ===
    signature_date: Optional[date] = None
    signatory_name: Optional[str] = None


class FL320CreateRequest(BaseModel):
    """Request to create FL-320 submission."""
    # case_id is taken from URL path, not body
    responds_to_form_id: Optional[str] = None  # FL-300 ID (can be determined from case)
    form_data: Optional[FL320FormData] = None  # Optional for starting a draft
    aria_assisted: bool = False


# =============================================================================
# FL-340 Specific Schemas (Court Order - CA Judicial Council Rev. July 1, 2025)
# =============================================================================

class FL340AttendanceInfo(BaseModel):
    """Attendance information for a party at hearing."""
    present: bool = False
    attorney_present: bool = False
    attorney_name: Optional[str] = None


class FL340OrderItem(BaseModel):
    """Order item with attachment/other/not applicable options."""
    as_attached: bool = False
    attachment_form: Optional[str] = None  # e.g., "FL-341", "FL-342"
    other: bool = False
    other_details: Optional[str] = None
    not_applicable: bool = False


class FL340FormData(BaseModel):
    """
    Structured data for FL-340 (Findings and Order After Hearing).
    Matches official CA Judicial Council form FL-340 [Rev. July 1, 2025].
    """
    # === HEADER SECTION ===
    # Attorney/Party information (for order preparer)
    party_name: Optional[str] = None
    firm_name: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: str = "CA"
    zip_code: Optional[str] = None
    telephone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    attorney_for: Optional[str] = None
    state_bar_number: Optional[str] = None

    # Court information
    court_county: Optional[str] = None
    court_street_address: Optional[str] = None
    court_mailing_address: Optional[str] = None
    court_city_zip: Optional[str] = None
    court_branch_name: Optional[str] = None

    # Case parties
    petitioner_name: Optional[str] = None
    respondent_name: Optional[str] = None
    other_parent_party_name: Optional[str] = None
    case_number: Optional[str] = None

    # === ITEM 1: HEARING INFORMATION ===
    hearing_date: Optional[date] = None
    hearing_time: Optional[str] = None
    hearing_dept: Optional[str] = None
    hearing_room: Optional[str] = None
    judge_name: Optional[str] = None
    is_temporary_judge: bool = False

    # Order to show cause / notice of motion / request for order
    motion_filed_date: Optional[date] = None
    motion_filed_by: Optional[str] = None  # name of person who filed

    # === ITEM 1a-c: ATTENDANCE ===
    petitioner: Optional[FL340AttendanceInfo] = None
    respondent: Optional[FL340AttendanceInfo] = None
    other_parent_party: Optional[FL340AttendanceInfo] = None

    # === THE COURT ORDERS ===

    # Item 2: Custody and visitation/parenting time
    custody_visitation_order: Optional[FL340OrderItem] = None

    # Item 3: Child support
    child_support_order: Optional[FL340OrderItem] = None

    # Item 4: Spousal or family support
    spousal_support_order: Optional[FL340OrderItem] = None

    # Item 5: Property orders
    property_order: Optional[FL340OrderItem] = None

    # Item 6: Attorney's fees
    attorney_fees_order: Optional[FL340OrderItem] = None

    # Item 7: Other orders
    other_orders_as_attached: bool = False
    other_orders_not_applicable: bool = False
    other_orders_details: Optional[str] = None

    # Item 8: All other issues reserved
    all_other_issues_reserved: bool = False

    # Item 9: Rescheduled hearing
    rescheduled_hearing_enabled: bool = False
    rescheduled_date: Optional[date] = None
    rescheduled_time: Optional[str] = None
    rescheduled_dept: Optional[str] = None
    rescheduled_issues: Optional[str] = None

    # === SIGNATURES ===
    judicial_officer_date: Optional[date] = None

    # Order prepared by
    order_prepared_by: Optional[str] = None  # Name of preparer
    order_approved_as_conforming: bool = False

    # Attorney signature 1
    attorney_signature_1_date: Optional[date] = None
    attorney_signature_1_for: Optional[str] = None  # petitioner, respondent, other_parent_party

    # Attorney signature 2
    attorney_signature_2_date: Optional[date] = None
    attorney_signature_2_for: Optional[str] = None


class FL340CreateRequest(BaseModel):
    """Request to create FL-340 (court enters order)."""
    case_id: str
    hearing_id: Optional[str] = None
    form_data: Optional[FL340FormData] = None


# =============================================================================
# FL-341 Specific Schemas (Custody Order Attachment - CA Rev. January 1, 2026)
# =============================================================================

class FL341ChildCustody(BaseModel):
    """Child custody information for FL-341 Item 7."""
    child_name: str
    birth_date: Optional[date] = None
    legal_custody_to: Optional[str] = None  # petitioner, respondent, joint, other
    physical_custody_to: Optional[str] = None  # petitioner, respondent, joint, other


class FL341WeekendSchedule(BaseModel):
    """Weekend visitation schedule for FL-341 Item 9e(1)(A)."""
    weekend: str  # 1st, 2nd, 3rd, 4th, 5th
    enabled: bool = False
    from_day: Optional[str] = None
    from_time: Optional[str] = None
    from_am_pm: Optional[str] = None
    from_start_after_school: Optional[str] = None  # start_of, after
    to_day: Optional[str] = None
    to_time: Optional[str] = None
    to_am_pm: Optional[str] = None
    to_start_after_school: Optional[str] = None


class FL341FormData(BaseModel):
    """
    Structured data for FL-341 (Child Custody and Visitation Order Attachment).
    Matches official CA Judicial Council form FL-341 [Rev. January 1, 2026].
    """
    # === HEADER ===
    petitioner_name: Optional[str] = None
    respondent_name: Optional[str] = None
    other_parent_party_name: Optional[str] = None
    case_number: Optional[str] = None

    # TO: (attachment to which form)
    attached_to_fl340: bool = False
    attached_to_fl180: bool = False
    attached_to_fl250: bool = False
    attached_to_fl355: bool = False
    attached_to_other: bool = False
    attached_to_other_specify: Optional[str] = None

    # === ITEMS 1-4: JURISDICTIONAL FINDINGS ===
    jurisdiction_confirmed: bool = True  # Item 1
    notice_opportunity_confirmed: bool = True  # Item 2
    habitual_residence_us: bool = True  # Item 3
    habitual_residence_other: Optional[str] = None
    penalties_acknowledged: bool = True  # Item 4

    # === ITEM 5: CHILD ABDUCTION PREVENTION ===
    child_abduction_risk: bool = False
    fl341b_attached: bool = False

    # === ITEM 6: MEDIATION REFERRAL ===
    mediation_referral_enabled: bool = False
    mediation_referral_details: Optional[str] = None

    # === ITEM 7: CHILD CUSTODY AWARDS ===
    children: list[FL341ChildCustody] = []
    joint_legal_custody_enabled: bool = False
    joint_legal_custody_fl341e_attached: bool = False
    joint_legal_custody_attachment_7b: bool = False

    # === ITEM 8: ABUSE/SUBSTANCE ABUSE ALLEGATIONS ===
    abuse_allegations_enabled: bool = False
    abuse_alleged_against_petitioner: bool = False
    abuse_alleged_against_respondent: bool = False
    abuse_alleged_against_other: bool = False
    substance_abuse_alleged_against_petitioner: bool = False
    substance_abuse_alleged_against_respondent: bool = False
    substance_abuse_alleged_against_other: bool = False

    custody_denied_to_petitioner: bool = False
    custody_denied_to_respondent: bool = False
    custody_denied_to_other: bool = False

    custody_granted_despite_allegations: bool = False
    custody_granted_reasons_in_writing: bool = False
    custody_granted_reasons_recorded: bool = False
    custody_granted_reasons_recorded_method: Optional[str] = None  # minute_order, court_reporter, other
    custody_granted_reasons_recorded_other: Optional[str] = None
    custody_best_interest_finding: bool = False

    # === ITEM 9: VISITATION (PARENTING TIME) ===
    visitation_reasonable: bool = False  # 9a
    visitation_see_attached: bool = False  # 9b
    visitation_attached_pages: Optional[int] = None
    visitation_none: bool = False  # 9c
    visitation_supervised: bool = False  # 9d (FL-341(A) attached)

    # 9e: Specific visitation schedule
    visitation_for_party: Optional[str] = None  # petitioner, respondent, other
    visitation_for_other_name: Optional[str] = None

    # 9e(1)(A): Weekend schedule
    weekends_starting_date: Optional[date] = None
    weekend_schedules: list[FL341WeekendSchedule] = []
    fifth_weekend_alternate: bool = False
    fifth_weekend_initial_party: Optional[str] = None
    fifth_weekend_alternate_starting: Optional[date] = None
    fifth_weekend_odd_even: Optional[str] = None  # odd, even
    fifth_weekend_odd_even_party: Optional[str] = None

    # 9e(1)(B): Alternate weekends
    alternate_weekends_enabled: bool = False
    alternate_weekends_starting: Optional[date] = None
    alternate_weekends_from_day: Optional[str] = None
    alternate_weekends_from_time: Optional[str] = None
    alternate_weekends_to_day: Optional[str] = None
    alternate_weekends_to_time: Optional[str] = None

    # 9e(1)(C): Weekdays
    weekdays_enabled: bool = False
    weekdays_starting: Optional[date] = None
    weekdays_from_day: Optional[str] = None
    weekdays_from_time: Optional[str] = None
    weekdays_to_day: Optional[str] = None
    weekdays_to_time: Optional[str] = None

    # 9e(1)(D): Other visitation
    other_visitation_attached: bool = False
    other_visitation_details: Optional[str] = None

    # 9e(2): Virtual visitation
    virtual_visitation_enabled: bool = False
    virtual_visitation_details: Optional[str] = None

    # 9e(3): Other ways
    other_visitation_ways: Optional[str] = None

    # === ITEM 10: SUPERVISED VISITATION ===
    supervised_visitation_enabled: bool = False
    supervised_until_further_order: bool = False
    supervised_until_other: Optional[str] = None
    supervised_party: Optional[str] = None  # petitioner, respondent, other_parent_party
    supervised_party_name: Optional[str] = None

    # === ITEM 11: TRANSPORTATION ===
    transportation_enabled: bool = False
    transportation_licensed_insured: bool = True  # 11a
    transportation_to_by: Optional[str] = None  # petitioner, respondent, other
    transportation_to_other: Optional[str] = None
    transportation_from_by: Optional[str] = None  # petitioner, respondent, other
    transportation_from_other: Optional[str] = None
    exchange_start_address: Optional[str] = None  # 11d
    exchange_end_address: Optional[str] = None  # 11e
    curbside_exchange: bool = False  # 11f
    transportation_other: Optional[str] = None  # 11g

    # === ITEM 12: TRAVEL RESTRICTIONS ===
    travel_restrictions_enabled: bool = False
    travel_restricted_party: Optional[str] = None  # petitioner, respondent, other_parent_party
    travel_restricted_party_name: Optional[str] = None
    travel_restrict_california: bool = False  # 12a
    travel_restrict_counties: bool = False  # 12b
    travel_allowed_counties: Optional[str] = None
    travel_restrict_other_places: bool = False  # 12c
    travel_other_places: Optional[str] = None

    # === ITEM 13: HOLIDAY SCHEDULE ===
    holiday_schedule_enabled: bool = False
    holiday_schedule_below: bool = False
    holiday_schedule_attached: bool = False  # FL-341(C)

    # === ITEM 14: ADDITIONAL PROVISIONS ===
    additional_provisions_enabled: bool = False
    additional_provisions_below: bool = False
    additional_provisions_attached: bool = False  # FL-341(D)
    additional_provisions_details: Optional[str] = None

    # === ITEM 15: ACCESS TO RECORDS ===
    access_to_records_confirmed: bool = True

    # === ITEM 16: OTHER ===
    other_orders_enabled: bool = False
    other_orders_details: Optional[str] = None


class FL341CreateRequest(BaseModel):
    """Request to create FL-341 attachment."""
    parent_form_id: Optional[str] = None  # FL-340 ID
    case_id: str
    form_data: Optional[FL341FormData] = None


# =============================================================================
# FL-342 Specific Schemas (Child Support Information and Order Attachment)
# =============================================================================

class FL342Child(BaseModel):
    """Child information for FL-342."""
    child_name: str
    birth_date: Optional[str] = None


class FL342IncomeInfo(BaseModel):
    """Income information for guideline calculation."""
    gross_monthly_income: Optional[float] = None
    hardship_deduction: Optional[float] = None
    net_monthly_disposable_income: Optional[float] = None


class FL342AdditionalCost(BaseModel):
    """Additional child-related costs."""
    type: str  # childcare, education, healthcare, etc.
    monthly_cost: Optional[float] = None
    petitioner_percentage: Optional[float] = None
    respondent_percentage: Optional[float] = None
    notes: Optional[str] = None


class FL342FormData(BaseModel):
    """Structured data for FL-342 (Child Support Information and Order Attachment).
    Based on California Judicial Council Form FL-342.
    """
    # Header information
    petitioner_name: Optional[str] = None
    respondent_name: Optional[str] = None
    other_parent_party_name: Optional[str] = None
    case_number: Optional[str] = None

    # Attachment type (which form this attaches to)
    attached_to_fl340: Optional[bool] = True
    attached_to_fl180: Optional[bool] = None
    attached_to_fl250: Optional[bool] = None
    attached_to_other: Optional[bool] = None
    attached_to_other_specify: Optional[str] = None

    # Item 1: Children covered by this order
    children: list[FL342Child] = Field(default_factory=list)

    # Item 2: Child support order
    child_support_ordered: Optional[bool] = True
    support_payor: Optional[str] = None  # petitioner, respondent, other_parent_party
    support_payee: Optional[str] = None
    monthly_child_support_amount: Optional[float] = None
    support_payable_on_date: Optional[int] = None  # Day of month (1-31)
    support_effective_date: Optional[str] = None
    support_terminates_per_statute: Optional[bool] = None
    support_terminates_on_date: Optional[str] = None
    support_terminates_other: Optional[str] = None

    # Item 3: Guideline calculation
    guideline_amount_calculated: Optional[bool] = None
    guideline_monthly_amount: Optional[float] = None
    order_below_guideline: Optional[bool] = None
    below_guideline_reason: Optional[str] = None
    order_above_guideline: Optional[bool] = None
    above_guideline_reason: Optional[str] = None
    non_guideline_agreed: Optional[bool] = None

    # Item 4: Income and expense information
    petitioner_income: Optional[FL342IncomeInfo] = None
    respondent_income: Optional[FL342IncomeInfo] = None
    timeshare_percentage_petitioner: Optional[float] = None
    timeshare_percentage_respondent: Optional[float] = None
    income_expense_declaration_filed: Optional[bool] = None

    # Item 5: Health insurance
    health_insurance_ordered: Optional[bool] = None
    health_insurance_provider: Optional[str] = None  # petitioner, respondent, both
    health_insurance_cost: Optional[float] = None
    health_insurance_petitioner_pays: Optional[float] = None
    health_insurance_respondent_pays: Optional[float] = None
    uninsured_costs_petitioner_percentage: Optional[float] = None
    uninsured_costs_respondent_percentage: Optional[float] = None
    cash_medical_support: Optional[float] = None
    cash_medical_payor: Optional[str] = None

    # Item 6: Childcare costs
    childcare_costs_ordered: Optional[bool] = None
    childcare_monthly_cost: Optional[float] = None
    childcare_petitioner_percentage: Optional[float] = None
    childcare_respondent_percentage: Optional[float] = None
    childcare_reason: Optional[str] = None  # employment, job_search, education

    # Item 7: Educational/special needs costs
    education_costs_ordered: Optional[bool] = None
    education_monthly_cost: Optional[float] = None
    education_petitioner_percentage: Optional[float] = None
    education_respondent_percentage: Optional[float] = None
    education_description: Optional[str] = None

    # Item 8: Travel expenses
    travel_costs_ordered: Optional[bool] = None
    travel_petitioner_percentage: Optional[float] = None
    travel_respondent_percentage: Optional[float] = None
    travel_notes: Optional[str] = None

    # Item 9: Additional children from other relationships
    payor_has_other_children: Optional[bool] = None
    payor_other_children_count: Optional[int] = None
    payor_other_support_amount: Optional[float] = None

    # Item 10: Mandatory earnings assignment
    earnings_assignment_ordered: Optional[bool] = True
    earnings_assignment_stayed: Optional[bool] = None
    earnings_assignment_stayed_reason: Optional[str] = None
    wage_assignment_service_required: Optional[bool] = None

    # Item 11: Arrears/past-due support
    arrears_exist: Optional[bool] = None
    arrears_amount: Optional[float] = None
    arrears_as_of_date: Optional[str] = None
    arrears_monthly_payment: Optional[float] = None
    arrears_interest_rate: Optional[float] = None

    # Item 12: Other orders
    other_orders_enabled: Optional[bool] = None
    other_orders_details: Optional[str] = None

    # Signature section
    judicial_officer_signature_date: Optional[str] = None
    judicial_officer_name: Optional[str] = None

    class Config:
        extra = "allow"  # Allow extra fields for flexibility


class FL342CreateRequest(BaseModel):
    """Request to create FL-342 attachment."""
    parent_form_id: str  # FL-340 ID
    form_data: FL342FormData


# =============================================================================
# Case Form Requirement Schemas
# =============================================================================

class CaseFormRequirementCreate(BaseModel):
    """Schema for creating a form requirement."""
    case_id: str
    form_type: CourtFormType
    required_by: str  # petitioner, respondent, both, court
    due_date: Optional[date] = None
    notes: Optional[str] = None


class CaseFormRequirementResponse(BaseModel):
    """Schema for form requirement response."""
    id: str
    case_id: str
    form_type: str
    required_by: str
    is_satisfied: bool
    satisfied_by_submission_id: Optional[str] = None
    satisfied_at: Optional[datetime] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Proof of Service Schemas
# =============================================================================

class ProofOfServiceCreate(BaseModel):
    """Schema for creating proof of service record."""
    case_id: str
    served_form_id: str
    service_type: ServiceType
    served_to_name: str
    served_at_address: Optional[str] = None
    served_on_date: date
    served_by_name: str
    served_by_relationship: Optional[str] = None
    notes: Optional[str] = None


class ProofOfServiceResponse(BaseModel):
    """Schema for proof of service response."""
    id: str
    case_id: str
    served_form_id: str
    service_type: str
    served_to_name: str
    served_at_address: Optional[str] = None
    served_on_date: date
    served_by_name: str
    served_by_relationship: Optional[str] = None
    proof_pdf_url: Optional[str] = None
    filed_with_court: bool
    filed_at: Optional[datetime] = None
    accepted_by_court: bool
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProofOfServiceFileRequest(BaseModel):
    """Schema for filing proof of service with court."""
    pass  # Just a trigger


# =============================================================================
# Court Hearing Schemas
# =============================================================================

class CourtHearingBase(BaseModel):
    """Base schema for court hearing."""
    hearing_type: HearingType
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    scheduled_date: date
    scheduled_time: Optional[str] = None
    court_name: Optional[str] = None
    department: Optional[str] = None
    courtroom: Optional[str] = None
    judge_name: Optional[str] = None


class CourtHearingCreate(CourtHearingBase):
    """Schema for creating a court hearing."""
    case_id: str
    related_fl300_id: Optional[str] = None
    notes: Optional[str] = None


class CourtHearingUpdate(BaseModel):
    """Schema for updating a court hearing."""
    hearing_type: Optional[HearingType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[str] = None
    court_name: Optional[str] = None
    department: Optional[str] = None
    courtroom: Optional[str] = None
    judge_name: Optional[str] = None
    notes: Optional[str] = None


class CourtHearingResponse(CourtHearingBase):
    """Schema for court hearing response."""
    id: str
    case_id: str
    outcome: str
    outcome_notes: Optional[str] = None
    petitioner_attended: Optional[bool] = None
    respondent_attended: Optional[bool] = None
    related_fl300_id: Optional[str] = None
    resulting_fl340_id: Optional[str] = None
    notifications_sent: bool
    notification_sent_at: Optional[datetime] = None
    reminder_sent: bool
    is_continuation: bool
    continued_from_id: Optional[str] = None
    continued_to_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CourtHearingOutcomeRequest(BaseModel):
    """Schema for recording hearing outcome."""
    outcome: HearingOutcome
    outcome_notes: Optional[str] = None
    petitioner_attended: bool
    respondent_attended: bool


class CourtHearingContinueRequest(BaseModel):
    """Schema for continuing a hearing to a new date."""
    new_date: date
    new_time: Optional[str] = None
    reason: str


# =============================================================================
# Respondent Access Code Schemas
# =============================================================================

class RespondentAccessCodeCreate(BaseModel):
    """Schema for creating respondent access code."""
    case_id: str
    respondent_email: EmailStr
    respondent_name: Optional[str] = None
    fl300_submission_id: str


class RespondentAccessCodeResponse(BaseModel):
    """Schema for access code response."""
    id: str
    case_id: str
    respondent_email: str
    respondent_name: Optional[str] = None
    expires_at: datetime
    is_used: bool
    used_at: Optional[datetime] = None
    notification_sent_at: Optional[datetime] = None
    notification_method: Optional[str] = None
    failed_attempts: int
    is_locked: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RespondentVerifyRequest(BaseModel):
    """Schema for respondent verification."""
    case_id: str
    access_code: str


class RespondentVerifyResponse(BaseModel):
    """Schema for verification response."""
    verified: bool
    case_id: Optional[str] = None
    message: str


# =============================================================================
# Case Form Progress Schemas
# =============================================================================

class CaseFormProgress(BaseModel):
    """Schema for overall case form workflow progress."""
    case_id: str
    activation_status: str
    forms_workflow_started_at: Optional[datetime] = None
    forms_workflow_completed_at: Optional[datetime] = None

    # Form status summary
    fl300_status: Optional[str] = None
    fl300_submission_id: Optional[str] = None
    fl311_status: Optional[str] = None
    fl311_submission_id: Optional[str] = None
    fl320_status: Optional[str] = None
    fl320_submission_id: Optional[str] = None
    fl340_status: Optional[str] = None
    fl340_submission_id: Optional[str] = None

    # Respondent status
    respondent_notified: bool = False
    respondent_on_platform: bool = False
    proof_of_service_filed: bool = False

    # Hearing status
    hearing_scheduled: bool = False
    hearing_id: Optional[str] = None
    hearing_date: Optional[date] = None

    # Progress percentage
    progress_percent: float = 0.0

    # Next required action
    next_action: Optional[str] = None
    next_action_by: Optional[str] = None  # petitioner, respondent, court


class CaseActivationRequest(BaseModel):
    """Schema for manual case activation."""
    notes: Optional[str] = None


# =============================================================================
# PDF Upload Schemas
# =============================================================================

class FormPDFUploadRequest(BaseModel):
    """Schema for uploading form PDF."""
    case_id: str
    form_type: CourtFormType
    pdf_base64: str  # Base64 encoded PDF


class FormPDFUploadResponse(BaseModel):
    """Schema for PDF upload response."""
    submission_id: str
    status: str
    extraction_started: bool
    message: str


class FormExtractionStatusResponse(BaseModel):
    """Schema for extraction status response."""
    submission_id: str
    status: str  # pending, processing, completed, failed
    extraction_confidence: Optional[float] = None
    requires_review: bool
    extracted_data: Optional[dict] = None
    error_message: Optional[str] = None


# =============================================================================
# Form Listing Schemas
# =============================================================================

class CaseFormsListResponse(BaseModel):
    """Schema for listing all forms for a case."""
    case_id: str
    forms: list[CourtFormSubmissionSummary]
    total: int


class FormRequirementsListResponse(BaseModel):
    """Schema for listing form requirements."""
    case_id: str
    requirements: list[CaseFormRequirementResponse]
    pending_count: int
    satisfied_count: int
