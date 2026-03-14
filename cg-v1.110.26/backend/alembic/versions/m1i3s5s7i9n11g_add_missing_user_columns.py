"""Add missing user columns to support full authentication.

This migration adds columns that were defined in the ORM models but
missing from the database schema.

Revision ID: m1i3s5s7i9n11g_missing
Revises: update_stripe_v3
Create Date: 2026-03-13 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'm1i3s5s7i9n11g_missing'
down_revision = 'update_stripe_v3'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Add missing columns to users table."""

    # Add first_name if missing
    if not column_exists('users', 'first_name'):
        op.add_column('users', sa.Column('first_name', sa.String(100), nullable=True))
        # Set default values for existing users
        op.execute("UPDATE users SET first_name = 'User' WHERE first_name IS NULL")
        # Make it non-nullable after setting defaults
        op.alter_column('users', 'first_name', nullable=False)

    # Add last_name if missing
    if not column_exists('users', 'last_name'):
        op.add_column('users', sa.Column('last_name', sa.String(100), nullable=True))
        # Set default values for existing users
        op.execute("UPDATE users SET last_name = 'Account' WHERE last_name IS NULL")
        # Make it non-nullable after setting defaults
        op.alter_column('users', 'last_name', nullable=False)

    # Add is_admin if missing
    if not column_exists('users', 'is_admin'):
        op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'))

    # Add admin_role if missing
    if not column_exists('users', 'admin_role'):
        op.add_column('users', sa.Column('admin_role', sa.String(30), nullable=True))

    # Add mfa_enabled if missing
    if not column_exists('users', 'mfa_enabled'):
        op.add_column('users', sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default='false'))

    # Add last_login if missing
    if not column_exists('users', 'last_login'):
        op.add_column('users', sa.Column('last_login', sa.DateTime(), nullable=True))

    # Add last_active if missing
    if not column_exists('users', 'last_active'):
        op.add_column('users', sa.Column('last_active', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove added columns."""
    # This downgrade is intentionally minimal to avoid data loss
    # Only remove columns if they exist
    if column_exists('users', 'last_active'):
        op.drop_column('users', 'last_active')
    if column_exists('users', 'last_login'):
        op.drop_column('users', 'last_login')
    if column_exists('users', 'mfa_enabled'):
        op.drop_column('users', 'mfa_enabled')
    if column_exists('users', 'admin_role'):
        op.drop_column('users', 'admin_role')
    if column_exists('users', 'is_admin'):
        op.drop_column('users', 'is_admin')
    if column_exists('users', 'last_name'):
        op.drop_column('users', 'last_name')
    if column_exists('users', 'first_name'):
        op.drop_column('users', 'first_name')
