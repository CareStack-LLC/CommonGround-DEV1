"""Fix Stripe price IDs to use test mode.

Revision ID: f1x2p3r4i5c6e7
Revises: p1r2i3c4e5
Create Date: 2026-01-15

Updates price IDs from live mode to test mode.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "f1x2p3r4i5c6e7"
down_revision = "p1r2i3c4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update to test mode Stripe price IDs."""
    # Plus plan - test mode price
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpxbVBQiJH5qPMuvFiaAc0m'
        WHERE plan_code = 'plus'
    """)

    # Family+ plan - test mode price
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpxbpBQiJH5qPMu2hVbTv2F'
        WHERE plan_code = 'family_plus'
    """)


def downgrade() -> None:
    """Revert to live mode price IDs."""
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpdKEBQiJH5qPMuS1mg72AV'
        WHERE plan_code = 'plus'
    """)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpdMfBQiJH5qPMu5d4niIbm'
        WHERE plan_code = 'family_plus'
    """)
