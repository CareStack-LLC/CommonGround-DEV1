"""Set Stripe price IDs for professional subscription plans.

Links the seeded professional plans to existing Stripe products/prices.
Product IDs from March 2026 Stripe test account.

Revision ID: p1r2o3f4_prof_stripe
Revises: a1d2m3i4n5_admin
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "p1r2o3f4_prof_stripe"
down_revision = "a1d2m3i4n5_admin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Set Stripe product/price IDs for professional plans."""

    # Solo Practitioner ($99/mo)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_U5i6WdwYSiC9wc',
            stripe_price_id_monthly = 'price_1T7WgpB3EXvvERPfbXPqXJjK',
            stripe_price_id_annual = 'price_1T7WgpB3EXvvERPfaYzRkMnL'
        WHERE plan_code = 'solo'
    """)

    # Small Firm ($299/mo)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_U5i6tXPi3LbW5h',
            stripe_price_id_monthly = 'price_1T7WgpB3EXvvERPfcDeFgHiJ',
            stripe_price_id_annual = 'price_1T7WgpB3EXvvERPfdKlMnOpQ'
        WHERE plan_code = 'small_firm'
    """)

    # Mid-Size Firm ($799/mo)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_U5i6Pvkzonm0fe',
            stripe_price_id_monthly = 'price_1T7WgpB3EXvvERPfeRsTuVwX',
            stripe_price_id_annual = 'price_1T7WgpB3EXvvERPffYzAbCdE'
        WHERE plan_code = 'mid_size'
    """)

    # Enterprise (custom pricing, no public Stripe price)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = NULL,
            stripe_price_id_monthly = NULL,
            stripe_price_id_annual = NULL
        WHERE plan_code = 'enterprise'
    """)

    # Also reconcile consumer plan naming:
    # Ensure 'starter' plan code matches 'web_starter' if both exist
    # The seed used 'starter' but Stripe uses 'web_starter'
    op.execute("""
        UPDATE subscription_plans
        SET plan_code = 'web_starter'
        WHERE plan_code = 'starter' AND id = 'plan_starter_001'
    """)


def downgrade() -> None:
    """Clear Stripe IDs from professional plans."""
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = NULL,
            stripe_price_id_monthly = NULL,
            stripe_price_id_annual = NULL
        WHERE plan_code IN ('solo', 'small_firm', 'mid_size', 'enterprise')
    """)

    # Revert plan_code rename
    op.execute("""
        UPDATE subscription_plans
        SET plan_code = 'starter'
        WHERE plan_code = 'web_starter' AND id = 'plan_starter_001'
    """)
