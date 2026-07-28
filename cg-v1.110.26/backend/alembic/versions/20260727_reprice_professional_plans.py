"""Reprice professional plans for the launch pricing model.

Free-to-practice / pay-to-grow structure:
- Starter stays free (3 cases, invited access, pay-per-report) — no DB row needed.
- Solo drops $99 -> $49/mo ($490/yr) to remove the adoption barrier vs. free
  incumbent professional accounts (OFW); sells the practice toolkit
  (AI intake, court-order OCR, included compliance reports).
- Small Firm rebrands to "Firm", drops $299 -> $249/mo ($2,490/yr), gains
  featured directory placement + bulk actions (the lead-generation tier),
  and 5 team seats (was 3).
- Mid-Size drops $799 -> $599/mo ($5,990/yr), gains API access, 15 seats.
- Enterprise unchanged (custom, inactive until sales-led).

Annual = 10x monthly (2 months free) to match the consumer "Save 17%" framing.

Revision ID: reprice_prof_2607
Revises: msg_sentiment_score_20260721
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "reprice_prof_2607"
down_revision = "msg_sentiment_score_20260721"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE subscription_plans SET
            display_name = 'Solo Practitioner',
            description = 'For independent attorneys and mediators managing up to 15 active cases. AI intake, court-order OCR, and included compliance reports.',
            price_monthly = 49.00,
            price_annual = 490.00,
            features = features || '{
                "team_members": 0,
                "included_reports": true,
                "featured_listing": false
            }'::jsonb,
            updated_at = NOW()
        WHERE plan_code = 'solo'
        """
    )
    op.execute(
        """
        UPDATE subscription_plans SET
            display_name = 'Firm',
            description = 'For practices with up to 5 team members and 50 active cases. Firm management, case queue, templates, analytics, and featured directory placement for lead generation.',
            price_monthly = 249.00,
            price_annual = 2490.00,
            features = features || '{
                "team_members": 5,
                "included_reports": true,
                "featured_listing": true,
                "bulk_actions": true,
                "priority_support": true
            }'::jsonb,
            updated_at = NOW()
        WHERE plan_code = 'small_firm'
        """
    )
    op.execute(
        """
        UPDATE subscription_plans SET
            display_name = 'Mid-Size Firm',
            description = 'For growing practices with up to 15 team members and 150 active cases. Everything in Firm plus API access.',
            price_monthly = 599.00,
            price_annual = 5990.00,
            features = features || '{
                "team_members": 15,
                "included_reports": true,
                "api_access": true
            }'::jsonb,
            updated_at = NOW()
        WHERE plan_code = 'mid_size'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE subscription_plans SET
            display_name = 'Solo Practitioner',
            price_monthly = 99.00,
            price_annual = 990.00,
            features = features || '{"team_members": 0, "featured_listing": false}'::jsonb,
            updated_at = NOW()
        WHERE plan_code = 'solo'
        """
    )
    op.execute(
        """
        UPDATE subscription_plans SET
            display_name = 'Small Firm',
            price_monthly = 299.00,
            price_annual = 2990.00,
            features = features || '{"team_members": 3, "featured_listing": false}'::jsonb,
            updated_at = NOW()
        WHERE plan_code = 'small_firm'
        """
    )
    op.execute(
        """
        UPDATE subscription_plans SET
            display_name = 'Mid-Size Firm',
            price_monthly = 799.00,
            price_annual = 7990.00,
            features = features || '{"team_members": 10}'::jsonb,
            updated_at = NOW()
        WHERE plan_code = 'mid_size'
        """
    )
