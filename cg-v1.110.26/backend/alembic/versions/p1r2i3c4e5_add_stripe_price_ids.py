"""Add Stripe price IDs to subscription plans.

Revision ID: p1r2i3c4e5
Revises: m3r9e1h2e3a4d5
Create Date: 2026-01-15

Configures Stripe price IDs for Plus and Family+ subscription plans.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "p1r2i3c4e5"
down_revision = "m3r9e1h2e3a4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add Stripe price IDs to subscription plans."""
    # Plus plan - monthly price
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpdKEBQiJH5qPMuS1mg72AV'
        WHERE plan_code = 'plus'
    """)

    # Family+ plan - monthly price
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpdMfBQiJH5qPMu5d4niIbm'
        WHERE plan_code = 'family_plus'
    """)


def downgrade() -> None:
    """Remove Stripe price IDs from subscription plans."""
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = NULL
        WHERE plan_code IN ('plus', 'family_plus')
    """)
