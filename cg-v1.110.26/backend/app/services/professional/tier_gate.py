"""
Tier-Gating Middleware.

FastAPI dependencies that enforce Professional Portal subscription tier limits.

Usage:
    @router.post("/cases")
    async def create_case(
        _tier: None = Depends(require_tier(ProfessionalTier.SOLO)),
        _limit: None = Depends(enforce_case_limit),
        profile: ProfessionalProfile = Depends(get_current_professional),
    ):
        ...
"""

from typing import Optional, Callable
from functools import wraps

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.professional import (
    ProfessionalProfile,
    ProfessionalTier,
    TIER_CASE_LIMITS,
    TIER_TEAM_LIMITS,
)


# =============================================================================
# Tier hierarchy (for comparison)
# =============================================================================

TIER_ORDER = {
    ProfessionalTier.STARTER: 0,
    ProfessionalTier.SOLO: 1,
    ProfessionalTier.SMALL_FIRM: 2,
    ProfessionalTier.MID_SIZE: 3,
    ProfessionalTier.ENTERPRISE: 4,
}

TIER_DISPLAY_NAMES = {
    ProfessionalTier.STARTER: "Starter (Free)",
    ProfessionalTier.SOLO: "Solo ($99/mo)",
    ProfessionalTier.SMALL_FIRM: "Small Firm ($299/mo)",
    ProfessionalTier.MID_SIZE: "Mid-Size ($799/mo)",
    ProfessionalTier.ENTERPRISE: "Enterprise (Custom)",
}


def _get_tier_from_profile(profile: ProfessionalProfile) -> ProfessionalTier:
    """Parse the subscription_tier string to ProfessionalTier enum."""
    try:
        return ProfessionalTier(profile.subscription_tier)
    except ValueError:
        return ProfessionalTier.STARTER


def _tier_meets_minimum(current: ProfessionalTier, minimum: ProfessionalTier) -> bool:
    """Check if current tier meets the minimum requirement."""
    return TIER_ORDER.get(current, 0) >= TIER_ORDER.get(minimum, 0)


# =============================================================================
# FastAPI Dependencies
# =============================================================================

def require_tier(minimum_tier: ProfessionalTier):
    """
    FastAPI dependency factory that requires a minimum subscription tier.

    Usage:
        @router.post("/ocr/upload")
        async def upload_ocr(
            _: None = Depends(require_tier(ProfessionalTier.SOLO)),
            profile: ProfessionalProfile = Depends(get_current_professional),
        ):
            ...
    """
    async def _check_tier(profile: ProfessionalProfile) -> None:
        current_tier = _get_tier_from_profile(profile)
        if not _tier_meets_minimum(current_tier, minimum_tier):
            min_name = TIER_DISPLAY_NAMES.get(minimum_tier, minimum_tier.value)
            current_name = TIER_DISPLAY_NAMES.get(current_tier, current_tier.value)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "tier_insufficient",
                    "message": f"This feature requires {min_name} tier or higher. "
                               f"Your current tier is {current_name}.",
                    "current_tier": current_tier.value,
                    "required_tier": minimum_tier.value,
                    "upgrade_url": "/professional/settings/subscription",
                },
            )
    return _check_tier


async def enforce_case_limit(profile: ProfessionalProfile) -> None:
    """
    FastAPI dependency that ensures the professional hasn't exceeded
    their tier's case limit.

    Raises 403 with upgrade guidance if at limit.
    """
    current_tier = _get_tier_from_profile(profile)
    max_cases = TIER_CASE_LIMITS.get(current_tier, 3)

    if profile.active_case_count >= max_cases:
        current_name = TIER_DISPLAY_NAMES.get(current_tier, current_tier.value)

        # Find the next tier up for upgrade message
        current_order = TIER_ORDER.get(current_tier, 0)
        next_tier = None
        for tier, order in sorted(TIER_ORDER.items(), key=lambda x: x[1]):
            if order > current_order:
                next_tier = tier
                break

        upgrade_msg = ""
        if next_tier:
            next_name = TIER_DISPLAY_NAMES.get(next_tier, next_tier.value)
            next_limit = TIER_CASE_LIMITS.get(next_tier, 0)
            upgrade_msg = (
                f" Upgrade to {next_name} for up to {next_limit} active cases."
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "case_limit_reached",
                "message": (
                    f"You've reached the maximum of {max_cases} active cases "
                    f"on the {current_name} tier.{upgrade_msg}"
                ),
                "current_tier": current_tier.value,
                "active_cases": profile.active_case_count,
                "max_cases": max_cases,
                "upgrade_url": "/professional/settings/subscription",
            },
        )


async def enforce_team_limit(
    profile: ProfessionalProfile,
    firm_member_count: int,
) -> None:
    """
    Check if firm can add more team members based on tier.

    Not a direct FastAPI dependency — called from firm member invite endpoint.
    """
    current_tier = _get_tier_from_profile(profile)
    max_members = TIER_TEAM_LIMITS.get(current_tier, 0)

    if max_members == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "firm_not_supported",
                "message": (
                    "Firm features require Small Firm tier ($299/mo) or higher. "
                    "Your current tier doesn't support team members."
                ),
                "current_tier": current_tier.value,
                "required_tier": ProfessionalTier.SMALL_FIRM.value,
                "upgrade_url": "/professional/settings/subscription",
            },
        )

    if firm_member_count >= max_members:
        current_name = TIER_DISPLAY_NAMES.get(current_tier, current_tier.value)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "team_limit_reached",
                "message": (
                    f"You've reached the maximum of {max_members} team members "
                    f"on the {current_name} tier."
                ),
                "current_tier": current_tier.value,
                "current_members": firm_member_count,
                "max_members": max_members,
                "upgrade_url": "/professional/settings/subscription",
            },
        )


# =============================================================================
# Feature availability checks (for frontend feature gating)
# =============================================================================

def get_tier_features(tier: ProfessionalTier) -> dict:
    """
    Return a feature availability map for a given tier.

    Used by the profile endpoint to tell the frontend which features to show/hide.
    """
    order = TIER_ORDER.get(tier, 0)

    return {
        "tier": tier.value,
        "max_cases": TIER_CASE_LIMITS.get(tier, 3),
        "max_team_members": TIER_TEAM_LIMITS.get(tier, 0),
        "features": {
            # All tiers
            "dashboard": True,
            "case_management": True,
            "messaging": True,
            "calendar": True,
            "compliance_view": True,
            "directory_listing": True,
            # Solo+ (order >= 1)
            "custom_intake": order >= 1,
            "ocr_processing": order >= 1,
            "compliance_reports": order >= 1,
            "call_logging": order >= 1,
            # Small Firm+ (order >= 2)
            "firm_management": order >= 2,
            "team_members": order >= 2,
            "case_dispatcher": order >= 2,
            "firm_templates": order >= 2,
            "firm_analytics": order >= 2,
            # Mid-Size+ (order >= 3)
            "featured_directory": order >= 3,
            "priority_support": order >= 3,
            "bulk_operations": order >= 3,
            # Enterprise (order >= 4)
            "api_access": order >= 4,
            "custom_integrations": order >= 4,
            "dedicated_account_manager": order >= 4,
        },
    }
