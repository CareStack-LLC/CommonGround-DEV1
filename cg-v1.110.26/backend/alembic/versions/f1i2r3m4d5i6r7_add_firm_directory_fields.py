"""add firm directory fields

Revision ID: f1i2r3m4d5i6r7
Revises: c1u2s3t4o5d6y7
Create Date: 2026-01-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'f1i2r3m4d5i6r7'
down_revision: Union[str, None] = 'p1r2o3f4e5s6s7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add description and practice_areas to firms table (if not already present)
    # Note: The professional_portal_tables migration may have already added these
    if not column_exists('firms', 'description'):
        op.add_column('firms', sa.Column('description', sa.Text(), nullable=True))
    if not column_exists('firms', 'practice_areas'):
        op.add_column('firms', sa.Column('practice_areas', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Only drop if columns exist
    if column_exists('firms', 'practice_areas'):
        op.drop_column('firms', 'practice_areas')
    if column_exists('firms', 'description'):
        op.drop_column('firms', 'description')
