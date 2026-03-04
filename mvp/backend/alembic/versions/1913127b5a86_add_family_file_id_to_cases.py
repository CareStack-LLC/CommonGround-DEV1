"""add_family_file_id_to_cases

Revision ID: 1913127b5a86
Revises: a1b2c3d4e5f6
Create Date: 2026-01-04 01:57:16.878485

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1913127b5a86'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add family_file_id column to cases table
    op.add_column('cases', sa.Column('family_file_id', sa.String(36), nullable=True))
    op.create_foreign_key(
        'fk_cases_family_file_id',
        'cases', 'family_files',
        ['family_file_id'], ['id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_cases_family_file_id', 'cases', type_='foreignkey')
    op.drop_column('cases', 'family_file_id')
