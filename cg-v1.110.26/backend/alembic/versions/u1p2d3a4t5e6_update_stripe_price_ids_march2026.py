"""Update Stripe price IDs to March 2026 test account.

Revision ID: u1p2d3a4t5e6
Revises: f1x2p3r4i5c6e7
Create Date: 2026-03-05

Updates subscription plan price IDs to match the CommonGround
Stripe test account products created March 2026.

New Products (BJIivbOFX7 account):
  Web Starter:              prod_UCPQdxPYuteQUA
  Plus:                     prod_UCPQBUvNRmZ4Cs
  Complete:                 prod_UCPQxC2eRt7g6K
  Professional - Starter:   prod_UCPQevbVaWJDfT
  Professional - Solo:      prod_UCPQVLqjYyuiRF
  Professional - Small Firm: prod_UCPQOK9Qpuw1hB
  Professional - Mid-Size:  prod_UCPQQwcr2VaCXs
  Court Investigation:      prod_UCPQOlUDOkaF3u
  Comm Analysis Report:     prod_UCPQI4zziqm3mM
  Financial Compliance:     prod_UCPQwdLQurLuJL
  Custody Compliance:       prod_UCPQNVYgbcZ3Am
  Rush Report Delivery:     prod_UCPQTRgWRvrgc6
  Urgent Report Delivery:   prod_UCPQ5vVhbWJRRE
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "u1p2d3a4t5e6"
down_revision = "f1x2p3r4i5c6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update to March 2026 Stripe test price IDs."""

    # Web Starter (free)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1TE0bXBJIivbOFX7luV9H7OZ',
            stripe_price_id_annual = NULL,
            stripe_product_id = 'prod_UCPQdxPYuteQUA'
        WHERE plan_code = 'web_starter'
    """)

    # Plus plan - monthly & annual
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1TE0bXBJIivbOFX70Ysv656Q',
            stripe_price_id_annual = 'price_1TE0bYBJIivbOFX7atup1qAE',
            stripe_product_id = 'prod_UCPQBUvNRmZ4Cs'
        WHERE plan_code = 'plus'
    """)

    # Complete plan - monthly & annual
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1TE0bYBJIivbOFX7VqmtQH23',
            stripe_price_id_annual = 'price_1TE0bZBJIivbOFX77f2QUPc6',
            stripe_product_id = 'prod_UCPQxC2eRt7g6K'
        WHERE plan_code = 'complete'
    """)


def downgrade() -> None:
    """Revert to previous test price IDs."""
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpxbVBQiJH5qPMuvFiaAc0m',
            stripe_price_id_annual = NULL
        WHERE plan_code = 'plus'
    """)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpxbpBQiJH5qPMu2hVbTv2F',
            stripe_price_id_annual = NULL
        WHERE plan_code IN ('complete', 'family_plus')
    """)
