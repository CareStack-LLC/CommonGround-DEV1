"""add_family_file_id_to_obligations

Revision ID: 2a2f1e6a170c
Revises: 18642bec3361
Create Date: 2026-01-04 22:09:09.030105

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a2f1e6a170c'
down_revision: Union[str, Sequence[str], None] = '18642bec3361'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add family_file_id column to obligations
    op.add_column(
        'obligations',
        sa.Column('family_file_id', sa.String(36), nullable=True)
    )
    op.create_index(
        'ix_obligations_family_file_id',
        'obligations',
        ['family_file_id']
    )
    op.create_foreign_key(
        'fk_obligations_family_file_id',
        'obligations',
        'family_files',
        ['family_file_id'],
        ['id']
    )

    # Make case_id nullable
    op.alter_column(
        'obligations',
        'case_id',
        existing_type=sa.String(36),
        nullable=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Make case_id not nullable (may fail if nulls exist)
    op.alter_column(
        'obligations',
        'case_id',
        existing_type=sa.String(36),
        nullable=False
    )

    # Remove family_file_id
    op.drop_constraint('fk_obligations_family_file_id', 'obligations', type_='foreignkey')
    op.drop_index('ix_obligations_family_file_id', 'obligations')
    op.drop_column('obligations', 'family_file_id')
