"""Agreement cryptographic e-signature fields.

Adds signed_payload_hash / signature_b64 / signature_key_id / signed_at to
agreements for Ed25519 dual-approval signatures. Idempotent.

Revision ID: agreement_esign_20260618
Revises: pro_credverify_20260618
Create Date: 2026-06-18
"""

from alembic import op


revision = "agreement_esign_20260618"
down_revision = "pro_credverify_20260618"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE agreements ADD COLUMN IF NOT EXISTS signed_payload_hash VARCHAR(64)")
    op.execute("ALTER TABLE agreements ADD COLUMN IF NOT EXISTS signature_b64 VARCHAR(200)")
    op.execute("ALTER TABLE agreements ADD COLUMN IF NOT EXISTS signature_key_id VARCHAR(64)")
    op.execute("ALTER TABLE agreements ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP")


def downgrade() -> None:
    for col in ("signed_payload_hash", "signature_b64", "signature_key_id", "signed_at"):
        op.execute(f"ALTER TABLE agreements DROP COLUMN IF EXISTS {col}")
