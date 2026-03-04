"""
Payment models - ClearFund financial tracking and payments.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Payment(Base, UUIDMixin, TimestampMixin):
    """
    Payment record - tracks all financial transactions.
    """

    __tablename__ = "payments"

    # Case link
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Payment type
    payment_type: Mapped[str] = mapped_column(
        String(50)
    )  # child_support, expense_reimbursement, escrow, one_time

    # Parties
    payer_id: Mapped[str] = mapped_column(String(36), index=True)  # User ID
    payee_id: Mapped[str] = mapped_column(String(36), index=True)  # User ID

    # Amount
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    # Purpose
    purpose: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(
        String(50)
    )  # medical, education, sports, clothing, etc.
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Related expense request
    expense_request_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("expense_requests.id"), index=True, nullable=True
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, processing, completed, failed, refunded

    # Payment processing
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_refund_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Timing
    scheduled_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Receipt
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    receipt_uploaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Notes
    payer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payee_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="payments")
    expense_request: Mapped[Optional["ExpenseRequest"]] = relationship(
        "ExpenseRequest", back_populates="payments"
    )

    def __repr__(self) -> str:
        return f"<Payment ${self.amount} {self.payment_type}>"


class ExpenseRequest(Base, UUIDMixin, TimestampMixin):
    """
    Expense request - structured request for shared expenses.
    """

    __tablename__ = "expense_requests"

    # Case link
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id"), index=True)

    # Request details
    requested_by: Mapped[str] = mapped_column(String(36), index=True)  # User ID
    requested_from: Mapped[str] = mapped_column(String(36), index=True)  # User ID

    # Amount
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    requesting_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2)
    )  # What they want from the other parent
    split_percentage: Mapped[int] = mapped_column(Integer, default=50)  # 0-100

    # Details
    category: Mapped[str] = mapped_column(
        String(50)
    )  # medical, education, sports, camp, device, transportation, other
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    vendor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Children affected
    child_ids: Mapped[list] = mapped_column(JSON)  # List of child IDs

    # Due date
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Attachments (receipts, invoices)
    attachment_urls: Mapped[list] = mapped_column(JSON, default=list)

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, approved, partial, rejected, paid

    # Response
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    response_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Payment tracking
    total_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    is_fully_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Agreement reference
    agreement_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    agreement_section: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Analytics
    response_time_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="expense_request", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ExpenseRequest ${self.total_amount} {self.category}>"


class PaymentLedger(Base, UUIDMixin, TimestampMixin):
    """
    FIFO ledger entry for payment tracking.

    Tracks obligations and credits to maintain accurate balances.
    All credits are applied FIFO (first-in, first-out) to oldest obligations.
    """

    __tablename__ = "payment_ledger"

    # Case or Family File link (one must be set)
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cases.id"), index=True, nullable=True
    )
    family_file_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("family_files.id"), index=True, nullable=True
    )

    # Entry type
    entry_type: Mapped[str] = mapped_column(
        String(20)
    )  # obligation, payment, credit, adjustment

    # Parties
    obligor_id: Mapped[str] = mapped_column(String(36), index=True)  # Who owes
    obligee_id: Mapped[str] = mapped_column(String(36), index=True)  # Who is owed

    # Amount
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    running_balance: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    # Reference
    payment_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    expense_request_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # ClearFund integration - obligation tracking
    obligation_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("obligations.id"), index=True, nullable=True
    )

    # FIFO tracking - which obligation consumed this credit
    fifo_applied_to: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )  # obligation_id that consumed this credit

    # Credit source for tracking payment origins
    credit_source: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # payment, prepayment, refund, adjustment

    # Details
    description: Mapped[str] = mapped_column(String(300))
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Effective date
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Status
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=False)
    reconciled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # FIFO application tracking
    fifo_applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    fifo_remaining: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )  # Amount not yet applied to obligations

    def __repr__(self) -> str:
        return f"<PaymentLedger {self.entry_type} ${self.amount}>"
