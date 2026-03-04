"""Add Stripe price IDs to subscription plans.

Revision ID: s2t3r4i5p6e7
Revises: s1u2b3s4c5r6
Create Date: 2026-01-14

Updates the subscription plans with actual Stripe price IDs.
"""

from alembic import op
import os

# revision identifiers, used by Alembic.
revision = "s2t3r4i5p6e7"
down_revision = "s1u2b3s4c5r6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Get price IDs from environment variables
    plus_price_id = os.environ.get("STRIPE_PLUS_PRICE_ID", "price_1SpdKEBQiJH5qPMuS1mg72AV")
    family_plus_price_id = os.environ.get("STRIPE_FAMILY_PLUS_PRICE_ID", "price_1SpdMfBQiJH5qPMu5d4niIbm")

    # Update Plus plan with Stripe price ID
    op.execute(
        f"""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = '{plus_price_id}'
        WHERE plan_code = 'plus'
        """
    )

    # Update Family+ plan with Stripe price ID
    op.execute(
        f"""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = '{family_plus_price_id}'
        WHERE plan_code = 'family_plus'
        """
    )


def downgrade() -> None:
    # Remove Stripe price IDs
    op.execute(
        """
        UPDATE subscription_plans
        SET stripe_price_id_monthly = NULL
        WHERE plan_code IN ('plus', 'family_plus')
        """
    )
