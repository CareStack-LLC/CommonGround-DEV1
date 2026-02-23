"""merge_heads_2026_02_22

Revision ID: 5c5e45b19598
Revises: 20260222_add_headshot_url, 61f0c2f1d6db
Create Date: 2026-02-22 21:58:38.391690

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c5e45b19598'
down_revision: Union[str, Sequence[str], None] = ('20260222_add_headshot_url', '61f0c2f1d6db')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
