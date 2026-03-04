"""
Partner API endpoints for nonprofit grant program.

Provides:
- Public: Partner landing page data, grant code validation
- Protected: Partner dashboard with anonymized metrics
- Admin: Partner creation, code generation
"""

import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, text, bindparam
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import (
    User,
    Partner,
    PartnerStaff,
    PartnerMetric,
    UserAnonymizationMap,
    GrantCode,
    GrantRedemption,
    Message,
    MessageFlag,
    ScheduleEvent,
    PartnerStatus,
    PartnerStaffRole,
)
from app.schemas.partner import (
    PartnerPublicInfo,
    PartnerBrandingConfig,
    PartnerLandingConfig,
    GrantCodeValidateRequest,
    GrantCodeValidateResponse,
    PartnerDashboardData,
    PartnerMetricsSummary,
    AnonymousUserInfo,
    GrantCodeStatus,
    PartnerStaffInfo,
    PartnerCreateRequest,
    PartnerCreateResponse,
    GenerateCodesRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Authenticated User Endpoints (MUST come before /{partner_slug} catch-all)
# ============================================================================

@router.get("/my-partners", response_model=list[PartnerStaffInfo])
async def get_my_partner_access(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of all partners where current user has staff access.
    Used by frontend navigation to show Partner Dashboard link.
    """
    result = await db.execute(
        select(PartnerStaff).options(
            selectinload(PartnerStaff.partner)
        ).where(
            PartnerStaff.user_id == current_user.id
        )
    )
    staff_roles = result.scalars().all()
    
    return [
        PartnerStaffInfo(
            user_id=current_user.id,
            partner_id=staff.partner_id,
            partner_slug=staff.partner.partner_slug,
            role=staff.role,
            display_name=f"{current_user.first_name} {current_user.last_name}"
        )
        for staff in staff_roles
        if staff.partner and staff.partner.status == PartnerStatus.ACTIVE
    ]


# ============================================================================
# Public Endpoints (No Auth)
# ============================================================================

@router.get("/{partner_slug}", response_model=PartnerPublicInfo)
async def get_partner_landing(
    partner_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get partner landing page data (public).
    
    Used to render the partner-branded landing page at {slug}.commonground.app
    """
    result = await db.execute(
        select(Partner).where(
            Partner.partner_slug == partner_slug.lower()
        )
    )
    partner = result.scalar_one_or_none()
    
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner not found"
        )
    
    # Count remaining codes
    codes_result = await db.execute(
        select(func.count(GrantCode.id)).where(
            GrantCode.partner_id == partner.id,
            GrantCode.is_active == True,
            GrantCode.redemption_count == 0
        )
    )
    codes_remaining = codes_result.scalar() or 0
    
    return PartnerPublicInfo(
        partner_slug=partner.partner_slug,
        display_name=partner.display_name,
        mission_statement=partner.mission_statement,
        branding_config=PartnerBrandingConfig(**partner.branding_config),
        landing_config=PartnerLandingConfig(**partner.landing_config),
        codes_remaining=codes_remaining,
        is_active=partner.status == PartnerStatus.ACTIVE
    )


@router.post("/{partner_slug}/validate-code", response_model=GrantCodeValidateResponse)
async def validate_partner_code(
    partner_slug: str,
    request: GrantCodeValidateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Validate a grant code for a specific partner (public).
    
    Checks if code exists, is active, belongs to partner, and has remaining uses.
    """
    result = await db.execute(
        select(GrantCode).options(
            selectinload(GrantCode.partner)
        ).where(
            GrantCode.code == request.code.upper()
        )
    )
    grant_code = result.scalar_one_or_none()
    
    if not grant_code:
        return GrantCodeValidateResponse(
            is_valid=False,
            message="Invalid grant code"
        )
    
    # Verify code belongs to this partner
    if grant_code.partner and grant_code.partner.partner_slug != partner_slug.lower():
        return GrantCodeValidateResponse(
            is_valid=False,
            message="This code is not valid for this organization"
        )
    
    # Check validity
    if not grant_code.is_active:
        return GrantCodeValidateResponse(
            is_valid=False,
            message="This code is no longer active",
            nonprofit_name=grant_code.nonprofit_name,
            granted_tier=grant_code.granted_plan_code
        )
    
    now = datetime.utcnow()
    if now < grant_code.valid_from:
        return GrantCodeValidateResponse(
            is_valid=False,
            message="This code is not active yet",
            nonprofit_name=grant_code.nonprofit_name,
            granted_tier=grant_code.granted_plan_code
        )
    
    if grant_code.valid_until and now > grant_code.valid_until:
        return GrantCodeValidateResponse(
            is_valid=False,
            message="This code has expired",
            nonprofit_name=grant_code.nonprofit_name,
            granted_tier=grant_code.granted_plan_code
        )
    
    if grant_code.max_redemptions and grant_code.redemption_count >= grant_code.max_redemptions:
        return GrantCodeValidateResponse(
            is_valid=False,
            message="This code has reached its maximum uses",
            nonprofit_name=grant_code.nonprofit_name,
            granted_tier=grant_code.granted_plan_code
        )
    
    return GrantCodeValidateResponse(
        is_valid=True,
        message="Code is valid! You'll receive free access.",
        nonprofit_name=grant_code.nonprofit_name,
        granted_tier=grant_code.granted_plan_code,
        partner_slug=grant_code.partner.partner_slug if grant_code.partner else None,
        grant_duration_days=grant_code.grant_duration_days
    )


@router.get("/{partner_slug}/impact-metrics", response_model=PartnerDashboardData)
async def get_public_impact_metrics(
    partner_slug: str,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """
    Get public impact metrics for a partner (public).
    
    Returns the same metrics as the dashboard, but without sensitive grant code or user lists.
    """
    result = await db.execute(
        select(Partner).where(
            Partner.partner_slug == partner_slug.lower()
        )
    )
    partner = result.scalar_one_or_none()
    
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner not found"
        )
    
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(days=days)
    
    # ==========================================
    # 1. Historical Metrics Cache Check
    # ==========================================
    period_type = None
    if days == 30:
        period_type = "monthly"
    elif days == 7:
        period_type = "weekly"
    elif days == 90:
        period_type = "quarterly"

    cached_metric = None
    if period_type:
        result = await db.execute(
            select(PartnerMetric).where(
                PartnerMetric.partner_id == partner.id,
                PartnerMetric.period_type == period_type
            ).order_by(PartnerMetric.period_end.desc()).limit(1)
        )
        cached_metric = result.scalar_one_or_none()
        
        if cached_metric and cached_metric.calculated_at > (datetime.utcnow() - timedelta(hours=24)):
            metrics_summary = PartnerMetricsSummary(
                codes_distributed=cached_metric.codes_distributed,
                codes_activated=cached_metric.codes_activated,
                activation_rate=float(cached_metric.activation_rate) if cached_metric.activation_rate else 0.0,
                active_users=cached_metric.active_users,
                messages_sent=cached_metric.messages_sent,
                aria_interventions=cached_metric.aria_interventions,
                schedules_created=cached_metric.schedules_created,
                conflict_reduction_pct=float(cached_metric.conflict_reduction_pct) if cached_metric.conflict_reduction_pct else None
            )
        else:
            cached_metric = None

    # ==========================================
    # 2. Real-time Calculation (if no cache)
    # ==========================================
    if not cached_metric:
        # Get all grant codes for this partner to calculate activation rates
        codes_result = await db.execute(
            select(GrantCode).where(
                GrantCode.partner_id == partner.id
            )
        )
        grant_codes = codes_result.scalars().all()
        
        # Build metrics
        codes_distributed = len(grant_codes)
        codes_activated = sum(1 for c in grant_codes if c.redemption_count > 0)
        activation_rate = (codes_activated / codes_distributed * 100) if codes_distributed > 0 else 0
        
        # Get anonymized user IDs for message/aria counts
        redemptions_result = await db.execute(
            select(GrantRedemption.user_id).join(GrantCode).where(
                GrantCode.partner_id == partner.id,
                GrantRedemption.is_active == True
            )
        )
        user_ids = [r[0] for r in redemptions_result.all()]
        
        total_messages = 0
        aria_interventions = 0
        if user_ids:
            msg_result = await db.execute(
                select(func.count(Message.id)).where(
                    Message.sender_id.in_(user_ids),
                    Message.created_at >= period_start
                )
            )
            total_messages = msg_result.scalar() or 0
            
            aria_result = await db.execute(
                select(func.count(MessageFlag.id))
                .join(Message, MessageFlag.message_id == Message.id)
                .where(
                    Message.sender_id.in_(user_ids),
                    MessageFlag.created_at >= period_start
                )
            )
            aria_interventions = aria_result.scalar() or 0
            
            # Also count blocked interventions
            try:
                blocked_stmt = text("SELECT COUNT(*) FROM aria_events WHERE user_id IN :user_ids AND created_at >= :period_start")
                blocked_stmt = blocked_stmt.bindparams(bindparam("user_ids", expanding=True))
                blocked_result = await db.execute(blocked_stmt, {"user_ids": list(user_ids), "period_start": period_start})
                aria_interventions += (blocked_result.scalar() or 0)
            except Exception:
                pass
        
        # Get schedule count
        schedules_created = 0
        if user_ids:
            sched_result = await db.execute(
                select(func.count(ScheduleEvent.id)).where(
                    ScheduleEvent.creator_id.in_(user_ids),
                    ScheduleEvent.created_at >= period_start
                )
            )
            schedules_created = sched_result.scalar() or 0
            
        metrics_summary = PartnerMetricsSummary(
            codes_distributed=codes_distributed,
            codes_activated=codes_activated,
            activation_rate=round(activation_rate, 1),
            active_users=len(user_ids),
            messages_sent=total_messages,
            aria_interventions=aria_interventions,
            schedules_created=schedules_created
        )

    # Count remaining codes
    rem_result = await db.execute(
        select(func.count(GrantCode.id)).where(
            GrantCode.partner_id == partner.id,
            GrantCode.is_active == True,
            GrantCode.redemption_count == 0
        )
    )
    codes_remaining = rem_result.scalar() or 0

    return PartnerDashboardData(
        partner=PartnerPublicInfo(
            partner_slug=partner.partner_slug,
            display_name=partner.display_name,
            mission_statement=partner.mission_statement,
            branding_config=PartnerBrandingConfig(**partner.branding_config),
            landing_config=PartnerLandingConfig(**partner.landing_config),
            codes_remaining=codes_remaining,
            is_active=partner.status == PartnerStatus.ACTIVE
        ),
        metrics=PartnerMetricsSummary(
            codes_distributed=codes_distributed,
            codes_activated=codes_activated,
            activation_rate=round(activation_rate, 1),
            active_users=len(user_ids),
            messages_sent=total_messages,
            aria_interventions=aria_interventions,
            schedules_created=schedules_created
        ),
        active_users=[], # Hide for public view
        grant_codes=[], # Hide for public view
        period_start=period_start,
        period_end=period_end
    )


# ============================================================================
# Protected Endpoints (Partner Staff Auth)
# ============================================================================

async def get_partner_staff_access(
    partner_slug: str,
    current_user: User,
    db: AsyncSession
) -> PartnerStaff:
    """
    Verify user has staff access to partner and return staff record.
    Raises 403 if not authorized.
    """
    result = await db.execute(
        select(PartnerStaff).options(
            selectinload(PartnerStaff.partner)
        ).join(Partner).where(
            Partner.partner_slug == partner_slug.lower(),
            PartnerStaff.user_id == current_user.id
        )
    )
    staff = result.scalar_one_or_none()
    
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this partner dashboard"
        )
    
    return staff


@router.get("/{partner_slug}/dashboard", response_model=PartnerDashboardData)
async def get_partner_dashboard(
    partner_slug: str,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get partner dashboard data (protected).
    
    Returns anonymized metrics for the partner's grant code users.
    Partner staff only - enforced via partner_staff table.
    """
    staff = await get_partner_staff_access(partner_slug, current_user, db)
    partner = staff.partner
    
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(days=days)
    
    # ==========================================
    # 1. Historical Metrics Cache Check
    # ==========================================
    # Check if we have pre-calculated metrics for this period type
    # (assuming days corresponds to a period_type like 'weekly' or 'monthly')
    period_type = None
    if days == 30:
        period_type = "monthly"
    elif days == 7:
        period_type = "weekly"
    elif days == 90:
        period_type = "quarterly"

    # Only attempt to load cached metrics if it's a standard period and not today
    cached_metric = None
    if period_type:
        # Approximate: Look for a metric calculated near period_end
        result = await db.execute(
            select(PartnerMetric).where(
                PartnerMetric.partner_id == partner.id,
                PartnerMetric.period_type == period_type
            ).order_by(PartnerMetric.period_end.desc()).limit(1)
        )
        cached_metric = result.scalar_one_or_none()
        
        # If we have a cached metric and it's fresh enough (e.g., within the last 24 hours), use its values
        if cached_metric and cached_metric.calculated_at > (datetime.utcnow() - timedelta(hours=24)):
            metrics_summary = PartnerMetricsSummary(
                codes_distributed=cached_metric.codes_distributed,
                codes_activated=cached_metric.codes_activated,
                activation_rate=float(cached_metric.activation_rate) if cached_metric.activation_rate else 0.0,
                active_users=cached_metric.active_users,
                messages_sent=cached_metric.messages_sent,
                aria_interventions=cached_metric.aria_interventions,
                schedules_created=cached_metric.schedules_created,
                conflict_reduction_pct=float(cached_metric.conflict_reduction_pct) if cached_metric.conflict_reduction_pct else None
            )
        else:
            cached_metric = None

    # Get all grant codes for this partner
    codes_result = await db.execute(
        select(GrantCode).where(
            GrantCode.partner_id == partner.id
        )
    )
    grant_codes = codes_result.scalars().all()
    
    # Get anonymized user data from redemptions
    redemptions_result = await db.execute(
        select(GrantRedemption).options(
            selectinload(GrantRedemption.user),
            selectinload(GrantRedemption.grant_code)
        ).join(GrantCode).where(
            GrantCode.partner_id == partner.id,
            GrantRedemption.is_active == True
        )
    )
    redemptions = redemptions_result.scalars().all()
    
    active_users = []
    user_ids = []
    
    # Always process active users list for the dashboard table
    for redemption in redemptions:
        user_ids.append(redemption.user_id)
        
        # Get or create anonymous ID
        anon_result = await db.execute(
            select(UserAnonymizationMap).where(
                UserAnonymizationMap.real_user_id == redemption.user_id,
                UserAnonymizationMap.partner_id == partner.id
            )
        )
        anon_map = anon_result.scalar_one_or_none()
        
        if not anon_map:
            # Generate new anonymous ID
            prefix = partner.code_prefix[:2].upper() if partner.code_prefix else partner.partner_slug[:2].upper()
            anon_id = f"User-{prefix}{secrets.token_hex(2).upper()}"
            anon_map = UserAnonymizationMap(
                real_user_id=redemption.user_id,
                anonymous_user_id=anon_id,
                partner_id=partner.id
            )
            db.add(anon_map)
            await db.flush()
        
        # Get message count for this user (Always needed for the table)
        msg_result = await db.execute(
            select(func.count(Message.id)).where(
                Message.sender_id == redemption.user_id
            )
        )
        msg_count = msg_result.scalar() or 0
        
        active_users.append(AnonymousUserInfo(
            anonymous_user_id=anon_map.anonymous_user_id,
            activated_at=redemption.granted_at,
            last_active=redemption.user.last_active if redemption.user else None,
            message_count=msg_count,
            is_active=redemption.is_active
        ))
    
    # ==========================================
    # 2. Real-time Calculation (if no cache)
    # ==========================================
    if not cached_metric:
        codes_distributed = len(grant_codes)
        codes_activated = sum(1 for c in grant_codes if c.redemption_count > 0)
        activation_rate = (codes_activated / codes_distributed * 100) if codes_distributed > 0 else 0
        
        # Aggregate metrics
        total_messages = 0
        aria_interventions = 0
        if user_ids:
            msg_result = await db.execute(
                select(func.count(Message.id)).where(
                    Message.sender_id.in_(user_ids),
                    Message.created_at >= period_start
                )
            )
            total_messages = msg_result.scalar() or 0
            
            # Count ALL ARIA interventions (flags) regardless of user action
            aria_result = await db.execute(
                select(func.count(MessageFlag.id))
                .join(Message, MessageFlag.message_id == Message.id)
                .where(
                    Message.sender_id.in_(user_ids),
                    MessageFlag.created_at >= period_start
                )
            )
            aria_interventions = aria_result.scalar() or 0
            
            # ALSO count blocked interventions from aria_events table (raw SQL since no model)
            if user_ids:
                try:
                    blocked_stmt = text("SELECT COUNT(*) FROM aria_events WHERE user_id IN :user_ids AND created_at >= :period_start")
                    blocked_stmt = blocked_stmt.bindparams(bindparam("user_ids", expanding=True))
                    
                    blocked_result = await db.execute(
                        blocked_stmt,
                        {"user_ids": list(user_ids), "period_start": period_start}
                    )
                    blocked_count = blocked_result.scalar() or 0
                    
                    aria_interventions += blocked_count
                except Exception as e:
                    logger.error(f"Failed to query blocked interventions from aria_events: {e}")
                    pass
        
        # Get schedule count
        schedules_created = 0
        if user_ids:
            sched_result = await db.execute(
                select(func.count(ScheduleEvent.id)).where(
                    ScheduleEvent.creator_id.in_(user_ids),
                    ScheduleEvent.created_at >= period_start
                )
            )
            schedules_created = sched_result.scalar() or 0
            
        metrics_summary = PartnerMetricsSummary(
            codes_distributed=codes_distributed,
            codes_activated=codes_activated,
            activation_rate=round(activation_rate, 1),
            active_users=len(active_users),
            messages_sent=total_messages,
            aria_interventions=aria_interventions,
            schedules_created=schedules_created
        )
    
    await db.commit()
    
    # Build grant code status list
    code_statuses = []
    for code in grant_codes:
        # Find redemption if any
        redemption = next((r for r in redemptions if r.grant_code_id == code.id), None)
        anon_id = None
        if redemption:
            anon_result = await db.execute(
                select(UserAnonymizationMap).where(
                    UserAnonymizationMap.real_user_id == redemption.user_id,
                    UserAnonymizationMap.partner_id == partner.id
                )
            )
            anon_map = anon_result.scalar_one_or_none()
            if anon_map:
                anon_id = anon_map.anonymous_user_id
        
        code_statuses.append(GrantCodeStatus(
            code=code.code,
            is_activated=code.redemption_count > 0,
            distributed_date=code.created_at,
            activated_date=redemption.granted_at if redemption else None,
            anonymous_user_id=anon_id
        ))
    
    return PartnerDashboardData(
        partner=PartnerPublicInfo(
            partner_slug=partner.partner_slug,
            display_name=partner.display_name,
            mission_statement=partner.mission_statement,
            branding_config=PartnerBrandingConfig(**partner.branding_config),
            landing_config=PartnerLandingConfig(**partner.landing_config),
            codes_remaining=codes_distributed - codes_activated,
            is_active=partner.status == PartnerStatus.ACTIVE
        ),
        metrics=PartnerMetricsSummary(
            codes_distributed=codes_distributed,
            codes_activated=codes_activated,
            activation_rate=round(activation_rate, 1),
            active_users=len(active_users),
            messages_sent=total_messages,
            aria_interventions=aria_interventions,
            schedules_created=schedules_created
        ),
        active_users=active_users,
        grant_codes=code_statuses,
        period_start=period_start,
        period_end=period_end
    )





@router.get("/{partner_slug}/staff/me", response_model=PartnerStaffInfo)
async def get_my_staff_access(
    partner_slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check current user's staff access to a partner (protected).
    """
    staff = await get_partner_staff_access(partner_slug, current_user, db)
    
    return PartnerStaffInfo(
        user_id=current_user.id,
        partner_id=staff.partner_id,
        partner_slug=staff.partner.partner_slug,
        role=staff.role,
        display_name=f"{current_user.first_name} {current_user.last_name}"
    )


# ============================================================================
# Admin Endpoints
# ============================================================================

def require_superadmin(current_user: User = Depends(get_current_user)):
    """
    Temporary check for superadmin access.
    In the future, this should use a robust RBAC system.
    """
    # For MVP, restrict to known admin domains or emails
    allowed_domains = ["@commonground.family", "@carestack.us"]
    allowed_emails = ["thomas@carestack.us", "founders@commonground.family"]
    
    is_allowed = False
    if current_user.email in allowed_emails:
        is_allowed = True
    else:
        for domain in allowed_domains:
            if current_user.email.endswith(domain):
                is_allowed = True
                break
                
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )
    return current_user


@router.post("/", response_model=PartnerCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_partner(
    request: PartnerCreateRequest,
    admin_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new partner organization (Admin only).
    """
    # Check if slug exists
    result = await db.execute(select(Partner).where(Partner.partner_slug == request.partner_slug.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Partner with slug '{request.partner_slug}' already exists."
        )

    partner = Partner(
        partner_slug=request.partner_slug.lower(),
        legal_name=request.legal_name,
        display_name=request.display_name,
        ein=request.ein,
        mission_statement=request.mission_statement,
        primary_contact_name=request.primary_contact_name,
        primary_contact_email=request.primary_contact_email,
        primary_contact_phone=request.primary_contact_phone,
        branding_config=request.branding_config.model_dump() if request.branding_config else {},
        landing_config=request.landing_config.model_dump() if request.landing_config else {},
        code_prefix=request.code_prefix,
        codes_allocated=request.codes_allocated,
        status=PartnerStatus.ACTIVE,
        activation_date=datetime.utcnow(),
    )
    db.add(partner)
    await db.flush()

    # Generate initial codes if requested
    if request.codes_allocated > 0:
        prefix = partner.code_prefix.upper() if partner.code_prefix else partner.partner_slug[:3].upper()
        for _ in range(request.codes_allocated):
            random_part = secrets.token_hex(4).upper()
            code_string = f"{prefix}-{random_part[:4]}-{random_part[4:]}"
            
            grant_code = GrantCode(
                code=code_string,
                partner_id=partner.id,
                nonprofit_name=partner.display_name,
                granted_plan_code="family_plus",  # Defaulting to highest tier for MVP
                is_active=True,
                valid_from=datetime.utcnow(),
                grant_duration_days=365,  # 1 year by default
                max_redemptions=1,
                redemption_count=0
            )
            db.add(grant_code)

    await db.commit()
    await db.refresh(partner)

    return PartnerCreateResponse(
        id=partner.id,
        partner_slug=partner.partner_slug,
        display_name=partner.display_name,
        codes_allocated=partner.codes_allocated,
        status=partner.status
    )


@router.post("/{partner_slug}/generate-codes", response_model=list[str])
async def generate_partner_codes(
    partner_slug: str,
    request: GenerateCodesRequest,
    admin_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate grant codes for a partner (Admin only).
    """
    result = await db.execute(select(Partner).where(Partner.partner_slug == partner_slug.lower()))
    partner = result.scalar_one_or_none()
    
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner not found"
        )

    prefix = partner.code_prefix.upper() if partner.code_prefix else partner.partner_slug[:3].upper()
    generated_codes = []
    
    for _ in range(request.count):
        random_part = secrets.token_hex(4).upper()
        code_string = f"{prefix}-{random_part[:4]}-{random_part[4:]}"
        
        grant_code = GrantCode(
            code=code_string,
            partner_id=partner.id,
            nonprofit_name=partner.display_name,
            granted_plan_code=request.tier,
            is_active=True,
            valid_from=datetime.utcnow(),
            grant_duration_days=request.duration_days,
            max_redemptions=1,
            redemption_count=0
        )
        db.add(grant_code)
        generated_codes.append(code_string)

    partner.codes_allocated += request.count
    await db.commit()

    return generated_codes

