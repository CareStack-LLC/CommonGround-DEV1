"""Seed professional subscription plans into subscription_plans table.

Adds Solo ($99/mo), Small Firm ($299/mo), Mid-Size ($799/mo), and Enterprise
plans for the Attorney-First GTM strategy. Professional Starter tier is free
and doesn't need a Stripe plan.

Revision ID: p1r2o3_prof_plans
Revises: a1b2c3_invitation
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = "p1r2o3_prof_plans"
down_revision = "a1b2c3_invitation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Seed professional subscription plans
    # Stripe price IDs will be updated once products are created in Stripe dashboard
    op.execute(
        """
        INSERT INTO subscription_plans (
            id, plan_code, display_name, description, badge,
            price_monthly, price_annual, features, is_active, display_order, trial_days,
            created_at, updated_at
        ) VALUES
        (
            'plan_solo_001',
            'solo',
            'Solo Practitioner',
            'For independent attorneys managing up to 15 active cases. Full case dashboard, ARIA controls, and client messaging.',
            NULL,
            99.00,
            990.00,
            '{
                "max_active_cases": 15,
                "team_members": 0,
                "case_dashboard": true,
                "aria_controls": true,
                "client_messaging": true,
                "intake_center": true,
                "compliance_tracking": true,
                "court_exports": true,
                "case_timeline": true,
                "firm_management": false,
                "bulk_actions": false,
                "api_access": false,
                "priority_support": false,
                "directory_listing": true,
                "featured_listing": false
            }'::jsonb,
            true,
            10,
            14,
            NOW(),
            NOW()
        ),
        (
            'plan_small_firm_001',
            'small_firm',
            'Small Firm',
            'For small practices with up to 3 team members and 50 active cases. Includes firm management and team collaboration.',
            'Most Popular',
            299.00,
            2990.00,
            '{
                "max_active_cases": 50,
                "team_members": 3,
                "case_dashboard": true,
                "aria_controls": true,
                "client_messaging": true,
                "intake_center": true,
                "compliance_tracking": true,
                "court_exports": true,
                "case_timeline": true,
                "firm_management": true,
                "bulk_actions": true,
                "api_access": false,
                "priority_support": true,
                "directory_listing": true,
                "featured_listing": false
            }'::jsonb,
            true,
            11,
            14,
            NOW(),
            NOW()
        ),
        (
            'plan_mid_size_001',
            'mid_size',
            'Mid-Size Firm',
            'For growing practices with up to 10 team members and 150 active cases. Priority support and featured directory placement.',
            NULL,
            799.00,
            7990.00,
            '{
                "max_active_cases": 150,
                "team_members": 10,
                "case_dashboard": true,
                "aria_controls": true,
                "client_messaging": true,
                "intake_center": true,
                "compliance_tracking": true,
                "court_exports": true,
                "case_timeline": true,
                "firm_management": true,
                "bulk_actions": true,
                "api_access": true,
                "priority_support": true,
                "directory_listing": true,
                "featured_listing": true
            }'::jsonb,
            true,
            12,
            14,
            NOW(),
            NOW()
        ),
        (
            'plan_enterprise_001',
            'enterprise',
            'Enterprise',
            'Custom pricing for large firms. Unlimited cases and team members with dedicated account management and API access.',
            NULL,
            0.00,
            0.00,
            '{
                "max_active_cases": 999999,
                "team_members": 999999,
                "case_dashboard": true,
                "aria_controls": true,
                "client_messaging": true,
                "intake_center": true,
                "compliance_tracking": true,
                "court_exports": true,
                "case_timeline": true,
                "firm_management": true,
                "bulk_actions": true,
                "api_access": true,
                "priority_support": true,
                "directory_listing": true,
                "featured_listing": true,
                "dedicated_account_manager": true,
                "custom_integrations": true
            }'::jsonb,
            false,
            13,
            30,
            NOW(),
            NOW()
        )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM subscription_plans
        WHERE plan_code IN ('solo', 'small_firm', 'mid_size', 'enterprise')
        """
    )
