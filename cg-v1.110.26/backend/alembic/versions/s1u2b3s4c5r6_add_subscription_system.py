"""Add subscription system tables and fields.

Revision ID: s1u2b3s4c5r6
Revises: a7b8c9d0e1f2
Create Date: 2026-01-14

This migration adds:
- subscription_plans table (Starter, Plus, Family+ plans)
- grant_codes table (nonprofit promo codes)
- grant_redemptions table (tracks grant usage)
- clearfund_fees table (per-payout fees for free tier)
- New subscription fields to user_profiles
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from decimal import Decimal


# revision identifiers, used by Alembic.
revision = "s1u2b3s4c5r6"
down_revision = "f937603dd5bc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create subscription_plans table
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("plan_code", sa.String(30), unique=True, nullable=False, index=True),
        sa.Column("stripe_product_id", sa.String(100), nullable=True),
        sa.Column("stripe_price_id_monthly", sa.String(100), nullable=True),
        sa.Column("stripe_price_id_annual", sa.String(100), nullable=True),
        sa.Column("display_name", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("badge", sa.String(30), nullable=True),
        sa.Column("price_monthly", sa.Numeric(10, 2), nullable=False, default=0),
        sa.Column("price_annual", sa.Numeric(10, 2), nullable=False, default=0),
        sa.Column("features", JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("display_order", sa.Integer(), nullable=False, default=0),
        sa.Column("trial_days", sa.Integer(), nullable=False, default=14),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column("updated_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
    )

    # 2. Create grant_codes table
    op.create_table(
        "grant_codes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("granted_plan_code", sa.String(30), nullable=False, default="plus"),
        sa.Column("nonprofit_name", sa.String(200), nullable=False),
        sa.Column("nonprofit_contact_email", sa.String(255), nullable=True),
        sa.Column("nonprofit_website", sa.String(500), nullable=True),
        sa.Column("valid_from", sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column("valid_until", sa.DateTime(), nullable=True),
        sa.Column("max_redemptions", sa.Integer(), nullable=True),
        sa.Column("redemption_count", sa.Integer(), nullable=False, default=0),
        sa.Column("grant_duration_days", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column("updated_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
    )

    # 3. Create grant_redemptions table
    op.create_table(
        "grant_redemptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "grant_code_id",
            sa.String(36),
            sa.ForeignKey("grant_codes.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("granted_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("revocation_reason", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column("updated_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
    )

    # 4. Create clearfund_fees table
    op.create_table(
        "clearfund_fees",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "payout_id",
            sa.String(36),
            sa.ForeignKey("payouts.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("fee_amount", sa.Numeric(10, 2), nullable=False, default=1.50),
        sa.Column("stripe_payment_intent_id", sa.String(100), nullable=True),
        sa.Column("stripe_charge_id", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, default="pending"),
        sa.Column("collected_at", sa.DateTime(), nullable=True),
        sa.Column("waived_reason", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column("updated_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
    )

    # 5. Add new columns to user_profiles
    op.add_column(
        "user_profiles",
        sa.Column("stripe_subscription_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("subscription_period_start", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("subscription_period_end", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column(
            "active_grant_id",
            sa.String(36),
            sa.ForeignKey("grant_redemptions.id"),
            nullable=True,
        ),
    )

    # 6. Update existing subscription_tier values from old names to new names
    # essential -> starter, complete -> plus, premium -> family_plus
    op.execute(
        """
        UPDATE user_profiles
        SET subscription_tier = CASE
            WHEN subscription_tier = 'essential' THEN 'starter'
            WHEN subscription_tier = 'complete' THEN 'plus'
            WHEN subscription_tier = 'premium' THEN 'family_plus'
            ELSE subscription_tier
        END
        """
    )

    # 7. Seed initial subscription plans
    op.execute(
        """
        INSERT INTO subscription_plans (
            id, plan_code, display_name, description, badge,
            price_monthly, price_annual, features, is_active, display_order, trial_days,
            created_at, updated_at
        ) VALUES
        (
            'plan_starter_001',
            'starter',
            'Starter',
            'Everything you need to get started with better co-parenting. Basic safety documentation and communication.',
            NULL,
            0.00,
            0.00,
            '{
                "aria_manual_sentiment": true,
                "aria_advanced": false,
                "clearfund_fee_exempt": false,
                "quick_accords": false,
                "auto_scheduling": false,
                "custody_dashboard": false,
                "pdf_summaries": false,
                "circle_contacts_limit": 0,
                "kidcoms_access": false,
                "theater_mode": false,
                "court_reporting": false,
                "silent_handoff_gps": true,
                "timebridge_calendar": true,
                "timebridge_manual_only": true
            }'::jsonb,
            true,
            1,
            0,
            NOW(),
            NOW()
        ),
        (
            'plan_plus_001',
            'plus',
            'Plus',
            'Full expense tracking, automated scheduling, and smart co-parenting tools. No more manual work.',
            'Most Popular',
            12.00,
            120.00,
            '{
                "aria_manual_sentiment": true,
                "aria_advanced": false,
                "clearfund_fee_exempt": true,
                "quick_accords": true,
                "auto_scheduling": true,
                "custody_dashboard": true,
                "pdf_summaries": true,
                "circle_contacts_limit": 1,
                "kidcoms_access": false,
                "theater_mode": false,
                "court_reporting": false,
                "silent_handoff_gps": true,
                "timebridge_calendar": true,
                "timebridge_manual_only": false
            }'::jsonb,
            true,
            2,
            14,
            NOW(),
            NOW()
        ),
        (
            'plan_family_plus_001',
            'family_plus',
            'Family+',
            'Complete platform access with KidsCom video calls, Watch Together theater, and advanced court reporting.',
            NULL,
            25.00,
            250.00,
            '{
                "aria_manual_sentiment": true,
                "aria_advanced": true,
                "clearfund_fee_exempt": true,
                "quick_accords": true,
                "auto_scheduling": true,
                "custody_dashboard": true,
                "pdf_summaries": true,
                "circle_contacts_limit": 5,
                "kidcoms_access": true,
                "theater_mode": true,
                "court_reporting": true,
                "silent_handoff_gps": true,
                "timebridge_calendar": true,
                "timebridge_manual_only": false
            }'::jsonb,
            true,
            3,
            14,
            NOW(),
            NOW()
        )
        """
    )


def downgrade() -> None:
    # 1. Revert subscription_tier values back to old names
    op.execute(
        """
        UPDATE user_profiles
        SET subscription_tier = CASE
            WHEN subscription_tier = 'starter' THEN 'essential'
            WHEN subscription_tier = 'plus' THEN 'complete'
            WHEN subscription_tier = 'family_plus' THEN 'premium'
            ELSE subscription_tier
        END
        """
    )

    # 2. Remove new columns from user_profiles
    op.drop_column("user_profiles", "active_grant_id")
    op.drop_column("user_profiles", "subscription_period_end")
    op.drop_column("user_profiles", "subscription_period_start")
    op.drop_column("user_profiles", "stripe_subscription_id")

    # 3. Drop tables in reverse order of creation (due to foreign keys)
    op.drop_table("clearfund_fees")
    op.drop_table("grant_redemptions")
    op.drop_table("grant_codes")
    op.drop_table("subscription_plans")
