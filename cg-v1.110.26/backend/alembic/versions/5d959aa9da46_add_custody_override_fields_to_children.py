"""add_custody_override_fields_to_children

Revision ID: 5d959aa9da46
Revises: b8c9d0e1f2a3
Create Date: 2026-01-11 11:06:32.135547

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5d959aa9da46'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add custody override fields to children table."""
    # Add columns for manual custody override ("With Me" button)
    op.add_column('children', sa.Column('current_custody_parent_id', sa.String(length=36), nullable=True))
    op.add_column('children', sa.Column('custody_override_at', sa.DateTime(), nullable=True))
    op.add_column('children', sa.Column('custody_override_by', sa.String(length=36), nullable=True))

    # Add foreign key constraints
    op.create_foreign_key(
        'fk_children_current_custody_parent_id',
        'children', 'users',
        ['current_custody_parent_id'], ['id']
    )
    op.create_foreign_key(
        'fk_children_custody_override_by',
        'children', 'users',
        ['custody_override_by'], ['id']
    )


def downgrade() -> None:
    """Remove custody override fields from children table."""
    op.drop_constraint('fk_children_custody_override_by', 'children', type_='foreignkey')
    op.drop_constraint('fk_children_current_custody_parent_id', 'children', type_='foreignkey')
    op.drop_column('children', 'custody_override_by')
    op.drop_column('children', 'custody_override_at')
    op.drop_column('children', 'current_custody_parent_id')
