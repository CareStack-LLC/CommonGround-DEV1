"""
Authentication service for user registration, login, and token management.
"""

from datetime import datetime
from typing import Tuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.supabase import get_supabase_client
from app.models.user import User, UserProfile
from app.schemas.auth import RegisterRequest, LoginRequest


class AuthService:
    """Service for handling authentication operations."""

    def __init__(self, db: AsyncSession):
        """
        Initialize auth service.

        Args:
            db: Database session
        """
        self.db = db
        self.supabase = get_supabase_client()

    async def register_user(self, request: RegisterRequest) -> Tuple[User, str, str]:
        """
        Register a new user.

        Creates user in Supabase Auth and syncs to local database.

        Args:
            request: Registration request data

        Returns:
            Tuple of (User, access_token, refresh_token)

        Raises:
            HTTPException: If registration fails
        """
        # Check if user already exists
        result = await self.db.execute(
            select(User).where(User.email == request.email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        try:
            # Create user in Supabase Auth
            auth_response = self.supabase.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "first_name": request.first_name,
                        "last_name": request.last_name,
                    }
                }
            })

            if not auth_response.user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user in Supabase"
                )

            supabase_user = auth_response.user

            # Create user in local database
            user = User(
                id=supabase_user.id,
                supabase_id=supabase_user.id,
                email=request.email,
                email_verified=supabase_user.email_confirmed_at is not None,
                first_name=request.first_name,
                last_name=request.last_name,
                phone=request.phone,
                is_active=True,
            )
            self.db.add(user)

            # Create user profile
            profile = UserProfile(
                user_id=user.id,
                first_name=request.first_name,
                last_name=request.last_name,
            )
            self.db.add(profile)

            await self.db.commit()
            await self.db.refresh(user)

            # Create JWT tokens
            access_token = create_access_token(data={"sub": user.id})
            refresh_token = create_refresh_token(data={"sub": user.id})

            return user, access_token, refresh_token

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {str(e)}"
            ) from e

    async def login_user(self, request: LoginRequest) -> Tuple[User, str, str]:
        """
        Login a user.

        Authenticates with Supabase and returns JWT tokens.

        Args:
            request: Login request data

        Returns:
            Tuple of (User, access_token, refresh_token)

        Raises:
            HTTPException: If login fails
        """
        try:
            # Authenticate with Supabase
            auth_response = self.supabase.auth.sign_in_with_password({
                "email": request.email,
                "password": request.password,
            })

            if not auth_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )

            supabase_user = auth_response.user

            # Get user from local database
            result = await self.db.execute(
                select(User).where(User.supabase_id == supabase_user.id)
            )
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found in local database"
                )

            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is inactive"
                )

            # Update last login timestamp
            user.last_login = datetime.utcnow()
            await self.db.commit()

            # Create JWT tokens
            access_token = create_access_token(data={"sub": user.id})
            refresh_token = create_refresh_token(data={"sub": user.id})

            return user, access_token, refresh_token

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Login failed: {str(e)}"
            ) from e

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, str]:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token: Refresh token

        Returns:
            Tuple of (new_access_token, new_refresh_token)

        Raises:
            HTTPException: If refresh fails
        """
        try:
            # Decode and verify refresh token
            payload = decode_token(refresh_token)

            # Verify token type
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )

            # Get user ID
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )

            # Verify user exists and is active
            result = await self.db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is inactive"
                )

            # Create new tokens
            new_access_token = create_access_token(data={"sub": user.id})
            new_refresh_token = create_refresh_token(data={"sub": user.id})

            return new_access_token, new_refresh_token

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token refresh failed: {str(e)}"
            ) from e

    async def logout_user(self, user_id: str) -> None:
        """
        Logout a user.

        Currently just signs out from Supabase. In production, you might want
        to implement token blacklisting.

        Args:
            user_id: User ID to logout

        Raises:
            HTTPException: If logout fails
        """
        try:
            # Sign out from Supabase
            self.supabase.auth.sign_out()
        except Exception as e:
            # Don't fail if Supabase sign out fails
            pass
