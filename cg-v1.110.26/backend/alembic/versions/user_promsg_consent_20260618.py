"""Parent consent for professional message viewing.

Adds user_profiles.professional_message_consent_at, capturing the parent's
consent (granted as part of accepting the platform Terms) for assigned legal
professionals to view their messages. Backfills existing accounts that already
accepted terms so they are not retroactively blocked. Idempotent.

Revision ID: user_promsg_consent_20260618
Revises: agreement_esign_20260618
Create Date: 2026-06-18
"""

from alembic import op


revision = "user_promsg_consent_20260618"
down_revision = "agreement_esign_20260618"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE user_profiles "
        "ADD COLUMN IF NOT EXISTS professional_message_consent_at TIMESTAMP"
    )
    # user_profiles.terms_accepted_at exists on production via drift (added
    # directly, never migrated) but is declared on the UserProfile model —
    # create it here too so a fresh database converges to the model schema
    # instead of erroring on the backfill below.
    op.execute(
        "ALTER TABLE user_profiles "
        "ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP"
    )
    # Existing accounts that accepted the Terms are treated as having consented
    # (the consent language is part of the Terms). New signups set it explicitly.
    op.execute(
        "UPDATE user_profiles "
        "SET professional_message_consent_at = terms_accepted_at "
        "WHERE professional_message_consent_at IS NULL "
        "AND terms_accepted_at IS NOT NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE user_profiles "
        "DROP COLUMN IF EXISTS professional_message_consent_at"
    )
