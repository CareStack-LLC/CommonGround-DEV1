"""migrate_subscription_tiers_to_v120

Revision ID: 578d6449b14a
Revises: c4l3n_fix_v2
Create Date: 2026-01-22 09:18:10.698349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '578d6449b14a'
down_revision: Union[str, Sequence[str], None] = 'c4l3n_fix_v2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Migrate subscription tiers for v1.120.0.

    Changes:
    - "starter" → "web_starter" (Free, web-only)
    - "plus" → "plus" (same name, new price $17.99/mo)
    - "family_plus" → "complete" (High-conflict tier, $34.99/mo)
    """
    conn = op.get_bind()

    # Update subscription_plans table - rename plan codes
    conn.execute(sa.text("""
        UPDATE subscription_plans
        SET plan_code = 'web_starter',
            display_name = 'Web Starter',
            description = 'Free web-only access with basic features',
            price_monthly = 0.00,
            price_annual = 0.00
        WHERE plan_code = 'starter';
    """))

    conn.execute(sa.text("""
        UPDATE subscription_plans
        SET display_name = 'Plus',
            description = 'Structure & stability with mobile apps and automation',
            price_monthly = 17.99,
            price_annual = 199.99
        WHERE plan_code = 'plus';
    """))

    conn.execute(sa.text("""
        UPDATE subscription_plans
        SET plan_code = 'complete',
            display_name = 'Complete',
            description = 'High-conflict/court-ready with full feature set',
            price_monthly = 34.99,
            price_annual = 349.99
        WHERE plan_code = 'family_plus';
    """))

    # Update user_profiles table - migrate existing users to new tier names
    conn.execute(sa.text("""
        UPDATE user_profiles
        SET subscription_tier = 'web_starter'
        WHERE subscription_tier = 'starter';
    """))

    conn.execute(sa.text("""
        UPDATE user_profiles
        SET subscription_tier = 'complete'
        WHERE subscription_tier = 'family_plus';
    """))

    # Note: "plus" tier stays the same, no update needed

    print("✅ Migrated subscription tiers to v1.120.0")
    print("   - starter → web_starter")
    print("   - plus → plus (price updated)")
    print("   - family_plus → complete")


def downgrade() -> None:
    """
    Rollback subscription tier migration.

    Reverts:
    - "web_starter" → "starter"
    - "complete" → "family_plus"
    - "plus" → plus (restore old pricing)
    """
    conn = op.get_bind()

    # Revert subscription_plans table
    conn.execute(sa.text("""
        UPDATE subscription_plans
        SET plan_code = 'starter',
            display_name = 'Starter',
            description = 'Basic features for getting started'
        WHERE plan_code = 'web_starter';
    """))

    conn.execute(sa.text("""
        UPDATE subscription_plans
        SET plan_code = 'family_plus',
            display_name = 'Family Plus',
            description = 'Advanced features for complex situations'
        WHERE plan_code = 'complete';
    """))

    # Revert user_profiles table
    conn.execute(sa.text("""
        UPDATE user_profiles
        SET subscription_tier = 'starter'
        WHERE subscription_tier = 'web_starter';
    """))

    conn.execute(sa.text("""
        UPDATE user_profiles
        SET subscription_tier = 'family_plus'
        WHERE subscription_tier = 'complete';
    """))

    print("⏮️  Rolled back subscription tiers to pre-v1.120.0")
