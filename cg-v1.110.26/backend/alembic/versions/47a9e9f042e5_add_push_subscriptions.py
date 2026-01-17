"""add_push_subscriptions

Revision ID: 47a9e9f042e5
Revises: 14bd7f850262
Create Date: 2026-01-17 00:30:05.392394

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '47a9e9f042e5'
down_revision: Union[str, Sequence[str], None] = '14bd7f850262'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.String(36), primary_key=True, default=sa.text('gen_random_uuid()::text')),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('endpoint', sa.Text, nullable=False, unique=True),
        sa.Column('p256dh_key', sa.String(200), nullable=False),
        sa.Column('auth_key', sa.String(100), nullable=False),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('push_subscriptions')
