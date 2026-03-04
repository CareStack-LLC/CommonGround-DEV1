"""
Custody Order models - matches real court custody forms like CA FL-311.

These models capture the full structure of actual custody orders,
enabling OCR extraction and court-ready exports.
"""

from datetime import datetime, date, time
from typing import Optional
from enum import Enum

from sqlalchemy import Boolean, DateTime, Date, Time, ForeignKey, Integer, String, Text, JSON, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


# =============================================================================
# Enums for Custody Orders
# =============================================================================

class CustodyType(str, Enum):
    """Type of custody arrangement."""
    SOLE = "sole"
    JOINT = "joint"
    PETITIONER = "petitioner"
    RESPONDENT = "respondent"
    OTHER = "other"


class VisitationType(str, Enum):
    """Type of visitation arrangement."""
    REASONABLE = "reasonable"
    SCHEDULED = "scheduled"
    SUPERVISED = "supervised"
    VIRTUAL_ONLY = "virtual_only"
    NONE = "none"


class SupervisionType(str, Enum):
    """Type of supervision for visits."""
    PROFESSIONAL = "professional"
    NONPROFESSIONAL = "nonprofessional"
    AGENCY = "agency"


class WeekendNumber(str, Enum):
    """Which weekend of the month."""
    FIRST = "1st"
    SECOND = "2nd"
    THIRD = "3rd"
    FOURTH = "4th"
    FIFTH = "5th"
    ALTERNATE = "alternate"
    ALL = "all"


class ExchangeProtocol(str, Enum):
    """Protocol for custody exchanges."""
    CURBSIDE = "curbside"  # Driver waits in car
    DOORSTEP = "doorstep"
    NEUTRAL_LOCATION = "neutral_location"
    SUPERVISED = "supervised"
    SCHOOL = "school"
    OTHER = "other"


# =============================================================================
# Main Custody Order Model
# =============================================================================

class CustodyOrder(Base, UUIDMixin, TimestampMixin):
    """
    Custody Order - Structured data from court custody orders.

    Matches the structure of CA FL-311 and similar court forms.
    This is the source of truth for custody arrangements.
    """

    __tablename__ = "custody_orders"

    # Link to case
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)
    agreement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("agreements.id"), nullable=True
    )  # Link to our agreement if applicable

    # Court Form Reference
    form_type: Mapped[str] = mapped_column(String(50), default="FL-311")  # e.g., FL-311, FL-341
    form_state: Mapped[str] = mapped_column(String(2), default="CA")  # State code

    # Court Information
    court_case_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    court_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    court_county: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Order Type
    order_type: Mapped[str] = mapped_column(
        String(50), default="application"
    )  # application, order, modification
    is_court_ordered: Mapped[bool] = mapped_column(Boolean, default=False)
    order_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    effective_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Party Information (references)
    petitioner_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    respondent_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    other_party_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Section 2: Custody Arrangements
    physical_custody: Mapped[str] = mapped_column(
        String(20), default="joint"
    )  # petitioner, respondent, joint, other
    legal_custody: Mapped[str] = mapped_column(
        String(20), default="joint"
    )  # petitioner, respondent, joint, other

    # Section 3: Visitation Type
    visitation_type: Mapped[str] = mapped_column(
        String(30), default="scheduled"
    )  # reasonable, scheduled, supervised, none
    visitation_document_pages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    visitation_document_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Section 5: Abuse/Substance Allegations
    has_abuse_allegations: Mapped[bool] = mapped_column(Boolean, default=False)
    abuse_alleged_against: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    has_substance_abuse_allegations: Mapped[bool] = mapped_column(Boolean, default=False)
    substance_abuse_alleged_against: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    abuse_allegation_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Section 8: Travel Restrictions
    travel_restriction_state: Mapped[bool] = mapped_column(Boolean, default=False)
    travel_restriction_counties: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    travel_restriction_other: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requires_written_permission: Mapped[bool] = mapped_column(Boolean, default=False)

    # Section 9: Child Abduction Prevention
    abduction_risk: Mapped[bool] = mapped_column(Boolean, default=False)
    abduction_prevention_orders: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Section 10: Mediation
    mediation_required: Mapped[bool] = mapped_column(Boolean, default=False)
    mediation_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    mediation_location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Additional provisions (Section 13)
    other_provisions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Extraction metadata
    source_pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Can be base64 or URL
    source_pdf_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    extracted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    extracted_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # Court professional ID
    extraction_confidence: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), nullable=True)
    extraction_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Manual review
    requires_review: Mapped[bool] = mapped_column(Boolean, default=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Full extracted JSON (raw data)
    raw_extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="custody_orders")
    agreement: Mapped[Optional["Agreement"]] = relationship("Agreement", backref="custody_orders")
    children: Mapped[list["CustodyOrderChild"]] = relationship(
        "CustodyOrderChild", back_populates="custody_order", cascade="all, delete-orphan"
    )
    visitation_schedules: Mapped[list["VisitationSchedule"]] = relationship(
        "VisitationSchedule", back_populates="custody_order", cascade="all, delete-orphan"
    )
    supervised_visitation: Mapped[Optional["SupervisedVisitation"]] = relationship(
        "SupervisedVisitation", back_populates="custody_order", uselist=False, cascade="all, delete-orphan"
    )
    exchange_rules: Mapped[Optional["ExchangeRules"]] = relationship(
        "ExchangeRules", back_populates="custody_order", uselist=False, cascade="all, delete-orphan"
    )
    holiday_schedule: Mapped[list["HolidaySchedule"]] = relationship(
        "HolidaySchedule", back_populates="custody_order", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CustodyOrder {self.form_type} case={self.case_id}>"


# =============================================================================
# Child Custody Details (per child)
# =============================================================================

class CustodyOrderChild(Base, UUIDMixin, TimestampMixin):
    """
    Child-specific custody information within an order.

    Matches Section 1 of FL-311 - Minor Children.
    """

    __tablename__ = "custody_order_children"

    custody_order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("custody_orders.id"), index=True
    )
    child_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("children.id"), nullable=True
    )  # Link to our Child model if exists

    # From form - may not match our records exactly
    child_name: Mapped[str] = mapped_column(String(200))
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    age_at_filing: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Child-specific custody (if different from main order)
    physical_custody: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    legal_custody: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Child-specific notes
    special_needs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    school_info: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # Relationships
    custody_order: Mapped["CustodyOrder"] = relationship("CustodyOrder", back_populates="children")
    child: Mapped[Optional["Child"]] = relationship("Child", backref="custody_order_entries")

    def __repr__(self) -> str:
        return f"<CustodyOrderChild {self.child_name}>"


# =============================================================================
# Visitation Schedule (Section 4)
# =============================================================================

class VisitationSchedule(Base, UUIDMixin, TimestampMixin):
    """
    Detailed visitation schedule from Section 4 of FL-311.

    Captures weekends, weekdays, times, and virtual visitation.
    """

    __tablename__ = "visitation_schedules"

    custody_order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("custody_orders.id"), index=True
    )

    # Which parent's schedule this is
    parent_type: Mapped[str] = mapped_column(
        String(20)
    )  # petitioner, respondent, other

    # Schedule type
    schedule_type: Mapped[str] = mapped_column(
        String(30)
    )  # weekend, weekday, virtual, other

    # Weekend schedules (Section 4.a.1)
    weekend_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # 1st, 2nd, etc.

    # Days and times
    start_day: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Friday, Saturday, etc.
    end_day: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)

    # School-related timing
    start_at_school: Mapped[bool] = mapped_column(Boolean, default=False)  # "start of school"
    start_after_school: Mapped[bool] = mapped_column(Boolean, default=False)  # "after school"
    end_at_school: Mapped[bool] = mapped_column(Boolean, default=False)
    end_after_school: Mapped[bool] = mapped_column(Boolean, default=False)

    # Effective dates
    effective_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    effective_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Fifth weekend handling (Section 4.a.1.a/b)
    fifth_weekend_rule: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # alternate, odd_months, even_months, petitioner, respondent
    fifth_weekend_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Virtual visitation (Section 4.b)
    is_virtual: Mapped[bool] = mapped_column(Boolean, default=False)
    virtual_platform: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    virtual_schedule_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Other specifications
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    custody_order: Mapped["CustodyOrder"] = relationship(
        "CustodyOrder", back_populates="visitation_schedules"
    )

    def __repr__(self) -> str:
        return f"<VisitationSchedule {self.schedule_type} {self.parent_type}>"


# =============================================================================
# Supervised Visitation (Section 6)
# =============================================================================

class SupervisedVisitation(Base, UUIDMixin, TimestampMixin):
    """
    Supervised visitation requirements from Section 6 of FL-311.
    """

    __tablename__ = "supervised_visitations"

    custody_order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("custody_orders.id"), unique=True, index=True
    )

    # Who requires supervision
    supervised_parent: Mapped[str] = mapped_column(
        String(20)
    )  # petitioner, respondent, other

    # Reason for supervision
    supervision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Supervisor details (Section 6.c)
    supervisor_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    supervisor_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    supervisor_type: Mapped[str] = mapped_column(
        String(30), default="professional"
    )  # professional, nonprofessional
    supervisor_agency: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Cost sharing (Section 6.c.1.B)
    petitioner_cost_percent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    respondent_cost_percent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    other_party_cost_percent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Location (Section 6.d)
    location_type: Mapped[str] = mapped_column(
        String(30), default="in_person"
    )  # in_person, virtual, other
    location_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    location_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Schedule (Section 6.e)
    frequency: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # once_weekly, twice_weekly, etc.
    hours_per_visit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    schedule_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    custody_order: Mapped["CustodyOrder"] = relationship(
        "CustodyOrder", back_populates="supervised_visitation"
    )

    def __repr__(self) -> str:
        return f"<SupervisedVisitation for {self.supervised_parent}>"


# =============================================================================
# Exchange Rules (Section 7)
# =============================================================================

class ExchangeRules(Base, UUIDMixin, TimestampMixin):
    """
    Transportation and exchange rules from Section 7 of FL-311.
    """

    __tablename__ = "exchange_rules"

    custody_order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("custody_orders.id"), unique=True, index=True
    )

    # Driver requirements (Section 7.a)
    require_licensed_driver: Mapped[bool] = mapped_column(Boolean, default=True)
    require_insured_driver: Mapped[bool] = mapped_column(Boolean, default=True)
    require_registered_vehicle: Mapped[bool] = mapped_column(Boolean, default=True)
    require_child_restraints: Mapped[bool] = mapped_column(Boolean, default=True)

    # Transportation providers (Section 7.b/c)
    transport_to_provider: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    transport_from_provider: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Exchange points (Section 7.d/e)
    exchange_start_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    exchange_end_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    exchange_location_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # home, school, neutral, police_station

    # Exchange protocol (Section 7.f)
    exchange_protocol: Mapped[str] = mapped_column(
        String(30), default="curbside"
    )  # curbside, doorstep, neutral_location
    curbside_exchange: Mapped[bool] = mapped_column(Boolean, default=False)

    # Other rules
    other_rules: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    custody_order: Mapped["CustodyOrder"] = relationship(
        "CustodyOrder", back_populates="exchange_rules"
    )

    def __repr__(self) -> str:
        return f"<ExchangeRules order={self.custody_order_id}>"


# =============================================================================
# Holiday Schedule (Section 11)
# =============================================================================

class HolidaySchedule(Base, UUIDMixin, TimestampMixin):
    """
    Holiday and vacation schedule from Section 11 (FL-341(C)).
    """

    __tablename__ = "holiday_schedules"

    custody_order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("custody_orders.id"), index=True
    )

    # Holiday identification
    holiday_name: Mapped[str] = mapped_column(String(100))  # Christmas, Thanksgiving, etc.
    holiday_type: Mapped[str] = mapped_column(
        String(30), default="federal"
    )  # federal, religious, school_break, birthday, other

    # Schedule
    assigned_to: Mapped[str] = mapped_column(
        String(20)
    )  # petitioner, respondent, alternate, split

    # For alternating holidays
    odd_years_to: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    even_years_to: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Timing
    start_day: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # "Christmas Eve at 6pm"
    end_day: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # "Christmas Day at 6pm"
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)

    # Duration for vacations
    duration_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Priority (holiday schedule takes priority over regular schedule per FL-311)
    priority: Mapped[int] = mapped_column(Integer, default=1)  # Higher = more priority

    # Relationships
    custody_order: Mapped["CustodyOrder"] = relationship(
        "CustodyOrder", back_populates="holiday_schedule"
    )

    def __repr__(self) -> str:
        return f"<HolidaySchedule {self.holiday_name}>"


# =============================================================================
# Agreement Upload Tracking
# =============================================================================

class AgreementUpload(Base, UUIDMixin, TimestampMixin):
    """
    Track uploaded agreement PDFs and extraction status.
    """

    __tablename__ = "agreement_uploads"

    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Upload metadata
    uploaded_by: Mapped[str] = mapped_column(String(36))  # Court professional or user ID
    uploaded_by_type: Mapped[str] = mapped_column(String(20))  # court_professional, parent

    # File information
    original_filename: Mapped[str] = mapped_column(String(500))
    file_url: Mapped[str] = mapped_column(Text)  # Base64 or URL
    file_size_bytes: Mapped[int] = mapped_column(Integer)
    file_hash: Mapped[str] = mapped_column(String(64))  # SHA-256
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Document classification
    document_type: Mapped[str] = mapped_column(
        String(50), default="custody_order"
    )  # custody_order, parenting_plan, modification, etc.
    form_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # FL-311, FL-341, etc.
    state: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)

    # Extraction status
    extraction_status: Mapped[str] = mapped_column(
        String(30), default="pending"
    )  # pending, processing, completed, failed, needs_review
    extraction_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    extraction_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    extraction_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Extraction results
    custody_order_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("custody_orders.id"), nullable=True
    )  # Created custody order
    extraction_confidence: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), nullable=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # OCR text
    raw_extracted_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Review status
    requires_review: Mapped[bool] = mapped_column(Boolean, default=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="agreement_uploads")
    custody_order: Mapped[Optional["CustodyOrder"]] = relationship(
        "CustodyOrder", backref="source_upload"
    )

    def __repr__(self) -> str:
        return f"<AgreementUpload {self.original_filename}>"
