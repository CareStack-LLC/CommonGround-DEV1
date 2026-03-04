"""
Schemas for Custody Order extraction and management.

Matches the CA FL-311 form structure for AI-powered PDF extraction.
"""

from datetime import datetime, date, time
from typing import Optional, List
from pydantic import BaseModel, Field


# =============================================================================
# Child Information (Section 1)
# =============================================================================

class ExtractedChild(BaseModel):
    """Child information extracted from custody document."""
    name: str = Field(..., description="Child's full name")
    birth_date: Optional[date] = Field(None, description="Child's date of birth")
    age: Optional[int] = Field(None, description="Child's age at time of filing")


# =============================================================================
# Visitation Schedule (Section 4)
# =============================================================================

class WeekendSchedule(BaseModel):
    """Weekend visitation schedule."""
    weekend_number: str = Field(..., description="1st, 2nd, 3rd, 4th, 5th, or alternate")
    start_day: str = Field(..., description="Day visitation starts (e.g., Friday)")
    end_day: str = Field(..., description="Day visitation ends (e.g., Sunday)")
    start_time: Optional[str] = Field(None, description="Start time (e.g., 6:00 PM)")
    end_time: Optional[str] = Field(None, description="End time (e.g., 6:00 PM)")
    start_at_school: bool = Field(False, description="Starts at school")
    start_after_school: bool = Field(False, description="Starts after school")
    end_at_school: bool = Field(False, description="Ends at start of school")


class WeekdaySchedule(BaseModel):
    """Weekday visitation schedule."""
    days: List[str] = Field(..., description="Days of week (e.g., ['Monday', 'Wednesday'])")
    start_time: Optional[str] = Field(None, description="Start time")
    end_time: Optional[str] = Field(None, description="End time")
    start_after_school: bool = Field(False, description="Starts after school")


class VirtualVisitation(BaseModel):
    """Virtual visitation details."""
    enabled: bool = Field(False, description="Virtual visitation ordered")
    schedule: Optional[str] = Field(None, description="Schedule description")
    platform: Optional[str] = Field(None, description="Platform (FaceTime, Zoom, etc.)")


class ExtractedVisitationSchedule(BaseModel):
    """Complete visitation schedule extracted from document."""
    parent: str = Field(..., description="petitioner, respondent, or other")
    schedule_type: str = Field(..., description="weekend, weekday, or other")
    weekends: Optional[List[WeekendSchedule]] = Field(None)
    weekdays: Optional[List[WeekdaySchedule]] = Field(None)
    virtual: Optional[VirtualVisitation] = Field(None)
    fifth_weekend_rule: Optional[str] = Field(None, description="alternate, odd_months, even_months")
    effective_date: Optional[date] = Field(None)
    other_notes: Optional[str] = Field(None)


# =============================================================================
# Supervised Visitation (Section 6)
# =============================================================================

class ExtractedSupervisedVisitation(BaseModel):
    """Supervised visitation requirements."""
    required: bool = Field(False, description="Is supervised visitation required")
    supervised_parent: Optional[str] = Field(None, description="petitioner, respondent, or other")
    reason: Optional[str] = Field(None, description="Reason for supervision")
    supervisor_name: Optional[str] = Field(None)
    supervisor_phone: Optional[str] = Field(None)
    supervisor_type: Optional[str] = Field(None, description="professional or nonprofessional")
    petitioner_cost_percent: Optional[int] = Field(None)
    respondent_cost_percent: Optional[int] = Field(None)
    location_type: Optional[str] = Field(None, description="in_person, virtual, or other")
    location_address: Optional[str] = Field(None)
    frequency: Optional[str] = Field(None, description="once_weekly, twice_weekly, etc.")
    hours_per_visit: Optional[int] = Field(None)


# =============================================================================
# Exchange Rules (Section 7)
# =============================================================================

class ExtractedExchangeRules(BaseModel):
    """Transportation and exchange rules."""
    require_licensed_driver: bool = Field(True)
    require_insured_driver: bool = Field(True)
    require_registered_vehicle: bool = Field(True)
    require_child_restraints: bool = Field(True)
    transport_to_provider: Optional[str] = Field(None, description="Who transports to visits")
    transport_from_provider: Optional[str] = Field(None, description="Who transports from visits")
    exchange_start_address: Optional[str] = Field(None)
    exchange_end_address: Optional[str] = Field(None)
    curbside_exchange: bool = Field(False, description="Driver waits in car, other party waits inside")
    other_rules: Optional[str] = Field(None)


# =============================================================================
# Travel Restrictions (Section 8)
# =============================================================================

class ExtractedTravelRestrictions(BaseModel):
    """Travel restriction orders."""
    state_restriction: bool = Field(False, description="Cannot take child out of state")
    county_restrictions: Optional[List[str]] = Field(None, description="Restricted counties")
    other_restrictions: Optional[str] = Field(None)
    requires_written_permission: bool = Field(False)


# =============================================================================
# Holiday Schedule (Section 11)
# =============================================================================

class ExtractedHoliday(BaseModel):
    """Individual holiday schedule."""
    holiday_name: str = Field(..., description="Name of holiday")
    holiday_type: str = Field("federal", description="federal, religious, school_break, birthday")
    assigned_to: str = Field(..., description="petitioner, respondent, alternate, or split")
    odd_years_to: Optional[str] = Field(None)
    even_years_to: Optional[str] = Field(None)
    start_description: Optional[str] = Field(None, description="e.g., 'Christmas Eve at 6pm'")
    end_description: Optional[str] = Field(None, description="e.g., 'Christmas Day at 6pm'")
    duration_days: Optional[int] = Field(None)
    notes: Optional[str] = Field(None)


# =============================================================================
# Complete Extracted Document
# =============================================================================

class CustodyOrderExtraction(BaseModel):
    """
    Complete custody order extraction schema.

    This is the target structure for AI extraction from FL-311 and similar forms.
    """

    # Document identification
    form_type: str = Field("FL-311", description="Form type (FL-311, FL-341, etc.)")
    form_state: str = Field("CA", description="State code")
    case_number: Optional[str] = Field(None)

    # Parties
    petitioner_name: Optional[str] = Field(None)
    respondent_name: Optional[str] = Field(None)
    other_party_name: Optional[str] = Field(None)

    # Section 1: Children
    children: List[ExtractedChild] = Field(default_factory=list)

    # Section 2: Custody
    physical_custody: str = Field(..., description="petitioner, respondent, joint, or other")
    legal_custody: str = Field(..., description="petitioner, respondent, joint, or other")

    # Section 3: Visitation type
    visitation_type: str = Field("scheduled", description="reasonable, scheduled, supervised, none")

    # Section 4: Visitation schedules
    visitation_schedules: List[ExtractedVisitationSchedule] = Field(default_factory=list)

    # Section 5: Abuse allegations
    has_abuse_allegations: bool = Field(False)
    abuse_alleged_against: Optional[str] = Field(None)
    has_substance_abuse_allegations: bool = Field(False)
    substance_abuse_alleged_against: Optional[str] = Field(None)
    abuse_details: Optional[str] = Field(None)

    # Section 6: Supervised visitation
    supervised_visitation: Optional[ExtractedSupervisedVisitation] = Field(None)

    # Section 7: Exchange rules
    exchange_rules: Optional[ExtractedExchangeRules] = Field(None)

    # Section 8: Travel restrictions
    travel_restrictions: Optional[ExtractedTravelRestrictions] = Field(None)

    # Section 9: Abduction prevention
    abduction_risk: bool = Field(False)
    abduction_prevention_notes: Optional[str] = Field(None)

    # Section 10: Mediation
    mediation_required: bool = Field(False)
    mediation_details: Optional[str] = Field(None)

    # Section 11: Holiday schedule
    holiday_schedule: List[ExtractedHoliday] = Field(default_factory=list)

    # Section 13: Other provisions
    other_provisions: Optional[str] = Field(None)

    # Extraction metadata
    extraction_confidence: float = Field(0.0, ge=0.0, le=1.0)
    extraction_notes: Optional[str] = Field(None)
    fields_needing_review: List[str] = Field(default_factory=list)


# =============================================================================
# API Request/Response Schemas
# =============================================================================

class AgreementUploadRequest(BaseModel):
    """Request to upload a custody agreement for extraction."""
    case_id: str
    document_type: str = Field("custody_order", description="Type of document")
    form_type: Optional[str] = Field(None, description="Form type if known (FL-311, etc.)")
    state: Optional[str] = Field(None, description="State code if known")


class AgreementUploadResponse(BaseModel):
    """Response after uploading agreement."""
    id: str
    case_id: str
    filename: str
    file_url: str
    extraction_status: str
    message: str


class ExtractionStatusResponse(BaseModel):
    """Status of extraction job."""
    upload_id: str
    status: str
    progress_percent: Optional[int] = Field(None)
    error: Optional[str] = Field(None)
    custody_order_id: Optional[str] = Field(None)
    extraction_confidence: Optional[float] = Field(None)
    requires_review: bool = Field(True)


class CustodyOrderResponse(BaseModel):
    """Response with extracted custody order data."""
    id: str
    case_id: str
    form_type: str
    form_state: str

    # Custody
    physical_custody: str
    legal_custody: str
    visitation_type: str

    # Flags
    has_abuse_allegations: bool
    has_substance_abuse_allegations: bool
    abduction_risk: bool
    mediation_required: bool

    # Travel
    travel_restriction_state: bool

    # Status
    is_court_ordered: bool
    requires_review: bool
    extraction_confidence: Optional[float]

    # Children count
    children_count: int

    # Timestamps
    created_at: datetime
    extracted_at: Optional[datetime]

    class Config:
        from_attributes = True


class CustodyOrderDetailResponse(BaseModel):
    """Detailed custody order with all relationships."""
    id: str
    case_id: str
    form_type: str
    form_state: str
    court_case_number: Optional[str]

    # Custody
    physical_custody: str
    legal_custody: str
    visitation_type: str

    # Flags
    has_abuse_allegations: bool
    abuse_alleged_against: Optional[str]
    has_substance_abuse_allegations: bool
    substance_abuse_alleged_against: Optional[str]
    abuse_allegation_details: Optional[str]

    # Travel
    travel_restriction_state: bool
    travel_restriction_counties: Optional[List[str]]
    travel_restriction_other: Optional[str]
    requires_written_permission: bool

    # Abduction
    abduction_risk: bool
    abduction_prevention_orders: Optional[str]

    # Mediation
    mediation_required: bool
    mediation_location: Optional[str]

    # Other
    other_provisions: Optional[str]

    # Status
    is_court_ordered: bool
    order_date: Optional[date]
    effective_date: Optional[date]

    # Extraction
    source_pdf_url: Optional[str]
    extraction_confidence: Optional[float]
    extraction_notes: Optional[str]
    requires_review: bool
    reviewed_at: Optional[datetime]

    # Raw data for review
    raw_extracted_data: Optional[dict]

    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustodyOrderChildResponse(BaseModel):
    """Child within custody order."""
    id: str
    child_name: str
    birth_date: Optional[date]
    age_at_filing: Optional[int]
    physical_custody: Optional[str]
    legal_custody: Optional[str]
    special_needs: Optional[str]
    school_info: Optional[str]

    class Config:
        from_attributes = True


class VisitationScheduleResponse(BaseModel):
    """Visitation schedule entry."""
    id: str
    parent_type: str
    schedule_type: str
    weekend_number: Optional[str]
    start_day: Optional[str]
    end_day: Optional[str]
    start_time: Optional[time]
    end_time: Optional[time]
    start_at_school: bool
    start_after_school: bool
    is_virtual: bool
    notes: Optional[str]

    class Config:
        from_attributes = True


class HolidayScheduleResponse(BaseModel):
    """Holiday schedule entry."""
    id: str
    holiday_name: str
    holiday_type: str
    assigned_to: str
    odd_years_to: Optional[str]
    even_years_to: Optional[str]
    start_day: Optional[str]
    end_day: Optional[str]
    duration_days: Optional[int]
    notes: Optional[str]

    class Config:
        from_attributes = True


class SupervisedVisitationResponse(BaseModel):
    """Supervised visitation details."""
    id: str
    supervised_parent: str
    supervision_reason: Optional[str]
    supervisor_name: Optional[str]
    supervisor_phone: Optional[str]
    supervisor_type: str
    supervisor_agency: Optional[str]
    petitioner_cost_percent: Optional[int]
    respondent_cost_percent: Optional[int]
    location_type: str
    location_address: Optional[str]
    frequency: Optional[str]
    hours_per_visit: Optional[int]

    class Config:
        from_attributes = True


class ExchangeRulesResponse(BaseModel):
    """Exchange rules details."""
    id: str
    require_licensed_driver: bool
    require_insured_driver: bool
    require_registered_vehicle: bool
    require_child_restraints: bool
    transport_to_provider: Optional[str]
    transport_from_provider: Optional[str]
    exchange_start_address: Optional[str]
    exchange_end_address: Optional[str]
    exchange_protocol: str
    curbside_exchange: bool
    other_rules: Optional[str]

    class Config:
        from_attributes = True


class CustodyOrderFullResponse(BaseModel):
    """Complete custody order with all nested data."""
    order: CustodyOrderDetailResponse
    children: List[CustodyOrderChildResponse]
    visitation_schedules: List[VisitationScheduleResponse]
    holiday_schedule: List[HolidayScheduleResponse]
    supervised_visitation: Optional[SupervisedVisitationResponse]
    exchange_rules: Optional[ExchangeRulesResponse]


# =============================================================================
# Review/Update Schemas
# =============================================================================

class CustodyOrderReview(BaseModel):
    """Mark custody order as reviewed."""
    review_notes: Optional[str] = Field(None)
    approved: bool = Field(True)


class CustodyOrderUpdate(BaseModel):
    """Update extracted custody order data."""
    physical_custody: Optional[str] = None
    legal_custody: Optional[str] = None
    visitation_type: Optional[str] = None

    has_abuse_allegations: Optional[bool] = None
    abuse_alleged_against: Optional[str] = None
    has_substance_abuse_allegations: Optional[bool] = None

    travel_restriction_state: Optional[bool] = None
    travel_restriction_counties: Optional[List[str]] = None

    mediation_required: Optional[bool] = None

    other_provisions: Optional[str] = None


class ChildUpdate(BaseModel):
    """Update child information."""
    child_name: Optional[str] = None
    birth_date: Optional[date] = None
    physical_custody: Optional[str] = None
    legal_custody: Optional[str] = None
    special_needs: Optional[str] = None
    school_info: Optional[str] = None
