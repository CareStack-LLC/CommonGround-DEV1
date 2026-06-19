"""Professional credential verification workflow fields.

Adds verification_status / verification_submitted_at / verification_rejected_reason
to professional_profiles. Idempotent.

Revision ID: pro_credverify_20260618
Revises: pro_reports_20260618
Create Date: 2026-06-18
"""

from alembic import op


revision = "pro_credverify_20260618"
down_revision = "pro_reports_20260618"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS "
        "verification_status VARCHAR(20) NOT NULL DEFAULT 'unsubmitted'"
    )
    op.execute("ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMP")
    op.execute("ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS verification_rejected_reason VARCHAR(500)")


def downgrade() -> None:
    for col in ("verification_status", "verification_submitted_at", "verification_rejected_reason"):
        op.execute(f"ALTER TABLE professional_profiles DROP COLUMN IF EXISTS {col}")
