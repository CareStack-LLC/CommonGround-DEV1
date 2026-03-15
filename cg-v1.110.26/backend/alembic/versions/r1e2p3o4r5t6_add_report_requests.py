"""Add report_requests table for paid report approval pipeline.

Revision ID: r1e2p3o4r5t6
Revises: p1r2o3f4_prof_stripe, update_stripe_v3
Create Date: 2026-03-15

This migration adds:
- report_requests table tracking paid professional report requests
  through the approval pipeline: pending_payment -> paid -> in_review ->
  generating -> completed -> delivered
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "r1e2p3o4r5t6"
down_revision = ("p1r2o3f4_prof_stripe", "update_stripe_v3")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "report_requests",
        # Primary key (UUIDMixin)
        sa.Column("id", sa.String(36), primary_key=True),
        # Core relationships
        sa.Column(
            "family_file_id",
            sa.String(36),
            sa.ForeignKey("family_files.id"),
            nullable=False,
        ),
        sa.Column(
            "requested_by_id",
            sa.String(36),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        # Report details
        sa.Column("report_type", sa.String(100), nullable=False),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="pending_payment",
        ),
        # Stripe payment
        sa.Column("stripe_checkout_session_id", sa.String(255), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True),
        # Request configuration
        sa.Column("urgency", sa.String(20), server_default="standard"),
        sa.Column("date_range_start", sa.Date, nullable=True),
        sa.Column("date_range_end", sa.Date, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("price_cents", sa.Integer, nullable=True),
        # Admin workflow
        sa.Column("admin_notes", sa.Text, nullable=True),
        sa.Column(
            "assigned_to",
            sa.String(36),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("approved_at", sa.DateTime, nullable=True),
        sa.Column(
            "approved_by",
            sa.String(36),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("rejected_at", sa.DateTime, nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        # Generated report
        sa.Column("generated_at", sa.DateTime, nullable=True),
        sa.Column("file_url", sa.String(500), nullable=True),
        sa.Column("sha256_hash", sa.String(64), nullable=True),
        sa.Column("report_id", sa.String(20), nullable=True),
        # Delivery
        sa.Column("delivered_at", sa.DateTime, nullable=True),
        # Timestamps (TimestampMixin)
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Add indexes for common queries
    op.create_index(
        "ix_report_requests_status",
        "report_requests",
        ["status"],
    )
    op.create_index(
        "ix_report_requests_family_file_id",
        "report_requests",
        ["family_file_id"],
    )
    op.create_index(
        "ix_report_requests_requested_by_id",
        "report_requests",
        ["requested_by_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_report_requests_requested_by_id")
    op.drop_index("ix_report_requests_family_file_id")
    op.drop_index("ix_report_requests_status")
    op.drop_table("report_requests")
