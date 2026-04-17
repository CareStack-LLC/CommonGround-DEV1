"""Allow daily_room_name/daily_room_url to be nullable on kidcoms_sessions.

Solo theater and progress-only sessions do not create a Daily.co room.
The prior NOT NULL constraint caused the theater progress endpoint to
fail when saving child media progress without an active call.

Revision ID: kidcoms_nullable_daily_room
Revises: aria_v2_phase4
Create Date: 2026-04-16
"""

from alembic import op
import sqlalchemy as sa

revision = 'kidcoms_nullable_daily_room'
down_revision = 'aria_v2_phase4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'kidcoms_sessions',
        'daily_room_name',
        existing_type=sa.String(length=100),
        nullable=True,
    )
    op.alter_column(
        'kidcoms_sessions',
        'daily_room_url',
        existing_type=sa.String(length=500),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        'kidcoms_sessions',
        'daily_room_url',
        existing_type=sa.String(length=500),
        nullable=False,
    )
    op.alter_column(
        'kidcoms_sessions',
        'daily_room_name',
        existing_type=sa.String(length=100),
        nullable=False,
    )
