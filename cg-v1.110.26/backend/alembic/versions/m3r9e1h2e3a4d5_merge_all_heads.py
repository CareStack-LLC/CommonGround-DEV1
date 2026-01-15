"""Merge all migration heads.

Revision ID: m3r9e1h2e3a4d5
Revises: 0c1021b735f5, s1u2b3s4c5r6
Create Date: 2026-01-15

This is an empty merge migration to combine all parallel migration branches.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "m3r9e1h2e3a4d5"
down_revision = ("0c1021b735f5", "s1u2b3s4c5r6")
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Empty merge migration."""
    pass


def downgrade() -> None:
    """Empty merge migration."""
    pass
