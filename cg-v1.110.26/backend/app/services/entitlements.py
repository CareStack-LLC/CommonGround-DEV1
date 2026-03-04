"""
Feature Entitlements Service

Centralized service for managing feature access based on subscription tiers.
This replaces scattered tier checks throughout the codebase.

Subscription Tiers:
- web_starter ($0/mo): Free tier, web-only, basic features
- plus ($17.99/mo): Structure & stability, mobile apps, automation
- complete ($34.99/mo): High-conflict/court-ready, full feature set
"""

from typing import Optional
from app.models.user import User, UserProfile


# Feature entitlement definitions by tier
FEATURE_ENTITLEMENTS = {
    # Core Platform Access
    "web_access": {
        "web_starter": True,
        "plus": True,
        "complete": True,
    },
    "mobile_apps": {
        "web_starter": False,  # Web only
        "plus": True,
        "complete": True,
    },

    # Messaging & ARIA
    "secure_messaging": {
        "web_starter": True,
        "plus": True,
        "complete": True,
    },
    "aria_flagging": {
        "web_starter": True,  # Basic flagging only
        "plus": True,  # Enhanced pattern awareness
        "complete": True,  # Advanced analytics
    },
    "aria_suggestions": {
        "web_starter": False,  # No suggestions at any tier now
        "plus": False,
        "complete": False,
    },

    # Calendar & Scheduling
    "basic_calendar": {
        "web_starter": True,  # Manual events only
        "plus": True,
        "complete": True,
    },
    "automated_scheduling": {
        "web_starter": False,
        "plus": True,  # Automated + recurring
        "complete": True,
    },

    # Agreements
    "quick_accords": {
        "web_starter": False,
        "plus": True,  # Unlimited
        "complete": True,
    },
    "shared_care_agreements": {
        "web_starter": False,
        "plus": False,
        "complete": True,  # Formal, long-term agreements
    },

    # ClearFund
    "clearfund_basic": {
        "web_starter": True,  # Manual tracking
        "plus": True,
        "complete": True,
    },
    "clearfund_automated": {
        "web_starter": False,
        "plus": True,  # Automated requests
        "complete": True,
    },
    "clearfund_fee_exempt": {
        "web_starter": True,  # No fees (updated v1.120)
        "plus": True,  # No fees
        "complete": True,  # No fees
    },

    # Custody Tracking
    "custody_tracking": {
        "web_starter": False,
        "plus": True,  # Per day/week tracking
        "complete": True,  # Advanced analytics
    },
    "custody_analytics": {
        "web_starter": False,
        "plus": False,
        "complete": True,  # Advanced analytics
    },

    # Silent Handoff & GPS
    "silent_handoff": {
        "web_starter": False,
        "plus": False,
        "complete": True,  # Geo-verified arrivals
    },
    "mandatory_event_checkins": {
        "web_starter": False,
        "plus": False,
        "complete": True,  # School, medical, hearings
    },

    # KidsCom
    "kidscoms_access": {
        "web_starter": False,
        "plus": False,
        "complete": True,  # Calls + watch-together
    },
    "kidscoms_watch_together": {
        "web_starter": False,
        "plus": False,
        "complete": True,  # Theater mode
    },

    # My Circle (Trusted Contacts)
    "my_circle_enabled": {
        "web_starter": False,
        "plus": True,
        "complete": True,
    },

    # Exports & Reports
    "basic_exports": {
        "web_starter": False,
        "plus": True,  # Basic PDF exports
        "complete": True,
    },
    "court_ready_exports": {
        "web_starter": False,
        "plus": False,
        "complete": True,  # Full export bundles with verification
    },
    "monthly_reports": {
        "web_starter": False,
        "plus": True,  # Parent Update summary
        "complete": True,  # Enhanced reports
    },

    # Support
    "priority_support": {
        "web_starter": False,
        "plus": False,
        "complete": True,
    },
}


# Numeric limits by tier
ENTITLEMENT_LIMITS = {
    "my_circle_contacts": {
        "web_starter": 0,
        "plus": 1,  # 1 contact
        "complete": 5,  # 3-5 contacts (using 5)
    },
    "quick_accords_per_month": {
        "web_starter": 0,
        "plus": 999,  # Unlimited (using large number)
        "complete": 999,  # Unlimited
    },
    "family_files": {
        "web_starter": 1,  # Single family file
        "plus": 1,
        "complete": 3,  # Multiple cases for complex situations
    },
}


class EntitlementsService:
    """
    Service for checking feature entitlements based on subscription tier.

    Replaces scattered tier checks with centralized logic.
    """

    @staticmethod
    def get_effective_tier(user: User) -> str:
        """
        Get user's effective subscription tier, accounting for grants.

        Args:
            user: User object with profile

        Returns:
            Tier code: "web_starter", "plus", or "complete"
        """
        if not user or not user.profile:
            return "web_starter"

        profile = user.profile

        # Check if user has active grant
        if profile.subscription_status == "grant" and profile.active_grant_id:
            # Grant users get the tier from their grant redemption
            # This is handled in the subscription service
            # For now, assume grant = "plus" (most common)
            return profile.subscription_tier or "plus"

        # Return subscription tier (default to web_starter if not set)
        return profile.subscription_tier or "web_starter"

    @staticmethod
    def has_feature(user: User, feature_code: str) -> bool:
        """
        Check if user has access to a specific feature.

        Args:
            user: User object with profile
            feature_code: Feature code from FEATURE_ENTITLEMENTS

        Returns:
            True if user has access, False otherwise
        """
        tier = EntitlementsService.get_effective_tier(user)

        if feature_code not in FEATURE_ENTITLEMENTS:
            # Unknown feature - default to False for security
            return False

        return FEATURE_ENTITLEMENTS[feature_code].get(tier, False)

    @staticmethod
    def get_limit(user: User, limit_code: str) -> int:
        """
        Get numeric limit for a feature based on user's tier.

        Args:
            user: User object with profile
            limit_code: Limit code from ENTITLEMENT_LIMITS

        Returns:
            Numeric limit value
        """
        tier = EntitlementsService.get_effective_tier(user)

        if limit_code not in ENTITLEMENT_LIMITS:
            # Unknown limit - default to 0 for security
            return 0

        return ENTITLEMENT_LIMITS[limit_code].get(tier, 0)

    @staticmethod
    def check_feature_or_raise(user: User, feature_code: str) -> None:
        """
        Check feature access and raise exception if not allowed.

        Args:
            user: User object with profile
            feature_code: Feature code to check

        Raises:
            PermissionError: If user doesn't have access
        """
        if not EntitlementsService.has_feature(user, feature_code):
            tier = EntitlementsService.get_effective_tier(user)
            raise PermissionError(
                f"Feature '{feature_code}' not available in {tier} tier. "
                f"Upgrade to access this feature."
            )

    @staticmethod
    def get_upgrade_message(feature_code: str) -> str:
        """
        Get user-friendly upgrade message for a feature.

        Args:
            feature_code: Feature code

        Returns:
            User-friendly message
        """
        # Map features to required tiers
        feature_tier_map = {
            "mobile_apps": "Plus",
            "automated_scheduling": "Plus",
            "quick_accords": "Plus",
            "clearfund_automated": "Plus",
            "custody_tracking": "Plus",
            "my_circle_enabled": "Plus",
            "basic_exports": "Plus",
            "monthly_reports": "Plus",
            "shared_care_agreements": "Complete",
            "silent_handoff": "Complete",
            "mandatory_event_checkins": "Complete",
            "kidscoms_access": "Complete",
            "court_ready_exports": "Complete",
            "custody_analytics": "Complete",
            "priority_support": "Complete",
        }

        required_tier = feature_tier_map.get(feature_code, "a paid")

        return f"Upgrade to {required_tier} to access this feature."

    @staticmethod
    def get_tier_features(tier: str) -> dict:
        """
        Get all features available for a specific tier.

        Args:
            tier: Tier code

        Returns:
            Dict of features and their availability
        """
        features = {}
        for feature_code, tier_access in FEATURE_ENTITLEMENTS.items():
            features[feature_code] = tier_access.get(tier, False)

        # Add limits
        for limit_code, tier_limits in ENTITLEMENT_LIMITS.items():
            features[f"limit_{limit_code}"] = tier_limits.get(tier, 0)

        return features


# Convenience instance
entitlements_service = EntitlementsService()


# Backwards compatibility aliases (to be removed after migration)
feature_gate = entitlements_service  # Old name used in codebase
