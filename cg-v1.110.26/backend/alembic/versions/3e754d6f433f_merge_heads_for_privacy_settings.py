"""merge_heads_for_privacy_settings

Revision ID: 3e754d6f433f
Revises: 303015bdbe67, r3c0rd_audit
Create Date: 2026-01-29 13:00:33.797871

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e754d6f433f'
down_revision: Union[str, Sequence[str], None] = ('303015bdbe67', 'r3c0rd_audit')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
