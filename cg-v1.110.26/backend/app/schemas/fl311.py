"""
FL-311 Schema - Child Custody and Visitation (Parenting Time) Application Attachment

This schema matches the official California Judicial Council Form FL-311
Rev. January 1, 2026 (5 pages)

Reference: https://www.courts.ca.gov/documents/fl311.pdf
"""

from datetime import date, time
from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from enum import Enum


# =============================================================================
# Enums matching official form options
# =============================================================================

class AttachmentType(str, Enum):
    """TO: This form is attached to (checkbox options)"""
    PETITION = "petition"
    RESPONSE = "response"
    REQUEST_FOR_ORDER = "request_for_order"
    RESPONSIVE_DECLARATION = "responsive_declaration"
    OTHER = "other"


class CustodyParty(str, Enum):
    """Party options for custody/visitation"""
    PETITIONER = "petitioner"
    RESPONDENT = "respondent"
    JOINT = "joint"
    OTHER_PARENT_PARTY = "other_parent_party"


class VisitationType(str, Enum):
    """Item 3: Visitation type options"""
    REASONABLE = "reasonable"  # 3a
    ATTACHED_DOCUMENT = "attached_document"  # 3b
    SCHEDULE_IN_ITEM_4 = "schedule_in_item_4"  # 3c
    SUPERVISED = "supervised"  # 3d
    NO_VISITATION = "no_visitation"  # 3e


class WeekendNumber(str, Enum):
    """Weekend selection for schedule"""
    FIRST = "1st"
    SECOND = "2nd"
    THIRD = "3rd"
    FOURTH = "4th"
    FIFTH = "5th"
    ALTERNATE = "alternate"


class DayOfWeek(str, Enum):
    """Days of the week"""
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"


class TimeReference(str, Enum):
    """Time reference options"""
    SPECIFIC_TIME = "specific_time"  # e.g., 6:00 PM
    START_OF_SCHOOL = "start_of_school"
    AFTER_SCHOOL = "after_school"


class SupervisedVisitationLocation(str, Enum):
    """Item 6d: Location of supervised visitation"""
    IN_PERSON_SAFE_LOCATION = "in_person_safe_location"
    VIRTUAL = "virtual"
    OTHER = "other"


class SupervisedVisitationFrequency(str, Enum):
    """Item 6e: Supervised visitation schedule"""
    ONCE_A_WEEK = "once_a_week"
    TWICE_A_WEEK = "twice_a_week"
    AS_SPECIFIED_IN_ITEM_4 = "as_specified_in_item_4"
    OTHER = "other"


class ProviderType(str, Enum):
    """Supervision provider type"""
    PROFESSIONAL = "professional"
    NONPROFESSIONAL = "nonprofessional"


# =============================================================================
# Child Models
# =============================================================================

class FL311Child(BaseModel):
    """Item 1: Minor Children - matches official form row"""
    name: str = Field(..., description="Child's full name")
    birthdate: date = Field(..., description="Child's birthdate")
    age: Optional[int] = Field(None, description="Child's age (calculated)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Jordan James Jones-Wilform",
                "birthdate": "2017-06-15",
                "age": 8
            }
        }


# =============================================================================
# Custody Models (Item 2)
# =============================================================================

class CustodyRequest(BaseModel):
    """Item 2: Custody of the minor children is requested as follows"""
    # 2a: Physical custody
    physical_custody_to: CustodyParty = Field(..., description="Physical custody requested to")

    # 2b: Legal custody
    legal_custody_to: CustodyParty = Field(..., description="Legal custody requested to")

    # 2c: Abuse/substance abuse allegations
    has_abuse_allegations: bool = Field(False, description="Check if allegations of abuse or substance abuse")

    # 2d: Other custody details
    other_custody_details: Optional[str] = Field(None, description="Other custody specifications")


# =============================================================================
# Visitation Schedule Models (Item 4)
# =============================================================================

class ScheduleTime(BaseModel):
    """Time specification for schedule"""
    time_value: Optional[str] = Field(None, description="Time value (e.g., '6:00 PM')")
    is_am: bool = Field(False, description="AM if true, PM if false")
    reference: TimeReference = Field(TimeReference.SPECIFIC_TIME, description="Time reference type")


class WeekendScheduleEntry(BaseModel):
    """Single weekend schedule entry"""
    weekend: WeekendNumber
    enabled: bool = Field(False)
    from_day: Optional[DayOfWeek] = None
    from_time: Optional[ScheduleTime] = None
    to_day: Optional[DayOfWeek] = None
    to_time: Optional[ScheduleTime] = None


class FifthWeekendHandling(BaseModel):
    """Item 4a(1)(a-b): Fifth weekend handling"""
    alternating: bool = Field(False, description="Parties alternate fifth weekends")
    initial_party: Optional[CustodyParty] = Field(None, description="Party having initial fifth weekend")
    starting_date: Optional[date] = None

    # Alternative: specific party gets fifth weekend
    specific_party: Optional[CustodyParty] = None
    in_odd_months: bool = Field(False)
    in_even_months: bool = Field(False)


class AlternateWeekendSchedule(BaseModel):
    """Item 4a(2): Alternate weekends"""
    enabled: bool = Field(False)
    starting_date: Optional[date] = None
    from_day: Optional[DayOfWeek] = None
    from_time: Optional[ScheduleTime] = None
    to_day: Optional[DayOfWeek] = None
    to_time: Optional[ScheduleTime] = None


class WeekdaySchedule(BaseModel):
    """Item 4a(3): Weekdays schedule"""
    enabled: bool = Field(False)
    starting_date: Optional[date] = None
    days: List[DayOfWeek] = Field(default_factory=list)
    from_time: Optional[ScheduleTime] = None
    to_time: Optional[ScheduleTime] = None


class VirtualVisitation(BaseModel):
    """Item 4b: Virtual visitation"""
    enabled: bool = Field(False)
    description: Optional[str] = Field(None, description="Virtual visitation schedule/details")
    in_attachment: bool = Field(False, description="Details in Attachment 4b")


class InPersonVisitationSchedule(BaseModel):
    """Item 4a: In-person visitation schedule"""
    # (1) Weekends
    weekends_starting_date: Optional[date] = None
    weekend_schedules: List[WeekendScheduleEntry] = Field(default_factory=list)
    fifth_weekend: Optional[FifthWeekendHandling] = None

    # (2) Alternate weekends
    alternate_weekends: Optional[AlternateWeekendSchedule] = None

    # (3) Weekdays
    weekdays: Optional[WeekdaySchedule] = None

    # (4) Other
    other_days_in_attachment: bool = Field(False)
    other_days_description: Optional[str] = None


class VisitationSchedule(BaseModel):
    """Item 4: Complete visitation schedule"""
    # Whose visitation is this describing
    for_party: CustodyParty = Field(..., description="Whose visitation schedule")

    # 4a: In-person
    in_person: Optional[InPersonVisitationSchedule] = None

    # 4b: Virtual visitation
    virtual: Optional[VirtualVisitation] = None

    # 4c: Other ways
    other_visitation: Optional[str] = None


# =============================================================================
# Abuse/Substance Abuse Models (Item 5)
# =============================================================================

class AbuseAllegations(BaseModel):
    """Item 5a: Allegations"""
    # (1) History of abuse
    abuse_alleged_against: List[CustodyParty] = Field(default_factory=list)

    # (2) Substance abuse
    substance_abuse_alleged_against: List[CustodyParty] = Field(default_factory=list)


class CustodyDespiteAllegations(BaseModel):
    """Item 5b: Child custody despite allegations"""
    # (1) Request NO sole/joint custody
    request_no_custody_to_alleged: bool = Field(False)

    # (2) Request custody despite allegations
    request_custody_despite_allegations: bool = Field(False)
    reasons: Optional[str] = Field(None, description="Reasons why custody should be granted")
    reasons_in_attachment: bool = Field(False)


class VisitationDespiteAllegations(BaseModel):
    """Item 5c: Visitation despite allegations"""
    # (1) Request supervised visitation
    request_supervised: bool = Field(False)

    # (2) Request unsupervised despite allegations
    request_unsupervised_despite_allegations: bool = Field(False)
    unsupervised_for: List[CustodyParty] = Field(default_factory=list)
    reasons: Optional[str] = None
    reasons_in_attachment: bool = Field(False)

    # (3) Other
    other: Optional[str] = None


class AbuseSubstanceAbuseSection(BaseModel):
    """Item 5: Complete abuse/substance abuse section"""
    allegations: Optional[AbuseAllegations] = None
    custody_request: Optional[CustodyDespiteAllegations] = None
    visitation_request: Optional[VisitationDespiteAllegations] = None


# =============================================================================
# Supervised Visitation Models (Item 6)
# =============================================================================

class SupervisionProvider(BaseModel):
    """Item 6c: Supervision provider details"""
    name: Optional[str] = None
    phone: Optional[str] = None
    provider_type: ProviderType = Field(ProviderType.NONPROFESSIONAL)

    # Professional provider fee split
    petitioner_fee_percent: Optional[int] = None
    respondent_fee_percent: Optional[int] = None
    other_party_fee_percent: Optional[int] = None


class SupervisedVisitation(BaseModel):
    """Item 6: Supervised visitation details"""
    # 6a: Who needs supervision
    supervised_party: CustodyParty

    # 6b: Reasons
    reasons: Optional[str] = None
    reasons_in_attachment: bool = Field(False)

    # 6c: Monitor
    provider: Optional[SupervisionProvider] = None

    # 6d: Location
    location_type: SupervisedVisitationLocation = Field(SupervisedVisitationLocation.IN_PERSON_SAFE_LOCATION)
    location_other_description: Optional[str] = None

    # 6e: Schedule
    frequency: SupervisedVisitationFrequency = Field(SupervisedVisitationFrequency.OTHER)
    hours_per_visit: Optional[float] = None
    schedule_description: Optional[str] = None


# =============================================================================
# Transportation Models (Item 7)
# =============================================================================

class TransportationExchange(BaseModel):
    """Item 7: Transportation for visitation and place of exchange"""
    # 7a: Licensed driver requirement (always true per form)
    licensed_insured_driver_required: bool = Field(True)

    # 7b: Transportation TO begin visits
    transport_to_visits_by: Optional[str] = Field(None, description="Name of person providing transport to visits")

    # 7c: Transportation FROM visits
    transport_from_visits_by: Optional[str] = Field(None, description="Name of person providing transport from visits")

    # 7d: Exchange point at beginning
    exchange_point_start: Optional[str] = Field(None, description="Address for exchange at beginning of visit")

    # 7e: Exchange point at end
    exchange_point_end: Optional[str] = Field(None, description="Address for exchange at end of visit")

    # 7f: Exchange procedure
    curbside_exchange: bool = Field(False, description="Driver waits in car, other party in home")

    # 7g: Other
    other_transport_details: Optional[str] = None


# =============================================================================
# Travel Restrictions (Item 8)
# =============================================================================

class TravelRestrictions(BaseModel):
    """Item 8: Travel with children"""
    enabled: bool = Field(False, description="Travel restrictions apply")
    restricted_party: Optional[CustodyParty] = None

    # 8a: Out of California
    restrict_out_of_state: bool = Field(False)

    # 8b: Specific counties
    restrict_to_counties: bool = Field(False)
    allowed_counties: List[str] = Field(default_factory=list)

    # 8c: Other places
    other_restrictions: Optional[str] = None


# =============================================================================
# Other Sections (Items 9-13)
# =============================================================================

class ChildAbductionPrevention(BaseModel):
    """Item 9: Child abduction prevention"""
    enabled: bool = Field(False)
    # References form FL-312
    fl312_attached: bool = Field(False)


class MediationRequest(BaseModel):
    """Item 10: Child custody mediation"""
    enabled: bool = Field(False)
    date: Optional[date] = None
    time: Optional[str] = None
    location: Optional[str] = None


class HolidayScheduleReference(BaseModel):
    """Item 11: Children's holiday schedule"""
    enabled: bool = Field(False)
    in_form_below: bool = Field(False)  # Schedule is in this form
    on_fl341c: bool = Field(False)  # Schedule is on form FL-341(C)

    # If in_form_below, include holiday details
    holiday_schedule: Optional[dict] = Field(None, description="Holiday schedule if included here")


class AdditionalProvisionsReference(BaseModel):
    """Item 12: Additional custody provisions"""
    enabled: bool = Field(False)
    in_form_below: bool = Field(False)
    on_fl341d: bool = Field(False)  # On form FL-341(D)

    # If in_form_below, include provisions
    provisions: Optional[List[str]] = None


# =============================================================================
# Main FL-311 Schema
# =============================================================================

class FL311FormData(BaseModel):
    """
    Complete FL-311 Form Data Schema

    California Judicial Council Form FL-311
    Child Custody and Visitation (Parenting Time) Application Attachment
    Rev. January 1, 2026
    """

    # Header Information
    petitioner_name: str = Field(..., description="PETITIONER name")
    respondent_name: str = Field(..., description="RESPONDENT name")
    other_parent_party_name: Optional[str] = Field(None, description="OTHER PARENT/PARTY name")
    case_number: str = Field(..., description="CASE NUMBER")

    # TO: Attachment type
    attachment_type: AttachmentType = Field(..., description="This form is attached TO")
    attachment_type_other: Optional[str] = Field(None, description="If OTHER, specify")

    # Item 1: Minor Children
    children: List[FL311Child] = Field(..., min_length=1, description="List of minor children")

    # Item 2: Custody Request
    custody_request: CustodyRequest

    # Item 3: Visitation Type
    visitation_type: VisitationType = Field(..., description="Type of visitation requested")
    visitation_attached_document_pages: Optional[int] = Field(None, description="If attached document, number of pages")
    visitation_attached_document_date: Optional[date] = Field(None, description="If attached document, date")
    no_visitation_reasons_in_item_13: bool = Field(False, description="Reasons in Item 13 if no visitation")

    # Item 4: Visitation Schedule (if type is SCHEDULE_IN_ITEM_4)
    visitation_schedule: Optional[VisitationSchedule] = None

    # Item 5: Abuse/Substance Abuse (if custody_request.has_abuse_allegations)
    abuse_substance_abuse: Optional[AbuseSubstanceAbuseSection] = None

    # Item 6: Supervised Visitation (if visitation_type is SUPERVISED)
    supervised_visitation: Optional[SupervisedVisitation] = None

    # Item 7: Transportation and Exchange
    transportation_exchange: Optional[TransportationExchange] = None

    # Item 8: Travel Restrictions
    travel_restrictions: Optional[TravelRestrictions] = None

    # Item 9: Child Abduction Prevention
    child_abduction_prevention: Optional[ChildAbductionPrevention] = None

    # Item 10: Child Custody Mediation
    mediation_request: Optional[MediationRequest] = None

    # Item 11: Holiday Schedule
    holiday_schedule: Optional[HolidayScheduleReference] = None

    # Item 12: Additional Provisions
    additional_provisions: Optional[AdditionalProvisionsReference] = None

    # Item 13: Other
    other_requests: Optional[str] = Field(None, description="Other requests/specifications")

    class Config:
        json_schema_extra = {
            "example": {
                "petitioner_name": "Grace Jones",
                "respondent_name": "Thomas Wilform",
                "case_number": "FAM-2024-GT-001",
                "attachment_type": "request_for_order",
                "children": [
                    {
                        "name": "Jordan James Jones-Wilform",
                        "birthdate": "2017-06-15",
                        "age": 8
                    }
                ],
                "custody_request": {
                    "physical_custody_to": "petitioner",
                    "legal_custody_to": "joint",
                    "has_abuse_allegations": False
                },
                "visitation_type": "schedule_in_item_4",
                "visitation_schedule": {
                    "for_party": "respondent",
                    "in_person": {
                        "alternate_weekends": {
                            "enabled": True,
                            "from_day": "Friday",
                            "to_day": "Sunday"
                        },
                        "weekdays": {
                            "enabled": True,
                            "days": ["Wednesday"]
                        }
                    }
                },
                "transportation_exchange": {
                    "exchange_point_start": "Grace Community Church, 100 Main St",
                    "exchange_point_end": "Grace Community Church, 100 Main St"
                }
            }
        }


# =============================================================================
# Response Models for API
# =============================================================================

class FL311FormResponse(BaseModel):
    """API Response for FL-311 form"""
    id: str
    case_id: str
    form_type: Literal["FL-311"] = "FL-311"
    status: str
    form_data: FL311FormData
    created_at: str
    updated_at: str


class FL311CreateRequest(BaseModel):
    """Request to create new FL-311 form"""
    case_id: str
    form_data: FL311FormData


class FL311UpdateRequest(BaseModel):
    """Request to update FL-311 form"""
    form_data: FL311FormData
