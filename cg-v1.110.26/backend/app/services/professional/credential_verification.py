"""
Credential verification provider seam.

Today verification is a manual review workflow (a firm owner / platform admin
approves submitted licenses). This module isolates the lookup behind a small
interface so a real bar-association / court lookup API can be dropped in later
without touching the workflow code in profile_service.py.
"""

from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass
class LookupResult:
    """Result of a credential lookup."""
    found: bool
    name: Optional[str] = None
    status: Optional[str] = None       # e.g. "active", "suspended"
    auto_verified: bool = False        # True only if a trusted source confirmed it
    source: str = "manual_review"


class BarLookupProvider(Protocol):
    """Interface for a license/bar-number lookup provider."""

    async def lookup(self, license_number: str, state: str) -> LookupResult: ...


class ManualReviewProvider:
    """
    Default provider: performs no external lookup. The submission is routed to a
    human review queue (pending_review) and never auto-verified.
    """

    async def lookup(self, license_number: str, state: str) -> LookupResult:
        return LookupResult(found=False, auto_verified=False, source="manual_review")


# Swap this for a real provider (state bar API, court directory, etc.) to enable
# automatic verification.
default_provider: BarLookupProvider = ManualReviewProvider()
