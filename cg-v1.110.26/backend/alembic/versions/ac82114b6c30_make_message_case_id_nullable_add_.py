"""make_message_case_id_nullable_add_family_file_id

Revision ID: ac82114b6c30
Revises: 6640a6780278
Create Date: 2026-01-04 17:18:22.360373

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac82114b6c30'
down_revision: Union[str, Sequence[str], None] = '6640a6780278'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make case_id nullable in messages table
    op.alter_column('messages', 'case_id',
                    existing_type=sa.String(36),
                    nullable=True)

    # Add family_file_id column to messages table
    op.add_column('messages', sa.Column('family_file_id', sa.String(36), nullable=True))

    # Create index on family_file_id
    op.create_index('ix_messages_family_file_id', 'messages', ['family_file_id'])

    # Create foreign key constraint
    op.create_foreign_key(
        'fk_messages_family_file_id',
        'messages', 'family_files',
        ['family_file_id'], ['id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraint
    op.drop_constraint('fk_messages_family_file_id', 'messages', type_='foreignkey')

    # Drop index
    op.drop_index('ix_messages_family_file_id', 'messages')

    # Drop family_file_id column
    op.drop_column('messages', 'family_file_id')

    # Make case_id non-nullable again
    op.alter_column('messages', 'case_id',
                    existing_type=sa.String(36),
                    nullable=False)
