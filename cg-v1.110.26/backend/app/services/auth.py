"""
Authentication service for user registration, login, and token management.
"""

from datetime import datetime
from typing import Tuple, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.supabase import get_supabase_client
from app.models.user import User, UserProfile
from app.schemas.auth import RegisterRequest, LoginRequest, OAuthSyncRequest
import logging

logger = logging.getLogger(__name__)


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

    async def register_user(self, request: RegisterRequest) -> Tuple[User, str, str, Optional[str]]:
        """
        Register a new user.

        Creates user in Supabase Auth and syncs to local database.
        Also creates a Stripe customer and initiates checkout if needed.

        Args:
            request: Registration request data

        Returns:
            Tuple of (User, access_token, refresh_token, checkout_url)

        Raises:
            HTTPException: If registration fails
        """
        try:
            logger.info(f"🚀 Starting registration for: {request.email}")
            
            # Check if user already exists
            result = await self.db.execute(
                select(User).where(User.email == request.email)
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                logger.warning(f"⚠️ Registration failed: Email {request.email} already exists")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

            # Create user in Supabase Auth
            logger.info(f"📡 Creating Supabase Auth account for {request.email}")
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
                logger.error(f"❌ Supabase Auth failed for {request.email}: No user in response")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user in Supabase"
                )

            supabase_user = auth_response.user
            logger.info(f"✅ Supabase User created: {supabase_user.id}")

            # 1. Create Stripe Customer
            logger.info(f"💳 Creating Stripe customer for {request.email}")
            from app.services.stripe_service import StripeService
            stripe_service = StripeService()
            
            stripe_customer = await stripe_service.create_customer(
                email=request.email,
                name=f"{request.first_name} {request.last_name}",
                user_id=supabase_user.id
            )
            logger.info(f"✅ Stripe Customer created: {stripe_customer['id']}")

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
                stripe_customer_id=stripe_customer["id"],
                subscription_tier="web_starter", # Default to free tier initially
                subscription_status="active" if not request.subscription_price_id else "trial"
            )
            self.db.add(profile)
            logger.info(f"📝 Local database records prepared for {user.id}")

            # 2. Handle Subscription Checkout if needed
            checkout_url = None
            if request.subscription_price_id and "price_1T7Wgn" not in request.subscription_price_id:
                logger.info(f"🛒 Initiating checkout for price: {request.subscription_price_id}")
                is_free = request.subscription_price_id == "price_1T7WgnB3EXvvERPfyu40gtfE"
                
                if not is_free:
                    from app.core.config import settings
                    checkout = await stripe_service.create_subscription_checkout(
                        customer_id=stripe_customer["id"],
                        price_id=request.subscription_price_id,
                        success_url=f"{settings.FRONTEND_URL}/dashboard?registration=complete",
                        cancel_url=f"{settings.FRONTEND_URL}/register?step=2&error=checkout_cancelled",
                        metadata={"user_id": user.id}
                    )
                    checkout_url = checkout["url"]
                    logger.info(f"🔗 Checkout URL generated: {checkout_url}")

            await self.db.commit()
            logger.info(f"💾 Database transaction committed for {user.id}")
            await self.db.refresh(user)

            # Create JWT tokens
            access_token = create_access_token(data={"sub": user.id})
            refresh_token = create_refresh_token(data={"sub": user.id})

            logger.info(f"✨ Registration successful for {request.email}")
            return user, access_token, refresh_token, checkout_url

        except HTTPException as e:
            logger.warning(f"⚠️ Registration HTTP error for {request.email}: {e.detail}")
            raise
        except Exception as e:
            logger.error(f"💥 Unexpected registration error for {request.email}: {str(e)}", exc_info=True)
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
            print(f"Attempting login for email: {request.email}")
            # Authenticate with Supabase
            try:
                auth_response = self.supabase.auth.sign_in_with_password({
                    "email": request.email,
                    "password": request.password,
                })
                print("Supabase auth successful")
            except Exception as supabase_error:
                print(f"Supabase auth failed: {supabase_error}")
                raise supabase_error

            if not auth_response.user:
                print("No user in auth response")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )

            supabase_user = auth_response.user
            print(f"Supabase user found: {supabase_user.id}")

            # First, try to get user by supabase_id
            try:
                result = await self.db.execute(
                    select(User).where(User.supabase_id == supabase_user.id)
                )
                user = result.scalar_one_or_none()
                print(f"Local user by ID search result: {user}")
            except Exception as db_error:
                print(f"Database query by ID failed: {db_error}")
                raise db_error

            # If not found by supabase_id, try by email
            if not user:
                print("User not found by ID, trying email")
                result = await self.db.execute(
                    select(User).where(User.email == supabase_user.email)
                )
                user = result.scalar_one_or_none()
                print(f"Local user by email search result: {user}")
                
                # If found by email, sync the supabase_id
                if user:
                    print("Syncing supabase_id")
                    user.supabase_id = supabase_user.id
                    await self.db.commit()
                    await self.db.refresh(user)

                # Ensure profile exists even if user already existed
                if user:
                    # Check for profile
                    result = await self.db.execute(
                        select(UserProfile).where(UserProfile.user_id == user.id)
                    )
                    profile = result.scalar_one_or_none()
                    if not profile:
                        print(f"Profile missing for existing user {user.id}, creating one")
                        profile = UserProfile(
                            user_id=user.id,
                            first_name=user.first_name,
                            last_name=user.last_name,
                            subscription_tier="web_starter",
                            subscription_status="active"
                        )
                        self.db.add(profile)
                        await self.db.commit()

            if not user:
                print("User not found locally, auto-creating")
                # Auto-create user if they exist in Supabase Auth but not locally
                # This handles users created directly in Supabase or migrated databases
                user_metadata = supabase_user.user_metadata or {}
                first_name = (
                    user_metadata.get("first_name") or
                    user_metadata.get("full_name", "").split()[0] if user_metadata.get("full_name") else
                    supabase_user.email.split("@")[0] if supabase_user.email else "User"
                )
                last_name = (
                    user_metadata.get("last_name") or
                    " ".join(user_metadata.get("full_name", "").split()[1:]) if user_metadata.get("full_name") else ""
                )

                user = User(
                    id=supabase_user.id,
                    supabase_id=supabase_user.id,
                    email=supabase_user.email,
                    email_verified=supabase_user.email_confirmed_at is not None,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True,
                )
                self.db.add(user)

                # Create user profile
                profile = UserProfile(
                    user_id=user.id,
                    first_name=first_name,
                    last_name=last_name,
                )
                self.db.add(profile)

                await self.db.commit()
                await self.db.refresh(user)
                print(f"User created: {user.id}")

            if not user.is_active:
                print("User is inactive")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is inactive"
                )

            # Update last login timestamp
            user.last_login = datetime.utcnow()
            await self.db.commit()
            print("Login flow completed successfully")

            # Create JWT tokens
            access_token = create_access_token(data={"sub": user.id})
            refresh_token = create_refresh_token(data={"sub": user.id})

            return user, access_token, refresh_token

        except HTTPException:
            raise
        except Exception as e:
            print(f"Login failed with exception: {str(e)}")
            import traceback
            traceback.print_exc()
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

    async def request_password_reset(self, email: str) -> None:
        """
        Request a password reset email.

        Sends password reset email via Supabase Auth.
        Always succeeds to prevent email enumeration attacks.

        Args:
            email: User email address
        """
        try:
            # Use Supabase's built-in password reset
            self.supabase.auth.reset_password_for_email(
                email,
                options={
                    "redirect_to": "https://commonground.app/reset-password"
                }
            )
        except Exception:
            # Silently ignore errors to prevent email enumeration
            pass

    async def confirm_password_reset(self, token: str, new_password: str) -> None:
        """
        Confirm password reset with token.

        Verifies the reset token and updates the password.

        Args:
            token: Password reset token from email
            new_password: New password to set

        Raises:
            HTTPException: If reset fails
        """
        try:
            # Supabase handles token verification and password update
            self.supabase.auth.update_user({"password": new_password})
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            ) from e

    async def oauth_sync(self, request: OAuthSyncRequest) -> Tuple[User, str, str]:
        """
        Sync OAuth user with backend database.

        Creates or updates user in local database after OAuth authentication.
        OAuth users don't have passwords - they authenticate via Supabase OAuth.

        Args:
            request: OAuth sync request with user data from Supabase

        Returns:
            Tuple of (User, access_token, refresh_token)
        """
        # Check if user already exists by Supabase ID or email
        result = await self.db.execute(
            select(User).where(
                (User.supabase_id == request.supabase_id) |
                (User.email == request.email)
            )
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # Update existing user with OAuth data
            existing_user.supabase_id = request.supabase_id
            existing_user.email_verified = True  # OAuth emails are verified
            if request.first_name and not existing_user.first_name:
                existing_user.first_name = request.first_name
            if request.last_name and not existing_user.last_name:
                existing_user.last_name = request.last_name
            existing_user.last_login = datetime.utcnow()

            # Ensure user has a profile
            profile_result = await self.db.execute(
                select(UserProfile).where(UserProfile.user_id == existing_user.id)
            )
            existing_profile = profile_result.scalar_one_or_none()
            if not existing_profile:
                print(f"User {existing_user.id} missing profile. Creating one.")
                profile = UserProfile(
                    user_id=existing_user.id,
                    first_name=request.first_name or existing_user.first_name,
                    last_name=request.last_name or existing_user.last_name or "",
                    avatar_url=request.avatar_url,
                )
                self.db.add(profile)

            await self.db.commit()
            await self.db.refresh(existing_user)
            user = existing_user
        else:
            # Create new user from OAuth data
            user = User(
                email=request.email,
                supabase_id=request.supabase_id,
                first_name=request.first_name,
                last_name=request.last_name or "",
                email_verified=True,  # OAuth emails are verified
                is_active=True,
                last_login=datetime.utcnow(),
            )
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)

            # Create default profile for new OAuth users
            profile = UserProfile(
                user_id=user.id,
                first_name=request.first_name,
                last_name=request.last_name or "",
                avatar_url=request.avatar_url,
            )
            self.db.add(profile)
            await self.db.commit()

        # Generate our JWT tokens
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})

        return user, access_token, refresh_token
