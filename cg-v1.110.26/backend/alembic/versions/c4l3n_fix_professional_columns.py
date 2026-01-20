"""fix_professional_columns_v2

This migration ensures the professional calendar columns exist on schedule_events.
Uses IF NOT EXISTS for idempotency.

Revision ID: c4l3n_fix_v2
Revises: c4l3n4d4r001
Create Date: 2026-01-20 09:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c4l3n_fix_v2'
down_revision: Union[str, Sequence[str], None] = 'c4l3n4d4r001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ensure professional fields exist on schedule_events."""
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
    """No-op downgrade - don't remove columns."""
    pass
