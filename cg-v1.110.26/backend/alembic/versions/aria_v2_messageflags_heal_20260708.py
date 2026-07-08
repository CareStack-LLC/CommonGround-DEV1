"""Heal message_flags: add the ARIA V2 columns prod is missing.

The MessageFlag model maps 7 V2 columns (category_confidence, window_heat_score,
v2_categories, domain_scores, time_frequency_flags, recipient_coaching,
reporting_tags). Four of them were introduced by `aria_v2_phase2` with plain
op.add_column (no IF NOT EXISTS); prod's alembic_version reached head
(startup_ddl_consolidate_20260703) without those columns ever being created —
i.e. the revision was marked applied but the DDL never landed. Result: every
attempt to PERSIST a flagged message (any saved MessageFlag row) 500s with
`UndefinedColumnError: column "window_heat_score" ... does not exist`. That hits
real users the moment a flagged message is stored (e.g. sent-anyway / declined
rewrite), not just the sim.

Alembic won't re-run an already-applied revision, so this new head migration
re-asserts ALL 7 columns idempotently (ADD COLUMN IF NOT EXISTS) — a no-op for
the three that already exist, and the fix for the four that don't. Additive and
nullable, so it's safe on the live table.

Revision ID: aria_v2_mflags_heal_20260708
Revises: startup_ddl_consolidate_20260703
Create Date: 2026-07-08
"""
from alembic import op

revision = 'aria_v2_mflags_heal_20260708'
down_revision = 'startup_ddl_consolidate_20260703'
branch_labels = None
depends_on = None

_COLUMNS = [
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS category_confidence JSON',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS window_heat_score FLOAT',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS v2_categories JSON',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS domain_scores JSON',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS time_frequency_flags JSON',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS recipient_coaching TEXT',
    'ALTER TABLE message_flags ADD COLUMN IF NOT EXISTS reporting_tags JSON',
]


def upgrade():
    for stmt in _COLUMNS:
        op.execute(stmt)


def downgrade():
    # Additive, nullable, data-bearing self-heal — no safe automatic drop.
    pass
