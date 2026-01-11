"""add_family_file_id_to_my_time_collections

Revision ID: a8582c5460cb
Revises: ac82114b6c30
Create Date: 2026-01-04 19:00:02.999291

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8582c5460cb'
down_revision: Union[str, Sequence[str], None] = 'ac82114b6c30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add family_file_id column to my_time_collections
    op.add_column(
        'my_time_collections',
        sa.Column('family_file_id', sa.String(36), nullable=True)
    )

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_my_time_collections_family_file_id',
        'my_time_collections',
        'family_files',
        ['family_file_id'],
        ['id']
    )

    # Create index for family_file_id
    op.create_index(
        'ix_my_time_collections_family_file_id',
        'my_time_collections',
        ['family_file_id']
    )

    # Make case_id nullable (to support family files without linked cases)
    op.alter_column(
        'my_time_collections',
        'case_id',
        existing_type=sa.String(36),
        nullable=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Make case_id required again
    op.alter_column(
        'my_time_collections',
        'case_id',
        existing_type=sa.String(36),
        nullable=False
    )

    # Drop index
    op.drop_index('ix_my_time_collections_family_file_id', 'my_time_collections')

    # Drop foreign key
    op.drop_constraint(
        'fk_my_time_collections_family_file_id',
        'my_time_collections',
        type_='foreignkey'
    )

    # Drop column
    op.drop_column('my_time_collections', 'family_file_id')
