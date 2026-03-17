"""Add ARIA intervention tracking columns to circle_messages.

Tracks user actions (accepted/modified/sent_anyway), all detected categories,
suggested rewrites, intervention severity level, and analysis response time
for court-ready reporting across all messaging channels.

Revision ID: add_aria_tracking
Revises: add_circle_attachments
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_aria_tracking'
down_revision = 'add_circle_attachments'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('circle_messages', sa.Column('user_action', sa.String(20), nullable=True))
    op.add_column('circle_messages', sa.Column('aria_intervention_level', sa.Integer(), nullable=True))
    op.add_column('circle_messages', sa.Column('aria_all_categories', sa.Text(), nullable=True))
    op.add_column('circle_messages', sa.Column('aria_suggested_rewrite', sa.Text(), nullable=True))
    op.add_column('circle_messages', sa.Column('aria_response_time_ms', sa.Integer(), nullable=True))

    # Index for intervention reporting queries
    op.create_index(
        'ix_circle_messages_interventions',
        'circle_messages',
        ['family_file_id', 'aria_flagged', 'user_action', 'sent_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_circle_messages_interventions', table_name='circle_messages')
    op.drop_column('circle_messages', 'aria_response_time_ms')
    op.drop_column('circle_messages', 'aria_suggested_rewrite')
    op.drop_column('circle_messages', 'aria_all_categories')
    op.drop_column('circle_messages', 'aria_intervention_level')
    op.drop_column('circle_messages', 'user_action')
