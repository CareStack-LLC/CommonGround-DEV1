"""Merge multiple heads

Revision ID: 6074eb3feec1
Revises: 20260301_circle_calling, u1p2d3a4t5e6
Create Date: 2026-03-05 00:49:15.626641

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6074eb3feec1'
down_revision: Union[str, Sequence[str], None] = ('20260301_circle_calling', 'u1p2d3a4t5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
