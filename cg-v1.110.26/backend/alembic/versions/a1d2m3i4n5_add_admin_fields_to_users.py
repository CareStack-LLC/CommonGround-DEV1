"""Add admin fields to users table for SuperAdmin Portal.

Adds is_admin and admin_role columns to the users table.
Seeds initial admin users from CommonGround founder accounts.

Revision ID: a1d2m3i4n5_admin
Revises: p1r2o3_prof_plans
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1d2m3i4n5_admin"
down_revision = "p1r2o3_prof_plans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add admin fields to users table
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "users",
        sa.Column("admin_role", sa.String(30), nullable=True),
    )

    # Set founder accounts as super admins
    op.execute(
        """
        UPDATE users
        SET is_admin = true, admin_role = 'super_admin'
        WHERE email IN ('thomas@carestack.us', 'founders@commonground.family')
        """
    )


def downgrade() -> None:
    op.drop_column("users", "admin_role")
    op.drop_column("users", "is_admin")
