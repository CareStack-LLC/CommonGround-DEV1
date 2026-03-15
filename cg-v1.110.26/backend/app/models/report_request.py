"""
Report Request Model.

Tracks paid report requests through the approval pipeline:
pending_payment -> paid -> in_review -> generating -> completed -> delivered
"""

from datetime import datetime, date
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


# Valid statuses for report requests
REPORT_REQUEST_STATUSES = [
    "pending_payment",
    "paid",
    "in_review",
    "generating",
    "completed",
    "delivered",
    "rejected",
]

# Urgency levels
URGENCY_LEVELS = ["standard", "rush", "urgent"]


class ReportRequest(Base, UUIDMixin, TimestampMixin):
    """
    Tracks paid professional report requests.

    Flow:
    1. Parent/professional initiates paid report via Stripe checkout
    2. Stripe webhook sets status to "paid"
    3. SuperAdmin reviews and approves (status -> "in_review" -> "generating")
    4. System generates PDF report
    5. Admin delivers report (status -> "completed" -> "delivered")
    """

    __tablename__ = "report_requests"

    # Core relationships
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id"), nullable=False
    )
    requested_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    # Report details
    report_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="pending_payment", nullable=False
    )

    # Stripe payment
    stripe_checkout_session_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Request configuration
    urgency: Mapped[str] = mapped_column(String(20), default="standard")
    date_range_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    date_range_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Admin workflow
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    approved_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    rejected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Generated report
    generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sha256_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    report_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Delivery
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    def __repr__(self) -> str:
        return f"<ReportRequest {self.id} type={self.report_type} status={self.status}>"
