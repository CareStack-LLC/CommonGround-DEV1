"""
Authentication endpoints.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    OAuthSyncRequest,
)
from app.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(
    http_request: Request,
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user.

    Creates a user account in Supabase Auth and syncs to local database.
    Sends verification email automatically via Supabase.

    Returns:
        LoginResponse with user data and JWT tokens
    """
    auth_service = AuthService(db)
    user, access_token, refresh_token, checkout_url = await auth_service.register_user(request)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            email_verified=user.email_verified,
            first_name=user.first_name,
            last_name=user.last_name,
        ),
        checkout_url=checkout_url
    )


@router.post("/login")
async def login(
    http_request: Request,
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login user and return access token.

    Authenticates with Supabase and returns JWT tokens.
    Updates last_login timestamp.

    Returns:
        LoginResponse with user data and JWT tokens
    """
    try:
        from app.utils.sentry_helpers import metric_increment, metric_set
        auth_service = AuthService(db)
        user, access_token, refresh_token = await auth_service.login_user(request)

        # Track login metrics
        metric_increment("auth.login.success")
        metric_set("auth.active_users", str(user.id))

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                email=user.email,
                email_verified=user.email_verified,
                first_name=user.first_name,
                last_name=user.last_name,
            )
        )
    except HTTPException:
        from app.utils.sentry_helpers import metric_increment
        metric_increment("auth.login.failure")
        raise
    except OperationalError as e:
        logger.error(f"Login DB connection error: {e}")
        from app.utils.sentry_helpers import capture_error
        capture_error(e)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again.")
    except IntegrityError as e:
        logger.warning(f"Login integrity error (likely race condition): {e}")
        raise HTTPException(status_code=409, detail="Account sync in progress. Please try again.")
    except Exception as e:
        import traceback
        logger.error(f"Login error: {traceback.format_exc()}")
        from app.utils.sentry_helpers import capture_error
        capture_error(e)
        if settings.ENVIRONMENT == "production":
            raise HTTPException(status_code=500, detail="Login failed. Please try again later.")
        raise HTTPException(status_code=500, detail=f"Login failed: {type(e).__name__}: {str(e)}")


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Logout user.

    Signs out from Supabase and blacklists the JWT token.

    Returns:
        Success message
    """
    # Blacklist the current token in Redis
    try:
        import hashlib
        import redis as redis_lib
        token_hash = hashlib.sha256(credentials.credentials.encode()).hexdigest()
        r = redis_lib.from_url(settings.REDIS_URL, socket_timeout=1)
        r.setex(f"blacklist:{token_hash}", settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, "1")
    except Exception:
        pass  # Non-blocking — token will expire naturally

    auth_service = AuthService(db)
    await auth_service.logout_user(current_user.id)

    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    request: Request,
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token.

    Validates refresh token and issues new access and refresh tokens.

    Args:
        refresh_token: Valid refresh token

    Returns:
        LoginResponse with new tokens
    """
    auth_service = AuthService(db)
    new_access_token, new_refresh_token = await auth_service.refresh_access_token(refresh_token)

    # Get user info for response
    from app.core.security import decode_token
    payload = decode_token(new_access_token)
    user_id = payload.get("sub")

    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()

    return LoginResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            email_verified=user.email_verified,
            first_name=user.first_name,
            last_name=user.last_name,
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information.

    Requires valid access token.

    Returns:
        Current user data
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        email_verified=current_user.email_verified,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
    )


@router.post("/test-email", status_code=status.HTTP_200_OK)
async def test_email(
    email: str = Body(..., embed=True),
    name: str = Body("Friend", embed=True),
    template: str = Body("welcome", embed=True),
):
    """
    Send a test email. Debug endpoint — only available in non-production environments.
    Supported templates: welcome, password_reset, security_alert
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    from app.services.email import EmailService
    email_service = EmailService()
    logger.info(f"Test email '{template}' requested to {email}")

    url = email_service.frontend_url
    result = None

    if template == "welcome":
        result = await email_service.send_welcome_email(to_email=email, user_name=name)
    elif template == "getting_started":
        result = await email_service.send_getting_started_email(to_email=email, user_name=name, completed_steps=["Create account", "Set up profile"], total_steps=5)
    elif template == "password_reset":
        result = await email_service.send_password_reset(to_email=email, to_name=name, reset_link=f"{url}/reset-password?token=test-123")
    elif template == "security_alert":
        result = await email_service.send_security_alert(to_email=email, to_name=name, alert_type="New Login Detected", alert_message="A new sign-in was detected from a device we haven't seen before.", secure_account_url=f"{url}/settings/security", event_timestamp="March 18, 2026 at 8:45 AM PST", device_info="Chrome on macOS", location="Los Angeles, CA", ip_address="192.168.1.x")
    elif template == "parent_invite":
        result = await email_service.send_case_invitation(to_email=email, to_name=name, inviter_name="Sarah Johnson", case_name="Johnson Family", invitation_link=f"{url}/invite/test-123", children_names=["Emma", "Liam"])
    elif template == "professional_invite":
        result = await email_service.send_professional_invitation(to_email=email, to_name=name, inviter_name="Sarah Johnson", case_name="Johnson Family", invitation_link=f"{url}/invite/test-123", role="Mediator", access_description="View custody schedules and communication logs")
    elif template == "circle_invite":
        result = await email_service.send_circle_invitation(to_email=email, to_name=name, inviter_name="Sarah Johnson", child_name="Emma", invitation_link=f"{url}/invite/test-123", relationship="Grandmother")
    elif template == "attorney_invite":
        result = await email_service.send_attorney_case_invitation(to_email=email, to_name=name, inviter_name="Sarah Johnson", family_file_title="Johnson Family", magic_link=f"{url}/attorney/test-123", children_names=["Emma", "Liam"], attorney_name="Robert Chen", firm_name="Chen Family Law")
    elif template == "message_notification":
        result = await email_service.send_message_notification(to_email=email, to_name=name, sender_name="Sarah Johnson", case_name="Johnson Family", message_preview="Hi, I wanted to discuss the schedule for next week...", message_link=f"{url}/messages")
    elif template == "agreement_approval":
        result = await email_service.send_agreement_approval_needed(to_email=email, to_name=name, case_name="Johnson Family", agreement_title="Holiday Schedule 2026", approval_link=f"{url}/agreements/test-123", other_parent_name="Sarah Johnson")
    elif template == "agreement_finalized":
        result = await email_service.send_agreement_finalized(to_email=email, to_name=name, case_name="Johnson Family", agreement_title="Custody Agreement", agreement_url=f"{url}/agreements/test-123", parent_a_name="TJ", parent_b_name="Sarah Johnson")
    elif template == "exchange_reminder":
        from datetime import datetime, timedelta
        result = await email_service.send_exchange_reminder(to_email=email, to_name=name, event_title="Weekend Exchange", event_time=datetime.now() + timedelta(hours=24), location="123 Main St, Los Angeles, CA", children_names=["Emma", "Liam"])
    elif template == "kidcoms_call":
        result = await email_service.send_kidcoms_call_notification(to_email=email, to_name=name, caller_name="Grandma Rose", child_name="Emma", call_link=f"{url}/kidspace/call/test-123", caller_relationship="Grandmother")
    elif template == "expense_request":
        result = await email_service.send_expense_request(to_email=email, to_name=name, requester_name="Sarah Johnson", expense_title="School Supplies", expense_category="Education", total_amount=85.50, your_share=42.75, approval_link=f"{url}/clearfund/test-123")
    elif template == "expense_approved":
        result = await email_service.send_expense_approved(to_email=email, to_name=name, expense_title="School Supplies", expense_category="Education", total_amount=85.50, approver_name="TJ", approved_date="March 18, 2026", view_link=f"{url}/clearfund")
    elif template == "payment_reminder":
        result = await email_service.send_payment_reminder(to_email=email, to_name=name, amount_due=42.75, due_date="March 25, 2026", payment_url=f"{url}/clearfund/pay")
    elif template == "subscription_activated":
        result = await email_service.send_subscription_activated(to_email=email, to_name=name, plan_name="CommonGround Pro", features=["Unlimited messaging", "Court-ready reports", "Priority ARIA analysis", "Professional access"])
    elif template == "subscription_cancelled":
        result = await email_service.send_subscription_cancelled(to_email=email, to_name=name, plan_name="CommonGround Pro", end_date="April 18, 2026")
    elif template == "payment_failed":
        result = await email_service.send_payment_failed(to_email=email, to_name=name, plan_name="CommonGround Pro", retry_url=f"{url}/settings/billing")
    elif template == "aria_intervention":
        result = await email_service.send_aria_intervention(to_email=email, to_name=name, category="Hostile Language", suggestion="Consider rephrasing to focus on the children's needs.", conversation_url=f"{url}/messages")
    elif template == "event_created":
        result = await email_service.send_event_created(to_email=email, to_name=name, event_title="Parent-Teacher Conference", event_date="March 25, 2026", event_time="3:00 PM", creator_name="Sarah Johnson")
    elif template == "agreement_expiring":
        result = await email_service.send_agreement_expiring(to_email=email, to_name=name, agreement_name="Summer Schedule Agreement", expiry_date="April 1, 2026", days_remaining=14)
    elif template == "report_ready":
        result = await email_service.send_report_ready(to_email=email, to_name=name, report_type="Monthly Compliance Report", date_range="February 2026", family_file_name="Johnson Family", download_url=f"{url}/reports/test-123")
    elif template == "compliance_monthly":
        result = await email_service.send_compliance_report(to_email=email, to_name=name, case_name="Johnson Family", on_time_rate=94.5, total_exchanges=18, report_link=f"{url}/reports/test-123", month_name="February")
    elif template == "newsletter_welcome":
        result = await email_service.send_newsletter_welcome(to_email=email)
    elif template == "contact_confirmation":
        result = await email_service.send_contact_form_confirmation(to_email=email, name=name)
    else:
        templates = ["welcome", "getting_started", "password_reset", "security_alert", "parent_invite", "professional_invite", "circle_invite", "attorney_invite", "message_notification", "agreement_approval", "agreement_finalized", "exchange_reminder", "kidcoms_call", "expense_request", "expense_approved", "payment_reminder", "subscription_activated", "subscription_cancelled", "payment_failed", "aria_intervention", "event_created", "agreement_expiring", "report_ready", "compliance_monthly", "newsletter_welcome", "contact_confirmation"]
        return {"error": f"Unknown template: {template}", "available": templates}

    return {
        "sent": result is not None,
        "message_id": result,
        "template": template,
        "email_enabled": email_service.enabled,
    }


@router.post("/password-reset/request", status_code=status.HTTP_200_OK)
async def request_password_reset(
    http_request: Request,
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request password reset email.

    Sends a password reset link to the provided email address.
    Always returns success to prevent email enumeration attacks.

    Args:
        request: Email address for password reset

    Returns:
        Success message
    """
    auth_service = AuthService(db)
    await auth_service.request_password_reset(request.email)

    return {"message": "If an account exists for this email, a password reset link has been sent."}


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_password_reset(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """
    Confirm password reset with token.

    Verifies the reset token and updates the password.

    Args:
        request: Token and new password

    Returns:
        Success message
    """
    auth_service = AuthService(db)
    await auth_service.confirm_password_reset(request.token, request.new_password)

    return {"message": "Password has been reset successfully."}


@router.post("/magic-link", status_code=status.HTTP_200_OK)
async def send_magic_link(
    request: Request,
    email: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a magic link for passwordless authentication.

    Uses Supabase OTP to send a sign-in link to the user's email.
    If the user doesn't exist, creates a new account.

    Returns:
        Success message (always succeeds to prevent email enumeration)
    """
    from app.core.supabase import get_supabase_client
    supabase = get_supabase_client()

    try:
        supabase.auth.sign_in_with_otp({
            "email": email,
            "options": {
                "should_create_user": True,
            }
        })
    except Exception:
        pass  # Silent failure to prevent email enumeration

    return {"message": "If an account exists for this email, a sign-in link has been sent."}


@router.post("/oauth/sync", response_model=LoginResponse)
async def oauth_sync(
    http_request: Request,
    request: OAuthSyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Sync OAuth user with backend database.

    Called after successful OAuth authentication (Google, Apple, etc.)
    to create or update the user in our database and return JWT tokens.

    Args:
        request: OAuth user data from Supabase

    Returns:
        LoginResponse with user data and JWT tokens
    """
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.oauth_sync(request)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            email_verified=user.email_verified,
            first_name=user.first_name,
            last_name=user.last_name,
        )
    )
