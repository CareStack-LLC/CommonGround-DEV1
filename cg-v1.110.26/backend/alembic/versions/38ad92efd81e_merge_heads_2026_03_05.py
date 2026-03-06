"""merge_heads_2026_03_05

Revision ID: 38ad92efd81e
Revises: a1r2i3a4, a6b0b8354b62
Create Date: 2026-03-05 18:37:55.462596

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38ad92efd81e'
down_revision: Union[str, Sequence[str], None] = ('a1r2i3a4', 'a6b0b8354b62')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
