"""
Partner schemas for nonprofit grant program API.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# Partner Landing Page (Public)
# ============================================================================

class PartnerBrandingConfig(BaseModel):
    """Partner visual branding configuration."""
    logo_url: str = ""
    primary_color: str = "#2C5F5D"
    secondary_color: str = "#D4A853"
    accent_color: str = "#4A90A4"
    font_family: str = "system-ui"
    hero_image_url: str = ""
    tagline: str = ""


class PartnerLandingConfig(BaseModel):
    """Partner landing page display options."""
    show_mission: bool = True
    show_stats: bool = True
    show_testimonials: bool = False
    custom_welcome_message: str = ""
    faq_items: List[Dict[str, str]] = []
    contact_method: str = "email"


class PartnerPublicInfo(BaseModel):
    """Public partner information for landing page."""
    partner_slug: str
    display_name: str
    mission_statement: Optional[str] = None
    branding_config: PartnerBrandingConfig
    landing_config: PartnerLandingConfig
    codes_remaining: int
    is_active: bool

    class Config:
        from_attributes = True


# ============================================================================
# Grant Code (Public Validation)
# ============================================================================

class GrantCodeValidateRequest(BaseModel):
    """Request to validate a grant code."""
    code: str = Field(..., min_length=4, max_length=50)


class GrantCodeValidateResponse(BaseModel):
    """Response from grant code validation."""
    is_valid: bool
    message: str
    nonprofit_name: Optional[str] = None
    granted_tier: Optional[str] = None
    partner_slug: Optional[str] = None
    grant_duration_days: Optional[int] = None


# ============================================================================
# Partner Dashboard (Protected)
# ============================================================================

class PartnerMetricsSummary(BaseModel):
    """Aggregated metrics for partner dashboard."""
    codes_distributed: int = 0
    codes_activated: int = 0
    activation_rate: float = 0.0
    active_users: int = 0
    messages_sent: int = 0
    aria_interventions: int = 0
    schedules_created: int = 0
    conflict_reduction_pct: Optional[float] = None


class AnonymousUserInfo(BaseModel):
    """Anonymized user info for partner dashboard."""
    anonymous_user_id: str  # e.g., "User-FF1A2B"
    activated_at: datetime
    last_active: Optional[datetime] = None
    message_count: int = 0
    is_active: bool = True


class GrantCodeStatus(BaseModel):
    """Grant code status for partner dashboard."""
    code: str
    is_activated: bool
    distributed_date: Optional[datetime] = None
    activated_date: Optional[datetime] = None
    anonymous_user_id: Optional[str] = None


class PartnerDashboardData(BaseModel):
    """Complete partner dashboard data."""
    partner: PartnerPublicInfo
    metrics: PartnerMetricsSummary
    active_users: List[AnonymousUserInfo] = []
    grant_codes: List[GrantCodeStatus] = []
    period_start: datetime
    period_end: datetime


# ============================================================================
# Partner Staff Auth
# ============================================================================

class PartnerStaffInfo(BaseModel):
    """Partner staff member info."""
    user_id: str
    partner_id: str
    partner_slug: str
    role: str  # "admin" or "viewer"
    display_name: str


# ============================================================================
# Admin Operations
# ============================================================================

class PartnerCreateRequest(BaseModel):
    """Request to create a new partner (admin only)."""
    partner_slug: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-z0-9-]+$")
    legal_name: str
    display_name: str
    ein: Optional[str] = None
    mission_statement: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    branding_config: Optional[PartnerBrandingConfig] = None
    landing_config: Optional[PartnerLandingConfig] = None
    code_prefix: Optional[str] = None
    codes_allocated: int = 25


class PartnerCreateResponse(BaseModel):
    """Response from partner creation."""
    id: str
    partner_slug: str
    display_name: str
    codes_allocated: int
    status: str


class GenerateCodesRequest(BaseModel):
    """Request to generate grant codes for a partner."""
    count: int = Field(..., ge=1, le=100)
    tier: str = "complete"
    duration_days: int = 180
