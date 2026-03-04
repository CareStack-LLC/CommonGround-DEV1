"""add call notification fields to kidcoms_sessions

Revision ID: 39cfacf2f90f
Revises: 99f6d503227e
Create Date: 2026-01-09 17:39:19.573054

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '39cfacf2f90f'
down_revision: Union[str, Sequence[str], None] = '99f6d503227e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add circle_contact_id and ringing_started_at to kidcoms_sessions for call notifications."""
    # Add circle_contact_id column
    op.add_column('kidcoms_sessions', sa.Column('circle_contact_id', sa.String(length=36), nullable=True))

    # Add ringing_started_at column for tracking call timeout
    op.add_column('kidcoms_sessions', sa.Column('ringing_started_at', sa.DateTime(), nullable=True))

    # Create index for circle_contact_id
    op.create_index(op.f('ix_kidcoms_sessions_circle_contact_id'), 'kidcoms_sessions', ['circle_contact_id'], unique=False)

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_kidcoms_sessions_circle_contact_id',
        'kidcoms_sessions',
        'circle_contacts',
        ['circle_contact_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Remove circle_contact_id and ringing_started_at from kidcoms_sessions."""
    # Drop foreign key
    op.drop_constraint('fk_kidcoms_sessions_circle_contact_id', 'kidcoms_sessions', type_='foreignkey')

    # Drop index
    op.drop_index(op.f('ix_kidcoms_sessions_circle_contact_id'), table_name='kidcoms_sessions')

    # Drop columns
    op.drop_column('kidcoms_sessions', 'ringing_started_at')
    op.drop_column('kidcoms_sessions', 'circle_contact_id')
