"""Add custody_day_records table for tracking daily custody.

Revision ID: c1u2s3t4o5d6y7
Revises: 47a9e9f042e5
Create Date: 2026-01-17

This migration adds:
- custody_day_records table for tracking which parent had custody on each day
- Supports schedule-based, check-in, and manual override determination
- Enables parenting time reports and custody percentage calculations
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = "c1u2s3t4o5d6y7"
down_revision = "47a9e9f042e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create custody_day_records table
    op.create_table(
        "custody_day_records",
        # Primary key
        sa.Column("id", sa.String(36), primary_key=True),

        # Core identifiers
        sa.Column("family_file_id", sa.String(36), sa.ForeignKey("family_files.id"), nullable=False, index=True),
        sa.Column("child_id", sa.String(36), sa.ForeignKey("children.id"), nullable=False, index=True),
        sa.Column("record_date", sa.Date(), nullable=False, index=True),

        # Which parent had custody
        sa.Column("custodial_parent_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),

        # How custody was determined
        sa.Column("determination_method", sa.String(50), nullable=False, default="scheduled"),

        # Source references for traceability
        sa.Column("source_exchange_instance_id", sa.String(36), sa.ForeignKey("custody_exchange_instances.id"), nullable=True),
        sa.Column("source_agreement_id", sa.String(36), sa.ForeignKey("agreements.id"), nullable=True),

        # Override tracking
        sa.Column("override_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("override_at", sa.DateTime(), nullable=True),
        sa.Column("override_reason", sa.Text(), nullable=True),

        # Flags
        sa.Column("is_disputed", sa.Boolean(), nullable=False, default=False),

        # Confidence score (0-100)
        sa.Column("confidence_score", sa.Integer(), nullable=True),

        # Notes
        sa.Column("notes", sa.Text(), nullable=True),

        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column("updated_at", sa.DateTime(), nullable=False, default=datetime.utcnow),

        # Unique constraint: one record per child per day
        sa.UniqueConstraint("child_id", "record_date", name="uq_child_date"),
    )

    # Create composite index for efficient date range queries
    op.create_index(
        "ix_custody_day_records_child_date_range",
        "custody_day_records",
        ["child_id", "record_date"]
    )

    # Create index for family file date range queries
    op.create_index(
        "ix_custody_day_records_family_date_range",
        "custody_day_records",
        ["family_file_id", "record_date"]
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_custody_day_records_family_date_range", table_name="custody_day_records")
    op.drop_index("ix_custody_day_records_child_date_range", table_name="custody_day_records")

    # Drop table
    op.drop_table("custody_day_records")
