"""add_professional_events_table

Revision ID: 0947f70af975
Revises: a1d2d3
Create Date: 2026-01-19 15:16:15.261945

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0947f70af975'
down_revision: Union[str, Sequence[str], None] = 'a1d2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create professional_events table."""
    op.create_table('professional_events',
        sa.Column('professional_id', sa.String(length=36), nullable=False),
        sa.Column('firm_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=False),
        sa.Column('all_day', sa.Boolean(), nullable=False),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('location', sa.String(length=500), nullable=True),
        sa.Column('virtual_meeting_url', sa.String(length=1000), nullable=True),
        sa.Column('family_file_id', sa.String(length=36), nullable=True),
        sa.Column('attendee_ids', sa.JSON(), nullable=True),
        sa.Column('attendee_emails', sa.JSON(), nullable=True),
        sa.Column('parent_visibility', sa.String(length=20), nullable=False),
        sa.Column('is_recurring', sa.Boolean(), nullable=False),
        sa.Column('recurrence_rule', sa.String(length=500), nullable=True),
        sa.Column('parent_event_id', sa.String(length=36), nullable=True),
        sa.Column('reminder_minutes', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_cancelled', sa.Boolean(), nullable=False),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('cancellation_reason', sa.String(length=500), nullable=True),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['family_file_id'], ['family_files.id'], ),
        sa.ForeignKeyConstraint(['firm_id'], ['firms.id'], ),
        sa.ForeignKeyConstraint(['parent_event_id'], ['professional_events.id'], ),
        sa.ForeignKeyConstraint(['professional_id'], ['professional_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_professional_events_end_time'), 'professional_events', ['end_time'], unique=False)
    op.create_index(op.f('ix_professional_events_family_file_id'), 'professional_events', ['family_file_id'], unique=False)
    op.create_index(op.f('ix_professional_events_firm_id'), 'professional_events', ['firm_id'], unique=False)
    op.create_index(op.f('ix_professional_events_professional_id'), 'professional_events', ['professional_id'], unique=False)
    op.create_index(op.f('ix_professional_events_start_time'), 'professional_events', ['start_time'], unique=False)


def downgrade() -> None:
    """Drop professional_events table."""
    op.drop_index(op.f('ix_professional_events_start_time'), table_name='professional_events')
    op.drop_index(op.f('ix_professional_events_professional_id'), table_name='professional_events')
    op.drop_index(op.f('ix_professional_events_firm_id'), table_name='professional_events')
    op.drop_index(op.f('ix_professional_events_family_file_id'), table_name='professional_events')
    op.drop_index(op.f('ix_professional_events_end_time'), table_name='professional_events')
    op.drop_table('professional_events')
