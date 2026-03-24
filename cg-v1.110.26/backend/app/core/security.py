"""
Security utilities for authentication and authorization.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.kidcoms import ChildUser, CircleUser

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Data to encode in the token
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Set expiration, and only set type to "access" if not already specified
    to_encode["exp"] = expire
    if "type" not in to_encode:
        to_encode["type"] = "access"

    # Use JWT_SECRET_KEY if set, otherwise fall back to SECRET_KEY
    secret_key = settings.JWT_SECRET_KEY or settings.SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=settings.JWT_ALGORITHM)

    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Create a JWT refresh token.

    Args:
        data: Data to encode in the token

    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})

    # Use JWT_SECRET_KEY if set, otherwise fall back to SECRET_KEY
    secret_key = settings.JWT_SECRET_KEY or settings.SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=settings.JWT_ALGORITHM)

    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT token.

    Args:
        token: JWT token to decode

    Returns:
        Decoded token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Use JWT_SECRET_KEY if set, otherwise fall back to SECRET_KEY
        secret_key = settings.JWT_SECRET_KEY or settings.SECRET_KEY
        payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from the JWT token.

    Args:
        credentials: HTTP authorization credentials
        db: Database session

    Returns:
        Current user

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials

    # Check if token has been blacklisted (logout)
    try:
        import hashlib
        import redis
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        r = redis.from_url(settings.REDIS_URL, socket_timeout=1)
        if r.get(f"blacklist:{token_hash}"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception as e:
        # SECURITY TRADEOFF: Fail-open for availability — if Redis is down, we allow
        # the token through rather than blocking all authenticated requests. This means
        # revoked tokens may be accepted while Redis is unavailable. We log this as an
        # error so it can be monitored and addressed quickly.
        logger.error(
            "SECURITY: Redis unavailable during token blacklist check — "
            "revoked tokens may be accepted. Error: %s", str(e)
        )

    # Decode token
    payload = decode_token(token)

    # Verify token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database with profile eager-loaded
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.profile))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    # Set Sentry user context for error tracking
    import sentry_sdk as _sentry
    _sentry.set_user({"id": str(user.id)})
    if user.profile:
        _sentry.set_tag("subscription_tier", user.profile.subscription_tier or "unknown")

    return user


async def get_current_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current authenticated user with verified email.

    Use this dependency for sensitive operations that require
    email verification (message sending, export generation, etc.).
    """
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before performing this action.",
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current authenticated admin user.

    Requires the user to have is_admin=True.
    Used by SuperAdmin Portal endpoints.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current active user.

    Args:
        current_user: Current user from get_current_user

    Returns:
        Current active user

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_current_child_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> ChildUser:
    """
    Get the current authenticated child user from the JWT token.

    Child tokens have type="child_user" and include child_id and family_file_id.

    Args:
        credentials: HTTP authorization credentials
        db: Database session

    Returns:
        Current child user

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials

    # Decode token
    payload = decode_token(token)

    # Verify it's a child user token
    token_type = payload.get("type")
    if token_type != "child_user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type - expected child_user token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get child user ID from token
    child_user_id: str = payload.get("sub")
    if child_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get child user from database
    result = await db.execute(select(ChildUser).where(ChildUser.id == child_user_id))
    child_user = result.scalar_one_or_none()

    if child_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Child user not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not child_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive child user",
        )

    import sentry_sdk as _sentry
    _sentry.set_user({"id": str(child_user.id)})
    _sentry.set_tag("user_type", "child")

    return child_user


async def get_current_circle_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> CircleUser:
    """
    Get the current authenticated circle user from the JWT token.

    Circle user tokens have type="circle_user" and include contact_id and family_file_id.

    Args:
        credentials: HTTP authorization credentials
        db: Database session

    Returns:
        Current circle user

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials

    # Decode token
    payload = decode_token(token)

    # Verify it's a circle user token
    token_type = payload.get("type")
    if token_type != "circle_user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type - expected circle_user token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get circle user ID from token
    circle_user_id: str = payload.get("sub")
    if circle_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get circle user from database
    result = await db.execute(select(CircleUser).where(CircleUser.id == circle_user_id))
    circle_user = result.scalar_one_or_none()

    if circle_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Circle user not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not circle_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive circle user",
        )

    return circle_user


async def get_current_participant_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get the current authenticated user (Parent, Child, or Circle Contact).
    Returns a dict with 'type' and 'user' object.
    
    Args:
        credentials: HTTP authorization credentials
        db: Database session
        
    Returns:
        Dict containing user type and user object
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    payload = decode_token(token)
    token_type = payload.get("type", "access")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if token_type == "access":
        result = await db.execute(
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.profile))
        )
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"type": "parent", "user": user}

    elif token_type == "child_user":
        result = await db.execute(select(ChildUser).where(ChildUser.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Child user not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"type": "child", "user": user}

    elif token_type == "circle_user":
        result = await db.execute(select(CircleUser).where(CircleUser.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Circle user not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"type": "circle_contact", "user": user}

    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token type for participant: {token_type}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_parent_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Ensure the current user is a parent, NOT a professional-only account.

    Professionals must use /professional/* endpoints to interact with
    case data. This dependency blocks professionals from calling parent-
    facing write endpoints (messages, agreements, schedules, etc.)
    that they shouldn't directly modify.

    A user who is BOTH a parent (has family files) AND a professional
    is allowed through — the guard only blocks professional-only accounts
    accessing parent endpoints they have no ownership of.
    """
    from app.models.professional import ProfessionalProfile
    from app.models.family_file import FamilyFile

    # Check if user has a professional profile
    prof_result = await db.execute(
        select(ProfessionalProfile).where(
            ProfessionalProfile.user_id == str(current_user.id),
            ProfessionalProfile.is_active == True,
        )
    )
    has_professional_profile = prof_result.scalar_one_or_none() is not None

    if not has_professional_profile:
        # Regular parent user — allow
        return current_user

    # User IS a professional. Check if they also own family files as a parent.
    ff_result = await db.execute(
        select(FamilyFile.id).where(
            (FamilyFile.parent_a_id == str(current_user.id)) |
            (FamilyFile.parent_b_id == str(current_user.id))
        ).limit(1)
    )
    is_also_parent = ff_result.scalar_one_or_none() is not None

    if is_also_parent:
        # Dual-role user (parent + professional) — allow parent endpoints
        return current_user

    # Professional-only account trying to use parent endpoints
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Professional accounts must use the professional portal to access case data.",
    )
