"""Add device setup fields to child_users

Revision ID: d3v1c3_setup
Revises: r3c0rd_audit
Create Date: 2026-01-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd3v1c3_setup'
down_revision = 'r3c0rd_audit'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add device setup fields to child_users table
    op.add_column('child_users', sa.Column('device_setup_code', sa.String(8), nullable=True))
    op.add_column('child_users', sa.Column('device_setup_expires_at', sa.DateTime(), nullable=True))

    # Create unique index on device_setup_code
    op.create_index(
        'ix_child_users_device_setup_code',
        'child_users',
        ['device_setup_code'],
        unique=True
    )


def downgrade() -> None:
    op.drop_index('ix_child_users_device_setup_code', table_name='child_users')
    op.drop_column('child_users', 'device_setup_expires_at')
    op.drop_column('child_users', 'device_setup_code')
