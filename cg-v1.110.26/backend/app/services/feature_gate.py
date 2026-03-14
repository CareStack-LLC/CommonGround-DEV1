"""
Feature Gate Service for subscription tier-based access control.

This service determines which features a user can access based on their
subscription tier (starter, plus, family_plus) or active grant.

Usage:
    from app.services.feature_gate import feature_gate

    # Check if user has access to a feature
    if feature_gate.has_feature(user, "quick_accords"):
        # Allow access

    # Get numeric limit for a feature
    contact_limit = feature_gate.get_limit(user, "circle_contacts_limit")

    # Get effective tier (accounting for grants)
    tier = feature_gate.get_effective_tier(user)
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional, Union

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

if TYPE_CHECKING:
    from app.models.user import User, UserProfile


# Feature definitions with tier access
# Keys are feature names, values are either:
# - List of tiers that have access (boolean features)
# - Dict mapping tier to limit value (numeric limits)
FEATURE_DEFINITIONS = {
    # ARIA Features
    "aria_manual_sentiment": ["starter", "plus", "family_plus"],  # All tiers
    "aria_advanced": ["family_plus"],  # Premium only

    # ClearFund Features
    "clearfund_fee_exempt": ["plus", "family_plus"],  # Paid tiers exempt from $1.50 fee

    # QuickAccords
    "quick_accords": ["plus", "family_plus"],

    # Scheduling & Automation
    "auto_scheduling": ["plus", "family_plus"],
    "custody_dashboard": ["plus", "family_plus"],
    "pdf_summaries": ["plus", "family_plus"],

    # Circle / Trusted Contacts (numeric limit)
    "circle_contacts_limit": {
        "starter": 0,
        "plus": 1,
        "family_plus": 5,
    },

    # KidsCom Features
    "kidcoms_access": ["family_plus"],
    "theater_mode": ["family_plus"],

    # Parent Calls (co-parent communication)
    "parent_voice_call": ["plus", "family_plus"],
    "parent_video_call": ["family_plus"],

    # Court & Reporting
    "court_reporting": ["family_plus"],

    # TimeBridge / Calendar
    "silent_handoff_gps": ["starter", "plus", "family_plus"],  # All tiers
    "timebridge_calendar": ["starter", "plus", "family_plus"],  # All tiers
    "timebridge_manual_only": {  # True = manual only, False = auto features
        "starter": True,
        "plus": False,
        "family_plus": False,
    },
}

# Tier hierarchy for comparison
TIER_HIERARCHY = {
    "starter": 0,
    "plus": 1,
    "family_plus": 2,
}

# Human-readable tier names for error messages
TIER_DISPLAY_NAMES = {
    "starter": "Starter",
    "plus": "Plus",
    "family_plus": "Family+",
}


class FeatureGate:
    """
    Service for checking feature access based on subscription tiers.

    Handles:
    - Boolean feature checks (has/doesn't have access)
    - Numeric limit features (e.g., contact limits)
    - Grant code overrides (nonprofit grants)
    - Trial period access
    """

    @staticmethod
    def get_effective_tier(user: "User") -> str:
        """
        Get the user's effective subscription tier.

        This accounts for:
        - Active grant codes (grants override subscription)
        - Subscription status (active/trial vs past_due/cancelled)

        Args:
            user: User object with profile relationship

        Returns:
            Effective tier code: "starter", "plus", or "family_plus"
        """
        profile = user.profile
        if not profile:
            return "starter"

        # Check for active grant first
        if profile.subscription_status == "grant" and profile.active_grant_id:
            # Grant provides Plus tier (or whatever the grant specifies)
            # For now, all grants give "plus" access
            return "plus"

        # Check subscription status
        # Note: Stripe returns "trialing" not "trial", and we set "cancelling" for cancel_at_period_end
        if profile.subscription_status in ("active", "trial", "trialing", "cancelling"):
            return profile.subscription_tier

        # Past due or cancelled - revert to starter
        if profile.subscription_status in ("past_due", "cancelled"):
            # Grace period: allow 3 days of past_due before downgrade
            if profile.subscription_status == "past_due":
                # Could implement grace period logic here
                pass
            return "starter"

        return profile.subscription_tier

    @staticmethod
    def has_feature(user: "User", feature: str) -> bool:
        """
        Check if user has access to a specific feature.

        Args:
            user: User object with profile relationship
            feature: Feature name from FEATURE_DEFINITIONS

        Returns:
            True if user has access, False otherwise
        """
        if feature not in FEATURE_DEFINITIONS:
            # Unknown feature - deny by default
            return False

        effective_tier = FeatureGate.get_effective_tier(user)
        feature_def = FEATURE_DEFINITIONS[feature]

        # Handle boolean features (list of allowed tiers)
        if isinstance(feature_def, list):
            return effective_tier in feature_def

        # Handle numeric features (dict of tier -> value)
        if isinstance(feature_def, dict):
            # For numeric features, check if value is truthy (> 0 or False is falsy)
            value = feature_def.get(effective_tier, 0)
            if isinstance(value, bool):
                return value
            return value > 0

        return False

    @staticmethod
    def get_limit(user: "User", feature: str) -> Union[int, bool]:
        """
        Get the numeric limit for a feature.

        Args:
            user: User object with profile relationship
            feature: Feature name from FEATURE_DEFINITIONS

        Returns:
            Limit value (int or bool depending on feature type)
        """
        if feature not in FEATURE_DEFINITIONS:
            return 0

        effective_tier = FeatureGate.get_effective_tier(user)
        feature_def = FEATURE_DEFINITIONS[feature]

        # Handle numeric features
        if isinstance(feature_def, dict):
            return feature_def.get(effective_tier, 0)

        # Handle boolean features - return 1 if has access, 0 if not
        if isinstance(feature_def, list):
            return 1 if effective_tier in feature_def else 0

        return 0

    @staticmethod
    def get_required_tier(feature: str) -> Optional[str]:
        """
        Get the minimum tier required for a feature.

        Args:
            feature: Feature name from FEATURE_DEFINITIONS

        Returns:
            Minimum required tier name, or None if feature doesn't exist
        """
        if feature not in FEATURE_DEFINITIONS:
            return None

        feature_def = FEATURE_DEFINITIONS[feature]

        # For boolean features, find the lowest tier in the list
        if isinstance(feature_def, list):
            if not feature_def:
                return None
            # Sort by hierarchy and return lowest
            sorted_tiers = sorted(
                feature_def,
                key=lambda t: TIER_HIERARCHY.get(t, 999)
            )
            return sorted_tiers[0]

        # For numeric features, find lowest tier with positive value
        if isinstance(feature_def, dict):
            for tier in ["starter", "plus", "family_plus"]:
                value = feature_def.get(tier, 0)
                if isinstance(value, bool):
                    if value:
                        return tier
                elif value > 0:
                    return tier
            return None

        return None

    @staticmethod
    def get_upgrade_message(feature: str) -> str:
        """
        Get a user-friendly message explaining how to access a feature.

        Args:
            feature: Feature name

        Returns:
            Upgrade prompt message
        """
        required_tier = FeatureGate.get_required_tier(feature)
        if not required_tier:
            return "This feature is not available."

        tier_name = TIER_DISPLAY_NAMES.get(required_tier, required_tier)

        if required_tier == "plus":
            return f"Upgrade to {tier_name} ($12/month) to access this feature."
        elif required_tier == "family_plus":
            return f"Upgrade to {tier_name} ($25/month) to access this feature."

        return f"This feature requires {tier_name} subscription."

    @staticmethod
    def compare_tiers(tier1: str, tier2: str) -> int:
        """
        Compare two tiers.

        Returns:
            -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2
        """
        h1 = TIER_HIERARCHY.get(tier1, 0)
        h2 = TIER_HIERARCHY.get(tier2, 0)

        if h1 < h2:
            return -1
        elif h1 > h2:
            return 1
        return 0

    @staticmethod
    def is_paid_tier(tier: str) -> bool:
        """Check if tier is a paid tier (Plus or Family+)."""
        return tier in ("plus", "family_plus")

    @staticmethod
    async def check_feature_or_raise(
        user: "User",
        feature: str,
        error_class: type = None,
    ) -> None:
        """
        Check feature access and raise exception if not allowed.

        Args:
            user: User object
            feature: Feature name
            error_class: Optional custom exception class (default: ValueError)

        Raises:
            error_class or ValueError if feature not accessible
        """
        if not FeatureGate.has_feature(user, feature):
            message = FeatureGate.get_upgrade_message(feature)
            if error_class:
                raise error_class(message)
            raise ValueError(message)


# Singleton instance for convenience
feature_gate = FeatureGate()
