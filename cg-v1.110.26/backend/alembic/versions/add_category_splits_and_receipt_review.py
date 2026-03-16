"""Add per-category splits and receipt review fields.

Revision ID: add_cat_splits
Revises: add_comm_prefs
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_cat_splits'
down_revision = 'add_comm_prefs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Per-category expense split overrides on family_files
    op.add_column('family_files', sa.Column('agreement_category_splits', sa.JSON(), nullable=True))

    # Co-parent receipt review fields on verification_artifacts
    op.add_column('verification_artifacts', sa.Column('reviewed_by', sa.String(36), nullable=True))
    op.add_column('verification_artifacts', sa.Column('review_status', sa.String(20), server_default='pending', nullable=False))
    op.add_column('verification_artifacts', sa.Column('reviewed_at', sa.DateTime(), nullable=True))
    op.add_column('verification_artifacts', sa.Column('review_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('verification_artifacts', 'review_notes')
    op.drop_column('verification_artifacts', 'reviewed_at')
    op.drop_column('verification_artifacts', 'review_status')
    op.drop_column('verification_artifacts', 'reviewed_by')
    op.drop_column('family_files', 'agreement_category_splits')
