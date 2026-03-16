"""Add agreement communication preferences to family_files.

Revision ID: add_comm_prefs
Revises: update_stripe_v3
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_comm_prefs'
down_revision = 'update_stripe_v3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add communication preferences columns to family_files
    op.add_column('family_files', sa.Column('agreement_communication_platform', sa.String(50), nullable=True))
    op.add_column('family_files', sa.Column('agreement_response_timeframe', sa.String(50), nullable=True))
    op.add_column('family_files', sa.Column('agreement_decision_authority', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('family_files', 'agreement_decision_authority')
    op.drop_column('family_files', 'agreement_response_timeframe')
    op.drop_column('family_files', 'agreement_communication_platform')
