"""ARIA V2 Phase 2: Add confidence scoring and heat window columns to message_flags.

Revision ID: aria_v2_phase2
Revises: update_stripe_v3
Create Date: 2026-04-02
"""

from alembic import op
import sqlalchemy as sa

revision = 'aria_v2_phase2'
down_revision = 'update_stripe_v3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add V2 columns to message_flags (all nullable for backward compat)
    op.add_column('message_flags', sa.Column('category_confidence', sa.JSON(), nullable=True))
    op.add_column('message_flags', sa.Column('window_heat_score', sa.Float(), nullable=True))
    op.add_column('message_flags', sa.Column('v2_categories', sa.JSON(), nullable=True))
    op.add_column('message_flags', sa.Column('domain_scores', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('message_flags', 'domain_scores')
    op.drop_column('message_flags', 'v2_categories')
    op.drop_column('message_flags', 'window_heat_score')
    op.drop_column('message_flags', 'category_confidence')
