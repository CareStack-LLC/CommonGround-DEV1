"""
Authentication endpoints.
"""

from fastapi import APIRouter, Depends, status, Body
from sqlalchemy.ext.asyncio import AsyncSession

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
    user, access_token, refresh_token = await auth_service.register_user(request)

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


@router.post("/login", response_model=LoginResponse)
async def login(
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
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.login_user(request)

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


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Logout user.

    Signs out from Supabase. Client should discard tokens.

    Returns:
        Success message
    """
    auth_service = AuthService(db)
    await auth_service.logout_user(current_user.id)

    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
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


@router.post("/password-reset/request", status_code=status.HTTP_200_OK)
async def request_password_reset(
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


@router.post("/oauth/sync", response_model=LoginResponse)
async def oauth_sync(
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
