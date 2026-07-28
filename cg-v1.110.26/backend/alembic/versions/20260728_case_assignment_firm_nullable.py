"""Make case_assignments.firm_id nullable again.

Solo practitioners legitimately take assignments without a firm (a parent
invites their attorney directly by email), but 177844c8f5a2 tightened the
column to NOT NULL, which makes every solo-professional assignment insert
fail. Relax it back to nullable to match the access-service behavior.

Revision ID: ca_firm_nullable_2807
Revises: reprice_prof_2607
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ca_firm_nullable_2807"
down_revision = "reprice_prof_2607"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "case_assignments",
        "firm_id",
        existing_type=sa.VARCHAR(length=36),
        nullable=True,
    )


def downgrade() -> None:
    # Note: will fail if solo (firm-less) assignments exist — intentional.
    op.alter_column(
        "case_assignments",
        "firm_id",
        existing_type=sa.VARCHAR(length=36),
        nullable=False,
    )
