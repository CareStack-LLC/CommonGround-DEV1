"""unify_calendar_with_professional_fields

Extends ScheduleEvent to support professional calendar events.
This enables professionals to create events that appear on parent calendars.

Revision ID: c4l3n4d4r001
Revises: 175238796214
Create Date: 2026-01-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c4l3n4d4r001'
down_revision: Union[str, Sequence[str], None] = '175238796214'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add professional fields to schedule_events for unified calendar."""
    # Professional who created the event (if applicable)
    op.add_column('schedule_events', sa.Column(
        'professional_id',
        sa.String(length=36),
        nullable=True
    ))

    # Professional event type (meeting, court_hearing, video_call, etc.)
    op.add_column('schedule_events', sa.Column(
        'professional_event_type',
        sa.String(length=50),
        nullable=True
    ))

    # Parent visibility: none, required_parent, both_parents
    op.add_column('schedule_events', sa.Column(
        'parent_visibility',
        sa.String(length=20),
        nullable=True
    ))

    # Virtual meeting URL for video calls
    op.add_column('schedule_events', sa.Column(
        'virtual_meeting_url',
        sa.Text(),
        nullable=True
    ))

    # Reminder in minutes before event
    op.add_column('schedule_events', sa.Column(
        'reminder_minutes',
        sa.Integer(),
        nullable=True
    ))

    # Color for calendar display
    op.add_column('schedule_events', sa.Column(
        'color',
        sa.String(length=10),
        nullable=True
    ))

    # Private notes (visible only to professional)
    op.add_column('schedule_events', sa.Column(
        'notes',
        sa.Text(),
        nullable=True
    ))

    # Timezone for the event
    op.add_column('schedule_events', sa.Column(
        'timezone',
        sa.String(length=50),
        nullable=True
    ))

    # Create foreign key constraint for professional_id
    op.create_foreign_key(
        'fk_schedule_events_professional_id',
        'schedule_events',
        'professional_profiles',
        ['professional_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Create index for professional_id lookups
    op.create_index(
        'ix_schedule_events_professional_id',
        'schedule_events',
        ['professional_id']
    )


def downgrade() -> None:
    """Remove professional fields from schedule_events."""
    op.drop_index('ix_schedule_events_professional_id', 'schedule_events')
    op.drop_constraint('fk_schedule_events_professional_id', 'schedule_events', type_='foreignkey')
    op.drop_column('schedule_events', 'timezone')
    op.drop_column('schedule_events', 'notes')
    op.drop_column('schedule_events', 'color')
    op.drop_column('schedule_events', 'reminder_minutes')
    op.drop_column('schedule_events', 'virtual_meeting_url')
    op.drop_column('schedule_events', 'parent_visibility')
    op.drop_column('schedule_events', 'professional_event_type')
    op.drop_column('schedule_events', 'professional_id')
