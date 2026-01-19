"""add firm directory fields

Revision ID: f1i2r3m4d5i6r7
Revises: c1u2s3t4o5d6y7
Create Date: 2026-01-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1i2r3m4d5i6r7'
down_revision: Union[str, None] = 'c1u2s3t4o5d6y7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add description and practice_areas to firms table
    op.add_column('firms', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('firms', sa.Column('practice_areas', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('firms', 'practice_areas')
    op.drop_column('firms', 'description')
