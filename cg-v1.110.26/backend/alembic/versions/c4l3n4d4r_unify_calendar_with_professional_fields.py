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
    # Use raw SQL with IF NOT EXISTS for idempotency
    conn = op.get_bind()

    # Add columns using IF NOT EXISTS (PostgreSQL syntax)
    conn.execute(sa.text("""
        ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS professional_id VARCHAR(36);
        ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS professional_event_type VARCHAR(50);
        ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS parent_visibility VARCHAR(20);
        ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS virtual_meeting_url TEXT;
        ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER;
        ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS color VARCHAR(10);
        ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
    """))

    # Create foreign key constraint if not exists
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_schedule_events_professional_id') THEN
                ALTER TABLE schedule_events ADD CONSTRAINT fk_schedule_events_professional_id
                FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """))

    # Create index if not exists
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_schedule_events_professional_id ON schedule_events(professional_id);
    """))


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
