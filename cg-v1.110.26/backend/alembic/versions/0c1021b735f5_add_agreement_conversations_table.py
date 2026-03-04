"""add_agreement_conversations_table

Revision ID: 0c1021b735f5
Revises: f937603dd5bc
Create Date: 2026-01-11 19:13:56.986170

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0c1021b735f5'
down_revision: Union[str, Sequence[str], None] = 'f937603dd5bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create agreement_conversations table."""
    op.create_table(
        'agreement_conversations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('agreement_id', sa.String(36), sa.ForeignKey('agreements.id'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('messages', sa.JSON(), nullable=True, default=[]),
        sa.Column('is_finalized', sa.Boolean(), nullable=False, default=False),
        sa.Column('finalized_at', sa.DateTime(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('extracted_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_agreement_conversations_user_id', 'agreement_conversations', ['user_id'])


def downgrade() -> None:
    """Drop agreement_conversations table."""
    op.drop_index('ix_agreement_conversations_user_id', table_name='agreement_conversations')
    op.drop_table('agreement_conversations')
