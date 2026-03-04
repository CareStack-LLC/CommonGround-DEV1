"""
ClearFund schemas - Pydantic models for obligation management.

Purpose-locked financial obligations with court-ready records.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.clearfund import (
    OBLIGATION_SOURCE_TYPES,
    OBLIGATION_CATEGORIES,
    OBLIGATION_STATUSES,
    ARTIFACT_TYPES,
)


# ============================================================================
# Obligation Schemas
# ============================================================================

class ObligationBase(BaseModel):
    """Base obligation fields."""

    purpose_category: str = Field(..., description="Category: medical, education, sports, etc.")
    title: str = Field(..., min_length=3, max_length=200, description="Obligation title")
    description: Optional[str] = Field(None, max_length=2000, description="Detailed description")
    child_ids: list[str] = Field(default_factory=list, description="Children affected")
    total_amount: Decimal = Field(..., gt=0, description="Total amount")
    petitioner_percentage: int = Field(50, ge=0, le=100, description="Petitioner share %")
    due_date: Optional[datetime] = Field(None, description="Due date for payment")
    verification_required: bool = Field(True, description="Require verification")
    receipt_required: bool = Field(False, description="Require receipt upload")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")

    @field_validator('purpose_category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Validate purpose category."""
        if v not in OBLIGATION_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {', '.join(OBLIGATION_CATEGORIES)}")
        return v

    @field_validator('total_amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Validate amount is positive."""
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v


class ObligationCreate(ObligationBase):
    """Create obligation request."""

    case_id: str = Field(..., description="Case ID")
    agreement_id: Optional[str] = Field(None, description="SharedCare Agreement ID")
    source_type: str = Field("request", description="Source: court_order, agreement, request")
    source_id: Optional[str] = Field(None, description="Reference to source document")

    @field_validator('source_type')
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        """Validate source type."""
        if v not in OBLIGATION_SOURCE_TYPES:
            raise ValueError(f"Invalid source type. Must be one of: {', '.join(OBLIGATION_SOURCE_TYPES)}")
        return v

    def get_petitioner_share(self) -> Decimal:
        """Calculate petitioner share from percentage."""
        return self.total_amount * Decimal(self.petitioner_percentage) / 100

    def get_respondent_share(self) -> Decimal:
        """Calculate respondent share from percentage."""
        return self.total_amount - self.get_petitioner_share()


class ObligationCreateFromRequest(BaseModel):
    """Create obligation from approved expense request."""

    expense_request_id: str = Field(..., description="Expense request ID to convert")


class ObligationUpdate(BaseModel):
    """Update obligation request (limited fields after creation)."""

    due_date: Optional[datetime] = Field(None, description="Update due date")
    notes: Optional[str] = Field(None, max_length=2000, description="Update notes")
    receipt_required: Optional[bool] = Field(None, description="Update receipt requirement")


class ObligationResponse(BaseModel):
    """Obligation response."""

    id: str
    case_id: Optional[str] = None  # Court case context (legacy)
    family_file_id: Optional[str] = None  # Family file context
    agreement_id: Optional[str] = None  # SharedCare Agreement context
    source_type: str
    source_id: Optional[str]
    purpose_category: str
    title: str
    description: Optional[str]
    child_ids: list[str]
    total_amount: Decimal
    petitioner_share: Decimal
    respondent_share: Decimal
    petitioner_percentage: int
    due_date: Optional[datetime]
    status: str
    amount_funded: Decimal
    amount_spent: Decimal
    amount_verified: Decimal
    verification_required: bool
    receipt_required: bool
    receipt_deadline_hours: int
    is_recurring: bool
    created_by: str
    funded_at: Optional[datetime]
    verified_at: Optional[datetime]
    completed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Computed properties
    is_fully_funded: bool = False
    funding_percentage: float = 0.0
    is_overdue: bool = False

    class Config:
        from_attributes = True


class ObligationListResponse(BaseModel):
    """Paginated list of obligations."""

    items: list[ObligationResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class ObligationCancel(BaseModel):
    """Cancel obligation request."""

    reason: str = Field(..., min_length=10, max_length=500, description="Cancellation reason")


# ============================================================================
# Funding Schemas
# ============================================================================

class FundingRecord(BaseModel):
    """Record of parent funding contribution."""

    parent_id: str
    amount_required: Decimal
    amount_funded: Decimal
    is_fully_funded: bool
    funded_at: Optional[datetime]

    class Config:
        from_attributes = True


class FundingCreate(BaseModel):
    """Record funding payment."""

    amount: Decimal = Field(..., gt=0, description="Amount funded")
    stripe_payment_intent_id: Optional[str] = Field(None, description="Stripe payment ID")
    payment_method: Optional[str] = Field(None, description="Payment method used")
    notes: Optional[str] = Field(None, max_length=500, description="Payment notes")

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Validate funding amount is positive."""
        if v <= 0:
            raise ValueError("Funding amount must be greater than 0")
        return v


class FundingStatusResponse(BaseModel):
    """Funding status for an obligation."""

    obligation_id: str
    total_amount: Decimal
    amount_funded: Decimal
    funding_percentage: float
    is_fully_funded: bool
    petitioner_funding: FundingRecord
    respondent_funding: FundingRecord


# ============================================================================
# Attestation Schemas
# ============================================================================

class AttestationCreate(BaseModel):
    """Create attestation (sworn statement)."""

    attestation_text: str = Field(..., min_length=50, max_length=5000, description="Sworn statement text")
    purpose_declaration: str = Field(..., min_length=20, max_length=1000, description="Purpose declaration")
    receipt_commitment: bool = Field(False, description="I commit to providing receipt")
    purpose_commitment: bool = Field(True, description="Funds will be used for stated purpose")
    legal_acknowledgment: bool = Field(True, description="I understand this is a legal record")

    @field_validator('legal_acknowledgment')
    @classmethod
    def require_legal_acknowledgment(cls, v: bool) -> bool:
        """Legal acknowledgment is required."""
        if not v:
            raise ValueError("You must acknowledge that this is a legal record")
        return v


class AttestationResponse(BaseModel):
    """Attestation response."""

    id: str
    obligation_id: str
    attesting_parent_id: str
    attestation_text: str
    purpose_declaration: str
    receipt_commitment: bool
    purpose_commitment: bool
    legal_acknowledgment: bool
    attested_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Verification Schemas
# ============================================================================

class VerificationCreate(BaseModel):
    """Create verification artifact."""

    artifact_type: str = Field(..., description="Type: transaction, receipt, vendor_confirmation, manual")
    vendor_name: Optional[str] = Field(None, max_length=200, description="Vendor name")
    vendor_mcc: Optional[str] = Field(None, max_length=10, description="Merchant category code")
    transaction_date: Optional[datetime] = Field(None, description="Transaction date")
    amount_verified: Decimal = Field(..., gt=0, description="Amount verified")
    stripe_transaction_id: Optional[str] = Field(None, description="Stripe transaction ID")
    verification_notes: Optional[str] = Field(None, max_length=1000, description="Verification notes")

    @field_validator('artifact_type')
    @classmethod
    def validate_artifact_type(cls, v: str) -> str:
        """Validate artifact type."""
        if v not in ARTIFACT_TYPES:
            raise ValueError(f"Invalid artifact type. Must be one of: {', '.join(ARTIFACT_TYPES)}")
        return v


class ReceiptUpload(BaseModel):
    """Receipt upload metadata."""

    vendor_name: Optional[str] = Field(None, max_length=200, description="Vendor name")
    amount: Decimal = Field(..., gt=0, description="Receipt amount")
    transaction_date: Optional[datetime] = Field(None, description="Purchase date")
    notes: Optional[str] = Field(None, max_length=500, description="Notes about purchase")


class VerificationArtifactResponse(BaseModel):
    """Verification artifact response."""

    id: str
    obligation_id: str
    artifact_type: str
    stripe_transaction_id: Optional[str]
    vendor_name: Optional[str]
    vendor_mcc: Optional[str]
    transaction_date: Optional[datetime]
    amount_verified: Decimal
    receipt_url: Optional[str]
    receipt_file_name: Optional[str]
    verified_by: Optional[str]
    verification_method: Optional[str]
    verification_notes: Optional[str]
    verified_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Ledger Schemas
# ============================================================================

class LedgerEntry(BaseModel):
    """Ledger entry response."""

    id: str
    case_id: str
    entry_type: str
    obligor_id: str
    obligee_id: str
    amount: Decimal
    running_balance: Decimal
    obligation_id: Optional[str]
    description: str
    effective_date: datetime
    credit_source: Optional[str]
    fifo_applied_to: Optional[str]
    is_reconciled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LedgerListResponse(BaseModel):
    """Paginated ledger entries."""

    items: list[LedgerEntry]
    total: int
    page: int
    page_size: int
    has_more: bool


class PrepaymentCreate(BaseModel):
    """Record prepayment credit."""

    amount: Decimal = Field(..., gt=0, description="Prepayment amount")
    description: str = Field(..., min_length=5, max_length=300, description="Payment description")
    stripe_payment_intent_id: Optional[str] = Field(None, description="Stripe payment ID")


class BalanceSummary(BaseModel):
    """Balance summary for a case."""

    case_id: str
    petitioner_id: str
    respondent_id: str
    petitioner_balance: Decimal  # Positive = owes, Negative = owed
    respondent_balance: Decimal
    petitioner_owes_respondent: Decimal
    respondent_owes_petitioner: Decimal
    net_balance: Decimal  # Who owes whom overall
    total_obligations_open: int
    total_obligations_funded: int
    total_obligations_completed: int
    total_this_month: Decimal
    total_overdue: Decimal


class ReconciliationReport(BaseModel):
    """Reconciliation report for a period."""

    case_id: str
    period_start: datetime
    period_end: datetime
    total_obligations: int
    total_amount: Decimal
    amount_funded: Decimal
    amount_verified: Decimal
    compliance_rate: float  # % of obligations completed on time
    entries: list[LedgerEntry]


# ============================================================================
# Analytics Schemas
# ============================================================================

class ObligationMetrics(BaseModel):
    """Obligation metrics for dashboard."""

    total_open: int
    total_pending_funding: int
    total_funded: int
    total_verified: int
    total_completed: int
    total_overdue: int
    total_cancelled: int


class MonthlyTotals(BaseModel):
    """Monthly spending totals."""

    month: str  # YYYY-MM
    total_amount: Decimal
    by_category: dict[str, Decimal]


class ClearFundAnalytics(BaseModel):
    """ClearFund dashboard analytics."""

    case_id: str
    balance_summary: BalanceSummary
    obligation_metrics: ObligationMetrics
    monthly_totals: list[MonthlyTotals]
    recent_activity: list[ObligationResponse]


class ComplianceReport(BaseModel):
    """Compliance report for court."""

    case_id: str
    generated_at: datetime
    period_start: datetime
    period_end: datetime

    # Summary
    total_obligations: int
    obligations_completed_on_time: int
    obligations_completed_late: int
    obligations_missed: int
    compliance_rate: float

    # By parent
    petitioner_funded_on_time: int
    petitioner_funded_late: int
    petitioner_not_funded: int
    respondent_funded_on_time: int
    respondent_funded_late: int
    respondent_not_funded: int

    # Financial summary
    total_amount: Decimal
    amount_by_category: dict[str, Decimal]

    # Detailed entries
    obligations: list[ObligationResponse]


# ============================================================================
# Filters and Query Params
# ============================================================================

class ObligationFilters(BaseModel):
    """Filters for listing obligations."""

    status: Optional[list[str]] = Field(None, description="Filter by status(es)")
    purpose_category: Optional[list[str]] = Field(None, description="Filter by category(ies)")
    agreement_id: Optional[str] = Field(None, description="Filter by SharedCare Agreement ID")
    child_id: Optional[str] = Field(None, description="Filter by affected child")
    created_by: Optional[str] = Field(None, description="Filter by creator")
    due_before: Optional[datetime] = Field(None, description="Due before date")
    due_after: Optional[datetime] = Field(None, description="Due after date")
    is_overdue: Optional[bool] = Field(None, description="Only overdue obligations")
    min_amount: Optional[Decimal] = Field(None, description="Minimum amount")
    max_amount: Optional[Decimal] = Field(None, description="Maximum amount")


class LedgerFilters(BaseModel):
    """Filters for listing ledger entries."""

    entry_type: Optional[str] = Field(None, description="Filter by entry type")
    parent_id: Optional[str] = Field(None, description="Filter by parent")
    start_date: Optional[datetime] = Field(None, description="Start date")
    end_date: Optional[datetime] = Field(None, description="End date")
    obligation_id: Optional[str] = Field(None, description="Filter by obligation")
    is_reconciled: Optional[bool] = Field(None, description="Reconciliation status")
