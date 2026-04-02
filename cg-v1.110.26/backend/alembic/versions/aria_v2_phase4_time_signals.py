"""ARIA V2 Phase 4: Add time signal and coaching columns to message_flags.

Revision ID: aria_v2_phase4
Revises: aria_v2_phase3
Create Date: 2026-04-02
"""

from alembic import op
import sqlalchemy as sa

revision = 'aria_v2_phase4'
down_revision = 'aria_v2_phase3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('message_flags', sa.Column('time_frequency_flags', sa.JSON(), nullable=True))
    op.add_column('message_flags', sa.Column('recipient_coaching', sa.Text(), nullable=True))
    op.add_column('message_flags', sa.Column('reporting_tags', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('message_flags', 'reporting_tags')
    op.drop_column('message_flags', 'recipient_coaching')
    op.drop_column('message_flags', 'time_frequency_flags')
