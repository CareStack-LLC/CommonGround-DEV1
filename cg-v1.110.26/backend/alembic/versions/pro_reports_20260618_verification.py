"""Professional compliance-report court verification fields.

Adds to compliance_reports: verification_number (public lookup), chain_verified,
chain_hash (EventLog chain-of-custody result), certified_at, and detached
signature fields (signature_b64, signature_key_id) for Phase 5.

Idempotent (ADD COLUMN IF NOT EXISTS) — safe against the repo's branched
migration history; app code reads via getattr defaults so it runs pre-migration.

Revision ID: pro_reports_20260618
Revises: childsafety_20260618
Create Date: 2026-06-18
"""

from alembic import op


revision = "pro_reports_20260618"
down_revision = "childsafety_20260618"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS verification_number VARCHAR(40)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_compliance_reports_verification_number ON compliance_reports (verification_number)")
    op.execute("ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS chain_verified BOOLEAN")
    op.execute("ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS chain_hash VARCHAR(64)")
    op.execute("ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS certified_at TIMESTAMP")
    op.execute("ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS signature_b64 VARCHAR(200)")
    op.execute("ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS signature_key_id VARCHAR(64)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_compliance_reports_verification_number")
    for col in ("verification_number", "chain_verified", "chain_hash", "certified_at", "signature_b64", "signature_key_id"):
        op.execute(f"ALTER TABLE compliance_reports DROP COLUMN IF EXISTS {col}")
