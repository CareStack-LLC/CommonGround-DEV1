"""
Wallet models - Parent wallets via Stripe Connect and Child wallets as internal ledgers.

This module implements the wallet system for ClearFund payments:
1. Parent Wallets - backed by Stripe Connect Express accounts
2. Child Wallets - internal ledger balances for receiving gifts
3. Wallet Transactions - immutable transaction records
4. Payouts - transfers to parent Connect accounts when obligations are funded

Key Invariants:
1. Parent wallets map 1:1 to Stripe Connect accounts
2. Child wallets are internal ledger balances only (no Stripe account)
3. All wallet transactions are immutable
4. Balance is derived from transactions, never stored directly
5. Payouts are triggered when obligations reach 100% funding
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.child import Child
    from app.models.family_file import FamilyFile
    from app.models.clearfund import Obligation


# ============================================================================
# Enums as Constants
# ============================================================================

# Wallet types
WALLET_TYPES = ["parent_connect", "child_ledger"]

# Owner types
OWNER_TYPES = ["parent", "child"]

# Stripe Connect account statuses
CONNECT_ACCOUNT_STATUSES = [
    "pending",      # Account created, onboarding not started
    "onboarding",   # User is completing onboarding
    "active",       # Account is active and can accept payments
    "restricted",   # Account has restrictions (needs verification)
    "disabled",     # Account is disabled
]

# Transaction types
TRANSACTION_TYPES = [
    "deposit_card",       # Parent adds funds via card
    "deposit_ach",        # Parent adds funds via ACH bank transfer
    "payment_to_obligation",  # Funds used to pay obligation
    "payout_received",    # Funds received from obligation payout
    "transfer_out",       # Funds transferred out (withdrawal to bank)
    "gift_received",      # Child wallet: gift from circle member
    "refund",             # Refund to wallet
    "fee",                # Platform fee (if applicable)
]

# Transaction statuses
TRANSACTION_STATUSES = ["pending", "processing", "completed", "failed", "cancelled"]

# Payment sources for obligation funding
PAYMENT_SOURCES = ["wallet", "card", "ach"]

# Payout statuses
PAYOUT_STATUSES = ["pending", "processing", "in_transit", "paid", "failed", "cancelled"]


# ============================================================================
# Core Wallet Models
# ============================================================================

class Wallet(Base, UUIDMixin, TimestampMixin):
    """
    Wallet - holds funds for parents or children.

    Parent Wallets:
    - Backed by Stripe Connect Express account
    - Can receive deposits (card, ACH)
    - Can pay obligations
    - Can receive payouts from funded obligations
    - Can withdraw to bank account

    Child Wallets:
    - Internal ledger only (no Stripe account)
    - Receives contributions from Circle members
    - Balance managed by parents
    - Funds saved for child's future use
    """

    __tablename__ = "wallets"

    # Owner identification
    owner_type: Mapped[str] = mapped_column(String(20))  # parent, child
    owner_id: Mapped[str] = mapped_column(String(36), index=True)  # User ID or Child ID

    # Family context
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )

    # Wallet type
    wallet_type: Mapped[str] = mapped_column(String(30))  # parent_connect, child_ledger

    # Display name
    display_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Stripe Connect details (parent wallets only)
    stripe_account_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, nullable=True, index=True
    )
    stripe_account_status: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )  # pending, onboarding, active, restricted, disabled

    # Connected bank account (last 4 digits for display)
    bank_last_four: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Onboarding
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    onboarding_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Verification
    charges_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    payouts_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    suspended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    suspension_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Extra data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    transactions: Mapped[List["WalletTransaction"]] = relationship(
        "WalletTransaction", back_populates="wallet", cascade="all, delete-orphan"
    )
    wallet_fundings: Mapped[List["WalletFunding"]] = relationship(
        "WalletFunding", back_populates="wallet", cascade="all, delete-orphan"
    )
    payouts_received: Mapped[List["Payout"]] = relationship(
        "Payout", back_populates="recipient_wallet", cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index("ix_wallets_owner", "owner_type", "owner_id"),
        Index("ix_wallets_family", "family_file_id", "owner_type"),
    )

    def __repr__(self) -> str:
        return f"<Wallet {self.wallet_type} owner={self.owner_id}>"

    @property
    def is_parent_wallet(self) -> bool:
        """Check if this is a parent wallet."""
        return self.wallet_type == "parent_connect"

    @property
    def is_child_wallet(self) -> bool:
        """Check if this is a child wallet."""
        return self.wallet_type == "child_ledger"

    @property
    def is_ready_for_payments(self) -> bool:
        """Check if wallet is ready to make/receive payments."""
        if self.is_child_wallet:
            return self.is_active
        return (
            self.is_active and
            self.onboarding_completed and
            self.charges_enabled
        )

    @property
    def is_ready_for_payouts(self) -> bool:
        """Check if wallet is ready to receive payouts."""
        if self.is_child_wallet:
            return False  # Child wallets don't receive payouts
        return (
            self.is_active and
            self.onboarding_completed and
            self.payouts_enabled
        )


class WalletTransaction(Base, UUIDMixin, TimestampMixin):
    """
    Immutable wallet transaction record.

    All wallet operations create transaction records for audit trail.
    Balance is calculated by summing completed transactions.
    """

    __tablename__ = "wallet_transactions"

    # Wallet link
    wallet_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("wallets.id"), index=True
    )

    # Transaction details
    transaction_type: Mapped[str] = mapped_column(String(30), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    # Description
    description: Mapped[str] = mapped_column(String(500))

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)

    # Stripe references
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_transfer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_payout_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Source/destination for transfers
    source_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    source_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    destination_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    destination_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Related entities
    obligation_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("obligations.id"), index=True, nullable=True
    )
    payout_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("payouts.id"), index=True, nullable=True
    )

    # Fees (for tracking Stripe fees)
    fee_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Balance after this transaction (for display)
    balance_after: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Extra data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Timestamps
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="transactions")

    # Indexes
    __table_args__ = (
        Index("ix_wallet_transactions_wallet_status", "wallet_id", "status"),
        Index("ix_wallet_transactions_wallet_created", "wallet_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<WalletTransaction {self.transaction_type} ${self.amount} {self.status}>"

    def mark_completed(self) -> None:
        """Mark transaction as completed."""
        self.status = "completed"
        self.completed_at = datetime.utcnow()

    def mark_failed(self, reason: str) -> None:
        """Mark transaction as failed."""
        self.status = "failed"
        self.failed_at = datetime.utcnow()
        self.failure_reason = reason


class WalletFunding(Base, UUIDMixin, TimestampMixin):
    """
    Links obligation to wallet payments.

    Tracks how an obligation was funded:
    - From wallet balance
    - Direct card payment
    - Direct ACH payment
    - Partial payments

    Replaces ObligationFunding for the new wallet system.
    """

    __tablename__ = "wallet_fundings"

    # Links
    obligation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("obligations.id"), index=True
    )
    wallet_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("wallets.id"), index=True, nullable=True
    )  # Null if direct card/ACH payment
    payer_id: Mapped[str] = mapped_column(String(36), index=True)  # User ID who paid

    # Amount
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    # Payment source
    payment_source: Mapped[str] = mapped_column(String(30))  # wallet, card, ach

    # Transaction links
    wallet_transaction_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("wallet_transactions.id"), nullable=True
    )
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")

    # Timestamps
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Extra data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    wallet: Mapped[Optional["Wallet"]] = relationship("Wallet", back_populates="wallet_fundings")

    # Indexes
    __table_args__ = (
        Index("ix_wallet_fundings_obligation_payer", "obligation_id", "payer_id"),
    )

    def __repr__(self) -> str:
        return f"<WalletFunding {self.payment_source} ${self.amount} for obligation {self.obligation_id}>"

    def mark_completed(self) -> None:
        """Mark funding as completed."""
        self.status = "completed"
        self.completed_at = datetime.utcnow()

    def mark_failed(self, reason: str) -> None:
        """Mark funding as failed."""
        self.status = "failed"
        self.failed_at = datetime.utcnow()
        self.failure_reason = reason


class ChildWalletContribution(Base, UUIDMixin, TimestampMixin):
    """
    Guest contributions to child wallet from Circle members.

    Circle members can contribute without creating an account.
    Uses Stripe guest checkout flow.
    """

    __tablename__ = "child_wallet_contributions"

    # Child wallet link
    child_wallet_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("wallets.id"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id"), index=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True
    )

    # Contributor info (may not be a registered user)
    contributor_name: Mapped[str] = mapped_column(String(200))
    contributor_email: Mapped[str] = mapped_column(String(255))
    contributor_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )  # Set if contributor is a registered circle user
    contributor_circle_contact_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("circle_contacts.id"), nullable=True
    )  # Set if contributor is a circle contact

    # Amount
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    # Purpose and message
    purpose: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Stripe payment
    stripe_payment_intent_id: Mapped[str] = mapped_column(String(100), index=True)
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Fees
    fee_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")

    # Transaction link (created when payment succeeds)
    wallet_transaction_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("wallet_transactions.id"), nullable=True
    )

    # Timestamps
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Receipt sent
    receipt_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Extra data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Indexes
    __table_args__ = (
        Index("ix_child_contributions_child", "child_id", "created_at"),
        Index("ix_child_contributions_email", "contributor_email"),
    )

    def __repr__(self) -> str:
        return f"<ChildWalletContribution ${self.amount} from {self.contributor_name}>"


class Payout(Base, UUIDMixin, TimestampMixin):
    """
    Payout from platform to parent when obligation is fully funded.

    When an obligation reaches 100% funding, the full amount is
    transferred to the requesting parent's Stripe Connect account.
    """

    __tablename__ = "payouts"

    # Obligation link
    obligation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("obligations.id"), unique=True, index=True
    )

    # Recipient
    recipient_wallet_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("wallets.id"), index=True
    )
    recipient_user_id: Mapped[str] = mapped_column(String(36), index=True)

    # Amounts
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    fee_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    # Stripe references
    stripe_transfer_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    stripe_payout_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)

    # Approval (for manual approval flow)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Timestamps
    initiated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    processing_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Expected arrival (from Stripe)
    estimated_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Extra data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    recipient_wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="payouts_received")

    # Indexes
    __table_args__ = (
        Index("ix_payouts_recipient_status", "recipient_user_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Payout ${self.net_amount} {self.status} for obligation {self.obligation_id}>"

    def approve(self, approved_by: str) -> None:
        """Approve the payout for processing."""
        self.approved_at = datetime.utcnow()
        self.approved_by = approved_by
        self.status = "processing"
        self.processing_at = datetime.utcnow()

    def mark_completed(self) -> None:
        """Mark payout as completed."""
        self.status = "paid"
        self.completed_at = datetime.utcnow()

    def mark_failed(self, reason: str) -> None:
        """Mark payout as failed."""
        self.status = "failed"
        self.failed_at = datetime.utcnow()
        self.failure_reason = reason
