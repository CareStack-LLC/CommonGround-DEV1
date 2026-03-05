"""ARIA v2 Upgrade: reply suggestions + aria_mode

Revision ID: a1r2i3a4
Revises: u1p2d3a4t5e6_update_stripe_price_ids_march2026
Create Date: 2026-03-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a1r2i3a4'
down_revision = 'u1p2d3a4t5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add aria_mode column to family_files
    # Values: 'off' | 'standard' | 'strict' (default: 'standard')
    op.add_column(
        'family_files',
        sa.Column('aria_mode', sa.String(20), server_default='standard', nullable=False)
    )

    # Create aria_reply_suggestions table
    op.create_table(
        'aria_reply_suggestions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('message_id', sa.String(36), sa.ForeignKey('messages.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('recipient_id', sa.String(36), nullable=False, index=True),
        sa.Column('suggestions', sa.JSON, nullable=False),   # List of 1-2 reply strings
        sa.Column('aria_mode', sa.String(20), nullable=False, server_default='standard'),
        sa.Column('was_used', sa.Boolean, nullable=False, default=False, server_default='false'),
        sa.Column('used_suggestion_index', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('aria_reply_suggestions')
    op.drop_column('family_files', 'aria_mode')
