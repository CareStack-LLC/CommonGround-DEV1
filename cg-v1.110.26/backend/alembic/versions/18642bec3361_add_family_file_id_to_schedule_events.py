"""add_family_file_id_to_schedule_events

Revision ID: 18642bec3361
Revises: a8582c5460cb
Create Date: 2026-01-04 22:02:16.993742

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18642bec3361'
down_revision: Union[str, Sequence[str], None] = 'a8582c5460cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add family_file_id column to schedule_events
    op.add_column(
        'schedule_events',
        sa.Column('family_file_id', sa.String(36), nullable=True)
    )
    op.create_index(
        'ix_schedule_events_family_file_id',
        'schedule_events',
        ['family_file_id']
    )
    op.create_foreign_key(
        'fk_schedule_events_family_file_id',
        'schedule_events',
        'family_files',
        ['family_file_id'],
        ['id']
    )

    # Make case_id nullable
    op.alter_column(
        'schedule_events',
        'case_id',
        existing_type=sa.String(36),
        nullable=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Make case_id not nullable (may fail if nulls exist)
    op.alter_column(
        'schedule_events',
        'case_id',
        existing_type=sa.String(36),
        nullable=False
    )

    # Remove family_file_id
    op.drop_constraint('fk_schedule_events_family_file_id', 'schedule_events', type_='foreignkey')
    op.drop_index('ix_schedule_events_family_file_id', 'schedule_events')
    op.drop_column('schedule_events', 'family_file_id')
