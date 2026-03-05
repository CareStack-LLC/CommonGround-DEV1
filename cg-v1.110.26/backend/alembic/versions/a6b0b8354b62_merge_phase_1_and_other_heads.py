"""Merge phase 1 and other heads

Revision ID: a6b0b8354b62
Revises: 6074eb3feec1
Create Date: 2026-03-05 01:03:49.691514

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6b0b8354b62'
down_revision: Union[str, Sequence[str], None] = '6074eb3feec1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
