"""
ClearFund models - Purpose-locked financial obligations and verifications.

ClearFund transforms child-related financial obligations into verifiable,
purpose-locked transactions with court-ready records.

Key Invariants:
1. Platform never holds money (Stripe handles all funds)
2. All obligations have immutable purpose
3. All payments applied FIFO
4. No obligation closed without verification
5. Spending verification ≠ spending surveillance
6. All state transitions logged
7. Parents cannot relabel history
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


# ============================================================================
# Enums as Constants (for documentation, validation in schemas)
# ============================================================================

# Obligation source types
OBLIGATION_SOURCE_TYPES = ["court_order", "agreement", "request"]

# Purpose categories for expenses
OBLIGATION_CATEGORIES = [
    "medical",        # Doctor visits, prescriptions, therapy
    "education",      # Tuition, books, school supplies
    "sports",         # Equipment, fees, uniforms
    "device",         # Phones, tablets, computers
    "camp",           # Summer camp, day camp
    "clothing",       # Seasonal clothes, shoes
    "transportation", # Travel, gas, car expenses
    "child_support",  # Monthly support payments
    "extracurricular",# Music lessons, clubs
    "childcare",      # Daycare, babysitting
    "other"           # Miscellaneous
]

# Obligation status lifecycle
OBLIGATION_STATUSES = [
    "open",           # Created, awaiting funding
    "partially_funded", # Some funds received
    "funded",         # Full amount received
    "authorized",     # Virtual card issued (future)
    "pending_verification", # Awaiting receipt/confirmation
    "verified",       # Transaction confirmed
    "completed",      # Obligation fulfilled
    "expired",        # Due date passed without completion
    "cancelled"       # Manually cancelled
]

# Virtual card statuses (for v2)
CARD_STATUSES = ["active", "used", "expired", "cancelled"]

# Verification artifact types
ARTIFACT_TYPES = ["transaction", "receipt", "vendor_confirmation", "manual"]

# Credit sources for ledger
CREDIT_SOURCES = ["payment", "prepayment", "refund", "adjustment"]


# ============================================================================
# Core ClearFund Models
# ============================================================================

class Obligation(Base, UUIDMixin, TimestampMixin):
    """
    Financial obligation for a specific purpose.

    Obligations represent money that must be spent on a specific child-related
    purpose. They can be created from agreement rules, court orders, or
    one-time expense requests.

    Lifecycle: open -> funded -> verified -> completed
    """

    __tablename__ = "obligations"

    # Case or Family File - at least one should be set
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True, nullable=True
    )  # Court case context (legacy)
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )  # Family file context (preferred)

    # Agreement link (primary - obligations belong to a specific SharedCare Agreement)
    agreement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("agreements.id"), index=True, nullable=True
    )

    source_type: Mapped[str] = mapped_column(
        String(20)
    )  # court_order, agreement, request
    source_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )  # FK to agreements, court_orders, or expense_requests

    # Purpose (immutable after creation)
    purpose_category: Mapped[str] = mapped_column(
        String(30)
    )  # medical, education, sports, etc.
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Children affected
    child_ids: Mapped[list] = mapped_column(JSON, default=list)

    # Financial details
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    petitioner_share: Mapped[Decimal] = mapped_column(
        Numeric(10, 2)
    )  # Amount petitioner owes
    respondent_share: Mapped[Decimal] = mapped_column(
        Numeric(10, 2)
    )  # Amount respondent owes

    # Split percentage (for display/reference)
    petitioner_percentage: Mapped[int] = mapped_column(default=50)  # 0-100

    # Due date
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Status tracking
    status: Mapped[str] = mapped_column(String(25), default="open")

    # Amount tracking
    amount_funded: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    amount_spent: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    amount_verified: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Verification requirements
    verification_required: Mapped[bool] = mapped_column(Boolean, default=True)
    receipt_required: Mapped[bool] = mapped_column(Boolean, default=False)
    receipt_deadline_hours: Mapped[int] = mapped_column(default=72)  # Hours after spend

    # Vendor info (for virtual card spending controls - v2)
    allowed_vendor_categories: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True
    )  # MCC codes
    allowed_vendors: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True
    )  # Specific vendor names

    # Recurring info (for auto-generated obligations)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_rule: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )  # iCal RRULE format
    parent_obligation_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )  # Link to template obligation

    # Audit trail
    created_by: Mapped[str] = mapped_column(String(36))  # User ID

    # Timestamps for lifecycle
    funded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expired_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="obligations")
    funding_records: Mapped[list["ObligationFunding"]] = relationship(
        "ObligationFunding", back_populates="obligation", cascade="all, delete-orphan"
    )
    attestation: Mapped[Optional["Attestation"]] = relationship(
        "Attestation", back_populates="obligation", uselist=False, cascade="all, delete-orphan"
    )
    verification_artifacts: Mapped[list["VerificationArtifact"]] = relationship(
        "VerificationArtifact", back_populates="obligation", cascade="all, delete-orphan"
    )
    virtual_card: Mapped[Optional["VirtualCardAuthorization"]] = relationship(
        "VirtualCardAuthorization", back_populates="obligation", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Obligation ${self.total_amount} {self.purpose_category} - {self.status}>"

    @property
    def is_fully_funded(self) -> bool:
        """Check if obligation has received full funding."""
        return self.amount_funded >= self.total_amount

    @property
    def funding_percentage(self) -> float:
        """Calculate percentage of funding received."""
        if self.total_amount == 0:
            return 100.0
        return float(self.amount_funded / self.total_amount * 100)

    @property
    def is_overdue(self) -> bool:
        """Check if obligation is past due date."""
        if not self.due_date:
            return False
        return datetime.utcnow() > self.due_date and self.status not in [
            "completed", "cancelled", "expired"
        ]


class ObligationFunding(Base, UUIDMixin, TimestampMixin):
    """
    Track funding contributions from each parent.

    Each parent has a required share. This tracks when they fund
    their portion and through what payment method.
    """

    __tablename__ = "obligation_funding"

    # Links
    obligation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("obligations.id"), index=True
    )
    parent_id: Mapped[str] = mapped_column(String(36), index=True)  # User ID

    # Amounts
    amount_required: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    amount_funded: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Payment tracking
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    payment_method: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # card, bank_transfer, existing_credit

    # Status
    is_fully_funded: Mapped[bool] = mapped_column(Boolean, default=False)
    funded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    obligation: Mapped["Obligation"] = relationship(
        "Obligation", back_populates="funding_records"
    )

    def __repr__(self) -> str:
        return f"<ObligationFunding ${self.amount_funded}/${self.amount_required}>"


class Attestation(Base, UUIDMixin, TimestampMixin):
    """
    Sworn statement from parent creating expense request.

    Attestations are immutable declarations of purpose. They provide
    court-ready evidence of intent and commitment.
    """

    __tablename__ = "attestations"

    # Links
    obligation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("obligations.id"), unique=True, index=True
    )
    attesting_parent_id: Mapped[str] = mapped_column(String(36), index=True)

    # The sworn statement (immutable)
    attestation_text: Mapped[str] = mapped_column(Text)
    purpose_declaration: Mapped[str] = mapped_column(Text)

    # Commitment checkboxes
    receipt_commitment: Mapped[bool] = mapped_column(
        Boolean, default=False
    )  # "I will provide receipt"
    purpose_commitment: Mapped[bool] = mapped_column(
        Boolean, default=True
    )  # "Funds will be used for stated purpose"

    # Legal acknowledgment
    legal_acknowledgment: Mapped[bool] = mapped_column(
        Boolean, default=True
    )  # "I understand this is a legal record"

    # Capture details for authenticity
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timestamp (separate from created_at for legal precision)
    attested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    obligation: Mapped["Obligation"] = relationship(
        "Obligation", back_populates="attestation"
    )

    def __repr__(self) -> str:
        return f"<Attestation by {self.attesting_parent_id} at {self.attested_at}>"


class VerificationArtifact(Base, UUIDMixin, TimestampMixin):
    """
    Proof that funds were spent as intended.

    Artifacts can be automatic (Stripe transaction data) or manual
    (uploaded receipt, vendor confirmation).
    """

    __tablename__ = "verification_artifacts"

    # Links
    obligation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("obligations.id"), index=True
    )

    # Artifact type
    artifact_type: Mapped[str] = mapped_column(
        String(30)
    )  # transaction, receipt, vendor_confirmation, manual

    # Transaction details (from Stripe or manual entry)
    stripe_transaction_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    vendor_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    vendor_mcc: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # Merchant category code
    transaction_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Amount
    amount_verified: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    # Receipt/document
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    receipt_file_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    receipt_file_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Verification metadata
    verified_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # User ID
    verification_method: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )  # automatic, manual, court_order
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    verified_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Integrity
    receipt_hash: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )  # SHA-256 of receipt file

    # Relationships
    obligation: Mapped["Obligation"] = relationship(
        "Obligation", back_populates="verification_artifacts"
    )

    def __repr__(self) -> str:
        return f"<VerificationArtifact {self.artifact_type} ${self.amount_verified}>"


class VirtualCardAuthorization(Base, UUIDMixin, TimestampMixin):
    """
    Virtual card issued for a specific obligation.

    Note: This is for v2 (Stripe Issuing). For MVP, we track expenses
    manually with receipt uploads.

    Each obligation gets exactly one virtual card with spending controls
    limited to the obligation purpose.
    """

    __tablename__ = "virtual_card_authorizations"

    # Links
    obligation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("obligations.id"), unique=True, index=True
    )

    # Stripe Issuing details
    stripe_card_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_cardholder_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    card_last_four: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)

    # Spending limits
    amount_authorized: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    amount_spent: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Merchant controls
    allowed_mccs: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # MCC codes
    blocked_mccs: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Transaction details (filled when card is used)
    vendor_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    vendor_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Status and lifecycle
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, active, used, expired, cancelled
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Activation
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    activated_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Relationships
    obligation: Mapped["Obligation"] = relationship(
        "Obligation", back_populates="virtual_card"
    )

    def __repr__(self) -> str:
        return f"<VirtualCardAuthorization ****{self.card_last_four} ${self.amount_authorized}>"

    @property
    def remaining_balance(self) -> Decimal:
        """Calculate remaining authorized amount."""
        return self.amount_authorized - self.amount_spent

    @property
    def is_expired(self) -> bool:
        """Check if card is expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
