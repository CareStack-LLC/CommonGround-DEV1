"""merge_heads_deployment_fix

Revision ID: 61f0c2f1d6db
Revises: 0dbb095fe408, pp_phase1_001
Create Date: 2026-02-15 18:06:20.572786

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61f0c2f1d6db'
down_revision: Union[str, Sequence[str], None] = ('0dbb095fe408', 'pp_phase1_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
