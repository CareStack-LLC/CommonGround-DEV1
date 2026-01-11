# CommonGround V1 - Security Practices Guide

**Last Updated:** January 10, 2026
**Version:** 1.0.0
**Security Review:** Completed December 30, 2025

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Input Validation & Sanitization](#input-validation--sanitization)
6. [Secure Communications](#secure-communications)
7. [Database Security](#database-security)
8. [Third-Party Services](#third-party-services)
9. [Child Data Protection](#child-data-protection)
10. [Audit & Compliance](#audit--compliance)
11. [Incident Response](#incident-response)
12. [Security Checklist](#security-checklist)

---

## Security Overview

### Security Principles

CommonGround follows these core security principles:

1. **Defense in Depth** - Multiple layers of security controls
2. **Least Privilege** - Minimum necessary access rights
3. **Secure by Default** - Secure configurations out of the box
4. **Fail Securely** - Errors don't expose vulnerabilities
5. **Privacy First** - User data protected at all levels

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    WAF / DDoS Protection                 │   │
│  │                   (Cloudflare/AWS WAF)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    TLS 1.3 / HTTPS                       │   │
│  │                   (Certificate Pinning)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Rate Limiting                         │   │
│  │              (Per-user, per-endpoint limits)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 JWT Authentication                       │   │
│  │            (Access + Refresh Token Flow)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  RBAC Authorization                      │   │
│  │          (Case-level + Feature Permissions)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Input Validation (Pydantic)                 │   │
│  │            + Content Sanitization (Bleach)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Parameterized Queries                      │   │
│  │                 (SQLAlchemy ORM)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Encryption at Rest (AES-256)                │   │
│  │           + Encryption in Transit (TLS 1.3)              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Security Status Summary

| Category | Status | Risk Level |
|----------|--------|------------|
| SQL Injection | ✅ Protected | LOW |
| XSS | ✅ Protected | LOW |
| CSRF | ✅ Protected | LOW |
| Authentication | ✅ Strong | LOW |
| Authorization | ✅ Implemented | LOW |
| Data Encryption | ✅ Enabled | LOW |
| Input Validation | ✅ Active | LOW |
| Rate Limiting | ⚠️ Partial | MEDIUM |
| Audit Logging | ✅ Comprehensive | LOW |

---

## Authentication & Authorization

### JWT Token Architecture

```python
# Token structure
{
    "sub": "user_uuid",        # User identifier
    "exp": 1704067200,         # Expiration timestamp
    "iat": 1704063600,         # Issued at timestamp
    "type": "access",          # Token type (access/refresh)
    "jti": "unique_token_id"   # Token identifier for revocation
}

# Token configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
TOKEN_ALGORITHM = "HS256"
```

### Token Security Best Practices

```python
# app/core/security.py

import secrets
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Adjust based on hardware
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time password verification"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password with bcrypt"""
    return pwd_context.hash(password)

def create_access_token(user_id: str, expires_delta: timedelta = None) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": secrets.token_urlsafe(16)
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
```

### Password Requirements

```python
# app/schemas/auth.py

from pydantic import BaseModel, validator
import re

class PasswordPolicy:
    MIN_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"

def validate_password_strength(password: str) -> str:
    """Validate password meets security requirements"""

    if len(password) < PasswordPolicy.MIN_LENGTH:
        raise ValueError(f"Password must be at least {PasswordPolicy.MIN_LENGTH} characters")

    if PasswordPolicy.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter")

    if PasswordPolicy.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter")

    if PasswordPolicy.REQUIRE_DIGIT and not re.search(r'\d', password):
        raise ValueError("Password must contain at least one digit")

    if PasswordPolicy.REQUIRE_SPECIAL:
        pattern = f'[{re.escape(PasswordPolicy.SPECIAL_CHARS)}]'
        if not re.search(pattern, password):
            raise ValueError("Password must contain at least one special character")

    return password
```

### Role-Based Access Control (RBAC)

```python
# Permission hierarchy
PERMISSIONS = {
    # Case-level permissions
    "case.view": "View case details",
    "case.edit": "Edit case details",
    "case.delete": "Delete case",
    "case.invite": "Invite participants",

    # Message permissions
    "message.send": "Send messages",
    "message.view": "View messages",
    "message.flag": "Flag messages",

    # Agreement permissions
    "agreement.create": "Create agreements",
    "agreement.edit": "Edit agreements",
    "agreement.approve": "Approve agreements",
    "agreement.view": "View agreements",

    # Financial permissions
    "finance.view": "View financial data",
    "finance.create": "Create obligations",
    "finance.approve": "Approve expenses",

    # Schedule permissions
    "schedule.view": "View schedule",
    "schedule.create": "Create events",
    "schedule.checkin": "Check in for exchanges",

    # Child permissions
    "child.view": "View child info",
    "child.edit": "Edit child info",

    # Export permissions
    "export.create": "Create exports",
    "export.view": "View exports",

    # Legal access permissions
    "legal.grant": "Grant legal access",
    "legal.revoke": "Revoke legal access",
}

# Role definitions
ROLES = {
    "parent": [
        "case.view", "case.edit", "case.invite",
        "message.send", "message.view", "message.flag",
        "agreement.create", "agreement.edit", "agreement.approve", "agreement.view",
        "finance.view", "finance.create", "finance.approve",
        "schedule.view", "schedule.create", "schedule.checkin",
        "child.view", "child.edit",
        "export.create", "export.view",
        "legal.grant", "legal.revoke"
    ],
    "gal": [  # Guardian ad Litem
        "case.view",
        "message.view",
        "agreement.view",
        "finance.view",
        "schedule.view",
        "child.view",
        "export.view"
    ],
    "attorney": [
        "case.view",
        "message.view",
        "agreement.view",
        "finance.view",
        "schedule.view",
        "export.view"
    ],
    "mediator": [
        "case.view",
        "message.view",
        "agreement.view"
    ],
    "court_clerk": [
        "case.view",
        "agreement.view",
        "export.view"
    ]
}
```

### Authorization Middleware

```python
# app/core/authorization.py

from functools import wraps
from fastapi import HTTPException, status

def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user, case_id, **kwargs):
            # Check if user has permission for this case
            participant = await get_case_participant(case_id, current_user.id)

            if not participant:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not a case participant"
                )

            user_permissions = ROLES.get(participant.role, [])

            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission required: {permission}"
                )

            return await func(*args, current_user=current_user, case_id=case_id, **kwargs)
        return wrapper
    return decorator

# Usage
@router.post("/agreements/")
@require_permission("agreement.create")
async def create_agreement(case_id: str, current_user: User, ...):
    ...
```

---

## Data Protection

### Encryption at Rest

```python
# Sensitive fields are encrypted using Fernet (AES-128-CBC)
from cryptography.fernet import Fernet

class EncryptedField:
    """Encrypted database field"""

    def __init__(self, key: bytes = None):
        self.key = key or settings.ENCRYPTION_KEY.encode()
        self.fernet = Fernet(self.key)

    def encrypt(self, value: str) -> str:
        """Encrypt a string value"""
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted_value: str) -> str:
        """Decrypt an encrypted value"""
        return self.fernet.decrypt(encrypted_value.encode()).decode()

# Fields requiring encryption
ENCRYPTED_FIELDS = [
    "child.ssn",
    "child.medical_conditions",
    "child.medications",
    "user.phone",
    "payment.card_last_four",
    "message.content_sensitive"  # If flagged as sensitive
]
```

### Data Classification

| Classification | Description | Examples | Handling |
|----------------|-------------|----------|----------|
| **PUBLIC** | Non-sensitive | User first name, case status | No special handling |
| **INTERNAL** | Business data | Message content, schedules | Encrypted in transit |
| **CONFIDENTIAL** | Sensitive personal | Phone, address, SSN | Encrypted at rest + transit |
| **RESTRICTED** | Highly sensitive | Child medical, abuse records | Full encryption + audit |

### Data Retention

```python
# Data retention policies
RETENTION_POLICIES = {
    "messages": {
        "active_case": "indefinite",  # While case active
        "closed_case": "7_years",      # Legal retention requirement
        "deleted": "30_days"           # Soft delete grace period
    },
    "audit_logs": {
        "retention": "7_years",        # Compliance requirement
        "immutable": True              # Cannot be deleted
    },
    "session_data": {
        "retention": "90_days",
        "on_logout": "immediate"
    },
    "exports": {
        "retention": "1_year",
        "accessed": "extend_90_days"
    }
}
```

### PII Handling

```python
# app/utils/pii.py

import re
from typing import Dict, Any

def redact_pii(data: Dict[str, Any], fields_to_redact: list) -> Dict[str, Any]:
    """Redact PII fields from data"""
    redacted = data.copy()

    for field in fields_to_redact:
        if field in redacted:
            redacted[field] = "[REDACTED]"

    return redacted

def mask_email(email: str) -> str:
    """Mask email for display: j***@example.com"""
    if '@' not in email:
        return "***"
    local, domain = email.split('@')
    return f"{local[0]}***@{domain}"

def mask_phone(phone: str) -> str:
    """Mask phone: ***-***-1234"""
    digits = re.sub(r'\D', '', phone)
    if len(digits) >= 4:
        return f"***-***-{digits[-4:]}"
    return "***"

def mask_ssn(ssn: str) -> str:
    """Mask SSN: ***-**-1234"""
    digits = re.sub(r'\D', '', ssn)
    if len(digits) >= 4:
        return f"***-**-{digits[-4:]}"
    return "***"
```

---

## API Security

### Rate Limiting

```python
# app/middleware/rate_limit.py

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "default": "100/minute",
    "auth": "10/minute",       # Login attempts
    "register": "5/hour",       # Registration
    "password_reset": "3/hour", # Password reset requests
    "export": "10/hour",        # Data exports
    "ai_analysis": "50/minute", # ARIA calls
    "message_send": "60/minute" # Message sending
}

@router.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):
    ...

@router.post("/auth/register")
@limiter.limit("5/hour")
async def register(request: Request, ...):
    ...
```

### CORS Configuration

```python
# app/core/cors.py

from fastapi.middleware.cors import CORSMiddleware

CORS_CONFIG = {
    "allow_origins": [
        "https://commonground.app",
        "https://www.commonground.app",
        "http://localhost:3000"  # Development only
    ],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    "allow_headers": [
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-Client-Version"
    ],
    "max_age": 600  # Preflight cache duration
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_CONFIG["allow_origins"],
    allow_credentials=CORS_CONFIG["allow_credentials"],
    allow_methods=CORS_CONFIG["allow_methods"],
    allow_headers=CORS_CONFIG["allow_headers"],
    max_age=CORS_CONFIG["max_age"]
)
```

### Security Headers

```python
# app/middleware/security_headers.py

from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.anthropic.com https://*.supabase.co; "
            "frame-ancestors 'none';"
        )

        # HSTS (only in production)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response
```

### API Versioning Security

```python
# Deprecation headers for old API versions
@router.get("/v1/legacy-endpoint")
async def legacy_endpoint():
    response = await process_request()
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "2026-06-01"
    response.headers["Link"] = '</api/v2/new-endpoint>; rel="successor-version"'
    return response
```

---

## Input Validation & Sanitization

### Pydantic Validation

```python
# app/schemas/message.py

from pydantic import BaseModel, Field, validator
from typing import Optional
import bleach

class MessageCreate(BaseModel):
    case_id: str = Field(..., min_length=36, max_length=36)
    content: str = Field(..., min_length=1, max_length=10000)
    thread_id: Optional[str] = Field(None, min_length=36, max_length=36)

    @validator('case_id', 'thread_id')
    def validate_uuid(cls, v):
        if v is not None:
            try:
                uuid.UUID(v)
            except ValueError:
                raise ValueError("Invalid UUID format")
        return v

    @validator('content')
    def sanitize_content(cls, v):
        """Sanitize message content to prevent XSS"""
        # Strip all HTML tags
        cleaned = bleach.clean(v, tags=[], strip=True)

        # Remove null bytes and control characters
        cleaned = cleaned.replace('\x00', '')

        # Limit consecutive whitespace
        cleaned = ' '.join(cleaned.split())

        return cleaned
```

### Content Sanitization

```python
# app/utils/sanitizer.py

import bleach
import re

class ContentSanitizer:
    """Sanitize user-generated content"""

    # Allowed HTML for rich text (if enabled)
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
    ALLOWED_ATTRIBUTES = {}

    # Dangerous patterns to remove
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'data:text/html',
        r'vbscript:',
    ]

    @classmethod
    def sanitize_plain_text(cls, content: str) -> str:
        """Sanitize content as plain text (remove all HTML)"""
        # Strip all HTML
        cleaned = bleach.clean(content, tags=[], strip=True)

        # Remove dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)

        return cleaned.strip()

    @classmethod
    def sanitize_rich_text(cls, content: str) -> str:
        """Sanitize content allowing limited HTML"""
        cleaned = bleach.clean(
            content,
            tags=cls.ALLOWED_TAGS,
            attributes=cls.ALLOWED_ATTRIBUTES,
            strip=True
        )

        # Remove dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)

        return cleaned.strip()

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize uploaded filename"""
        # Remove path separators
        filename = filename.replace('/', '_').replace('\\', '_')

        # Remove null bytes
        filename = filename.replace('\x00', '')

        # Only allow safe characters
        safe_chars = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

        # Limit length
        return safe_chars[:255]
```

### SQL Injection Prevention

```python
# All queries use SQLAlchemy ORM - no raw SQL

# ✅ Safe: Parameterized query
result = await session.execute(
    select(User).where(User.email == email)
)

# ✅ Safe: Using filter with bound parameters
result = await session.execute(
    select(Message)
    .where(Message.case_id == case_id)
    .where(Message.created_at > start_date)
)

# ❌ NEVER DO: String interpolation
# result = session.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

---

## Secure Communications

### TLS Configuration

```yaml
# nginx.conf (production)
server {
    listen 443 ssl http2;
    server_name commonground.app;

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/commonground.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/commonground.app/privkey.pem;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Session settings
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
}
```

### WebSocket Security

```python
# app/api/websocket.py

from fastapi import WebSocket, WebSocketDisconnect
from app.core.security import verify_ws_token

async def websocket_endpoint(websocket: WebSocket, token: str):
    # Verify token before accepting connection
    try:
        user = await verify_ws_token(token)
        if not user:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()

            # Validate message structure
            if not validate_ws_message(data):
                await websocket.send_json({"error": "Invalid message format"})
                continue

            # Process message with authorization check
            if not await can_access_case(user.id, data.get("case_id")):
                await websocket.send_json({"error": "Access denied"})
                continue

            await process_ws_message(data, user)

    except WebSocketDisconnect:
        await cleanup_connection(user.id)
```

---

## Database Security

### Connection Security

```python
# Database connection with SSL
DATABASE_URL = (
    f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    f"?ssl=require&sslmode=verify-full"
)

engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "ssl": ssl_context,
        "statement_cache_size": 0
    }
)
```

### Row-Level Security

```sql
-- PostgreSQL Row Level Security for multi-tenant isolation
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_isolation ON messages
    FOR ALL
    USING (
        case_id IN (
            SELECT case_id FROM case_participants
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );
```

### Database User Permissions

```sql
-- Application user with minimum necessary permissions
CREATE ROLE commonground_app WITH LOGIN PASSWORD 'secure_password';

-- Grant specific permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO commonground_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO commonground_app;

-- Deny DROP and ALTER
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM commonground_app;
REVOKE ALTER ON ALL TABLES IN SCHEMA public FROM commonground_app;
```

---

## Third-Party Services

### API Key Management

```python
# Environment-based secrets (never in code)
class Settings(BaseSettings):
    # API Keys
    ANTHROPIC_API_KEY: str = Field(..., env="ANTHROPIC_API_KEY")
    OPENAI_API_KEY: str = Field(..., env="OPENAI_API_KEY")
    DAILY_API_KEY: str = Field(..., env="DAILY_API_KEY")
    SENDGRID_API_KEY: str = Field(..., env="SENDGRID_API_KEY")
    SUPABASE_SERVICE_KEY: str = Field(..., env="SUPABASE_SERVICE_KEY")

    # Keys are never logged
    class Config:
        json_encoders = {
            str: lambda v: "[REDACTED]" if "KEY" in v or "SECRET" in v else v
        }
```

### Service Authentication

```python
# Secure service initialization
import anthropic
from functools import lru_cache

@lru_cache()
def get_anthropic_client():
    """Get cached Anthropic client"""
    return anthropic.Anthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=30.0,
        max_retries=2
    )

# Never expose API keys in responses
@router.get("/config")
async def get_public_config():
    return {
        "api_version": settings.API_VERSION,
        "features_enabled": settings.ENABLED_FEATURES,
        # Never include: API keys, secrets, internal URLs
    }
```

---

## Child Data Protection

### COPPA Compliance

```python
# app/models/child.py

class Child(Base):
    """
    Child model with enhanced privacy protections.

    COPPA Compliance:
    - No direct online interaction with children under 13
    - Parental consent required for data collection
    - Limited data collection (minimum necessary)
    - Secure data storage (encrypted at rest)
    """

    __tablename__ = "children"

    # Basic info (required)
    id = Column(UUID, primary_key=True)
    case_id = Column(UUID, ForeignKey("cases.id"))
    first_name = Column(String(50))
    date_of_birth = Column(Date)  # For age calculation only

    # Sensitive info (encrypted)
    ssn_encrypted = Column(String(500), nullable=True)
    medical_encrypted = Column(Text, nullable=True)

    # Access control
    restricted_access = Column(Boolean, default=False)
    access_audit_required = Column(Boolean, default=True)

    @property
    def age(self) -> int:
        """Calculate age without exposing DOB"""
        today = date.today()
        return today.year - self.date_of_birth.year

    @property
    def is_minor(self) -> bool:
        """Check if child is under 18"""
        return self.age < 18
```

### Access Logging for Child Data

```python
# app/middleware/child_access_audit.py

async def audit_child_data_access(
    user_id: str,
    child_id: str,
    action: str,
    fields_accessed: list
):
    """Log all access to child data"""
    await create_audit_log(
        event_type="child_data_access",
        user_id=user_id,
        resource_type="child",
        resource_id=child_id,
        action=action,
        details={
            "fields_accessed": fields_accessed,
            "timestamp": datetime.utcnow().isoformat(),
            "ip_address": get_client_ip(),
            "user_agent": get_user_agent()
        },
        severity="high"
    )
```

---

## Audit & Compliance

### Audit Logging

```python
# app/models/audit.py

class AuditLog(Base):
    """Immutable audit log for compliance"""

    __tablename__ = "audit_logs"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_type = Column(String(100), index=True)
    user_id = Column(UUID, nullable=True)
    case_id = Column(UUID, nullable=True, index=True)
    resource_type = Column(String(50))
    resource_id = Column(UUID, nullable=True)
    action = Column(String(50))  # create, read, update, delete, export
    details = Column(JSONB)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    severity = Column(String(20))  # low, medium, high, critical

    # Prevent modification
    __table_args__ = (
        {"info": {"immutable": True}},
    )
```

### Compliance Events

```python
# Events that MUST be logged
COMPLIANCE_EVENTS = {
    "auth.login_success": "low",
    "auth.login_failed": "medium",
    "auth.password_changed": "medium",
    "auth.account_locked": "high",

    "case.created": "low",
    "case.invitation_sent": "low",
    "case.invitation_accepted": "low",
    "case.closed": "medium",

    "message.sent": "low",
    "message.flagged": "medium",
    "message.blocked": "high",

    "agreement.created": "low",
    "agreement.approved": "medium",
    "agreement.signed": "high",

    "child.data_accessed": "medium",
    "child.data_modified": "high",

    "export.created": "high",
    "export.downloaded": "high",

    "legal_access.granted": "high",
    "legal_access.revoked": "high",
    "legal_access.expired": "medium",

    "security.suspicious_activity": "critical",
    "security.data_breach_suspected": "critical"
}
```

---

## Incident Response

### Security Incident Procedure

```markdown
## Incident Response Plan

### 1. Detection & Identification
- Monitor alerts from Sentry, CloudWatch, WAF
- Review security logs for anomalies
- User-reported security concerns

### 2. Containment
- Isolate affected systems if necessary
- Revoke compromised credentials immediately
- Block suspicious IP addresses

### 3. Eradication
- Identify root cause
- Remove malicious code/access
- Patch vulnerabilities

### 4. Recovery
- Restore from clean backups if needed
- Verify system integrity
- Re-enable services gradually

### 5. Post-Incident
- Document timeline and actions taken
- Conduct post-mortem
- Update security controls
- Notify affected users if required

### Contact Information
- Security Lead: [name] - [contact]
- On-call Engineer: [rotation schedule]
- Legal/Compliance: [contact]
```

### Breach Notification

```python
# app/services/incident.py

async def handle_potential_breach(
    incident_type: str,
    affected_users: list,
    description: str
):
    """Handle potential security breach"""

    # 1. Log incident
    await log_security_incident(incident_type, description)

    # 2. Notify security team
    await notify_security_team(incident_type, description)

    # 3. If data breach confirmed, notify affected users
    if incident_type == "confirmed_breach":
        for user_id in affected_users:
            await send_breach_notification(
                user_id=user_id,
                incident_type=incident_type,
                description=description,
                actions_to_take=[
                    "Change your password immediately",
                    "Review recent account activity",
                    "Monitor for suspicious communications"
                ]
            )

    # 4. Log for compliance
    await create_compliance_record(
        event="potential_breach",
        details={
            "type": incident_type,
            "affected_count": len(affected_users),
            "response_time": datetime.utcnow().isoformat()
        }
    )
```

---

## Security Checklist

### Pre-Deployment Checklist

```markdown
## Security Deployment Checklist

### Authentication
- [ ] JWT secrets are strong (32+ bytes, randomly generated)
- [ ] Token expiration is reasonable (30 min access, 7 day refresh)
- [ ] Password policy enforced (12+ chars, complexity)
- [ ] Account lockout enabled (5 failed attempts)
- [ ] Rate limiting configured for auth endpoints

### Authorization
- [ ] All endpoints require authentication (except public)
- [ ] RBAC permissions verified
- [ ] Case-level access control tested
- [ ] Privilege escalation tested

### Data Protection
- [ ] Database encryption at rest enabled
- [ ] TLS 1.2+ enforced
- [ ] Sensitive fields encrypted (PII, child data)
- [ ] Data retention policies implemented

### Input Validation
- [ ] All inputs validated (Pydantic schemas)
- [ ] Content sanitization active
- [ ] File uploads validated (type, size, content)
- [ ] SQL injection protection verified

### API Security
- [ ] CORS configured correctly
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] API versioning in place

### Logging & Monitoring
- [ ] Audit logging enabled
- [ ] Security alerts configured
- [ ] Error tracking active (Sentry)
- [ ] Log retention configured

### Secrets Management
- [ ] No secrets in code
- [ ] Environment variables for all secrets
- [ ] Secrets rotation plan documented
- [ ] API keys have minimum permissions

### Third-Party Security
- [ ] Dependencies updated
- [ ] Security vulnerabilities scanned
- [ ] Vendor security reviewed
- [ ] SLAs for security incidents
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **SECURITY.md** | `/docs/operations/` | This document |
| SECURITY_AUDIT.md | `/mvp/backend/` | Detailed security audit |
| SECURITY_IMPLEMENTATION.md | `/mvp/backend/` | Implementation details |
| AUTHENTICATION.md | `/docs/api/` | Auth system documentation |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
*Security Review: December 30, 2025*
