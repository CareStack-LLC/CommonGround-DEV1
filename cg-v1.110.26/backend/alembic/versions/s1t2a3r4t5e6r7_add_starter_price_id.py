"""Add Stripe price ID for Starter plan.

Revision ID: s1t2a3r4t5e6r7
Revises: f1x2p3r4i5c6e7
Create Date: 2026-01-15

Adds the Stripe test price ID for the Starter plan.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "s1t2a3r4t5e6r7"
down_revision = "f1x2p3r4i5c6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add Stripe price ID for Starter plan."""
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpzqxBQiJH5qPMuSrGDCqvl'
        WHERE plan_code = 'starter'
    """)


def downgrade() -> None:
    """Remove Stripe price ID from Starter plan."""
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = NULL
        WHERE plan_code = 'starter'
    """)
