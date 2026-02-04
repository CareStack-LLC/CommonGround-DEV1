"""merge all heads

Revision ID: merge_2026_02_04
Revises: c4l3n_fix_v2, b25878c61dcc, d3v1c3_setup
Create Date: 2026-02-04 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'merge_2026_02_04'
down_revision: Union[str, Sequence[str], None] = ('c4l3n_fix_v2', 'b25878c61dcc', 'd3v1c3_setup')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
