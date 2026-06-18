"""Child-safety call hardening: per-family ARIA strictness + monitoring
failure counter for circle calls.

Adds:
- kidcoms_settings.aria_call_strictness  (default 'strict' = zero tolerance)
- circle_call_sessions.aria_failure_count (consecutive analysis failures)

Uses ADD COLUMN IF NOT EXISTS so it is safe to apply regardless of the
repository's branched migration history (multiple heads). The application code
reads these via getattr() defaults, so it runs correctly even before this
migration is applied; the columns are required for persisting the new values.

Revision ID: childsafety_20260618
Revises: reliability_batch1_20260611
Create Date: 2026-06-18
"""

from alembic import op


revision = "childsafety_20260618"
down_revision = "reliability_batch1_20260611"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE kidcoms_settings "
        "ADD COLUMN IF NOT EXISTS aria_call_strictness VARCHAR(20) "
        "NOT NULL DEFAULT 'strict'"
    )
    op.execute(
        "ALTER TABLE circle_call_sessions "
        "ADD COLUMN IF NOT EXISTS aria_failure_count INTEGER "
        "NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE circle_call_sessions DROP COLUMN IF EXISTS aria_failure_count")
    op.execute("ALTER TABLE kidcoms_settings DROP COLUMN IF EXISTS aria_call_strictness")
