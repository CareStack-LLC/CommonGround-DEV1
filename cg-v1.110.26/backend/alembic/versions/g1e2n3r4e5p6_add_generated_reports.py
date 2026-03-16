"""Add generated_reports table for report verification system.

Revision ID: g1e2n3r4e5p6
Revises: r1e2p3o4r5t6
Create Date: 2026-03-15

This migration adds:
- generated_reports table tracking every PDF report generated
  by the platform, enabling public verification by Report ID
  or SHA-256 hash at /verify.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "g1e2n3r4e5p6"
down_revision = "r1e2p3o4r5t6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "generated_reports",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("report_id", sa.String(20), nullable=False),
        sa.Column("sha256_hash", sa.String(64), nullable=False),
        sa.Column("report_type", sa.String(50), nullable=False),
        sa.Column("report_category", sa.String(30), nullable=False),
        sa.Column("family_file_id", sa.String(36), sa.ForeignKey("family_files.id"), nullable=True),
        sa.Column("generated_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("date_range_start", sa.Date, nullable=True),
        sa.Column("date_range_end", sa.Date, nullable=True),
        sa.Column("file_url", sa.String(500), nullable=True),
        sa.Column("file_size_bytes", sa.Integer, nullable=True),
        sa.Column("page_count", sa.Integer, nullable=True),
        sa.Column("generated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("family_file_number_redacted", sa.String(20), nullable=True),
        sa.Column("source_record_id", sa.String(36), nullable=True),
        sa.Column("source_record_type", sa.String(30), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_index("ix_generated_reports_report_id", "generated_reports", ["report_id"], unique=True)
    op.create_index("ix_generated_reports_sha256_hash", "generated_reports", ["sha256_hash"])
    op.create_index("ix_generated_reports_family_file_id", "generated_reports", ["family_file_id"])


def downgrade() -> None:
    op.drop_index("ix_generated_reports_family_file_id", table_name="generated_reports")
    op.drop_index("ix_generated_reports_sha256_hash", table_name="generated_reports")
    op.drop_index("ix_generated_reports_report_id", table_name="generated_reports")
    op.drop_table("generated_reports")
