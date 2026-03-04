"""merge_aria_and_parent_calls

Revision ID: 869376b528b1
Revises: a1r2i3a4s5e6n7, ee9bcfb92527
Create Date: 2026-01-23 15:24:16.578595

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '869376b528b1'
down_revision: Union[str, Sequence[str], None] = ('a1r2i3a4s5e6n7', 'ee9bcfb92527')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
