"""merge_heads

Revision ID: 7e60b95aa043
Revises: 1c9a6143d966, 7cceeebd637d, d295f5c75e3a
Create Date: 2026-01-02 11:00:04.592339

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e60b95aa043'
down_revision: Union[str, Sequence[str], None] = ('1c9a6143d966', '7cceeebd637d', 'd295f5c75e3a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
