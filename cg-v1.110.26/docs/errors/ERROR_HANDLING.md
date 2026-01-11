# CommonGround V1 - Error Handling Guide

**Last Updated:** January 10, 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Error Response Format](#error-response-format)
3. [HTTP Status Codes](#http-status-codes)
4. [Error Codes Reference](#error-codes-reference)
5. [Error Handling by Module](#error-handling-by-module)
6. [Frontend Error Handling](#frontend-error-handling)
7. [Logging & Monitoring](#logging--monitoring)
8. [Recovery Procedures](#recovery-procedures)
9. [Best Practices](#best-practices)

---

## Overview

CommonGround uses a standardized error handling system across all API endpoints and services.

### Principles

1. **Consistent Format:** All errors follow the same JSON structure
2. **Meaningful Codes:** Error codes are specific and actionable
3. **User-Friendly:** Messages are clear for both developers and users
4. **Secure:** Errors never expose sensitive information
5. **Logged:** All errors are logged for debugging

---

## Error Response Format

### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      },
      {
        "field": "password",
        "message": "Password must be at least 12 characters",
        "code": "TOO_SHORT"
      }
    ],
    "help_url": "https://docs.commonground.app/errors/VALIDATION_ERROR"
  },
  "meta": {
    "request_id": "req_abc123xyz",
    "timestamp": "2026-01-10T12:00:00Z"
  }
}
```

### Error Response Schema

```python
# app/schemas/error.py

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str
    code: Optional[str] = None

class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    help_url: Optional[str] = None

class ErrorEnvelope(BaseModel):
    error: ErrorResponse
    meta: dict
```

### Error Response Builder

```python
# app/core/errors.py

from fastapi import Request
from fastapi.responses import JSONResponse
import uuid
from datetime import datetime

class APIError(Exception):
    """Base exception for API errors"""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: list = None,
        help_url: str = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        self.help_url = help_url or f"https://docs.commonground.app/errors/{code}"
        super().__init__(message)

def create_error_response(
    request: Request,
    error: APIError
) -> JSONResponse:
    """Create standardized error response"""
    return JSONResponse(
        status_code=error.status_code,
        content={
            "error": {
                "code": error.code,
                "message": error.message,
                "details": error.details,
                "help_url": error.help_url
            },
            "meta": {
                "request_id": getattr(request.state, 'request_id', str(uuid.uuid4())),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
    )
```

---

## HTTP Status Codes

### Success Codes

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST that creates resource |
| 202 | Accepted | Request accepted for async processing |
| 204 | No Content | Successful DELETE or empty response |

### Client Error Codes

| Code | Name | Usage |
|------|------|-------|
| 400 | Bad Request | Malformed request syntax |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 409 | Conflict | Resource conflict (duplicate) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |

### Server Error Codes

| Code | Name | Usage |
|------|------|-------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | External service error |
| 503 | Service Unavailable | Service temporarily unavailable |
| 504 | Gateway Timeout | External service timeout |

---

## Error Codes Reference

### Authentication Errors (AUTH_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `AUTH_REQUIRED` | 401 | No authentication provided | Please log in to continue |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password | Invalid email or password |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token expired | Your session has expired. Please log in again |
| `AUTH_TOKEN_INVALID` | 401 | Token malformed or tampered | Invalid authentication token |
| `AUTH_REFRESH_TOKEN_EXPIRED` | 401 | Refresh token expired | Please log in again |
| `AUTH_REFRESH_TOKEN_REVOKED` | 401 | Refresh token was revoked | Your session was ended. Please log in again |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Email not verified | Please verify your email address |
| `AUTH_ACCOUNT_SUSPENDED` | 403 | Account is suspended | Your account has been suspended |
| `AUTH_ACCOUNT_LOCKED` | 429 | Too many failed attempts | Account locked. Try again in 15 minutes |

### Permission Errors (PERM_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `PERM_DENIED` | 403 | General permission denied | You don't have permission for this action |
| `PERM_NOT_CASE_MEMBER` | 403 | Not a case participant | You're not a member of this case |
| `PERM_VIEW_RESTRICTED` | 403 | View permission restricted | You don't have access to view this |
| `PERM_EDIT_RESTRICTED` | 403 | Edit permission restricted | You don't have permission to edit this |
| `PERM_PROFESSIONAL_EXPIRED` | 403 | Professional access expired | Your professional access has expired |
| `PERM_REQUIRES_BOTH_PARENTS` | 403 | Action requires both parents | This action requires approval from both parents |

### Validation Errors (VAL_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `VAL_REQUIRED_FIELD` | 422 | Required field missing | This field is required |
| `VAL_INVALID_FORMAT` | 422 | Field format invalid | Invalid format |
| `VAL_TOO_SHORT` | 422 | Value too short | Must be at least {min} characters |
| `VAL_TOO_LONG` | 422 | Value too long | Must be no more than {max} characters |
| `VAL_INVALID_EMAIL` | 422 | Invalid email format | Please enter a valid email address |
| `VAL_WEAK_PASSWORD` | 422 | Password doesn't meet requirements | Password must include uppercase, lowercase, number, and special character |
| `VAL_INVALID_DATE` | 422 | Invalid date format | Please enter a valid date |
| `VAL_DATE_IN_FUTURE` | 422 | Date cannot be in future | Date cannot be in the future |
| `VAL_DATE_IN_PAST` | 422 | Date cannot be in past | Date cannot be in the past |
| `VAL_INVALID_UUID` | 422 | Invalid UUID format | Invalid identifier format |
| `VAL_INVALID_PHONE` | 422 | Invalid phone format | Please enter a valid phone number |

### Resource Errors (RES_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `RES_NOT_FOUND` | 404 | Resource not found | The requested item was not found |
| `RES_CASE_NOT_FOUND` | 404 | Case not found | Case not found |
| `RES_USER_NOT_FOUND` | 404 | User not found | User not found |
| `RES_MESSAGE_NOT_FOUND` | 404 | Message not found | Message not found |
| `RES_AGREEMENT_NOT_FOUND` | 404 | Agreement not found | Agreement not found |
| `RES_CHILD_NOT_FOUND` | 404 | Child not found | Child not found |
| `RES_ALREADY_EXISTS` | 409 | Resource already exists | This item already exists |
| `RES_EMAIL_IN_USE` | 409 | Email already registered | This email is already registered |
| `RES_CASE_ALREADY_JOINED` | 409 | User already in case | You're already a member of this case |

### Case Errors (CASE_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `CASE_INVITATION_EXPIRED` | 400 | Invitation has expired | This invitation has expired |
| `CASE_INVITATION_INVALID` | 400 | Invalid invitation token | Invalid invitation link |
| `CASE_INVITATION_ALREADY_USED` | 400 | Invitation already accepted | This invitation has already been used |
| `CASE_NOT_ACTIVE` | 400 | Case is not active | This case is not currently active |
| `CASE_CLOSED` | 400 | Case is closed | This case has been closed |
| `CASE_SUSPENDED` | 400 | Case is suspended | This case is currently suspended |

### Agreement Errors (AGR_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `AGR_NOT_DRAFT` | 400 | Agreement is not in draft | Agreement cannot be edited |
| `AGR_ALREADY_APPROVED` | 400 | Already approved by user | You have already approved this agreement |
| `AGR_PENDING_APPROVAL` | 400 | Waiting for other parent | Waiting for other parent's approval |
| `AGR_SECTION_REQUIRED` | 400 | Required section incomplete | Please complete all required sections |
| `AGR_CANNOT_MODIFY` | 400 | Agreement cannot be modified | This agreement cannot be modified |

### Message Errors (MSG_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `MSG_BLOCKED` | 400 | Message blocked by ARIA | This message was blocked due to concerning content |
| `MSG_INTERVENTION_REQUIRED` | 200 | ARIA intervention triggered | Please review the suggested changes |
| `MSG_TOO_LONG` | 422 | Message exceeds limit | Message exceeds maximum length |
| `MSG_EMPTY` | 422 | Message is empty | Please enter a message |

### Finance Errors (FIN_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `FIN_INVALID_AMOUNT` | 422 | Invalid expense amount | Please enter a valid amount |
| `FIN_NEGATIVE_AMOUNT` | 422 | Amount cannot be negative | Amount must be positive |
| `FIN_ALREADY_APPROVED` | 400 | Expense already approved | This expense has already been approved |
| `FIN_ALREADY_REJECTED` | 400 | Expense already rejected | This expense has already been rejected |
| `FIN_CANNOT_APPROVE_OWN` | 400 | Cannot approve own expense | You cannot approve your own expense |

### Schedule Errors (SCHED_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `SCHED_CONFLICT` | 409 | Schedule conflict exists | This time conflicts with an existing event |
| `SCHED_PAST_EVENT` | 400 | Cannot create past event | Cannot create events in the past |
| `SCHED_INVALID_RECURRENCE` | 422 | Invalid recurrence rule | Invalid recurrence pattern |
| `SCHED_EXCHANGE_NOT_FOUND` | 404 | Exchange not found | Exchange not found |
| `SCHED_ALREADY_CHECKED_IN` | 400 | Already checked in | You have already checked in |

### External Service Errors (EXT_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `EXT_AI_UNAVAILABLE` | 503 | AI service unavailable | AI service temporarily unavailable |
| `EXT_AI_TIMEOUT` | 504 | AI service timeout | AI service request timed out |
| `EXT_VIDEO_UNAVAILABLE` | 503 | Video service unavailable | Video calling is temporarily unavailable |
| `EXT_EMAIL_FAILED` | 500 | Email sending failed | Failed to send email |
| `EXT_STORAGE_FAILED` | 500 | File storage failed | Failed to upload file |

### Rate Limit Errors (RATE_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `RATE_LIMIT_EXCEEDED` | 429 | General rate limit | Too many requests. Please wait and try again |
| `RATE_AUTH_EXCEEDED` | 429 | Auth rate limit | Too many login attempts. Please wait |
| `RATE_API_EXCEEDED` | 429 | API rate limit | API rate limit exceeded |
| `RATE_EXPORT_EXCEEDED` | 429 | Export rate limit | Export limit reached. Please wait |

### System Errors (SYS_*)

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `SYS_INTERNAL_ERROR` | 500 | Unexpected system error | An unexpected error occurred |
| `SYS_DATABASE_ERROR` | 500 | Database error | Database error occurred |
| `SYS_MAINTENANCE` | 503 | System under maintenance | System is under maintenance |
| `SYS_OVERLOADED` | 503 | System overloaded | System is busy. Please try again |

---

## Error Handling by Module

### Authentication Module

```python
# app/api/v1/endpoints/auth.py

from app.core.errors import APIError

@router.post("/login")
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    user = await get_user_by_email(db, credentials.email)
    if not user:
        raise APIError(
            code="AUTH_INVALID_CREDENTIALS",
            message="Invalid email or password",
            status_code=401
        )

    # Check if account is locked
    if await is_account_locked(db, credentials.email):
        raise APIError(
            code="AUTH_ACCOUNT_LOCKED",
            message="Account temporarily locked due to too many failed attempts",
            status_code=429,
            details=[{
                "message": "Try again in 15 minutes",
                "code": "LOCKOUT_DURATION"
            }]
        )

    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        await log_failed_attempt(db, credentials.email)
        raise APIError(
            code="AUTH_INVALID_CREDENTIALS",
            message="Invalid email or password",
            status_code=401
        )

    # Check account status
    if not user.is_active:
        raise APIError(
            code="AUTH_ACCOUNT_SUSPENDED",
            message="Your account has been suspended",
            status_code=403,
            details=[{
                "message": "Contact support for assistance",
                "code": "CONTACT_SUPPORT"
            }]
        )

    # Success - generate tokens
    return create_token_response(user)
```

### Case Management Module

```python
# app/api/v1/endpoints/cases.py

@router.post("/accept/{token}")
async def accept_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find invitation
    invitation = await get_invitation_by_token(db, token)

    if not invitation:
        raise APIError(
            code="CASE_INVITATION_INVALID",
            message="Invalid invitation link",
            status_code=400
        )

    if invitation.expires_at < datetime.utcnow():
        raise APIError(
            code="CASE_INVITATION_EXPIRED",
            message="This invitation has expired",
            status_code=400,
            details=[{
                "message": "Please ask the other parent to send a new invitation",
                "code": "REQUEST_NEW_INVITATION"
            }]
        )

    if invitation.status != "pending":
        raise APIError(
            code="CASE_INVITATION_ALREADY_USED",
            message="This invitation has already been used",
            status_code=400
        )

    # Check if user is already a participant
    existing = await get_case_participant(db, invitation.case_id, current_user.id)
    if existing:
        raise APIError(
            code="RES_CASE_ALREADY_JOINED",
            message="You're already a member of this case",
            status_code=409
        )

    # Accept invitation
    return await accept_case_invitation(db, invitation, current_user)
```

### ARIA Module

```python
# app/services/aria.py

async def analyze_message(content: str, case_id: str) -> dict:
    try:
        # Try Claude first
        result = await claude_analyze(content)
        return result
    except anthropic.APITimeoutError:
        # Fallback to OpenAI
        try:
            result = await openai_analyze(content)
            result["fallback_used"] = True
            return result
        except openai.APITimeoutError:
            raise APIError(
                code="EXT_AI_TIMEOUT",
                message="AI analysis timed out",
                status_code=504,
                details=[{
                    "message": "Message can be sent without analysis",
                    "code": "SKIP_ANALYSIS_OPTION"
                }]
            )
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        raise APIError(
            code="EXT_AI_UNAVAILABLE",
            message="AI service temporarily unavailable",
            status_code=503
        )
```

---

## Frontend Error Handling

### Global Error Handler

```typescript
// lib/api.ts

import axios, { AxiosError } from 'axios';

interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
      code?: string;
    }>;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}

// Create axios instance with interceptors
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIErrorResponse>) => {
    const errorCode = error.response?.data?.error?.code;
    const status = error.response?.status;

    // Handle authentication errors
    if (status === 401) {
      if (errorCode === 'AUTH_TOKEN_EXPIRED') {
        // Try to refresh token
        try {
          await refreshToken();
          return api.request(error.config!);
        } catch {
          // Refresh failed, redirect to login
          window.location.href = '/login?expired=true';
        }
      } else {
        // Other auth errors, redirect to login
        window.location.href = '/login';
      }
    }

    // Handle rate limiting
    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      toast.error(`Too many requests. Please wait ${retryAfter} seconds.`);
    }

    // Handle maintenance mode
    if (status === 503 && errorCode === 'SYS_MAINTENANCE') {
      window.location.href = '/maintenance';
    }

    return Promise.reject(error);
  }
);
```

### Form Validation Errors

```typescript
// components/forms/error-display.tsx

interface FormErrorProps {
  error: APIErrorResponse['error'];
}

export function FormError({ error }: FormErrorProps) {
  if (!error.details?.length) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  // Map field errors
  const fieldErrors = error.details.reduce((acc, detail) => {
    if (detail.field) {
      acc[detail.field] = detail.message;
    }
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-2">
      {Object.entries(fieldErrors).map(([field, message]) => (
        <p key={field} className="text-sm text-red-600">
          <span className="font-medium">{field}:</span> {message}
        </p>
      ))}
    </div>
  );
}
```

### Error Boundary

```typescript
// components/error-boundary.tsx

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    console.error('Error caught by boundary:', error, errorInfo);

    // Send to Sentry or similar
    // Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-gray-600">Please refresh the page and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Logging & Monitoring

### Error Logging

```python
# app/core/logging.py

import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        if hasattr(record, 'error_code'):
            log_obj['error_code'] = record.error_code

        if hasattr(record, 'request_id'):
            log_obj['request_id'] = record.request_id

        if hasattr(record, 'user_id'):
            log_obj['user_id'] = record.user_id

        if record.exc_info:
            log_obj['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_obj)

# Configure logger
logger = logging.getLogger("commonground")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

### Error Middleware

```python
# app/middleware/error_handler.py

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import traceback

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except APIError as e:
            # Known API error - log at info/warning level
            logger.warning(
                f"API Error: {e.code}",
                extra={
                    "error_code": e.code,
                    "request_id": request.state.request_id,
                    "path": request.url.path,
                    "method": request.method
                }
            )
            return create_error_response(request, e)
        except Exception as e:
            # Unexpected error - log at error level
            logger.error(
                f"Unexpected error: {str(e)}",
                extra={
                    "request_id": request.state.request_id,
                    "path": request.url.path,
                    "method": request.method,
                    "traceback": traceback.format_exc()
                },
                exc_info=True
            )

            # Return generic error to client
            return create_error_response(
                request,
                APIError(
                    code="SYS_INTERNAL_ERROR",
                    message="An unexpected error occurred",
                    status_code=500
                )
            )
```

### Sentry Integration

```python
# app/core/sentry.py

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

def init_sentry():
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration()
        ],
        traces_sample_rate=0.1,  # 10% of transactions
        profiles_sample_rate=0.1,

        # Don't send sensitive data
        before_send=filter_sensitive_data
    )

def filter_sensitive_data(event, hint):
    # Remove sensitive fields
    if 'request' in event and 'data' in event['request']:
        if 'password' in event['request']['data']:
            event['request']['data']['password'] = '[REDACTED]'
    return event
```

---

## Recovery Procedures

### Database Connection Errors

```python
# app/core/database.py

from sqlalchemy.exc import OperationalError
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True
)
async def get_db_with_retry():
    try:
        async with AsyncSession(engine) as session:
            yield session
    except OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        raise APIError(
            code="SYS_DATABASE_ERROR",
            message="Database temporarily unavailable",
            status_code=503
        )
```

### External Service Fallbacks

```python
# app/services/aria.py

async def analyze_with_fallback(content: str) -> dict:
    """Analyze message with fallback chain"""

    # Try Claude first
    try:
        return await claude_analyze(content)
    except Exception as e:
        logger.warning(f"Claude failed, trying OpenAI: {e}")

    # Fallback to OpenAI
    try:
        result = await openai_analyze(content)
        result["fallback"] = "openai"
        return result
    except Exception as e:
        logger.warning(f"OpenAI failed, using regex: {e}")

    # Final fallback to regex-based analysis
    result = regex_analyze(content)
    result["fallback"] = "regex"
    return result
```

### Graceful Degradation

```python
# app/api/v1/endpoints/messages.py

@router.post("/")
async def send_message(
    message: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Try full ARIA analysis
        analysis = await analyze_message(message.content)

        if analysis.get("is_toxic"):
            return InterventionResponse(
                requires_intervention=True,
                analysis=analysis,
                suggestions=analysis.get("suggestions", [])
            )

    except APIError as e:
        if e.code.startswith("EXT_"):
            # External service error - allow message without analysis
            logger.warning(
                "ARIA unavailable, sending without analysis",
                extra={"error_code": e.code}
            )
            # Continue to send message
        else:
            raise

    # Send message
    return await create_message(db, message, current_user)
```

---

## Best Practices

### Do's

1. **Use specific error codes:** `AUTH_TOKEN_EXPIRED` not `AUTH_ERROR`
2. **Include actionable details:** Tell users how to fix the problem
3. **Log all errors:** Include request_id for tracing
4. **Use appropriate HTTP status codes:** Match REST conventions
5. **Implement retry logic:** For transient failures
6. **Provide fallbacks:** Degrade gracefully

### Don'ts

1. **Don't expose stack traces:** To end users
2. **Don't leak sensitive data:** In error messages
3. **Don't use 500 for client errors:** Use 4xx codes
4. **Don't swallow exceptions:** Always log
5. **Don't return ambiguous errors:** Be specific
6. **Don't hardcode error messages:** Use constants

### Error Message Guidelines

```python
# Good error messages
"Email address is already registered"  # Specific and actionable
"Password must be at least 12 characters"  # Clear requirement
"This invitation has expired. Please request a new one."  # Includes next step

# Bad error messages
"Error"  # Too vague
"Invalid input"  # Not specific
"Something went wrong"  # No actionable info
"Error code 42"  # Meaningless to users
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **ERROR_HANDLING.md** | `/docs/errors/` | This document |
| API_REFERENCE.md | `/docs/api/` | API documentation |
| MONITORING.md | `/docs/operations/` | Monitoring setup |
| TROUBLESHOOTING.md | `/docs/guides/` | Common issues |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
