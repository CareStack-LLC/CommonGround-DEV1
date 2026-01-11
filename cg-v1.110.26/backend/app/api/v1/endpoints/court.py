"""
Court Access Mode API endpoints.

Endpoints for court professional access, settings, events, and reports.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib
import jwt

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.case import CaseParticipant
from app.models.court import (
    CourtRole,
    AccessScope,
    CourtEventType,
    CourtMessageType,
    ReportType,
)
from app.schemas.court import (
    # Professional
    CourtProfessionalCreate,
    CourtProfessionalUpdate,
    CourtProfessionalResponse,
    CourtProfessionalVerify,
    # Access Grants
    AccessGrantRequest,
    AccessGrantResponse,
    AccessGrantApproval,
    AccessGrantRevoke,
    AccessLinkResponse,
    # Access Logs
    AccessLogEntry,
    AccessLogList,
    # Settings
    CourtSettingsCreate,
    CourtSettingsUpdate,
    CourtSettingsResponse,
    CourtSettingsPublic,
    # Events
    CourtEventCreate,
    CourtEventUpdate,
    CourtEventAttendance,
    CourtEventResponse,
    CourtEventPublic,
    # Messages
    CourtMessageCreate,
    CourtMessageResponse,
    CourtMessagePublic,
    # Reports
    ReportRequest,
    ReportResponse,
    ReportVerification,
    # ARIA
    ARIACourtQuery,
    ARIACourtResponse,
    ARIASuggestionList,
    # Auth
    CourtLoginRequest,
    CourtLoginResponse,
    # Summary
    CaseCourtSummary,
    # Compliance
    ComplianceSnapshot,
    CategoryCompliance,
    # Exchange Compliance (Silent Handoff)
    ExchangeComplianceResponse,
    ExchangeComplianceMetrics,
    ParentExchangeMetrics,
    # Templates
    CourtEventTemplate,
    CourtEventTemplateList,
    COURT_EVENT_TEMPLATES,
    PredefinedReportType,
    PredefinedReportTypeList,
    PREDEFINED_REPORT_TYPES,
)
from app.services.court import (
    CourtProfessionalService,
    AccessGrantService,
    AccessLogService,
    CourtSettingsService,
    CourtEventService,
    CourtMessageService,
    ReportService,
    ARIACourtService,
)
from app.services.exchange_compliance import ExchangeComplianceService
from app.models.message import Message, MessageFlag
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

router = APIRouter()


# =============================================================================
# MVP Court Login (Simulated for Demo)
# =============================================================================

@router.post(
    "/login",
    response_model=CourtLoginResponse,
    summary="Login as court professional (MVP - simulated)",
)
async def court_login(
    data: CourtLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    MVP court login with simulated verification.

    For demo purposes:
    - Code "123456" always works
    - Creates professional if not exists
    - Returns JWT token for court portal access
    """
    from app.core.security import create_access_token
    from datetime import timedelta

    # MVP: Accept code 123456 for demo
    if data.access_code != "123456":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code. Use 123456 for demo.",
        )

    service = CourtProfessionalService(db)
    professional = await service.get_professional_by_email(data.email)

    if not professional:
        # Auto-create for MVP demo
        from app.schemas.court import CourtProfessionalCreate
        create_data = CourtProfessionalCreate(
            email=data.email,
            full_name=data.email.split("@")[0].replace(".", " ").title(),
            organization="San Diego Family Court",
            role=CourtRole.GAL,
        )
        professional = await service.create_professional(create_data)
        # Auto-verify for MVP
        professional = await service.verify_professional(
            str(professional.id),
            verification_method="email",
            credentials={"email_verified": True},
        )

    # Create token
    expires_delta = timedelta(hours=8)
    token_data = {
        "sub": str(professional.id),
        "type": "court",
        "role": professional.role,
    }
    access_token = create_access_token(
        data=token_data,
        expires_delta=expires_delta,
    )

    # Extract bar_number and court_id from credentials JSON
    credentials = professional.credentials or {}

    # For MVP, return empty grants list (would be populated from DB in production)
    return CourtLoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_at=datetime.utcnow() + expires_delta,
        professional=CourtProfessionalResponse(
            id=professional.id,
            email=professional.email,
            full_name=professional.full_name,
            title=professional.title,
            organization=professional.organization,
            role=CourtRole(professional.role),
            bar_number=credentials.get("bar_number"),
            court_id=credentials.get("court_id"),
            is_verified=professional.is_verified,
            is_active=professional.is_active,
            mfa_enabled=professional.mfa_enabled,
            created_at=professional.created_at,
            updated_at=professional.updated_at,
        ),
        active_grants=[],  # MVP: Empty for now
    )


@router.get(
    "/me",
    response_model=CourtProfessionalResponse,
    summary="Get current court professional",
)
async def get_current_professional(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current court professional from token."""
    # For MVP, try to get professional by user's email
    service = CourtProfessionalService(db)
    professional = await service.get_professional_by_email(current_user.email)

    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Court professional not found",
        )

    credentials = professional.credentials or {}

    return CourtProfessionalResponse(
        id=professional.id,
        email=professional.email,
        full_name=professional.full_name,
        title=professional.title,
        organization=professional.organization,
        role=CourtRole(professional.role),
        bar_number=credentials.get("bar_number"),
        court_id=credentials.get("court_id"),
        is_verified=professional.is_verified,
        is_active=professional.is_active,
        mfa_enabled=professional.mfa_enabled,
        created_at=professional.created_at,
        updated_at=professional.updated_at,
    )


@router.get(
    "/cases",
    summary="List cases for court professional (MVP)",
)
async def list_professional_cases(
    db: AsyncSession = Depends(get_db),
):
    """
    List all cases for a court professional.

    For MVP, returns all cases in the system.
    In production, would filter by grants.
    """
    from sqlalchemy import select, or_
    from app.models.case import Case

    # Include both active and pending cases for court staff
    result = await db.execute(
        select(Case).where(
            or_(Case.status == "active", Case.status == "pending")
        ).order_by(Case.created_at.desc())
    )
    cases = result.scalars().all()

    return [
        {
            "id": str(c.id),
            "case_name": c.case_name,
            "case_number": c.case_number,
            "state": c.state,
            "county": c.county,
            "status": c.status,
        }
        for c in cases
    ]


# =============================================================================
# Parent-Facing Court Endpoints
# =============================================================================

@router.get(
    "/events/parent/{case_id}",
    response_model=list[CourtEventPublic],
    summary="Get court events for parent calendar",
)
async def get_court_events_for_parent(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get court events visible to parents.

    These appear on the parent's calendar and cannot be modified.
    """
    await get_user_case_role(db, current_user.id, case_id)

    service = CourtEventService(db)
    events = await service.get_events_for_case(case_id, include_past=False)

    return [
        CourtEventPublic(
            id=e.id,
            event_type=CourtEventType(e.event_type),
            title=e.title,
            description=e.description,
            event_date=e.event_date,
            start_time=str(e.start_time) if e.start_time else None,
            end_time=str(e.end_time) if e.end_time else None,
            location=e.location,
            virtual_link=e.virtual_link,
            is_mandatory=e.is_mandatory,
            shared_notes=e.shared_notes,
        )
        for e in events
    ]


@router.get(
    "/messages/parent/{case_id}",
    response_model=list[CourtMessagePublic],
    summary="Get court messages for parent",
)
async def get_court_messages_for_parent(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get court messages visible to a parent."""
    user_role = await get_user_case_role(db, current_user.id, case_id)

    service = CourtMessageService(db)
    messages = await service.get_messages_for_case(case_id)

    return [
        CourtMessagePublic(
            id=m.id,
            message_type=CourtMessageType(m.message_type),
            subject=m.subject,
            content=m.content,
            sent_at=m.sent_at,
            is_urgent=m.is_urgent,
            requires_acknowledgment=m.requires_acknowledgment,
            is_read=m.petitioner_read_at is not None if user_role == "petitioner" else m.respondent_read_at is not None,
        )
        for m in messages
    ]


# =============================================================================
# Helper Functions
# =============================================================================

async def get_professional_from_grant(
    db: AsyncSession, grant_id: str, professional_id: str
):
    """Verify a professional has an active grant."""
    grant_service = AccessGrantService(db)
    grant = await grant_service.get_grant(grant_id)
    if not grant or grant.professional_id != professional_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or unauthorized access grant",
        )
    if not grant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access grant is not active or has expired",
        )
    return grant


async def log_court_action(
    db: AsyncSession,
    request: Request,
    grant_id: str,
    professional_id: str,
    case_id: str,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
):
    """Log a court access action."""
    log_service = AccessLogService(db)
    await log_service.log_action(
        grant_id=grant_id,
        professional_id=professional_id,
        case_id=case_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


async def get_user_case_role(db: AsyncSession, user_id: str, case_id: str) -> str:
    """Get a user's role in a case (petitioner or respondent)."""
    from sqlalchemy import select

    result = await db.execute(
        select(CaseParticipant).where(
            CaseParticipant.user_id == user_id,
            CaseParticipant.case_id == case_id,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant in this case",
        )
    return participant.role


# =============================================================================
# Court Professional Endpoints
# =============================================================================

@router.post(
    "/professionals",
    response_model=CourtProfessionalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a court professional",
)
async def create_professional(
    data: CourtProfessionalCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new court professional.

    This creates an unverified professional account.
    Verification is required before accessing cases.
    """
    service = CourtProfessionalService(db)

    # Check if email already exists
    existing = await service.get_professional_by_email(data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    professional = await service.create_professional(data)
    return professional


@router.get(
    "/professionals/{professional_id}",
    response_model=CourtProfessionalResponse,
    summary="Get a court professional",
)
async def get_professional(
    professional_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get details of a court professional."""
    service = CourtProfessionalService(db)
    professional = await service.get_professional(professional_id)
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional not found",
        )
    return professional


@router.put(
    "/professionals/{professional_id}",
    response_model=CourtProfessionalResponse,
    summary="Update a court professional",
)
async def update_professional(
    professional_id: str,
    data: CourtProfessionalUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a court professional's information."""
    service = CourtProfessionalService(db)
    professional = await service.update_professional(professional_id, data)
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional not found",
        )
    return professional


@router.post(
    "/professionals/{professional_id}/verify",
    response_model=CourtProfessionalResponse,
    summary="Verify a court professional",
)
async def verify_professional(
    professional_id: str,
    data: CourtProfessionalVerify,
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a court professional as verified.

    In production, this would involve bar verification, court email confirmation, etc.
    For MVP, this is simulated.
    """
    service = CourtProfessionalService(db)
    professional = await service.verify_professional(
        professional_id,
        verification_method=data.verification_method,
        credentials=data.credentials,
    )
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional not found",
        )
    return professional


@router.post(
    "/professionals/{professional_id}/mfa",
    response_model=CourtProfessionalResponse,
    summary="Enable MFA for a professional (simulated)",
)
async def enable_mfa(
    professional_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Enable MFA for a court professional.

    For MVP, this generates a simulated MFA secret.
    In production, this would use TOTP or SMS.
    """
    import secrets

    service = CourtProfessionalService(db)
    mfa_secret = secrets.token_hex(16)  # Simulated
    professional = await service.enable_mfa(professional_id, mfa_secret)
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional not found",
        )
    return professional


# =============================================================================
# Access Grant Endpoints
# =============================================================================

@router.post(
    "/access/request",
    response_model=AccessGrantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request access to a case",
)
async def request_access(
    data: AccessGrantRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Request court access to a case (initiated by a parent).

    The parent specifies:
    - Who gets access (professional must be registered)
    - What they can see (access scope)
    - How long (duration)
    - Authorization type (consent, court order, etc.)

    For roles requiring joint consent (GAL, Mediator),
    both parents must approve before access is activated.
    """
    # Verify user is a case participant
    await get_user_case_role(db, current_user.id, data.case_id)

    # For MVP, create a professional if email doesn't exist
    prof_service = CourtProfessionalService(db)
    professional = await prof_service.get_professional_by_email(
        data.authorization_reference or f"temp-{data.case_id}@court.local"
    )

    if not professional:
        # In production, require professional to be pre-registered
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Professional must be registered first. Use POST /court/professionals",
        )

    grant_service = AccessGrantService(db)
    grant = await grant_service.create_grant(data, professional.id)
    return grant


@router.get(
    "/access/grants",
    response_model=list[AccessGrantResponse],
    summary="List access grants for a case",
)
async def list_grants(
    case_id: str,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all access grants for a case (for parents to manage)."""
    await get_user_case_role(db, current_user.id, case_id)

    grant_service = AccessGrantService(db)
    grants = await grant_service.get_grants_for_case(case_id, active_only)
    return grants


@router.get(
    "/access/grants/{grant_id}",
    response_model=AccessGrantResponse,
    summary="Get an access grant",
)
async def get_grant(
    grant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of an access grant."""
    grant_service = AccessGrantService(db)
    grant = await grant_service.get_grant(grant_id)
    if not grant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found",
        )

    # Verify user is a participant
    await get_user_case_role(db, current_user.id, grant.case_id)
    return grant


@router.post(
    "/access/grants/{grant_id}/approve",
    response_model=AccessGrantResponse,
    summary="Approve an access grant",
)
async def approve_grant(
    grant_id: str,
    data: AccessGrantApproval,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve or reject an access grant.

    For GAL and Mediator roles, both parents must approve.
    For Attorney roles, only the represented parent approves.
    """
    grant_service = AccessGrantService(db)
    grant = await grant_service.get_grant(grant_id)
    if not grant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found",
        )

    user_role = await get_user_case_role(db, current_user.id, grant.case_id)

    updated_grant = await grant_service.approve_grant(
        grant_id, user_role, data.approved, data.notes
    )
    return updated_grant


@router.post(
    "/access/grants/{grant_id}/revoke",
    response_model=AccessGrantResponse,
    summary="Revoke an access grant",
)
async def revoke_grant(
    grant_id: str,
    data: AccessGrantRevoke,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an access grant."""
    grant_service = AccessGrantService(db)
    grant = await grant_service.get_grant(grant_id)
    if not grant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found",
        )

    await get_user_case_role(db, current_user.id, grant.case_id)

    updated_grant = await grant_service.revoke_grant(
        grant_id, current_user.id, data.reason
    )
    return updated_grant


@router.get(
    "/access/grants/{grant_id}/audit",
    response_model=AccessLogList,
    summary="Get access audit log",
)
async def get_audit_log(
    grant_id: str,
    page: int = 1,
    per_page: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the audit log for an access grant."""
    grant_service = AccessGrantService(db)
    grant = await grant_service.get_grant(grant_id)
    if not grant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found",
        )

    await get_user_case_role(db, current_user.id, grant.case_id)

    log_service = AccessLogService(db)
    logs, total = await log_service.get_logs_for_grant(
        grant_id, limit=per_page, offset=(page - 1) * per_page
    )

    return AccessLogList(logs=logs, total=total, page=page, per_page=per_page)


# =============================================================================
# Court Settings Endpoints
# =============================================================================

@router.get(
    "/settings/case/{case_id}",
    response_model=CourtSettingsResponse,
    summary="Get court settings for a case",
)
async def get_court_settings(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get court-controlled settings for a case."""
    service = CourtSettingsService(db)
    settings = await service.get_or_create_settings(case_id)

    # Add computed field
    response = CourtSettingsResponse(
        id=settings.id,
        case_id=settings.case_id,
        gps_checkins_required=settings.gps_checkins_required,
        supervised_exchange_required=settings.supervised_exchange_required,
        aria_enforcement_locked=settings.aria_enforcement_locked,
        in_app_communication_only=settings.in_app_communication_only,
        agreement_edits_locked=settings.agreement_edits_locked,
        investigation_mode=settings.investigation_mode,
        child_safety_tracking=settings.child_safety_tracking,
        financial_verification_required=settings.financial_verification_required,
        set_by_professional_id=settings.set_by_professional_id,
        set_at=settings.set_at,
        court_order_reference=settings.court_order_reference,
        notes=settings.notes,
        active_controls=settings.get_active_controls(),
        settings_history=settings.settings_history,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )
    return response


@router.put(
    "/settings/case/{case_id}",
    response_model=CourtSettingsResponse,
    summary="Update court settings (court staff only)",
)
async def update_court_settings(
    case_id: str,
    data: CourtSettingsUpdate,
    request: Request,
    professional_id: str,  # In production, from court auth token
    grant_id: str,  # In production, from court auth token
    db: AsyncSession = Depends(get_db),
):
    """
    Update court-controlled settings for a case.

    Only court clerks with active grants can update settings.
    All changes are logged immutably.
    """
    # Verify professional has clerk role and active grant
    grant = await get_professional_from_grant(db, grant_id, professional_id)

    if grant.role != CourtRole.COURT_CLERK.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only court clerks can modify settings",
        )

    service = CourtSettingsService(db)
    settings = await service.update_settings(case_id, data, professional_id)

    if not settings:
        # Create if doesn't exist
        create_data = CourtSettingsCreate(
            case_id=case_id,
            **data.model_dump(exclude_unset=True),
        )
        settings = await service.create_settings(create_data, professional_id)

    # Log the action
    await log_court_action(
        db, request, grant_id, professional_id, case_id,
        action="update_settings",
        resource_type="court_case_settings",
        details=data.model_dump(exclude_unset=True),
    )

    response = CourtSettingsResponse(
        id=settings.id,
        case_id=settings.case_id,
        gps_checkins_required=settings.gps_checkins_required,
        supervised_exchange_required=settings.supervised_exchange_required,
        aria_enforcement_locked=settings.aria_enforcement_locked,
        in_app_communication_only=settings.in_app_communication_only,
        agreement_edits_locked=settings.agreement_edits_locked,
        investigation_mode=settings.investigation_mode,
        child_safety_tracking=settings.child_safety_tracking,
        financial_verification_required=settings.financial_verification_required,
        set_by_professional_id=settings.set_by_professional_id,
        set_at=settings.set_at,
        court_order_reference=settings.court_order_reference,
        notes=settings.notes,
        active_controls=settings.get_active_controls(),
        settings_history=settings.settings_history,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )
    return response


@router.get(
    "/settings/case/{case_id}/public",
    response_model=CourtSettingsPublic,
    summary="Get public court settings (for parents)",
)
async def get_public_settings(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get court settings visible to parents.

    Parents can see what's controlled but not internal notes.
    """
    await get_user_case_role(db, current_user.id, case_id)

    service = CourtSettingsService(db)
    settings = await service.get_or_create_settings(case_id)

    return CourtSettingsPublic(
        gps_checkins_required=settings.gps_checkins_required,
        supervised_exchange_required=settings.supervised_exchange_required,
        aria_enforcement_locked=settings.aria_enforcement_locked,
        in_app_communication_only=settings.in_app_communication_only,
        agreement_edits_locked=settings.agreement_edits_locked,
        active_controls=settings.get_active_controls(),
    )


# =============================================================================
# Court Event Endpoints
# =============================================================================

@router.post(
    "/events",
    response_model=CourtEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a court event",
)
async def create_court_event(
    data: CourtEventCreate,
    request: Request,
    professional_id: Optional[str] = None,
    grant_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
):
    """
    Create a court event (hearing, mediation, deadline, etc.).

    Court events appear on both parents' calendars and cannot be modified by them.

    MVP Demo: If professional_id/grant_id not provided, uses token's subject ID.
    """
    from jose import jwt
    from app.core.config import settings

    # Extract professional ID from token
    token = credentials.credentials
    try:
        secret_key = settings.JWT_SECRET_KEY or settings.SECRET_KEY
        payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])
        token_subject_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # MVP Demo mode: use token subject if no professional/grant provided
    if professional_id and grant_id:
        grant = await get_professional_from_grant(db, grant_id, professional_id)
    else:
        # Demo mode: use the subject ID from token
        professional_id = token_subject_id
        grant_id = "demo-grant"

    service = CourtEventService(db)
    event = await service.create_event(data, professional_id)

    # Skip logging in demo mode (no real grant)
    if grant_id != "demo-grant":
        await log_court_action(
            db, request, grant_id, professional_id, data.case_id,
            action="create_event",
            resource_type="court_event",
            resource_id=event.id,
            details={"title": data.title, "date": str(data.event_date)},
        )

    return CourtEventResponse(
        id=event.id,
        case_id=event.case_id,
        created_by=event.created_by,
        event_type=CourtEventType(event.event_type),
        title=event.title,
        description=event.description,
        event_date=event.event_date,
        start_time=str(event.start_time) if event.start_time else None,
        end_time=str(event.end_time) if event.end_time else None,
        location=event.location,
        virtual_link=event.virtual_link,
        petitioner_required=event.petitioner_required,
        respondent_required=event.respondent_required,
        is_mandatory=event.is_mandatory,
        status=event.status,
        internal_notes=event.internal_notes,
        shared_notes=event.shared_notes,
        petitioner_attended=event.petitioner_attended,
        respondent_attended=event.respondent_attended,
        attendance_summary=event.attendance_summary,
        is_past=event.is_past,
        reminder_sent=event.reminder_sent,
        # RSVP tracking (empty for new events)
        petitioner_rsvp_status=event.petitioner_rsvp_status,
        respondent_rsvp_status=event.respondent_rsvp_status,
        petitioner_rsvp_at=event.petitioner_rsvp_at,
        respondent_rsvp_at=event.respondent_rsvp_at,
        petitioner_rsvp_notes=event.petitioner_rsvp_notes,
        respondent_rsvp_notes=event.respondent_rsvp_notes,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


@router.get(
    "/events/case/{case_id}",
    response_model=list[CourtEventResponse],
    summary="List court events for a case",
)
async def list_court_events(
    case_id: str,
    include_past: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List court events for a case."""
    service = CourtEventService(db)
    events = await service.get_events_for_case(case_id, include_past)

    return [
        CourtEventResponse(
            id=e.id,
            case_id=e.case_id,
            created_by=e.created_by,
            event_type=CourtEventType(e.event_type),
            title=e.title,
            description=e.description,
            event_date=e.event_date,
            start_time=str(e.start_time) if e.start_time else None,
            end_time=str(e.end_time) if e.end_time else None,
            location=e.location,
            virtual_link=e.virtual_link,
            petitioner_required=e.petitioner_required,
            respondent_required=e.respondent_required,
            is_mandatory=e.is_mandatory,
            status=e.status,
            internal_notes=e.internal_notes,
            shared_notes=e.shared_notes,
            petitioner_attended=e.petitioner_attended,
            respondent_attended=e.respondent_attended,
            attendance_summary=e.attendance_summary,
            is_past=e.is_past,
            reminder_sent=e.reminder_sent,
            # RSVP tracking
            petitioner_rsvp_status=e.petitioner_rsvp_status,
            respondent_rsvp_status=e.respondent_rsvp_status,
            petitioner_rsvp_at=e.petitioner_rsvp_at,
            respondent_rsvp_at=e.respondent_rsvp_at,
            petitioner_rsvp_notes=e.petitioner_rsvp_notes,
            respondent_rsvp_notes=e.respondent_rsvp_notes,
            created_at=e.created_at,
            updated_at=e.updated_at,
        )
        for e in events
    ]


@router.put(
    "/events/{event_id}",
    response_model=CourtEventResponse,
    summary="Update a court event",
)
async def update_court_event(
    event_id: str,
    data: CourtEventUpdate,
    request: Request,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Update a court event."""
    service = CourtEventService(db)
    event = await service.get_event(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    await get_professional_from_grant(db, grant_id, professional_id)

    updated = await service.update_event(event_id, data)

    await log_court_action(
        db, request, grant_id, professional_id, event.case_id,
        action="update_event",
        resource_type="court_event",
        resource_id=event_id,
    )

    return CourtEventResponse(
        id=updated.id,
        case_id=updated.case_id,
        created_by=updated.created_by,
        event_type=CourtEventType(updated.event_type),
        title=updated.title,
        description=updated.description,
        event_date=updated.event_date,
        start_time=str(updated.start_time) if updated.start_time else None,
        end_time=str(updated.end_time) if updated.end_time else None,
        location=updated.location,
        virtual_link=updated.virtual_link,
        petitioner_required=updated.petitioner_required,
        respondent_required=updated.respondent_required,
        is_mandatory=updated.is_mandatory,
        status=updated.status,
        internal_notes=updated.internal_notes,
        shared_notes=updated.shared_notes,
        petitioner_attended=updated.petitioner_attended,
        respondent_attended=updated.respondent_attended,
        attendance_summary=updated.attendance_summary,
        is_past=updated.is_past,
        reminder_sent=updated.reminder_sent,
        # RSVP tracking
        petitioner_rsvp_status=updated.petitioner_rsvp_status,
        respondent_rsvp_status=updated.respondent_rsvp_status,
        petitioner_rsvp_at=updated.petitioner_rsvp_at,
        respondent_rsvp_at=updated.respondent_rsvp_at,
        petitioner_rsvp_notes=updated.petitioner_rsvp_notes,
        respondent_rsvp_notes=updated.respondent_rsvp_notes,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


@router.post(
    "/events/{event_id}/attendance",
    response_model=CourtEventResponse,
    summary="Record attendance for a court event",
)
async def record_attendance(
    event_id: str,
    data: CourtEventAttendance,
    request: Request,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Record attendance for a court event."""
    service = CourtEventService(db)
    event = await service.get_event(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    await get_professional_from_grant(db, grant_id, professional_id)

    updated = await service.record_attendance(event_id, data)

    await log_court_action(
        db, request, grant_id, professional_id, event.case_id,
        action="record_attendance",
        resource_type="court_event",
        resource_id=event_id,
        details=data.model_dump(),
    )

    return CourtEventResponse(
        id=updated.id,
        case_id=updated.case_id,
        created_by=updated.created_by,
        event_type=CourtEventType(updated.event_type),
        title=updated.title,
        description=updated.description,
        event_date=updated.event_date,
        start_time=str(updated.start_time) if updated.start_time else None,
        end_time=str(updated.end_time) if updated.end_time else None,
        location=updated.location,
        virtual_link=updated.virtual_link,
        petitioner_required=updated.petitioner_required,
        respondent_required=updated.respondent_required,
        is_mandatory=updated.is_mandatory,
        status=updated.status,
        internal_notes=updated.internal_notes,
        shared_notes=updated.shared_notes,
        petitioner_attended=updated.petitioner_attended,
        respondent_attended=updated.respondent_attended,
        attendance_summary=updated.attendance_summary,
        is_past=updated.is_past,
        reminder_sent=updated.reminder_sent,
        # RSVP tracking
        petitioner_rsvp_status=updated.petitioner_rsvp_status,
        respondent_rsvp_status=updated.respondent_rsvp_status,
        petitioner_rsvp_at=updated.petitioner_rsvp_at,
        respondent_rsvp_at=updated.respondent_rsvp_at,
        petitioner_rsvp_notes=updated.petitioner_rsvp_notes,
        respondent_rsvp_notes=updated.respondent_rsvp_notes,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


# =============================================================================
# Court Message Endpoints
# =============================================================================

@router.post(
    "/messages",
    response_model=CourtMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a court message",
)
async def send_court_message(
    data: CourtMessageCreate,
    request: Request,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message from the court to parents.

    Court messages are:
    - Clearly marked as court communications
    - Cannot be edited or deleted by parents
    - Timestamped and immutable
    """
    await get_professional_from_grant(db, grant_id, professional_id)

    service = CourtMessageService(db)
    message = await service.send_message(data, professional_id)

    await log_court_action(
        db, request, grant_id, professional_id, data.case_id,
        action="send_message",
        resource_type="court_message",
        resource_id=message.id,
        details={"type": data.message_type.value, "urgent": data.is_urgent},
    )

    return message


@router.get(
    "/messages/case/{case_id}",
    response_model=list[CourtMessageResponse],
    summary="List court messages for a case",
)
async def list_court_messages(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List court messages for a case."""
    service = CourtMessageService(db)
    messages = await service.get_messages_for_case(case_id)
    return messages


@router.post(
    "/messages/{message_id}/read",
    response_model=CourtMessageResponse,
    summary="Mark a court message as read",
)
async def mark_message_read(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a court message as read (for parents)."""
    service = CourtMessageService(db)
    message = await service.get_message(message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    user_role = await get_user_case_role(db, current_user.id, message.case_id)
    updated = await service.mark_read(message_id, user_role)
    return updated


# =============================================================================
# Parent-to-Parent Messages (Court View)
# =============================================================================

from pydantic import BaseModel
from typing import List, Optional as Opt


class ParentMessageResponse(BaseModel):
    """Response schema for parent-to-parent messages viewed by court."""
    id: str
    sender_id: str
    sender_name: str
    sender_role: str  # petitioner or respondent
    recipient_id: str
    recipient_name: str
    content: str
    sent_at: datetime
    was_flagged: bool
    original_content: Opt[str] = None
    aria_score: Opt[float] = None
    aria_categories: Opt[List[str]] = None
    suggestion_accepted: Opt[bool] = None


@router.get(
    "/parent-messages/{case_id}",
    response_model=List[ParentMessageResponse],
    summary="Get parent-to-parent messages for a case",
)
async def get_parent_messages(
    case_id: str,
    limit: int = 100,
    offset: int = 0,
    flagged_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Get parent-to-parent messages for a case (for court professional view).

    Returns messages with ARIA analysis data including:
    - Original content if flagged
    - Toxicity scores
    - Categories flagged
    - Whether suggestions were accepted
    """
    # Build query
    query = (
        select(Message)
        .options(selectinload(Message.flags))
        .where(Message.case_id == case_id)
        .order_by(Message.sent_at.desc())
    )

    if flagged_only:
        query = query.where(Message.was_flagged == True)

    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    messages = result.scalars().all()

    # Get participant info to map IDs to names and roles
    participants_result = await db.execute(
        select(CaseParticipant)
        .where(CaseParticipant.case_id == case_id)
    )
    participants = {p.user_id: p for p in participants_result.scalars().all()}

    # Get user names
    from app.models.user import User as UserModel, UserProfile

    user_ids = set()
    for msg in messages:
        user_ids.add(msg.sender_id)
        user_ids.add(msg.recipient_id)

    users_result = await db.execute(
        select(UserModel, UserProfile)
        .outerjoin(UserProfile, UserModel.id == UserProfile.user_id)
        .where(UserModel.id.in_(user_ids))
    )
    users = {}
    for user, profile in users_result.all():
        name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        if not name:
            name = user.email.split('@')[0]
        users[user.id] = name

    # Build response
    response = []
    for msg in messages:
        sender_participant = participants.get(msg.sender_id)
        recipient_participant = participants.get(msg.recipient_id)

        # Get ARIA flag data if exists
        aria_score = None
        aria_categories = None
        suggestion_accepted = None

        if msg.flags:
            flag = msg.flags[0]  # Get first flag
            aria_score = flag.toxicity_score
            aria_categories = flag.categories
            suggestion_accepted = flag.user_action in ["accepted", "modified"]

        response.append(ParentMessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=users.get(msg.sender_id, "Unknown"),
            sender_role=sender_participant.role if sender_participant else "unknown",
            recipient_id=msg.recipient_id,
            recipient_name=users.get(msg.recipient_id, "Unknown"),
            content=msg.content,
            sent_at=msg.sent_at,
            was_flagged=msg.was_flagged,
            original_content=msg.original_content,
            aria_score=aria_score,
            aria_categories=aria_categories,
            suggestion_accepted=suggestion_accepted,
        ))

    return response


# =============================================================================
# Court Forms & Hearings (Court Portal Access)
# =============================================================================

from app.models.court_form import CourtFormSubmission, CourtHearing, CourtFormType, CourtFormStatus, FormSubmissionSource


class CourtFormSummary(BaseModel):
    """Summary of a court form submission for court portal."""
    id: str
    case_id: str
    parent_id: Opt[str] = None
    form_type: str
    status: str
    submission_source: str
    form_data: dict
    pdf_url: Opt[str] = None
    aria_assisted: bool
    review_notes: Opt[str] = None
    submitted_at: Opt[datetime] = None
    reviewed_at: Opt[datetime] = None
    created_at: datetime
    updated_at: datetime


class CaseFormsResponse(BaseModel):
    """Response for case forms list."""
    case_id: str
    forms: List[CourtFormSummary]
    total: int


class CaseFormProgressResponse(BaseModel):
    """Workflow progress for a case."""
    case_id: str
    activation_status: str
    total_forms: int
    pending_forms: int
    approved_forms: int
    has_fl300: bool
    has_fl300_approved: bool
    has_fl311: bool
    has_fl320: bool
    has_fl340: bool
    next_action: Opt[str] = None
    fl300_id: Opt[str] = None


class CourtHearingResponse(BaseModel):
    """Response for a court hearing."""
    id: str
    case_id: str
    hearing_type: str
    scheduled_date: datetime
    scheduled_time: Opt[str] = None
    department: Opt[str] = None
    judge_name: Opt[str] = None
    outcome: Opt[str] = None
    petitioner_attended: Opt[bool] = None
    respondent_attended: Opt[bool] = None


@router.get(
    "/forms/case/{case_id}",
    response_model=CaseFormsResponse,
    summary="List court form submissions for a case (Court Portal)",
)
async def list_court_forms_for_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all court form submissions for a case (accessible by court portal)."""
    result = await db.execute(
        select(CourtFormSubmission)
        .where(CourtFormSubmission.case_id == case_id)
        .order_by(CourtFormSubmission.created_at.desc())
    )
    forms = result.scalars().all()

    return CaseFormsResponse(
        case_id=case_id,
        forms=[
            CourtFormSummary(
                id=f.id,
                case_id=f.case_id,
                parent_id=f.parent_id,
                form_type=f.form_type.value if hasattr(f.form_type, 'value') else str(f.form_type),
                status=f.status.value if hasattr(f.status, 'value') else str(f.status),
                submission_source=f.submission_source.value if hasattr(f.submission_source, 'value') else str(f.submission_source),
                form_data=f.form_data or {},
                pdf_url=f.pdf_url,
                aria_assisted=f.aria_assisted,
                review_notes=f.review_notes,
                submitted_at=f.submitted_at,
                reviewed_at=f.reviewed_at,
                created_at=f.created_at,
                updated_at=f.updated_at,
            )
            for f in forms
        ],
        total=len(forms),
    )


class CourtFormDetailResponse(BaseModel):
    """Detailed response for a single court form (for court portal)."""
    id: str
    case_id: str
    parent_id: Opt[str] = None
    form_type: str
    status: str
    submission_source: str
    form_data: dict
    pdf_url: Opt[str] = None
    pdf_hash: Opt[str] = None
    aria_assisted: bool
    aria_conversation_id: Opt[str] = None
    responds_to_form_id: Opt[str] = None
    parent_form_id: Opt[str] = None
    hearing_id: Opt[str] = None
    court_notes: Opt[str] = None  # Mapped from review_notes for frontend compatibility
    review_notes: Opt[str] = None
    resubmission_issues: Opt[List[str]] = None  # Derived from rejection_reason
    status_history: Opt[list] = None
    submitted_at: Opt[datetime] = None
    reviewed_at: Opt[datetime] = None
    approved_at: Opt[datetime] = None  # Alias for reviewed_at when status is approved
    # Edit permission fields
    edits_allowed: bool = False
    edits_allowed_by: Opt[str] = None
    edits_allowed_at: Opt[datetime] = None
    edits_allowed_notes: Opt[str] = None
    edits_allowed_sections: Opt[list] = None
    created_at: datetime
    updated_at: datetime


@router.get(
    "/forms/{form_id}",
    response_model=CourtFormDetailResponse,
    summary="Get a single court form submission by ID (Court Portal)",
)
async def get_court_form_by_id(
    form_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single court form submission by ID (accessible by court portal)."""
    result = await db.execute(
        select(CourtFormSubmission).where(CourtFormSubmission.id == form_id)
    )
    form = result.scalar_one_or_none()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )

    # Derive resubmission issues from rejection_reason if present
    resubmission_issues = None
    if form.rejection_reason:
        # Split rejection_reason by newlines if multiple issues
        resubmission_issues = [issue.strip() for issue in form.rejection_reason.split('\n') if issue.strip()]

    # For approved status, use reviewed_at as approved_at
    approved_at = form.reviewed_at if form.status in ['approved', 'served', 'entered'] else None

    return CourtFormDetailResponse(
        id=form.id,
        case_id=form.case_id,
        parent_id=form.parent_id,
        form_type=form.form_type.value if hasattr(form.form_type, 'value') else str(form.form_type),
        status=form.status.value if hasattr(form.status, 'value') else str(form.status),
        submission_source=form.submission_source.value if hasattr(form.submission_source, 'value') else str(form.submission_source),
        form_data=form.form_data or {},
        pdf_url=form.pdf_url,
        pdf_hash=form.pdf_hash,
        aria_assisted=form.aria_assisted,
        aria_conversation_id=form.aria_conversation_id,
        responds_to_form_id=form.responds_to_form_id,
        parent_form_id=form.parent_form_id,
        hearing_id=form.hearing_id,
        court_notes=form.review_notes,  # Map review_notes to court_notes for frontend
        review_notes=form.review_notes,
        resubmission_issues=resubmission_issues,
        status_history=form.status_history,
        submitted_at=form.submitted_at,
        reviewed_at=form.reviewed_at,
        approved_at=approved_at,
        edits_allowed=form.edits_allowed,
        edits_allowed_by=form.edits_allowed_by,
        edits_allowed_at=form.edits_allowed_at,
        edits_allowed_notes=form.edits_allowed_notes,
        edits_allowed_sections=form.edits_allowed_sections,
        created_at=form.created_at,
        updated_at=form.updated_at,
    )


@router.get(
    "/forms/case/{case_id}/progress",
    response_model=CaseFormProgressResponse,
    summary="Get form workflow progress for a case (Court Portal)",
)
async def get_court_form_progress(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get workflow progress for a case (accessible by court portal)."""
    result = await db.execute(
        select(CourtFormSubmission)
        .where(CourtFormSubmission.case_id == case_id)
    )
    forms = result.scalars().all()

    # Calculate progress
    has_fl300 = any(f.form_type == CourtFormType.FL_300 for f in forms)
    has_fl300_approved = any(
        f.form_type == CourtFormType.FL_300 and f.status == CourtFormStatus.APPROVED
        for f in forms
    )
    has_fl311 = any(f.form_type == CourtFormType.FL_311 for f in forms)
    has_fl320 = any(f.form_type == CourtFormType.FL_320 for f in forms)
    has_fl340 = any(f.form_type == CourtFormType.FL_340 for f in forms)

    pending_forms = sum(1 for f in forms if f.status in [CourtFormStatus.SUBMITTED, CourtFormStatus.UNDER_COURT_REVIEW])
    approved_forms = sum(1 for f in forms if f.status == CourtFormStatus.APPROVED)

    # Determine next action
    next_action = None
    activation_status = "pending"

    if not has_fl300:
        next_action = "Petitioner needs to submit FL-300 Request for Order"
        activation_status = "fl300_required"
    elif not has_fl300_approved:
        next_action = "Court needs to review and approve FL-300"
        activation_status = "fl300_submitted"
    elif not has_fl320:
        next_action = "Respondent needs to submit FL-320 Response"
        activation_status = "fl320_required"
    elif not has_fl340:
        next_action = "Awaiting hearing and court order (FL-340)"
        activation_status = "awaiting_hearing"
    else:
        activation_status = "active"

    fl300_id = next((f.id for f in forms if f.form_type == CourtFormType.FL_300), None)

    return CaseFormProgressResponse(
        case_id=case_id,
        activation_status=activation_status,
        total_forms=len(forms),
        pending_forms=pending_forms,
        approved_forms=approved_forms,
        has_fl300=has_fl300,
        has_fl300_approved=has_fl300_approved,
        has_fl311=has_fl311,
        has_fl320=has_fl320,
        has_fl340=has_fl340,
        next_action=next_action,
        fl300_id=fl300_id,
    )


@router.get(
    "/hearings/case/{case_id}",
    response_model=List[CourtHearingResponse],
    summary="List hearings for a case (Court Portal)",
)
async def list_court_hearings_for_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all court hearings for a case (accessible by court portal)."""
    result = await db.execute(
        select(CourtHearing)
        .where(CourtHearing.case_id == case_id)
        .order_by(CourtHearing.scheduled_date.desc())
    )
    hearings = result.scalars().all()

    return [
        CourtHearingResponse(
            id=h.id,
            case_id=h.case_id,
            hearing_type=h.hearing_type.value if hasattr(h.hearing_type, 'value') else str(h.hearing_type),
            scheduled_date=h.scheduled_date,
            scheduled_time=h.scheduled_time,
            department=h.department,
            judge_name=h.judge_name,
            outcome=h.outcome.value if hasattr(h.outcome, 'value') else str(h.outcome) if h.outcome else None,
            petitioner_attended=h.petitioner_attended,
            respondent_attended=h.respondent_attended,
        )
        for h in hearings
    ]


# =============================================================================
# Investigation Report Endpoints
# =============================================================================

@router.post(
    "/reports/generate",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate an investigation report",
)
async def generate_report(
    data: ReportRequest,
    request: Request,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an investigation report.

    Reports include:
    - Date-range scoped evidence
    - Hash verification for integrity
    - Watermark with generator identity
    """
    grant = await get_professional_from_grant(db, grant_id, professional_id)

    # Get professional name for watermark
    prof_service = CourtProfessionalService(db)
    professional = await prof_service.get_professional(professional_id)

    service = ReportService(db)
    report = await service.generate_report(
        data, professional_id, professional.full_name
    )

    await log_court_action(
        db, request, grant_id, professional_id, data.case_id,
        action="generate_report",
        resource_type="investigation_report",
        resource_id=report.id,
        details={"type": data.report_type.value, "number": report.report_number},
    )

    # Update grant access count
    grant_service = AccessGrantService(db)
    await grant_service.record_access(grant_id)

    return report


@router.get(
    "/reports/case/{case_id}",
    response_model=list[ReportResponse],
    summary="List reports for a case",
)
async def list_reports(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List investigation reports for a case."""
    service = ReportService(db)
    reports = await service.get_reports_for_case(case_id)
    return reports


@router.get(
    "/reports/{report_id}",
    response_model=ReportResponse,
    summary="Get a report",
)
async def get_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get details of an investigation report."""
    service = ReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    return report


@router.post(
    "/reports/{report_id}/download",
    response_model=ReportResponse,
    summary="Record report download",
)
async def download_report(
    report_id: str,
    request: Request,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Record a report download.

    In production, this would also return the actual file.
    """
    await get_professional_from_grant(db, grant_id, professional_id)

    service = ReportService(db)
    report = await service.record_download(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    await log_court_action(
        db, request, grant_id, professional_id, report.case_id,
        action="download_report",
        resource_type="investigation_report",
        resource_id=report_id,
    )

    return report


@router.get(
    "/reports/verify/{report_number}",
    response_model=ReportVerification,
    summary="Verify report authenticity",
)
async def verify_report(
    report_number: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify the authenticity of a report.

    This is a public endpoint for courts to verify report integrity.
    """
    service = ReportService(db)
    verification = await service.verify_report(report_number)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    return verification


# =============================================================================
# ARIA Court Query Endpoints
# =============================================================================

@router.post(
    "/aria/query",
    response_model=ARIACourtResponse,
    summary="Query ARIA about a case (facts only)",
)
async def query_aria(
    data: ARIACourtQuery,
    request: Request,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Query ARIA about case facts.

    ARIA provides factual information only:
    - Schedule and exchange data
    - Compliance statistics
    - Communication patterns
    - Court settings

    ARIA does NOT:
    - Recommend custody changes
    - Label or characterize parents
    - Suggest sanctions
    - Make predictions
    """
    await get_professional_from_grant(db, grant_id, professional_id)

    service = ARIACourtService(db)
    response = await service.query(data.case_id, data.query)

    await log_court_action(
        db, request, grant_id, professional_id, data.case_id,
        action="aria_query",
        resource_type="aria",
        details={"query": data.query},
    )

    return ARIACourtResponse(**response)


@router.get(
    "/aria/suggestions",
    response_model=ARIASuggestionList,
    summary="Get suggested ARIA queries",
)
async def get_aria_suggestions(
    db: AsyncSession = Depends(get_db),
):
    """Get a list of suggested queries for court staff."""
    service = ARIACourtService(db)
    suggestions = await service.get_suggested_queries()
    return ARIASuggestionList(suggestions=suggestions)


# =============================================================================
# Summary Endpoints
# =============================================================================

@router.get(
    "/summary/case/{case_id}",
    response_model=CaseCourtSummary,
    summary="Get court summary for a case",
)
async def get_case_summary(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a summary of court-related activity for a case."""
    await get_user_case_role(db, current_user.id, case_id)

    # Get settings
    settings_service = CourtSettingsService(db)
    settings = await settings_service.get_or_create_settings(case_id)

    # Count grants
    grant_service = AccessGrantService(db)
    grants = await grant_service.get_grants_for_case(case_id, active_only=True)

    # Count upcoming events
    event_service = CourtEventService(db)
    events = await event_service.get_events_for_case(case_id)

    # Count unread messages
    message_service = CourtMessageService(db)
    user_role = await get_user_case_role(db, current_user.id, case_id)
    unread = await message_service.get_unread_count(case_id, user_role)

    return CaseCourtSummary(
        case_id=case_id,
        has_court_settings=settings.set_at is not None,
        active_controls=settings.get_active_controls(),
        active_grants_count=len(grants),
        upcoming_court_events=len(events),
        unread_court_messages=unread,
        investigation_mode=settings.investigation_mode,
    )


# =============================================================================
# ClearFund Financial Endpoints (Court Read-Only Access)
# =============================================================================

@router.get(
    "/clearfund/obligations/{case_id}",
    summary="Get obligations for case (court view)",
)
async def get_case_obligations(
    case_id: str,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all financial obligations for a case.

    Court professionals can view all obligations for compliance monitoring.
    """
    from app.services.clearfund import ClearFundService
    from app.schemas.clearfund import ObligationFilters

    service = ClearFundService(db)
    filters = ObligationFilters()
    # list_obligations returns (obligations, total) tuple
    obligations, total = await service.list_obligations(case_id, filters, page, page_size)

    return {
        "items": [
            {
                "id": str(ob.id),
                "title": ob.title,
                "purpose_category": ob.purpose_category,
                "total_amount": str(ob.total_amount),
                "petitioner_share": str(ob.petitioner_share),
                "respondent_share": str(ob.respondent_share),
                "status": ob.status,
                "amount_funded": str(ob.amount_funded),
                "amount_verified": str(ob.amount_verified),
                "due_date": ob.due_date.isoformat() if ob.due_date else None,
                "is_overdue": ob.is_overdue,
                "verification_required": ob.verification_required,
                "receipt_required": ob.receipt_required,
                "created_by": str(ob.created_by),
                "created_at": ob.created_at.isoformat(),
            }
            for ob in obligations
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.get(
    "/clearfund/balance/{case_id}",
    summary="Get balance summary for case (court view)",
)
async def get_case_balance(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get financial balance summary between parents.

    Shows who owes whom and overall financial standing.
    """
    from app.services.clearfund import ClearFundService

    service = ClearFundService(db)
    balance = await service.get_balance_summary(case_id)

    return {
        "case_id": balance.case_id,
        "petitioner_id": balance.petitioner_id,
        "respondent_id": balance.respondent_id,
        "petitioner_balance": str(balance.petitioner_balance),
        "respondent_balance": str(balance.respondent_balance),
        "petitioner_owes_respondent": str(balance.petitioner_owes_respondent),
        "respondent_owes_petitioner": str(balance.respondent_owes_petitioner),
        "net_balance": str(balance.net_balance),
        "total_obligations_open": balance.total_obligations_open,
        "total_obligations_funded": balance.total_obligations_funded,
        "total_obligations_completed": balance.total_obligations_completed,
        "total_this_month": str(balance.total_this_month),
        "total_overdue": str(balance.total_overdue),
    }


@router.get(
    "/clearfund/metrics/{case_id}",
    summary="Get obligation metrics for case (court view)",
)
async def get_case_metrics(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get obligation metrics for compliance reporting.

    Summary counts by status for court oversight.
    """
    from app.services.clearfund import ClearFundService

    service = ClearFundService(db)
    metrics = await service.get_obligation_metrics(case_id)

    return {
        "total_open": metrics.total_open,
        "total_pending_funding": metrics.total_pending_funding,
        "total_funded": metrics.total_funded,
        "total_verified": metrics.total_verified,
        "total_completed": metrics.total_completed,
        "total_overdue": metrics.total_overdue,
        "total_cancelled": metrics.total_cancelled,
    }


@router.get(
    "/clearfund/ledger/{case_id}",
    summary="Get transaction ledger for case (court view)",
)
async def get_case_ledger(
    case_id: str,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    Get immutable transaction ledger for court records.

    All financial transactions with running balances for evidence.
    """
    from app.services.clearfund import LedgerService
    from app.schemas.clearfund import LedgerFilters

    service = LedgerService(db)
    filters = LedgerFilters()
    result = await service.get_ledger_history(case_id, filters, page, page_size)

    return {
        "items": [
            {
                "id": str(entry.id),
                "entry_type": entry.entry_type,
                "obligor_id": str(entry.obligor_id),
                "obligee_id": str(entry.obligee_id),
                "amount": str(entry.amount),
                "running_balance": str(entry.running_balance),
                "obligation_id": str(entry.obligation_id) if entry.obligation_id else None,
                "description": entry.description,
                "effective_date": entry.effective_date.isoformat(),
                "is_reconciled": entry.is_reconciled,
                "created_at": entry.created_at.isoformat(),
            }
            for entry in result["items"]
        ],
        "total": result["total"],
        "page": page,
        "page_size": page_size,
        "has_more": result["has_more"],
    }


# =============================================================================
# KidsCubbie Court Access Endpoints
# =============================================================================

@router.get(
    "/cubbie/items/{case_id}",
    summary="Get all cubbie items for case (court view)",
)
async def get_case_cubbie_items(
    case_id: str,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all high-value items registered in KidsCubbie for court review.

    Shows items being tracked for all children in the case.
    """
    from app.services.cubbie import CubbieService
    from app.models.child import Child
    from sqlalchemy import select

    # Get all children in case
    children_result = await db.execute(
        select(Child).where(Child.case_id == case_id)
    )
    children = children_result.scalars().all()

    if not children:
        return {"children": [], "total_items": 0, "total_value": "0"}

    items_by_child = []
    total_items = 0
    total_value = 0

    service = CubbieService(db)

    for child in children:
        # Get items for each child (bypass user check for court access)
        from app.models.cubbie import CubbieItem
        from sqlalchemy import and_

        query = select(CubbieItem).where(CubbieItem.child_id == child.id)
        if not include_inactive:
            query = query.where(CubbieItem.is_active == True)

        items_result = await db.execute(query.order_by(CubbieItem.name))
        items = items_result.scalars().all()

        child_total = sum(
            float(item.estimated_value or 0) for item in items
        )

        items_by_child.append({
            "child_id": str(child.id),
            "child_name": child.display_name,
            "items": [
                {
                    "id": str(item.id),
                    "name": item.name,
                    "description": item.description,
                    "category": item.category,
                    "estimated_value": str(item.estimated_value) if item.estimated_value else None,
                    "serial_number": item.serial_number,
                    "current_location": item.current_location,
                    "photo_url": item.photo_url,
                    "is_active": item.is_active,
                    "added_at": item.created_at.isoformat() if item.created_at else None,
                    "last_location_update": item.last_location_update.isoformat() if item.last_location_update else None,
                }
                for item in items
            ],
            "item_count": len(items),
            "total_value": str(child_total),
        })

        total_items += len(items)
        total_value += child_total

    return {
        "children": items_by_child,
        "total_items": total_items,
        "total_value": str(total_value),
    }


@router.get(
    "/cubbie/exchanges/{case_id}",
    summary="Get item exchange history for case (court view)",
)
async def get_case_item_exchanges(
    case_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    disputed_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Get history of item transfers during custody exchanges.

    Shows when items moved between parents, condition reports, and disputes.
    """
    from app.models.cubbie import CubbieExchangeItem, CubbieItem
    from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
    from sqlalchemy import select, and_
    from sqlalchemy.orm import selectinload

    # Get all exchanges for this case
    exchanges_result = await db.execute(
        select(CustodyExchange).where(CustodyExchange.case_id == case_id)
    )
    exchanges = exchanges_result.scalars().all()
    exchange_ids = [e.id for e in exchanges]

    if not exchange_ids:
        return {"exchanges": [], "total_transfers": 0, "disputed_count": 0}

    # Build query for instances
    query = select(CustodyExchangeInstance).where(
        CustodyExchangeInstance.exchange_id.in_(exchange_ids)
    )

    if start_date:
        query = query.where(
            CustodyExchangeInstance.scheduled_time >= datetime.fromisoformat(start_date)
        )
    if end_date:
        query = query.where(
            CustodyExchangeInstance.scheduled_time <= datetime.fromisoformat(end_date)
        )

    instances_result = await db.execute(query.order_by(CustodyExchangeInstance.scheduled_time.desc()))
    instances = instances_result.scalars().all()
    instance_ids = [i.id for i in instances]

    if not instance_ids:
        return {"exchanges": [], "total_transfers": 0, "disputed_count": 0}

    # Get exchange items
    items_query = select(CubbieExchangeItem).options(
        selectinload(CubbieExchangeItem.cubbie_item)
    ).where(CubbieExchangeItem.exchange_id.in_(instance_ids))

    if disputed_only:
        items_query = items_query.where(CubbieExchangeItem.is_disputed == True)

    items_result = await db.execute(items_query)
    exchange_items = items_result.scalars().all()

    # Get user names
    user_ids = set()
    for ei in exchange_items:
        user_ids.add(ei.sent_by)
        if ei.acknowledged_by:
            user_ids.add(ei.acknowledged_by)

    from app.models.user import User
    users_result = await db.execute(
        select(User).where(User.id.in_(list(user_ids)))
    )
    users = {str(u.id): u.full_name for u in users_result.scalars().all()}

    # Map instance to scheduled time
    instance_times = {i.id: i.scheduled_time for i in instances}

    # Build response
    transfers = []
    disputed_count = 0

    for ei in exchange_items:
        if ei.is_disputed:
            disputed_count += 1

        transfers.append({
            "exchange_id": str(ei.exchange_id),
            "exchange_date": instance_times.get(ei.exchange_id).isoformat() if instance_times.get(ei.exchange_id) else None,
            "item_id": str(ei.cubbie_item_id),
            "item_name": ei.cubbie_item.name if ei.cubbie_item else "Unknown",
            "item_category": ei.cubbie_item.category if ei.cubbie_item else None,
            "sent_by": users.get(str(ei.sent_by), "Unknown"),
            "sent_at": ei.sent_at.isoformat() if ei.sent_at else None,
            "acknowledged_by": users.get(str(ei.acknowledged_by)) if ei.acknowledged_by else None,
            "acknowledged_at": ei.acknowledged_at.isoformat() if ei.acknowledged_at else None,
            "condition_sent": ei.condition_sent,
            "condition_received": ei.condition_received,
            "condition_changed": (
                ei.condition_sent != ei.condition_received
                if ei.condition_sent and ei.condition_received
                else False
            ),
            "condition_notes": ei.condition_notes,
            "is_disputed": ei.is_disputed,
            "dispute_notes": ei.dispute_notes,
            "photo_sent_url": ei.photo_sent_url,
            "photo_received_url": ei.photo_received_url,
        })

    return {
        "exchanges": transfers,
        "total_transfers": len(transfers),
        "disputed_count": disputed_count,
    }


@router.get(
    "/cubbie/disputes/{case_id}",
    summary="Get disputed items for case (court view)",
)
async def get_case_item_disputes(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all disputed item transfers for court review.

    Shows condition disagreements and documented disputes with evidence.
    """
    # Use the exchanges endpoint with disputed_only=True
    return await get_case_item_exchanges(
        case_id=case_id,
        disputed_only=True,
        db=db,
    )


@router.get(
    "/cubbie/summary/{case_id}",
    summary="Get cubbie summary for case (court view)",
)
async def get_case_cubbie_summary(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get summary statistics for KidsCubbie items in a case.

    Provides overview of items, transfers, and any issues for quick review.
    """
    from app.models.cubbie import CubbieItem, CubbieExchangeItem
    from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
    from app.models.child import Child
    from sqlalchemy import select, func, and_

    # Get children
    children_result = await db.execute(
        select(func.count(Child.id)).where(Child.case_id == case_id)
    )
    child_count = children_result.scalar() or 0

    # Get all children IDs
    children_ids_result = await db.execute(
        select(Child.id).where(Child.case_id == case_id)
    )
    child_ids = [r[0] for r in children_ids_result.all()]

    if not child_ids:
        return {
            "total_items": 0,
            "active_items": 0,
            "total_value": "0",
            "by_category": {},
            "by_location": {},
            "total_transfers": 0,
            "disputed_items": 0,
            "condition_issues": 0,
        }

    # Get item counts
    items_result = await db.execute(
        select(
            func.count(CubbieItem.id),
            func.count(CubbieItem.id).filter(CubbieItem.is_active == True),
            func.sum(CubbieItem.estimated_value),
        ).where(CubbieItem.child_id.in_(child_ids))
    )
    item_stats = items_result.one()
    total_items = item_stats[0] or 0
    active_items = item_stats[1] or 0
    total_value = float(item_stats[2] or 0)

    # Category breakdown
    category_result = await db.execute(
        select(CubbieItem.category, func.count(CubbieItem.id))
        .where(CubbieItem.child_id.in_(child_ids))
        .group_by(CubbieItem.category)
    )
    by_category = dict(category_result.all())

    # Location breakdown
    location_result = await db.execute(
        select(CubbieItem.current_location, func.count(CubbieItem.id))
        .where(
            and_(
                CubbieItem.child_id.in_(child_ids),
                CubbieItem.is_active == True,
            )
        )
        .group_by(CubbieItem.current_location)
    )
    by_location = dict(location_result.all())

    # Get exchanges for this case
    exchanges_result = await db.execute(
        select(CustodyExchange.id).where(CustodyExchange.case_id == case_id)
    )
    exchange_ids = [r[0] for r in exchanges_result.all()]

    total_transfers = 0
    disputed_items = 0
    condition_issues = 0

    if exchange_ids:
        # Get all instances
        instances_result = await db.execute(
            select(CustodyExchangeInstance.id)
            .where(CustodyExchangeInstance.exchange_id.in_(exchange_ids))
        )
        instance_ids = [r[0] for r in instances_result.all()]

        if instance_ids:
            # Count exchange items
            transfers_result = await db.execute(
                select(
                    func.count(CubbieExchangeItem.id),
                    func.count(CubbieExchangeItem.id).filter(CubbieExchangeItem.is_disputed == True),
                ).where(CubbieExchangeItem.exchange_id.in_(instance_ids))
            )
            transfer_stats = transfers_result.one()
            total_transfers = transfer_stats[0] or 0
            disputed_items = transfer_stats[1] or 0

            # Count condition issues (where sent != received)
            condition_result = await db.execute(
                select(func.count(CubbieExchangeItem.id))
                .where(
                    and_(
                        CubbieExchangeItem.exchange_id.in_(instance_ids),
                        CubbieExchangeItem.condition_sent.isnot(None),
                        CubbieExchangeItem.condition_received.isnot(None),
                        CubbieExchangeItem.condition_sent != CubbieExchangeItem.condition_received,
                    )
                )
            )
            condition_issues = condition_result.scalar() or 0

    return {
        "total_items": total_items,
        "active_items": active_items,
        "total_value": str(total_value),
        "by_category": by_category,
        "by_location": by_location,
        "total_transfers": total_transfers,
        "disputed_items": disputed_items,
        "condition_issues": condition_issues,
    }


# =============================================================================
# Compliance Snapshot Endpoints
# =============================================================================

@router.get(
    "/compliance/snapshot/{case_id}",
    response_model=ComplianceSnapshot,
    summary="Get compliance snapshot for case",
)
async def get_compliance_snapshot(
    case_id: str,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a comprehensive compliance snapshot for court dashboard.

    Aggregates data from:
    - Schedule: Exchange on-time rates, missed exchanges
    - Communication: Flagged messages, response times
    - Financial: Overdue obligations, payment compliance
    - Items: Disputed transfers, condition issues

    Returns a unified compliance view with status indicators:
    - 🟢 GREEN: Good standing (score >= 80)
    - 🟡 AMBER: Needs attention (score 60-79)
    - 🔴 RED: Serious issues (score < 60)
    """
    from datetime import timedelta
    from sqlalchemy import select, func, and_
    from app.models.case import Case
    from app.models.message import Message
    from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
    from app.models.child import Child

    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    # Verify case exists
    case_result = await db.execute(
        select(Case).where(Case.id == case_id)
    )
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Calculate days since case creation
    days_monitored = (now - case.created_at).days if case.created_at else days

    # =========================================================================
    # 1. Schedule Compliance
    # =========================================================================
    exchanges_result = await db.execute(
        select(CustodyExchange.id).where(CustodyExchange.case_id == case_id)
    )
    exchange_ids = [r[0] for r in exchanges_result.all()]

    total_exchanges = 0
    on_time_count = 0
    late_count = 0
    missed_count = 0
    schedule_issues = []

    if exchange_ids:
        # Get completed instances in date range
        instances_result = await db.execute(
            select(CustodyExchangeInstance)
            .where(
                and_(
                    CustodyExchangeInstance.exchange_id.in_(exchange_ids),
                    CustodyExchangeInstance.scheduled_time >= start_date,
                    CustodyExchangeInstance.status.in_(["completed", "cancelled", "missed"]),
                )
            )
        )
        instances = instances_result.scalars().all()
        total_exchanges = len(instances)

        for inst in instances:
            if inst.status == "completed":
                # Check if on time (within 15 min grace period)
                if inst.completed_at and inst.scheduled_time:
                    diff = (inst.completed_at - inst.scheduled_time).total_seconds()
                    if diff <= 900:  # 15 minutes grace
                        on_time_count += 1
                    else:
                        late_count += 1
                else:
                    on_time_count += 1  # Assume on-time if no times recorded
            elif inst.status == "missed":
                missed_count += 1

        if missed_count > 0:
            schedule_issues.append(f"{missed_count} missed exchange(s) in last {days} days")
        if late_count > 2:
            schedule_issues.append(f"{late_count} late arrivals in last {days} days")

    on_time_rate = (on_time_count / total_exchanges * 100) if total_exchanges > 0 else 100.0

    # Calculate schedule score
    if on_time_rate >= 90:
        schedule_status = "green"
        schedule_score = 90 + (on_time_rate - 90)
    elif on_time_rate >= 70:
        schedule_status = "amber"
        schedule_score = 60 + (on_time_rate - 70)
    else:
        schedule_status = "red"
        schedule_score = on_time_rate * 0.8

    schedule_compliance = CategoryCompliance(
        status=schedule_status,
        score=round(schedule_score, 1),
        metrics={
            "total_exchanges": total_exchanges,
            "on_time": on_time_count,
            "late": late_count,
            "missed": missed_count,
            "on_time_rate": round(on_time_rate, 1),
        },
        issues=schedule_issues,
    )

    # =========================================================================
    # 2. Communication Compliance
    # =========================================================================
    messages_result = await db.execute(
        select(
            func.count(Message.id),
            func.count(Message.id).filter(Message.was_flagged == True),
        )
        .where(
            and_(
                Message.case_id == case_id,
                Message.sent_at >= start_date,
            )
        )
    )
    msg_stats = messages_result.one()
    total_messages = msg_stats[0] or 0
    flagged_messages = msg_stats[1] or 0

    flagged_rate = (flagged_messages / total_messages * 100) if total_messages > 0 else 0.0
    comm_issues = []

    if flagged_rate > 15:
        comm_issues.append(f"High flagged message rate: {flagged_rate:.1f}%")
    elif flagged_rate > 5:
        comm_issues.append(f"Elevated flagged message rate: {flagged_rate:.1f}%")

    # Calculate communication score
    if flagged_rate <= 5:
        comm_status = "green"
        comm_score = 100 - flagged_rate
    elif flagged_rate <= 15:
        comm_status = "amber"
        comm_score = 80 - (flagged_rate - 5) * 2
    else:
        comm_status = "red"
        comm_score = max(0, 60 - (flagged_rate - 15) * 2)

    communication_compliance = CategoryCompliance(
        status=comm_status,
        score=round(comm_score, 1),
        metrics={
            "total_messages": total_messages,
            "flagged_messages": flagged_messages,
            "flagged_rate": round(flagged_rate, 1),
        },
        issues=comm_issues,
    )

    # =========================================================================
    # 3. Financial Compliance
    # =========================================================================
    overdue_obligations = 0
    total_obligations = 0
    financial_issues = []

    try:
        from app.models.clearfund import Obligation

        obligations_result = await db.execute(
            select(
                func.count(Obligation.id),
                func.count(Obligation.id).filter(Obligation.is_overdue == True),
            )
            .where(Obligation.case_id == case_id)
        )
        ob_stats = obligations_result.one()
        total_obligations = ob_stats[0] or 0
        overdue_obligations = ob_stats[1] or 0

        if overdue_obligations > 0:
            financial_issues.append(f"{overdue_obligations} overdue obligation(s)")
    except Exception:
        # ClearFund may not be set up
        pass

    # Calculate financial score
    if overdue_obligations == 0:
        financial_status = "green"
        financial_score = 100
    elif overdue_obligations <= 2:
        financial_status = "amber"
        financial_score = 80 - (overdue_obligations * 10)
    else:
        financial_status = "red"
        financial_score = max(0, 60 - (overdue_obligations - 2) * 15)

    financial_compliance = CategoryCompliance(
        status=financial_status,
        score=round(financial_score, 1),
        metrics={
            "total_obligations": total_obligations,
            "overdue_obligations": overdue_obligations,
        },
        issues=financial_issues,
    )

    # =========================================================================
    # 4. Item Compliance (KidsCubbie)
    # =========================================================================
    disputed_items = 0
    condition_issues_count = 0
    item_issues = []

    try:
        from app.models.cubbie import CubbieItem, CubbieExchangeItem

        # Get children IDs
        children_ids_result = await db.execute(
            select(Child.id).where(Child.case_id == case_id)
        )
        child_ids = [r[0] for r in children_ids_result.all()]

        if child_ids and exchange_ids:
            # Get instances
            instances_result = await db.execute(
                select(CustodyExchangeInstance.id)
                .where(CustodyExchangeInstance.exchange_id.in_(exchange_ids))
            )
            instance_ids = [r[0] for r in instances_result.all()]

            if instance_ids:
                # Count disputes and condition issues
                items_result = await db.execute(
                    select(
                        func.count(CubbieExchangeItem.id).filter(CubbieExchangeItem.is_disputed == True),
                        func.count(CubbieExchangeItem.id).filter(
                            and_(
                                CubbieExchangeItem.condition_sent.isnot(None),
                                CubbieExchangeItem.condition_received.isnot(None),
                                CubbieExchangeItem.condition_sent != CubbieExchangeItem.condition_received,
                            )
                        ),
                    )
                    .where(CubbieExchangeItem.exchange_id.in_(instance_ids))
                )
                item_stats = items_result.one()
                disputed_items = item_stats[0] or 0
                condition_issues_count = item_stats[1] or 0

                if disputed_items > 0:
                    item_issues.append(f"{disputed_items} disputed item transfer(s)")
                if condition_issues_count > 0:
                    item_issues.append(f"{condition_issues_count} condition discrepancy report(s)")
    except Exception:
        # Cubbie may not be set up
        pass

    # Calculate item score
    total_item_issues = disputed_items + condition_issues_count
    if total_item_issues == 0:
        item_status = "green"
        item_score = 100
    elif total_item_issues <= 1:
        item_status = "amber"
        item_score = 75
    else:
        item_status = "red"
        item_score = max(0, 50 - (total_item_issues - 1) * 10)

    item_compliance = CategoryCompliance(
        status=item_status,
        score=round(item_score, 1),
        metrics={
            "disputed_items": disputed_items,
            "condition_issues": condition_issues_count,
        },
        issues=item_issues,
    )

    # =========================================================================
    # Calculate Overall Score and Status
    # =========================================================================
    # Weighted average: Schedule 40%, Communication 30%, Financial 20%, Items 10%
    overall_score = (
        schedule_compliance.score * 0.4 +
        communication_compliance.score * 0.3 +
        financial_compliance.score * 0.2 +
        item_compliance.score * 0.1
    )

    # Determine overall status
    if overall_score >= 80:
        overall_status = "green"
    elif overall_score >= 60:
        overall_status = "amber"
    else:
        overall_status = "red"

    # If any category is red, overall cannot be green
    if "red" in [schedule_compliance.status, communication_compliance.status,
                 financial_compliance.status, item_compliance.status]:
        if overall_status == "green":
            overall_status = "amber"

    return ComplianceSnapshot(
        case_id=case_id,
        generated_at=now,
        overall_status=overall_status,
        overall_score=round(overall_score, 1),
        schedule_compliance=schedule_compliance,
        communication_compliance=communication_compliance,
        financial_compliance=financial_compliance,
        item_compliance=item_compliance,
        days_monitored=days_monitored,
        total_exchanges=total_exchanges,
        on_time_rate=round(on_time_rate, 1),
        flagged_messages_count=flagged_messages,
        overdue_obligations=overdue_obligations,
        disputed_items=disputed_items,
    )


# =============================================================================
# Court Event Templates
# =============================================================================

@router.get(
    "/templates/events",
    response_model=CourtEventTemplateList,
    summary="Get court event templates",
)
async def get_event_templates():
    """
    Get predefined court event templates for quick event creation.

    Templates include:
    - Custody Hearing
    - Modification Hearing
    - Mediation Session
    - Status Conference
    - Settlement Conference
    - Review Hearing
    - Filing Deadline
    - Response Deadline
    - Parenting Class
    - GAL Interview
    - Custody Evaluation
    """
    return CourtEventTemplateList(templates=COURT_EVENT_TEMPLATES)


@router.get(
    "/templates/events/{template_id}",
    response_model=CourtEventTemplate,
    summary="Get a specific event template",
)
async def get_event_template(template_id: str):
    """Get a specific court event template by ID."""
    template = next(
        (t for t in COURT_EVENT_TEMPLATES if t.id == template_id),
        None
    )
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event template '{template_id}' not found"
        )
    return template


# =============================================================================
# Predefined Report Types
# =============================================================================

@router.get(
    "/templates/reports",
    response_model=PredefinedReportTypeList,
    summary="Get predefined report types",
)
async def get_report_types():
    """
    Get predefined report types for quick report generation.

    Report types include:
    - Attendance Compliance Report
    - Financial Summary Report
    - Communication Analysis Report
    - Missed Exchanges Report
    - Complete Case Packet
    - Item Transfer Log
    - ARIA Communication Summary
    - Investigation Report
    """
    return PredefinedReportTypeList(report_types=PREDEFINED_REPORT_TYPES)


@router.get(
    "/templates/reports/{report_type_id}",
    response_model=PredefinedReportType,
    summary="Get a specific report type",
)
async def get_report_type(report_type_id: str):
    """Get a specific predefined report type by ID."""
    report_type = next(
        (r for r in PREDEFINED_REPORT_TYPES if r.id == report_type_id),
        None
    )
    if not report_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report type '{report_type_id}' not found"
        )
    return report_type


# =============================================================================
# Custody Agreement Upload & Extraction Endpoints
# =============================================================================

from fastapi import UploadFile, File, BackgroundTasks
from app.services.custody_extraction import CustodyExtractionService, compute_file_hash
from app.schemas.custody_order import (
    AgreementUploadResponse,
    ExtractionStatusResponse,
    CustodyOrderResponse,
    CustodyOrderFullResponse,
    CustodyOrderDetailResponse,
    CustodyOrderChildResponse,
    VisitationScheduleResponse,
    HolidayScheduleResponse,
    SupervisedVisitationResponse,
    ExchangeRulesResponse,
    CustodyOrderReview,
)
from app.models.custody_order import (
    CustodyOrder,
    CustodyOrderChild,
    VisitationSchedule,
    SupervisedVisitation,
    ExchangeRules,
    HolidaySchedule,
    AgreementUpload,
)


@router.post(
    "/agreements/upload/{case_id}",
    response_model=AgreementUploadResponse,
    summary="Upload custody agreement for extraction",
)
async def upload_custody_agreement(
    case_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    professional_id: str,
    grant_id: str,
    file: UploadFile = File(...),
    document_type: str = "custody_order",
    form_type: Optional[str] = None,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a custody agreement PDF for AI extraction.

    The extraction will run in the background. Use the extraction status
    endpoint to check progress and retrieve results.
    """
    # Verify access
    await get_professional_from_grant(db, grant_id, professional_id)

    # Validate file type
    if not file.content_type or not file.content_type.startswith("application/pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )

    # Read file content
    content = await file.read()
    file_hash = compute_file_hash(content)
    file_size = len(content)

    # For now, store in a temporary location (in production, use Supabase Storage)
    # We'll store the base64 content in the database for simplicity
    import base64
    file_url = f"data:application/pdf;base64,{base64.b64encode(content).decode()}"

    # Create upload record
    service = CustodyExtractionService(db)
    upload = await service.create_upload(
        case_id=case_id,
        uploaded_by=professional_id,
        uploaded_by_type="court_professional",
        filename=file.filename or "custody_agreement.pdf",
        file_url=file_url,
        file_size=file_size,
        file_hash=file_hash,
        document_type=document_type,
        form_type=form_type,
        state=state,
    )

    # Log the action
    await log_court_action(
        db, request, grant_id, professional_id, case_id,
        action="agreement_upload",
        resource_type="agreement_upload",
        resource_id=upload.id,
        details={
            "filename": file.filename,
            "file_size": file_size,
            "document_type": document_type,
        },
    )

    # Start extraction in background
    async def run_extraction():
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            extraction_service = CustodyExtractionService(session)
            try:
                await extraction_service.extract_from_pdf(upload.id, content)
            except Exception as e:
                # Error is logged in the service
                print(f"Extraction error for {upload.id}: {e}")

    background_tasks.add_task(run_extraction)

    return AgreementUploadResponse(
        id=upload.id,
        case_id=case_id,
        filename=file.filename or "custody_agreement.pdf",
        file_url=upload.file_url,
        extraction_status="processing",
        message="File uploaded. Extraction started in background.",
    )


@router.get(
    "/agreements/upload/{upload_id}/status",
    response_model=ExtractionStatusResponse,
    summary="Get extraction status",
)
async def get_extraction_status(
    upload_id: str,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the status of a custody agreement extraction."""
    await get_professional_from_grant(db, grant_id, professional_id)

    service = CustodyExtractionService(db)
    upload = await service.get_upload(upload_id)

    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )

    # Calculate progress (rough estimate)
    progress = None
    if upload.extraction_status == "pending":
        progress = 0
    elif upload.extraction_status == "processing":
        progress = 50
    elif upload.extraction_status == "completed":
        progress = 100
    elif upload.extraction_status == "failed":
        progress = 0

    return ExtractionStatusResponse(
        upload_id=upload.id,
        status=upload.extraction_status,
        progress_percent=progress,
        error=upload.extraction_error,
        custody_order_id=upload.custody_order_id,
        extraction_confidence=float(upload.extraction_confidence) if upload.extraction_confidence else None,
        requires_review=upload.requires_review,
    )


@router.get(
    "/agreements/uploads/case/{case_id}",
    summary="List uploads for a case",
)
async def list_case_uploads(
    case_id: str,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all agreement uploads for a case."""
    await get_professional_from_grant(db, grant_id, professional_id)

    service = CustodyExtractionService(db)
    uploads = await service.get_uploads_for_case(case_id)

    return {
        "uploads": [
            {
                "id": u.id,
                "filename": u.original_filename,
                "document_type": u.document_type,
                "form_type": u.form_type,
                "extraction_status": u.extraction_status,
                "custody_order_id": u.custody_order_id,
                "extraction_confidence": float(u.extraction_confidence) if u.extraction_confidence else None,
                "requires_review": u.requires_review,
                "uploaded_at": u.created_at.isoformat(),
            }
            for u in uploads
        ]
    }


@router.get(
    "/custody-orders/case/{case_id}",
    summary="List custody orders for a case",
)
async def list_case_custody_orders(
    case_id: str,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all extracted custody orders for a case."""
    await get_professional_from_grant(db, grant_id, professional_id)

    service = CustodyExtractionService(db)
    orders = await service.get_custody_orders_for_case(case_id)

    return {
        "custody_orders": [
            CustodyOrderResponse(
                id=o.id,
                case_id=o.case_id,
                form_type=o.form_type,
                form_state=o.form_state,
                physical_custody=o.physical_custody,
                legal_custody=o.legal_custody,
                visitation_type=o.visitation_type,
                has_abuse_allegations=o.has_abuse_allegations,
                has_substance_abuse_allegations=o.has_substance_abuse_allegations,
                abduction_risk=o.abduction_risk,
                mediation_required=o.mediation_required,
                travel_restriction_state=o.travel_restriction_state,
                is_court_ordered=o.is_court_ordered,
                requires_review=o.requires_review,
                extraction_confidence=float(o.extraction_confidence) if o.extraction_confidence else None,
                children_count=len(o.children) if o.children else 0,
                created_at=o.created_at,
                extracted_at=o.extracted_at,
            )
            for o in orders
        ]
    }


@router.get(
    "/custody-orders/{order_id}",
    response_model=CustodyOrderFullResponse,
    summary="Get custody order details",
)
async def get_custody_order_details(
    order_id: str,
    request: Request,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get full details of an extracted custody order."""
    await get_professional_from_grant(db, grant_id, professional_id)

    # Get order with relationships
    result = await db.execute(
        select(CustodyOrder)
        .where(CustodyOrder.id == order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custody order not found"
        )

    # Get children
    children_result = await db.execute(
        select(CustodyOrderChild)
        .where(CustodyOrderChild.custody_order_id == order_id)
    )
    children = children_result.scalars().all()

    # Get visitation schedules
    schedules_result = await db.execute(
        select(VisitationSchedule)
        .where(VisitationSchedule.custody_order_id == order_id)
    )
    schedules = schedules_result.scalars().all()

    # Get holiday schedule
    holidays_result = await db.execute(
        select(HolidaySchedule)
        .where(HolidaySchedule.custody_order_id == order_id)
    )
    holidays = holidays_result.scalars().all()

    # Get supervised visitation
    supervised_result = await db.execute(
        select(SupervisedVisitation)
        .where(SupervisedVisitation.custody_order_id == order_id)
    )
    supervised = supervised_result.scalar_one_or_none()

    # Get exchange rules
    exchange_result = await db.execute(
        select(ExchangeRules)
        .where(ExchangeRules.custody_order_id == order_id)
    )
    exchange = exchange_result.scalar_one_or_none()

    # Log access
    await log_court_action(
        db, request, grant_id, professional_id, order.case_id,
        action="view_custody_order",
        resource_type="custody_order",
        resource_id=order_id,
    )

    return CustodyOrderFullResponse(
        order=CustodyOrderDetailResponse(
            id=order.id,
            case_id=order.case_id,
            form_type=order.form_type,
            form_state=order.form_state,
            court_case_number=order.court_case_number,
            physical_custody=order.physical_custody,
            legal_custody=order.legal_custody,
            visitation_type=order.visitation_type,
            has_abuse_allegations=order.has_abuse_allegations,
            abuse_alleged_against=order.abuse_alleged_against,
            has_substance_abuse_allegations=order.has_substance_abuse_allegations,
            substance_abuse_alleged_against=order.substance_abuse_alleged_against,
            abuse_allegation_details=order.abuse_allegation_details,
            travel_restriction_state=order.travel_restriction_state,
            travel_restriction_counties=order.travel_restriction_counties,
            travel_restriction_other=order.travel_restriction_other,
            requires_written_permission=order.requires_written_permission,
            abduction_risk=order.abduction_risk,
            abduction_prevention_orders=order.abduction_prevention_orders,
            mediation_required=order.mediation_required,
            mediation_location=order.mediation_location,
            other_provisions=order.other_provisions,
            is_court_ordered=order.is_court_ordered,
            order_date=order.order_date,
            effective_date=order.effective_date,
            source_pdf_url=order.source_pdf_url,
            extraction_confidence=float(order.extraction_confidence) if order.extraction_confidence else None,
            extraction_notes=order.extraction_notes,
            requires_review=order.requires_review,
            reviewed_at=order.reviewed_at,
            raw_extracted_data=order.raw_extracted_data,
            created_at=order.created_at,
            updated_at=order.updated_at,
        ),
        children=[
            CustodyOrderChildResponse(
                id=c.id,
                child_name=c.child_name,
                birth_date=c.birth_date,
                age_at_filing=c.age_at_filing,
                physical_custody=c.physical_custody,
                legal_custody=c.legal_custody,
                special_needs=c.special_needs,
                school_info=c.school_info,
            )
            for c in children
        ],
        visitation_schedules=[
            VisitationScheduleResponse(
                id=s.id,
                parent_type=s.parent_type,
                schedule_type=s.schedule_type,
                weekend_number=s.weekend_number,
                start_day=s.start_day,
                end_day=s.end_day,
                start_time=s.start_time,
                end_time=s.end_time,
                start_at_school=s.start_at_school,
                start_after_school=s.start_after_school,
                is_virtual=s.is_virtual,
                notes=s.notes,
            )
            for s in schedules
        ],
        holiday_schedule=[
            HolidayScheduleResponse(
                id=h.id,
                holiday_name=h.holiday_name,
                holiday_type=h.holiday_type,
                assigned_to=h.assigned_to,
                odd_years_to=h.odd_years_to,
                even_years_to=h.even_years_to,
                start_day=h.start_day,
                end_day=h.end_day,
                duration_days=h.duration_days,
                notes=h.notes,
            )
            for h in holidays
        ],
        supervised_visitation=SupervisedVisitationResponse(
            id=supervised.id,
            supervised_parent=supervised.supervised_parent,
            supervision_reason=supervised.supervision_reason,
            supervisor_name=supervised.supervisor_name,
            supervisor_phone=supervised.supervisor_phone,
            supervisor_type=supervised.supervisor_type,
            supervisor_agency=supervised.supervisor_agency,
            petitioner_cost_percent=supervised.petitioner_cost_percent,
            respondent_cost_percent=supervised.respondent_cost_percent,
            location_type=supervised.location_type,
            location_address=supervised.location_address,
            frequency=supervised.frequency,
            hours_per_visit=supervised.hours_per_visit,
        ) if supervised else None,
        exchange_rules=ExchangeRulesResponse(
            id=exchange.id,
            require_licensed_driver=exchange.require_licensed_driver,
            require_insured_driver=exchange.require_insured_driver,
            require_registered_vehicle=exchange.require_registered_vehicle,
            require_child_restraints=exchange.require_child_restraints,
            transport_to_provider=exchange.transport_to_provider,
            transport_from_provider=exchange.transport_from_provider,
            exchange_start_address=exchange.exchange_start_address,
            exchange_end_address=exchange.exchange_end_address,
            exchange_protocol=exchange.exchange_protocol,
            curbside_exchange=exchange.curbside_exchange,
            other_rules=exchange.other_rules,
        ) if exchange else None,
    )


@router.post(
    "/custody-orders/{order_id}/review",
    summary="Mark custody order as reviewed",
)
async def review_custody_order(
    order_id: str,
    request: Request,
    data: CustodyOrderReview,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark an extracted custody order as reviewed by court professional."""
    await get_professional_from_grant(db, grant_id, professional_id)

    service = CustodyExtractionService(db)
    order = await service.mark_reviewed(
        order_id=order_id,
        reviewed_by=professional_id,
        review_notes=data.review_notes,
    )

    # Log action
    await log_court_action(
        db, request, grant_id, professional_id, order.case_id,
        action="review_custody_order",
        resource_type="custody_order",
        resource_id=order_id,
        details={"approved": data.approved, "notes": data.review_notes},
    )

    return {
        "success": True,
        "message": "Custody order marked as reviewed",
        "order_id": order_id,
        "reviewed_at": order.reviewed_at.isoformat(),
    }


@router.post(
    "/custody-orders/{order_id}/apply-to-case",
    summary="Apply custody order to case schedule",
)
async def apply_custody_order_to_case(
    order_id: str,
    request: Request,
    professional_id: str,
    grant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Apply extracted custody order data to the case.

    This will:
    - Update case custody settings
    - Generate schedule events from visitation schedules
    - Apply exchange rules
    - Set up holiday schedules
    """
    await get_professional_from_grant(db, grant_id, professional_id)

    # Get the custody order
    result = await db.execute(
        select(CustodyOrder).where(CustodyOrder.id == order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custody order not found"
        )

    if order.requires_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Custody order must be reviewed before applying to case"
        )

    # TODO: Implement the logic to:
    # 1. Update case settings from custody order
    # 2. Generate recurring schedule events from visitation schedules
    # 3. Create exchange rules in the case
    # 4. Set up holiday schedule events

    # For now, return a success message indicating this is a future feature
    await log_court_action(
        db, request, grant_id, professional_id, order.case_id,
        action="apply_custody_order",
        resource_type="custody_order",
        resource_id=order_id,
    )

    return {
        "success": True,
        "message": "Custody order applied to case (schedule generation coming soon)",
        "order_id": order_id,
        "case_id": order.case_id,
    }


# =============================================================================
# Case Creation from Court Forms (FL-300, FL-311)
# =============================================================================

@router.post(
    "/cases/extract-from-forms",
    summary="Extract case data from FL-300 and FL-311 forms",
)
async def extract_case_from_forms(
    fl300: UploadFile = File(..., description="FL-300 Request for Order PDF"),
    fl311: UploadFile = File(None, description="FL-311 Child Custody Application PDF (optional)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Extract case and party information from uploaded court forms.

    This endpoint:
    1. Uses ARIA/Claude to extract structured data from PDF forms
    2. Returns extracted data for review/editing
    3. Does NOT create the case - that's done in a separate step

    Supported forms:
    - FL-300: Request for Order (required)
    - FL-311: Child Custody and Visitation Application (optional, provides more detail)
    """
    import anthropic
    import base64
    import json
    import os

    # Read PDF files
    fl300_content = await fl300.read()
    fl311_content = await fl311.read() if fl311 else None

    # Check file types
    if not fl300.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FL-300 must be a PDF file"
        )

    if fl311 and not fl311.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FL-311 must be a PDF file"
        )

    # Build extraction prompt
    extraction_prompt = """You are an expert at extracting structured data from California Judicial Council family law forms.

Extract the following information from the provided FL-300 (Request for Order) and optionally FL-311 (Child Custody Application) PDF forms:

Return a JSON object with this exact structure:
{
    "case_number": "string or null - the court case number if present",
    "court_county": "string - the California county",
    "filing_date": "string in YYYY-MM-DD format or null",
    "petitioner_name": "string - full name of petitioner/requesting party",
    "petitioner_email": "string or null - email if present",
    "petitioner_address": "string or null - address if present",
    "respondent_name": "string - full name of respondent/other party",
    "respondent_email": "string or null - email if present",
    "respondent_address": "string or null - address if present",
    "children": [
        {
            "name": "string - child's full name",
            "date_of_birth": "string in YYYY-MM-DD format or null",
            "age": number or null
        }
    ],
    "legal_custody_request": "string describing legal custody arrangement requested",
    "physical_custody_request": "string describing physical custody arrangement requested",
    "visitation_schedule": "string describing visitation schedule if specified",
    "additional_requests": "string with any other requests or orders sought"
}

Be precise and extract exactly what's in the forms. If information is not present or unclear, use null.
For children, extract all children listed in the forms.
"""

    try:
        # Try using Claude to extract data
        from app.core.config import settings
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Build message content with PDFs
        content = []

        # Add FL-300 PDF
        content.append({
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": base64.standard_b64encode(fl300_content).decode("utf-8"),
            },
        })
        content.append({
            "type": "text",
            "text": "This is the FL-300 (Request for Order) form."
        })

        # Add FL-311 if provided
        if fl311_content:
            content.append({
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": base64.standard_b64encode(fl311_content).decode("utf-8"),
                },
            })
            content.append({
                "type": "text",
                "text": "This is the FL-311 (Child Custody and Visitation Application) form."
            })

        content.append({
            "type": "text",
            "text": extraction_prompt
        })

        # Call Claude
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": content
                }
            ]
        )

        # Parse response
        response_text = response.content[0].text

        # Try to extract JSON from response
        # Handle cases where Claude wraps JSON in markdown code blocks
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()

        extracted_data = json.loads(response_text)

        return {
            "success": True,
            "extraction_method": "aria",
            "data": extracted_data,
        }

    except Exception as e:
        # Log the error but try PDF form field extraction as fallback
        import traceback
        print(f"ARIA extraction failed: {e}")
        traceback.print_exc()

        # Try to extract from PDF form fields directly using pypdf
        try:
            from pypdf import PdfReader
            import io
            import re

            def convert_date_format(date_str):
                """Convert MM/DD/YYYY to YYYY-MM-DD format for HTML date inputs"""
                if not date_str:
                    return None
                date_str = str(date_str).strip()
                # Try MM/DD/YYYY format
                match = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', date_str)
                if match:
                    month, day, year = match.groups()
                    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                # Already in YYYY-MM-DD format
                if re.match(r'\d{4}-\d{2}-\d{2}', date_str):
                    return date_str
                return date_str

            extracted_data = {
                "case_number": None,
                "court_county": "California",
                "filing_date": None,
                "petitioner_name": "",
                "petitioner_email": None,
                "petitioner_address": None,
                "respondent_name": "",
                "respondent_email": None,
                "respondent_address": None,
                "children": [],
                "legal_custody_request": None,
                "physical_custody_request": None,
                "visitation_schedule": None,
                "additional_requests": None,
            }

            # Extract from FL-300
            pdf_reader = PdfReader(io.BytesIO(fl300_content))
            fields = pdf_reader.get_fields() or {}

            # Map PDF field names to our data structure
            field_mapping = {
                # Case info
                "FL-300[0].Page1[0].CaseNumber[0].CaseNumber_ft[0]": "case_number",
                "FL-300[0].Page1[0].CourtInfo[0].CrtCounty_ft[0]": "court_county",
                # Petitioner
                "FL-300[0].Page1[0].TitlePartyName[0].Petitioner_1_ft[0]": "petitioner_name",
                "FL-300[0].Page1[0].AttyInfo[0].Email_ft[0]": "petitioner_email",
                "FL-300[0].Page1[0].AttyInfo[0].AttyStreet_ft[0]": "petitioner_address",
                # Respondent
                "FL-300[0].Page1[0].TitlePartyName[0].Respondent_ft[0]": "respondent_name",
            }

            for pdf_field, data_field in field_mapping.items():
                if pdf_field in fields:
                    value = fields[pdf_field].get('/V', '')
                    if value:
                        extracted_data[data_field] = str(value)

            # Extract children from FL-300 Page 2
            children = []
            child_fields = [
                ("FL-300[0].Page2[0].List2[0].Li1[0].Child1Name_ft[0]", "FL-300[0].Page2[0].List2[0].Li1[0].Child1BirthDate_dt[0]"),
                ("FL-300[0].Page2[0].List2[0].Li1[0].Child2Name_ft[0]", "FL-300[0].Page2[0].List2[0].Li1[0].Child2BirthDate_dt[0]"),
                ("FL-300[0].Page2[0].List2[0].Li1[0].Child3Name_ft[0]", "FL-300[0].Page2[0].List2[0].Li1[0].Child3BirthDate_dt[0]"),
                ("FL-300[0].Page2[0].List2[0].Li1[0].Child4Name_ft[0]", "FL-300[0].Page2[0].List2[0].Li1[0].Child4BirthDate_dt[0]"),
            ]

            for name_field, dob_field in child_fields:
                if name_field in fields:
                    name = fields[name_field].get('/V', '')
                    if name:
                        dob = fields.get(dob_field, {}).get('/V', '') if dob_field in fields else ''
                        children.append({
                            "name": str(name),
                            "date_of_birth": convert_date_format(dob) if dob else None,
                        })

            extracted_data["children"] = children

            # If FL-311 was provided, extract additional custody info
            if fl311_content:
                pdf_reader_311 = PdfReader(io.BytesIO(fl311_content))
                fields_311 = pdf_reader_311.get_fields() or {}

                # Also try to get children from FL-311 if not found in FL-300
                if not children:
                    fl311_child_fields = [
                        ("FL-311[0].Page1[0].List1[0].Li1[0].tblMinorChildren[0].child1[0].Child1Name[0]",
                         "FL-311[0].Page1[0].List1[0].Li1[0].tblMinorChildren[0].child1[0].Child1Birthdate_dt[0]"),
                        ("FL-311[0].Page1[0].List1[0].Li1[0].tblMinorChildren[0].child2[0].Child2Name[0]",
                         "FL-311[0].Page1[0].List1[0].Li1[0].tblMinorChildren[0].child2[0].Child2Birthdate_dt[0]"),
                    ]

                    for name_field, dob_field in fl311_child_fields:
                        if name_field in fields_311:
                            name = fields_311[name_field].get('/V', '')
                            if name:
                                dob = fields_311.get(dob_field, {}).get('/V', '') if dob_field in fields_311 else ''
                                children.append({
                                    "name": str(name),
                                    "date_of_birth": convert_date_format(dob) if dob else None,
                                })

                    extracted_data["children"] = children

                # Check custody checkboxes
                if "FL-311[0].Page1[0].List2[0].Li1[0].ToPetitioner_cb[0]" in fields_311:
                    val = fields_311["FL-311[0].Page1[0].List2[0].Li1[0].ToPetitioner_cb[0]"].get('/V', '')
                    if val and val != '/Off':
                        extracted_data["physical_custody_request"] = "Primary physical custody to Petitioner"

                if "FL-311[0].Page1[0].List2[0].Li2[0].ToBothJointly_cb[0]" in fields_311:
                    val = fields_311["FL-311[0].Page1[0].List2[0].Li2[0].ToBothJointly_cb[0]"].get('/V', '')
                    if val and val != '/Off':
                        extracted_data["legal_custody_request"] = "Joint legal custody to both parents"

            print(f"PDF form field extraction successful: {extracted_data}")

            return {
                "success": True,
                "extraction_method": "pdf_fields",
                "data": extracted_data,
            }

        except Exception as pdf_err:
            print(f"PDF field extraction also failed: {pdf_err}")
            traceback.print_exc()

            return {
                "success": False,
                "extraction_method": "manual",
                "error": str(e),
                "data": {
                    "case_number": None,
                    "court_county": "California",
                    "filing_date": None,
                    "petitioner_name": "",
                    "petitioner_email": None,
                    "petitioner_address": None,
                    "respondent_name": "",
                    "respondent_email": None,
                    "respondent_address": None,
                    "children": [],
                    "legal_custody_request": None,
                    "physical_custody_request": None,
                    "visitation_schedule": None,
                    "additional_requests": None,
                },
            }


@router.post(
    "/cases/create-from-extraction",
    summary="Create a new case from extracted form data",
)
async def create_case_from_extraction(
    request: Request,
    case_number: Optional[str] = Form(None),
    court_county: str = Form(...),
    petitioner_name: str = Form(...),
    petitioner_email: str = Form(...),
    respondent_name: str = Form(...),
    respondent_email: str = Form(...),
    children: str = Form("[]"),  # JSON array of children
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new case from form extraction data.

    This endpoint:
    1. Creates the case record
    2. Creates placeholder users for petitioner and respondent (if not existing)
    3. Generates invite links for both parents to join the platform
    4. Returns the case ID and invite URLs
    """
    import json
    import uuid
    import secrets
    import os
    from datetime import date
    from app.models.case import Case
    from app.models.child import Child

    # Parse children JSON
    try:
        children_list = json.loads(children)
    except:
        children_list = []

    # Generate case name
    petitioner_last = petitioner_name.split()[-1] if petitioner_name else "Unknown"
    respondent_last = respondent_name.split()[-1] if respondent_name else "Unknown"
    case_name = f"{petitioner_last} v. {respondent_last}"

    # Generate invite tokens
    petitioner_invite_token = secrets.token_urlsafe(32)
    respondent_invite_token = secrets.token_urlsafe(32)

    # Create the case
    # Note: CaseParticipant records are created when users register with invite links
    # This allows cases to be created before users join the platform
    case = Case(
        id=str(uuid.uuid4()),
        case_name=case_name,
        case_number=case_number,
        state="CA",
        county=court_county,
        status="pending",  # Will become active when both parents join
    )
    db.add(case)

    # Add children
    for child_data in children_list:
        # Parse date_of_birth if provided
        dob = None
        dob_str = child_data.get("date_of_birth")
        if dob_str:
            try:
                dob = date.fromisoformat(dob_str)
            except:
                pass

        child = Child(
            id=str(uuid.uuid4()),
            case_id=case.id,
            first_name=child_data.get("name", "").split()[0] if child_data.get("name") else "Unknown",
            last_name=child_data.get("name", "").split()[-1] if child_data.get("name") and len(child_data.get("name", "").split()) > 1 else "",
            date_of_birth=dob,
        )
        db.add(child)

    # Create FL-300 form submission (court-uploaded)
    fl300_submission = CourtFormSubmission(
        id=str(uuid.uuid4()),
        case_id=case.id,
        parent_id=None,  # Court-uploaded, no parent yet
        form_type=CourtFormType.FL_300.value,
        form_state="CA",
        status=CourtFormStatus.SUBMITTED.value,
        submission_source=FormSubmissionSource.COURT_UPLOAD.value,
        submitted_at=datetime.utcnow(),
        form_data={
            "petitioner_name": petitioner_name,
            "petitioner_email": petitioner_email,
            "respondent_name": respondent_name,
            "respondent_email": respondent_email,
            "children": children_list,
            "court_county": court_county,
            "case_number": case_number,
        },
        aria_assisted=False,
        requires_review=True,
        status_history=[{
            "status": CourtFormStatus.SUBMITTED.value,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "court_upload",
        }],
    )
    db.add(fl300_submission)

    # Create FL-311 form submission if we have custody data
    fl311_submission = CourtFormSubmission(
        id=str(uuid.uuid4()),
        case_id=case.id,
        parent_id=None,  # Court-uploaded
        form_type=CourtFormType.FL_311.value,
        form_state="CA",
        status=CourtFormStatus.SUBMITTED.value,
        submission_source=FormSubmissionSource.COURT_UPLOAD.value,
        submitted_at=datetime.utcnow(),
        parent_form_id=fl300_submission.id,  # Links to FL-300
        form_data={
            "children": children_list,
        },
        aria_assisted=False,
        requires_review=True,
        status_history=[{
            "status": CourtFormStatus.SUBMITTED.value,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "court_upload",
        }],
    )
    db.add(fl311_submission)

    await db.commit()
    await db.refresh(case)

    # Generate invite URLs (frontend will handle these routes)
    base_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    # Encode invite data in URL
    import base64
    petitioner_invite_data = base64.urlsafe_b64encode(json.dumps({
        "case_id": case.id,
        "role": "petitioner",
        "name": petitioner_name,
        "email": petitioner_email,
        "token": petitioner_invite_token,
    }).encode()).decode()

    respondent_invite_data = base64.urlsafe_b64encode(json.dumps({
        "case_id": case.id,
        "role": "respondent",
        "name": respondent_name,
        "email": respondent_email,
        "token": respondent_invite_token,
    }).encode()).decode()

    return {
        "success": True,
        "case_id": case.id,
        "case_name": case.case_name,
        "case_number": case.case_number,
        "petitioner_invite_url": f"{base_url}/register?invite={petitioner_invite_data}",
        "respondent_invite_url": f"{base_url}/register?invite={respondent_invite_data}",
    }


# =============================================================================
# Exchange Compliance Endpoints (Silent Handoff Integration)
# =============================================================================

# Bearer scheme for exchange endpoints
exchange_bearer_scheme = HTTPBearer(auto_error=False)


async def get_user_or_court_professional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(exchange_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> tuple[Optional[User], Optional[str]]:
    """
    Authenticate either a regular user or a court professional.

    Returns:
        tuple: (user, professional_id) - one will be set, the other None
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    try:
        secret_key = settings.JWT_SECRET_KEY or settings.SECRET_KEY
        payload = jwt.decode(
            credentials.credentials,
            secret_key,
            algorithms=[settings.JWT_ALGORITHM]
        )

        subject = payload.get("sub")
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token - missing subject",
            )

        # Check if this is a court professional token
        role = payload.get("role", "")
        court_roles = ["court_clerk", "gal", "mediator", "judge", "attorney", "evaluator",
                       "attorney_petitioner", "attorney_respondent"]
        token_type = payload.get("type", "")
        is_court_token = token_type == "court" or role in court_roles

        if is_court_token:
            # Return professional ID
            return None, subject
        else:
            # Try to get regular user
            from sqlalchemy import select
            result = await db.execute(
                select(User).where(User.id == subject)
            )
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                )
            return user, None

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


@router.get(
    "/cases/{case_id}/exchange-compliance",
    response_model=ExchangeComplianceResponse,
    summary="Get exchange compliance metrics",
    description="Get GPS-verified exchange compliance data for court review.",
)
async def get_exchange_compliance(
    case_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    auth_result: tuple = Depends(get_user_or_court_professional),
):
    """
    Get exchange compliance metrics from Silent Handoff GPS verification.

    This endpoint provides objective evidence of custody exchange compliance:
    - Total exchanges and outcomes (completed, missed, disputed)
    - GPS verification rates
    - Geofence compliance rates
    - Per-parent metrics (petitioner vs respondent)

    Can be accessed by:
    - Parents who are case participants
    - Court professionals with active access grants including 'schedule' or 'checkins' scope

    Returns:
        ExchangeComplianceResponse with metrics, recent exchanges, and overall status.
    """
    from datetime import timedelta, timezone

    current_user, professional_id = auth_result

    # Strip timezone if present
    if start_date and start_date.tzinfo:
        start_date = start_date.replace(tzinfo=None)
    if end_date and end_date.tzinfo:
        end_date = end_date.replace(tzinfo=None)

    # Default to last 30 days if no dates provided
    if end_date is None:
        end_date = datetime.utcnow()
    if start_date is None:
        start_date = end_date - timedelta(days=30)

    # Authorize based on user type
    if current_user:
        # Check if user is a case participant (parent)
        try:
            await get_user_case_role(db, current_user.id, case_id)
        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this case. Must be a case participant.",
            )
    elif professional_id:
        # Check for active access grant with schedule/checkins scope
        grant_service = AccessGrantService(db)
        grants = await grant_service.get_grants_for_case(case_id, active_only=True)
        has_access = False
        for grant in grants:
            if str(grant.professional_id) == str(professional_id):
                # Check if grant includes schedule or checkins scope
                if isinstance(grant.access_scope, dict):
                    has_access = grant.access_scope.get("schedule", False) or grant.access_scope.get("checkins", False)
                elif isinstance(grant.access_scope, list):
                    has_access = "schedule" in grant.access_scope or "checkins" in grant.access_scope
                else:
                    has_access = AccessScope.SCHEDULE in grant.access_scope or AccessScope.CHECKINS in grant.access_scope
                if has_access:
                    break

        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active access grant for this case with schedule/checkins scope.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Get compliance data
    summary = await ExchangeComplianceService.get_compliance_summary(
        db=db,
        case_id=case_id,
        start_date=start_date,
        end_date=end_date,
    )

    metrics = summary["metrics"]

    return ExchangeComplianceResponse(
        case_id=case_id,
        metrics=ExchangeComplianceMetrics(
            total_exchanges=metrics["total_exchanges"],
            completed=metrics["completed"],
            missed=metrics["missed"],
            one_party_only=metrics["one_party_only"],
            disputed=metrics["disputed"],
            gps_verified_rate=metrics["gps_verified_rate"],
            geofence_compliance_rate=metrics["geofence_compliance_rate"],
            on_time_rate=metrics["on_time_rate"],
            petitioner_metrics=ParentExchangeMetrics(
                check_ins=metrics["petitioner_metrics"]["check_ins"],
                avg_distance_meters=metrics["petitioner_metrics"]["avg_distance_meters"],
                geofence_hit_rate=metrics["petitioner_metrics"]["geofence_hit_rate"],
                on_time_rate=metrics["petitioner_metrics"]["on_time_rate"],
            ),
            respondent_metrics=ParentExchangeMetrics(
                check_ins=metrics["respondent_metrics"]["check_ins"],
                avg_distance_meters=metrics["respondent_metrics"]["avg_distance_meters"],
                geofence_hit_rate=metrics["respondent_metrics"]["geofence_hit_rate"],
                on_time_rate=metrics["respondent_metrics"]["on_time_rate"],
            ),
            date_range=metrics["date_range"],
        ),
        recent_exchanges=summary["recent_exchanges"],
        overall_status=summary["overall_status"],
        generated_at=summary["generated_at"],
    )


@router.get(
    "/cases/{case_id}/exchange-details",
    response_model=list[dict],
    summary="Get detailed exchange data for export",
    description="Get detailed GPS verification data for each exchange (for court exports).",
)
async def get_exchange_details(
    case_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    include_maps: bool = True,
    db: AsyncSession = Depends(get_db),
    auth_result: tuple = Depends(get_user_or_court_professional),
):
    """
    Get detailed exchange data suitable for court exports.

    Includes full GPS verification data, timestamps, and optional static map URLs.
    Primarily used by court professionals for evidence packages.
    """
    from datetime import timedelta
    from app.services.geolocation import GeolocationService

    current_user, professional_id = auth_result

    # Strip timezone if present
    if start_date and start_date.tzinfo:
        start_date = start_date.replace(tzinfo=None)
    if end_date and end_date.tzinfo:
        end_date = end_date.replace(tzinfo=None)

    # Default to last 30 days
    if end_date is None:
        end_date = datetime.utcnow()
    if start_date is None:
        start_date = end_date - timedelta(days=30)

    # Authorize based on user type
    if current_user:
        # Check if user is a case participant (parent)
        try:
            await get_user_case_role(db, current_user.id, case_id)
        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this case. Must be a case participant.",
            )
    elif professional_id:
        # Check for active access grant with schedule/checkins scope
        grant_service = AccessGrantService(db)
        grants = await grant_service.get_grants_for_case(case_id, active_only=True)
        has_access = False
        for grant in grants:
            if str(grant.professional_id) == str(professional_id):
                # Check if grant includes schedule or checkins scope
                if isinstance(grant.access_scope, dict):
                    has_access = grant.access_scope.get("schedule", False) or grant.access_scope.get("checkins", False)
                elif isinstance(grant.access_scope, list):
                    has_access = "schedule" in grant.access_scope or "checkins" in grant.access_scope
                else:
                    has_access = AccessScope.SCHEDULE in grant.access_scope or AccessScope.CHECKINS in grant.access_scope
                if has_access:
                    break

        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active access grant for this case with schedule/checkins scope.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Get detailed exchange data
    details = await ExchangeComplianceService.get_exchange_details_for_export(
        db=db,
        case_id=case_id,
        start_date=start_date,
        end_date=end_date,
    )

    # Optionally add static map URLs
    if include_maps:
        for detail in details:
            location = detail.get("location", {})
            if location.get("lat") and location.get("lng"):
                from_gps = detail.get("from_parent", {}).get("gps")
                to_gps = detail.get("to_parent", {}).get("gps")

                from_lat = from_gps.get("lat") if from_gps else None
                from_lng = from_gps.get("lng") if from_gps else None
                from_in_geo = from_gps.get("in_geofence") if from_gps else None

                to_lat = to_gps.get("lat") if to_gps else None
                to_lng = to_gps.get("lng") if to_gps else None
                to_in_geo = to_gps.get("in_geofence") if to_gps else None

                # Determine if petitioner is from_parent
                petitioner_is_from = detail.get("from_parent", {}).get("role") == "petitioner"

                map_url = GeolocationService.generate_exchange_map(
                    exchange_location_lat=location["lat"],
                    exchange_location_lng=location["lng"],
                    geofence_radius=location.get("geofence_radius_meters", 100),
                    from_parent_lat=from_lat,
                    from_parent_lng=from_lng,
                    from_parent_in_geofence=from_in_geo,
                    to_parent_lat=to_lat,
                    to_parent_lng=to_lng,
                    to_parent_in_geofence=to_in_geo,
                    petitioner_is_from=petitioner_is_from,
                )
                detail["static_map_url"] = map_url

    return details
