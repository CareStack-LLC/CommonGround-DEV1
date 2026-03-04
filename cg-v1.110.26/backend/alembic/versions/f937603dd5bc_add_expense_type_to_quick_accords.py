"""add_expense_type_to_quick_accords

Revision ID: f937603dd5bc
Revises: a1b2c3d4e5f7
Create Date: 2026-01-11 17:00:57.333542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f937603dd5bc'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add expense_type column to quick_accords table."""
    op.add_column(
        'quick_accords',
        sa.Column('expense_type', sa.String(length=20), nullable=True, server_default='shared')
    )


def downgrade() -> None:
    """Remove expense_type column from quick_accords table."""
    op.drop_column('quick_accords', 'expense_type')
