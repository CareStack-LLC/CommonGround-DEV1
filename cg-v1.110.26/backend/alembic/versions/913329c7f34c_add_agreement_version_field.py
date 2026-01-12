"""add_agreement_version_field

Revision ID: 913329c7f34c
Revises: 5d959aa9da46
Create Date: 2026-01-11 16:01:22.168735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '913329c7f34c'
down_revision: Union[str, Sequence[str], None] = '5d959aa9da46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add agreement_version field to agreements table.

    Values:
    - v1: Original 18-section comprehensive format (ARIA Professional)
    - v2_standard: Simplified 7-section format (default for new agreements)
    - v2_lite: Minimal 5-section format (for low-conflict situations)
    """
    op.add_column(
        'agreements',
        sa.Column('agreement_version', sa.String(length=20), nullable=True)
    )

    # Set existing agreements to v1 (original 18-section format)
    op.execute("UPDATE agreements SET agreement_version = 'v1' WHERE agreement_version IS NULL")

    # Now make the column non-nullable with default
    op.alter_column(
        'agreements',
        'agreement_version',
        nullable=False,
        server_default='v2_standard'
    )


def downgrade() -> None:
    """Remove agreement_version field from agreements table."""
    op.drop_column('agreements', 'agreement_version')
