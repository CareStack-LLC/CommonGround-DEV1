"""add missing firm columns (description, practice_areas)

Revision ID: a1d2d3
Revises: f1i2r3m4d5i6r7
Create Date: 2026-01-19 17:30:00.000000

This migration adds the description and practice_areas columns to the
firms table if they don't already exist. These columns may have been
missing if the firms table was created before the professional portal
migration was run.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'a1d2d3'
down_revision: Union[str, None] = 'f1i2r3m4d5i6r7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    try:
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception:
        return False


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    # Only proceed if firms table exists
    if not table_exists('firms'):
        return

    # Add description column if missing
    if not column_exists('firms', 'description'):
        op.add_column('firms', sa.Column('description', sa.Text(), nullable=True))

    # Add practice_areas column if missing
    if not column_exists('firms', 'practice_areas'):
        op.add_column('firms', sa.Column('practice_areas', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Only drop if columns exist
    if table_exists('firms'):
        if column_exists('firms', 'practice_areas'):
            op.drop_column('firms', 'practice_areas')
        if column_exists('firms', 'description'):
            op.drop_column('firms', 'description')
