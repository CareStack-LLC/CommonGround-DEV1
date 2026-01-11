"""fix circle_permissions time columns to varchar

Revision ID: 99f6d503227e
Revises: adf7fbde7f66
Create Date: 2026-01-09 16:53:59.812908

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99f6d503227e'
down_revision: Union[str, Sequence[str], None] = 'adf7fbde7f66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - change TIME columns to VARCHAR(10) to match model."""
    # The model uses String(10) for storing time as "HH:MM" format
    # but the original migration created TIME columns
    op.execute("""
        ALTER TABLE circle_permissions
            ALTER COLUMN allowed_start_time TYPE VARCHAR(10) USING allowed_start_time::TEXT,
            ALTER COLUMN allowed_end_time TYPE VARCHAR(10) USING allowed_end_time::TEXT;
    """)


def downgrade() -> None:
    """Downgrade schema - revert to TIME columns."""
    op.execute("""
        ALTER TABLE circle_permissions
            ALTER COLUMN allowed_start_time TYPE TIME USING allowed_start_time::TIME,
            ALTER COLUMN allowed_end_time TYPE TIME USING allowed_end_time::TIME;
    """)
