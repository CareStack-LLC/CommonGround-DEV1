"""add attendee fields to schedule events

Revision ID: add_attendee_fields
Revises: 20260215_professional_portal_phase1
Create Date: 2026-02-16 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_attendee_fields'
down_revision: Union[str, Sequence[str], None] = 'pp_phase1_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add attendee fields to schedule_events
    op.add_column('schedule_events', sa.Column('attendee_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('schedule_events', sa.Column('attendee_emails', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('schedule_events', 'attendee_emails')
    op.drop_column('schedule_events', 'attendee_ids')
