# CommonGround V1 - Authentication & Authorization Guide

**Last Updated:** January 15, 2026
**Version:** 1.1.0
**Security Level:** Production

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Architecture](#authentication-architecture)
3. [User Registration](#user-registration)
4. [Login & Token Management](#login--token-management)
5. [Password Reset Flow](#password-reset-flow)
6. [JWT Token Structure](#jwt-token-structure)
7. [Token Refresh Flow](#token-refresh-flow)
8. [Authorization & Permissions](#authorization--permissions)
9. [Role-Based Access Control](#role-based-access-control)
10. [Case-Level Permissions](#case-level-permissions)
11. [Professional Access (Court Portal)](#professional-access-court-portal)
12. [Security Best Practices](#security-best-practices)
13. [Implementation Details](#implementation-details)
14. [Troubleshooting](#troubleshooting)

---

## Overview

CommonGround uses a multi-layered authentication and authorization system:

1. **Authentication Layer:** Supabase Auth + JWT tokens
2. **Authorization Layer:** Role-based + Case-level permissions
3. **Audit Layer:** Comprehensive action logging

### Key Principles

- **Zero Trust:** Every request is authenticated and authorized
- **Least Privilege:** Users get minimum necessary permissions
- **Defense in Depth:** Multiple security layers
- **Audit Everything:** All access is logged

---

## Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌──────────────┐     ┌───────────────────┐    │
│  │   Client    │────▶│   FastAPI    │────▶│   Supabase Auth   │    │
│  │  (Browser)  │     │   Backend    │     │                   │    │
│  └─────────────┘     └──────────────┘     └───────────────────┘    │
│         │                   │                      │               │
│         │                   │                      │               │
│         ▼                   ▼                      ▼               │
│  ┌─────────────┐     ┌──────────────┐     ┌───────────────────┐    │
│  │ localStorage│     │  JWT Verify  │     │  User Database    │    │
│  │ (tokens)    │     │  Middleware  │     │  (PostgreSQL)     │    │
│  └─────────────┘     └──────────────┘     └───────────────────┘    │
│                                                                     │
│  FLOW:                                                              │
│  1. User submits credentials                                        │
│  2. Backend validates with Supabase                                 │
│  3. Backend generates JWT tokens                                    │
│  4. Client stores tokens in memory/localStorage                     │
│  5. Client includes token in Authorization header                   │
│  6. Backend verifies token on each request                          │
│  7. Backend checks case-level permissions                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| Supabase Auth | Primary identity provider | External service |
| FastAPI Backend | Token generation/validation | `app/core/security.py` |
| JWT Middleware | Request authentication | `app/core/security.py` |
| Permission Service | Authorization checks | `app/services/permissions.py` |

---

## User Registration

### Registration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REGISTRATION FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User Submits Registration Form                                  │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────┐                        │
│  │ POST /api/v1/auth/register              │                        │
│  │ {                                       │                        │
│  │   "email": "user@example.com",          │                        │
│  │   "password": "SecurePass123!",         │                        │
│  │   "first_name": "John",                 │                        │
│  │   "last_name": "Doe"                    │                        │
│  │ }                                       │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│  2. Backend Processing                                              │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────┐                        │
│  │ a. Validate input (Pydantic schema)     │                        │
│  │ b. Check email uniqueness               │                        │
│  │ c. Validate password strength           │                        │
│  │ d. Create Supabase user                 │                        │
│  │ e. Create local user record             │                        │
│  │ f. Create user profile                  │                        │
│  │ g. Generate JWT tokens                  │                        │
│  │ h. Send verification email              │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│  3. Response                                                        │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────┐                        │
│  │ {                                       │                        │
│  │   "user": {...},                        │                        │
│  │   "access_token": "eyJ...",             │                        │
│  │   "refresh_token": "eyJ...",            │                        │
│  │   "expires_in": 1800                    │                        │
│  │ }                                       │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                     │
│  4. Email Verification                                              │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────┐                        │
│  │ User clicks link in email               │                        │
│  │ POST /api/v1/auth/verify-email          │                        │
│  │ { "token": "verification_token" }       │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Password Requirements

```python
# app/core/security.py

PASSWORD_REQUIREMENTS = {
    "min_length": 12,
    "require_uppercase": True,
    "require_lowercase": True,
    "require_digit": True,
    "require_special": True,
    "special_chars": "!@#$%^&*()_+-=[]{}|;:,.<>?",
    "max_length": 128,
    "no_common_passwords": True,
    "no_sequential": True,  # No "abc", "123"
    "no_repetition": True   # No "aaa", "111"
}

def validate_password(password: str) -> tuple[bool, list[str]]:
    """
    Validate password against requirements.
    Returns (is_valid, list_of_errors)
    """
    errors = []

    if len(password) < PASSWORD_REQUIREMENTS["min_length"]:
        errors.append(f"Password must be at least {PASSWORD_REQUIREMENTS['min_length']} characters")

    if PASSWORD_REQUIREMENTS["require_uppercase"] and not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")

    if PASSWORD_REQUIREMENTS["require_lowercase"] and not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")

    if PASSWORD_REQUIREMENTS["require_digit"] and not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one number")

    if PASSWORD_REQUIREMENTS["require_special"]:
        if not any(c in PASSWORD_REQUIREMENTS["special_chars"] for c in password):
            errors.append("Password must contain at least one special character")

    return len(errors) == 0, errors
```

### Email Validation

```python
# Regex pattern for email validation
EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

# Additional checks
- Domain must be valid
- No disposable email domains (optional)
- Email uniqueness check in database
```

---

## Login & Token Management

### Login Flow

```python
# app/api/v1/endpoints/auth.py

@router.post("/login")
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """
    Authenticate user and return JWT tokens.
    """
    # 1. Find user by email
    user = await get_user_by_email(db, credentials.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 2. Verify password
    if not verify_password(credentials.password, user.password_hash):
        # Log failed attempt for rate limiting
        await log_failed_login(db, credentials.email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 3. Check account status
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")

    if not user.email_verified:
        # Optional: Allow login but restrict features
        pass

    # 4. Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # 5. Store refresh token hash
    await store_refresh_token(db, user.id, refresh_token)

    # 6. Update last login
    await update_last_login(db, user.id)

    # 7. Log successful login
    await log_successful_login(db, user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
```

### Token Storage (Frontend)

```typescript
// lib/auth-context.tsx

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

// Store tokens securely
const storeTokens = (accessToken: string, refreshToken: string) => {
  // Access token: Memory only (lost on refresh)
  // This prevents XSS attacks from stealing the token
  setAccessToken(accessToken);

  // Refresh token: HttpOnly cookie (set by backend)
  // This prevents JavaScript access entirely
  // The backend sets this cookie in the login response
};

// Alternative: localStorage (less secure but persists)
const storeTokensLocalStorage = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};
```

---

## Password Reset Flow

*(Added in v1.1.0)*

### Overview

Users can reset their password via a secure email-based flow. The system uses Supabase Auth for token generation and email delivery.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PASSWORD RESET FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User requests password reset                                    │
│     │                                                               │
│     ▼                                                               │
│  POST /api/v1/auth/password-reset/request                           │
│  { "email": "user@example.com" }                                    │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────┐                        │
│  │ Backend processing:                     │                        │
│  │ a. Validate email format                │                        │
│  │ b. Call Supabase resetPasswordForEmail  │                        │
│  │ c. ALWAYS return success (security)     │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│  2. Response (always 200 OK)                                        │
│     │                                                               │
│     ▼                                                               │
│  { "message": "If this email exists, a reset link was sent" }      │
│                                                                     │
│  3. If email exists in system:                                      │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────┐                        │
│  │ Supabase sends email with reset link:   │                        │
│  │ https://app.commonground.co/reset?      │                        │
│  │   token=eyJ...&type=recovery            │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│  4. User clicks link and enters new password                        │
│     │                                                               │
│     ▼                                                               │
│  POST /api/v1/auth/password-reset/confirm                           │
│  {                                                                  │
│    "token": "eyJ...",                                               │
│    "new_password": "NewSecurePass123!"                              │
│  }                                                                  │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────┐                        │
│  │ Backend processing:                     │                        │
│  │ a. Verify token with Supabase           │                        │
│  │ b. Validate password strength           │                        │
│  │ c. Update password                      │                        │
│  │ d. Invalidate all existing sessions     │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│  5. Success response                                                │
│     │                                                               │
│     ▼                                                               │
│  { "message": "Password reset successfully" }                       │
│                                                                     │
│  6. User redirected to login                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### API Endpoints

#### Request Password Reset

```http
POST /api/v1/auth/password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (always 200):**
```json
{
  "message": "If this email exists in our system, a password reset link has been sent"
}
```

#### Confirm Password Reset

```http
POST /api/v1/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewSecurePass123!"
}
```

**Success Response (200):**
```json
{
  "message": "Password has been reset successfully"
}
```

**Error Responses:**
```json
// 400 - Invalid or expired token
{
  "detail": "Invalid or expired reset token"
}

// 400 - Password doesn't meet requirements
{
  "detail": "Password must be at least 12 characters and contain uppercase, lowercase, number, and special character"
}
```

### Security Considerations

1. **Anti-Enumeration:**
   - The request endpoint always returns success, even for non-existent emails
   - This prevents attackers from discovering valid email addresses

2. **Token Expiration:**
   - Reset tokens expire after 1 hour
   - Tokens are single-use (invalidated after successful reset)

3. **Session Invalidation:**
   - All existing sessions are invalidated after password reset
   - User must log in again with new password

4. **Rate Limiting:**
   - Password reset requests are rate-limited to 3 per hour per email
   - Prevents abuse and spam

5. **Password Validation:**
   - New password must meet all security requirements
   - Cannot reuse the current password

### Frontend Implementation

```typescript
// lib/auth.ts

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch('/api/v1/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    throw new Error('Failed to request password reset');
  }

  // Always show success message (anti-enumeration)
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<void> {
  const response = await fetch('/api/v1/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reset password');
  }
}
```

---

## JWT Token Structure

### Access Token

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "550e8400-e29b-41d4-a716-446655440000",
    "type": "access",
    "iat": 1704902400,
    "exp": 1704904200,
    "jti": "unique-token-id"
  }
}
```

| Field | Purpose |
|-------|---------|
| `sub` | User UUID |
| `type` | Token type (access/refresh) |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp |
| `jti` | Unique token identifier (for revocation) |

### Refresh Token

```json
{
  "payload": {
    "sub": "550e8400-e29b-41d4-a716-446655440000",
    "type": "refresh",
    "iat": 1704902400,
    "exp": 1705507200,
    "jti": "refresh-token-id",
    "family": "token-family-id"
  }
}
```

| Field | Purpose |
|-------|---------|
| `family` | Token family for rotation tracking |

### Token Generation

```python
# app/core/security.py

from datetime import datetime, timedelta
from jose import jwt
import secrets

def create_access_token(user_id: str) -> str:
    """Create a new access token."""
    expires = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "type": "access",
        "exp": expires,
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(32)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def create_refresh_token(user_id: str, family: str = None) -> str:
    """Create a new refresh token with family tracking."""
    expires = datetime.utcnow() + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expires,
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(32),
        "family": family or secrets.token_urlsafe(16)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )
```

---

## Token Refresh Flow

### Refresh Token Rotation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Client detects access token expired (or 401 response)           │
│     │                                                               │
│     ▼                                                               │
│  POST /api/v1/auth/refresh                                          │
│  { "refresh_token": "eyJ..." }                                      │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────┐                        │
│  │ Backend validates refresh token:        │                        │
│  │ a. Verify signature                     │                        │
│  │ b. Check expiration                     │                        │
│  │ c. Check token family validity          │                        │
│  │ d. Check if token is revoked            │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│           ┌───────┴───────┐                                         │
│           │               │                                         │
│         Valid          Invalid                                      │
│           │               │                                         │
│           ▼               ▼                                         │
│  ┌─────────────┐   ┌─────────────────┐                              │
│  │ Generate:   │   │ Revoke entire   │                              │
│  │ - New access│   │ token family    │                              │
│  │ - New refr. │   │ Force re-login  │                              │
│  │ (rotation)  │   └─────────────────┘                              │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────┐                        │
│  │ Response:                               │                        │
│  │ {                                       │                        │
│  │   "access_token": "new_eyJ...",         │                        │
│  │   "refresh_token": "new_eyJ...",        │ ◀── IMPORTANT:         │
│  │   "expires_in": 1800                    │     Client must use    │
│  │ }                                       │     new refresh token  │
│  └─────────────────────────────────────────┘     for next refresh   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Refresh Token Reuse Detection

```python
# app/services/auth.py

async def refresh_tokens(
    db: AsyncSession,
    refresh_token: str
) -> TokenResponse:
    """
    Refresh access token using refresh token.
    Implements token rotation for security.
    """
    # 1. Decode and verify token
    payload = verify_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload["sub"]
    token_family = payload["family"]
    token_jti = payload["jti"]

    # 2. Check if token has been used before (reuse detection)
    token_record = await get_refresh_token(db, token_jti)

    if token_record is None:
        # Token not found - might be reuse of old token
        # SECURITY: Revoke entire family
        await revoke_token_family(db, token_family)
        raise HTTPException(
            status_code=401,
            detail="Token reuse detected. Please login again."
        )

    if token_record.used:
        # Token already used - definite reuse attack
        # SECURITY: Revoke entire family immediately
        await revoke_token_family(db, token_family)
        raise HTTPException(
            status_code=401,
            detail="Security alert: Token reuse detected. All sessions revoked."
        )

    # 3. Mark current token as used
    await mark_token_used(db, token_jti)

    # 4. Generate new token pair (same family)
    new_access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id, family=token_family)

    # 5. Store new refresh token
    await store_refresh_token(db, user_id, new_refresh_token)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
```

---

## Authorization & Permissions

### Permission Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION LAYERS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: Authentication                                            │
│  ┌─────────────────────────────────────────┐                        │
│  │ Is the user authenticated?              │                        │
│  │ - Valid JWT token present               │                        │
│  │ - Token not expired                     │                        │
│  │ - User account active                   │                        │
│  └─────────────────────────────────────────┘                        │
│                    │                                                │
│                    ▼                                                │
│  Layer 2: Role-Based Access                                         │
│  ┌─────────────────────────────────────────┐                        │
│  │ What role does the user have?           │                        │
│  │ - parent (standard user)                │                        │
│  │ - professional (GAL, attorney, etc.)    │                        │
│  │ - admin (platform admin)                │                        │
│  └─────────────────────────────────────────┘                        │
│                    │                                                │
│                    ▼                                                │
│  Layer 3: Case-Level Permissions                                    │
│  ┌─────────────────────────────────────────┐                        │
│  │ What is the user's role in THIS case?   │                        │
│  │ - petitioner / respondent               │                        │
│  │ - can_view_financials                   │                        │
│  │ - can_view_messages                     │                        │
│  │ - can_edit_children                     │                        │
│  └─────────────────────────────────────────┘                        │
│                    │                                                │
│                    ▼                                                │
│  Layer 4: Resource-Level Permissions                                │
│  ┌─────────────────────────────────────────┐                        │
│  │ Can user access THIS specific resource? │                        │
│  │ - Is message in user's case?            │                        │
│  │ - Is child in user's case?              │                        │
│  │ - Is export owned by user?              │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Permission Check Flow

```python
# app/services/permissions.py

from enum import Enum
from typing import Optional

class Permission(Enum):
    VIEW_CASE = "view_case"
    EDIT_CASE = "edit_case"
    VIEW_MESSAGES = "view_messages"
    SEND_MESSAGES = "send_messages"
    VIEW_FINANCIALS = "view_financials"
    SUBMIT_EXPENSES = "submit_expenses"
    APPROVE_EXPENSES = "approve_expenses"
    VIEW_SCHEDULE = "view_schedule"
    EDIT_SCHEDULE = "edit_schedule"
    VIEW_AGREEMENTS = "view_agreements"
    EDIT_AGREEMENTS = "edit_agreements"
    APPROVE_AGREEMENTS = "approve_agreements"
    EDIT_CHILDREN = "edit_children"
    EXPORT_DATA = "export_data"

async def check_permission(
    db: AsyncSession,
    user_id: str,
    case_id: str,
    permission: Permission
) -> bool:
    """
    Check if user has specific permission in a case.
    """
    # 1. Get user's participation in the case
    participant = await get_case_participant(db, case_id, user_id)

    if not participant:
        return False

    if not participant.is_active:
        return False

    # 2. Check permission based on participant settings
    permission_map = {
        Permission.VIEW_CASE: True,  # All participants can view
        Permission.EDIT_CASE: True,  # All participants can edit basic info
        Permission.VIEW_MESSAGES: participant.can_view_messages,
        Permission.SEND_MESSAGES: participant.can_view_messages,
        Permission.VIEW_FINANCIALS: participant.can_view_financials,
        Permission.SUBMIT_EXPENSES: participant.can_view_financials,
        Permission.APPROVE_EXPENSES: participant.can_view_financials,
        Permission.VIEW_SCHEDULE: participant.can_view_schedule,
        Permission.EDIT_SCHEDULE: participant.can_view_schedule,
        Permission.VIEW_AGREEMENTS: True,
        Permission.EDIT_AGREEMENTS: True,
        Permission.APPROVE_AGREEMENTS: True,
        Permission.EDIT_CHILDREN: participant.can_edit_children,
        Permission.EXPORT_DATA: True
    }

    return permission_map.get(permission, False)

# Dependency for routes
async def require_permission(
    permission: Permission,
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    FastAPI dependency to require specific permission.
    """
    has_permission = await check_permission(
        db, current_user.id, case_id, permission
    )

    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied: {permission.value}"
        )

    return True
```

---

## Role-Based Access Control

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `parent` | Standard user (co-parent) | Own cases only |
| `professional` | Legal professional | Granted cases only |
| `admin` | Platform administrator | All cases (rare) |

### Case Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `petitioner` | Initiating parent | Full case access |
| `respondent` | Invited parent | Full case access |
| `gal` | Guardian ad Litem | Read-only + exports |
| `attorney_petitioner` | Attorney for petitioner | Client-side read |
| `attorney_respondent` | Attorney for respondent | Client-side read |
| `mediator` | Neutral mediator | Limited read access |

### Role Hierarchy

```python
# app/core/roles.py

from enum import IntEnum

class AccessLevel(IntEnum):
    NONE = 0
    READ_LIMITED = 1
    READ_FULL = 2
    WRITE_LIMITED = 3
    WRITE_FULL = 4
    ADMIN = 5

ROLE_PERMISSIONS = {
    "petitioner": {
        "access_level": AccessLevel.WRITE_FULL,
        "can_invite": True,
        "can_modify_agreement": True,
        "can_approve_agreement": True,
        "can_grant_professional_access": True,
        "can_export": True
    },
    "respondent": {
        "access_level": AccessLevel.WRITE_FULL,
        "can_invite": False,
        "can_modify_agreement": True,
        "can_approve_agreement": True,
        "can_grant_professional_access": True,
        "can_export": True
    },
    "gal": {
        "access_level": AccessLevel.READ_FULL,
        "can_invite": False,
        "can_modify_agreement": False,
        "can_approve_agreement": False,
        "can_grant_professional_access": False,
        "can_export": True
    },
    "attorney_petitioner": {
        "access_level": AccessLevel.READ_LIMITED,
        "client_side": "petitioner",
        "can_export": True
    },
    "attorney_respondent": {
        "access_level": AccessLevel.READ_LIMITED,
        "client_side": "respondent",
        "can_export": True
    },
    "mediator": {
        "access_level": AccessLevel.READ_LIMITED,
        "can_export": False
    }
}
```

---

## Case-Level Permissions

### Participant Permissions

```python
# Database model: case_participants

class CaseParticipant(Base):
    __tablename__ = "case_participants"

    id: UUID
    case_id: UUID
    user_id: UUID
    role: str  # petitioner, respondent

    # Permission flags
    is_active: bool = True
    can_view_financials: bool = True
    can_view_messages: bool = True
    can_view_schedule: bool = True
    can_edit_children: bool = True

    # Timestamps
    invited_at: datetime
    joined_at: datetime
    left_at: datetime | None
```

### Permission Restriction Scenarios

1. **Court Order Restrictions:**
```python
# When court orders restrict a parent's access
async def apply_court_restrictions(
    db: AsyncSession,
    case_id: str,
    parent_id: str,
    restrictions: list[str]
):
    participant = await get_case_participant(db, case_id, parent_id)

    if "no_financial_access" in restrictions:
        participant.can_view_financials = False

    if "supervised_messaging" in restrictions:
        # Messages go through moderator
        participant.requires_message_approval = True

    await db.commit()
```

2. **Professional Access Expiration:**
```python
# Automatically revoke expired professional access
@scheduled_task(cron="0 0 * * *")  # Daily at midnight
async def revoke_expired_access():
    expired = await get_expired_legal_access()
    for access in expired:
        access.is_active = False
        await log_access_revocation(access.id, "expired")
```

---

## Professional Access (Court Portal)

### Access Grant Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                PROFESSIONAL ACCESS GRANT FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Parent initiates access grant                                   │
│     POST /api/v1/court/access                                       │
│     {                                                               │
│       "case_id": "xxx",                                             │
│       "professional_email": "attorney@firm.com",                    │
│       "role": "attorney_petitioner",                                │
│       "bar_number": "CA123456",                                     │
│       "end_date": "2026-04-10"                                      │
│     }                                                               │
│                    │                                                │
│                    ▼                                                │
│  2. System creates pending access record                            │
│     ┌─────────────────────────────────┐                             │
│     │ status: pending_verification    │                             │
│     │ verification_status: pending    │                             │
│     └───────────────┬─────────────────┘                             │
│                     │                                               │
│                     ▼                                               │
│  3. Email sent to professional                                      │
│     ┌─────────────────────────────────┐                             │
│     │ "You've been granted access..." │                             │
│     │ Click here to claim access      │                             │
│     └───────────────┬─────────────────┘                             │
│                     │                                               │
│                     ▼                                               │
│  4. Professional creates account or logs in                         │
│     POST /api/v1/court/access/claim/{token}                         │
│                     │                                               │
│                     ▼                                               │
│  5. Bar number verification (optional)                              │
│     ┌─────────────────────────────────┐                             │
│     │ Manual or automated check       │                             │
│     │ against state bar database      │                             │
│     └───────────────┬─────────────────┘                             │
│                     │                                               │
│                     ▼                                               │
│  6. Access activated                                                │
│     ┌─────────────────────────────────┐                             │
│     │ status: active                  │                             │
│     │ verification_status: verified   │                             │
│     │ Access logged in audit trail    │                             │
│     └─────────────────────────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Professional Access Limits

| Role | Default Duration | Max Duration | Renewable |
|------|------------------|--------------|-----------|
| GAL | 120 days | 365 days | Yes |
| Attorney (Pet.) | 90 days | 180 days | Yes |
| Attorney (Resp.) | 90 days | 180 days | Yes |
| Mediator | 60 days | 90 days | Yes |
| Court Clerk | 30 days | 60 days | Yes |

### Access Logging

```python
# All professional access is logged

class LegalAccessLog(Base):
    __tablename__ = "legal_access_log"

    id: UUID
    access_id: UUID  # Reference to legal_access
    action: str  # login, view_messages, view_schedule, export, etc.
    resource_type: str | None  # message, agreement, etc.
    resource_id: UUID | None
    ip_address: str
    user_agent: str
    created_at: datetime

# Logged actions
LOGGED_ACTIONS = [
    "login",
    "view_case_overview",
    "view_messages",
    "view_message_detail",
    "view_schedule",
    "view_compliance",
    "view_agreements",
    "view_financials",
    "generate_export",
    "download_export",
    "logout"
]
```

---

## Security Best Practices

### Backend Security

```python
# 1. Always hash passwords
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# 2. Use constant-time comparison
import secrets

def secure_compare(a: str, b: str) -> bool:
    return secrets.compare_digest(a, b)

# 3. Rate limiting for auth endpoints
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")  # 5 attempts per minute
async def login(...):
    ...

# 4. Lock accounts after failed attempts
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(minutes=15)

async def check_account_lockout(db: AsyncSession, email: str):
    attempts = await get_recent_failed_attempts(db, email)
    if attempts >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Account locked. Try again in {LOCKOUT_DURATION.minutes} minutes."
        )
```

### Frontend Security

```typescript
// 1. Never store access tokens in localStorage (XSS vulnerable)
// Use memory + httpOnly refresh cookie

// 2. Implement token refresh before expiry
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

const checkTokenExpiry = () => {
  const token = getAccessToken();
  if (!token) return;

  const payload = decodeToken(token);
  const expiresIn = payload.exp * 1000 - Date.now();

  if (expiresIn < TOKEN_REFRESH_THRESHOLD) {
    refreshTokens();
  }
};

// 3. Clear tokens on logout
const logout = async () => {
  await api.post('/auth/logout');
  clearAccessToken();
  // Backend clears httpOnly refresh cookie
  window.location.href = '/login';
};

// 4. Handle 401 responses globally
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        await refreshTokens();
        return api.request(error.config);
      } catch {
        logout();
      }
    }
    return Promise.reject(error);
  }
);
```

### HTTPS & Headers

```python
# app/core/security.py

# Security headers middleware
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response
```

---

## Implementation Details

### Dependencies

```python
# app/core/security.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get current authenticated user.
    """
    token = credentials.credentials

    # Verify token
    payload = verify_token(token)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=401,
            detail="Invalid token type"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )

    # Get user from database
    user = await get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account suspended"
        )

    return user

async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security, use_cache=False),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    """
    Optional authentication - returns None if not authenticated.
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
```

### Route Protection

```python
# Example protected route

@router.get("/cases/{case_id}")
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Requires auth
) -> CaseResponse:
    """
    Get case details. User must be authenticated and a participant.
    """
    # Check permission
    has_access = await check_permission(
        db, current_user.id, case_id, Permission.VIEW_CASE
    )

    if not has_access:
        raise HTTPException(
            status_code=404,  # 404 not 403 for security
            detail="Case not found"
        )

    case = await get_case_by_id(db, case_id)
    return CaseResponse.from_orm(case)
```

---

## Troubleshooting

### Common Issues

#### 1. "Token expired" immediately after login

**Cause:** Server and client time not synchronized
**Solution:**
```python
# Add clock skew tolerance
def verify_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=["HS256"],
        options={
            "leeway": 30  # 30 second tolerance
        }
    )
```

#### 2. "Invalid token" after server restart

**Cause:** SECRET_KEY changed or not persisted
**Solution:**
```bash
# Ensure SECRET_KEY is in .env and persisted
SECRET_KEY=your-constant-secret-key-here

# Generate a new key only once:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### 3. Refresh token not working

**Cause:** Token family revoked due to detected reuse
**Solution:**
```python
# Clear all refresh tokens for user
await revoke_all_user_tokens(db, user_id)
# User must login again
```

#### 4. CORS errors on authentication endpoints

**Cause:** CORS not configured for frontend origin
**Solution:**
```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://app.commonground.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 5. "Account locked" message

**Cause:** Too many failed login attempts
**Solution:**
```sql
-- Clear failed attempts for user (admin action)
DELETE FROM failed_login_attempts
WHERE email = 'user@example.com'
AND created_at > NOW() - INTERVAL '15 minutes';
```

### Debug Logging

```python
# Enable detailed auth logging in development
import logging

logging.getLogger("app.core.security").setLevel(logging.DEBUG)

# Log auth events
logger.debug(f"Token generated for user {user_id}")
logger.debug(f"Token verified: {payload}")
logger.warning(f"Failed login attempt for {email}")
logger.error(f"Token verification failed: {error}")
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **AUTHENTICATION.md** | `/docs/api/` | This document |
| API_REFERENCE.md | `/docs/api/` | Full API documentation |
| SECURITY.md | `/docs/operations/` | Security architecture |
| OVERVIEW.md | `/docs/architecture/` | System overview |

---

*Last Updated: January 15, 2026*
*Document Version: 1.1.0*
