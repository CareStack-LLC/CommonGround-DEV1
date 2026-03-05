# Master Documentation: Api

This document is a consolidation of all documentation files in this directory.

---

## Document: API_REFERENCE.md

# CommonGround V1 - Complete API Reference

**Last Updated:** January 18, 2026
**API Version:** 1.6.0
**Base URL:** `https://commonground-api-gdxg.onrender.com/api/v1`
**Local Development:** `http://localhost:8000/api/v1`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Error Handling](#error-handling)
5. [Endpoints by Module](#endpoints-by-module)
   - [Auth](#auth-endpoints)
   - [Users](#users-endpoints)
   - [Family Files](#family-files-endpoints)
   - [Cases](#cases-endpoints) (legacy)
   - [Children](#children-endpoints)
   - [Dashboard](#dashboard-endpoints)
   - [Custody Time](#custody-time-endpoints)
   - [Messages](#messages-endpoints)
   - [ARIA](#aria-endpoints)
   - [Agreements](#agreements-endpoints)
   - [ClearFund](#clearfund-endpoints)
   - [Wallet](#wallet-endpoints-v112)
   - [Subscriptions](#subscriptions-endpoints)
   - [Grants](#grants-endpoints)
   - [Schedule](#schedule-endpoints)
   - [Exchanges](#exchanges-endpoints)
   - [KidComs](#kidcoms-endpoints)
   - [Cubbie](#cubbie-endpoints)
   - [My Circle](#my-circle-endpoints)
   - [Court Portal](#court-portal-endpoints)
   - [Exports](#exports-endpoints)
   - [Notifications](#notifications-endpoints)
   - [Professional Portal](#professional-portal-endpoints)
6. [Webhooks](#webhooks)
7. [Rate Limiting](#rate-limiting)
8. [SDK Examples](#sdk-examples)

---

## Overview

### API Design Principles

- **RESTful:** Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON:** All requests and responses use JSON
- **Versioned:** API version in URL path (`/api/v1/`)
- **Authenticated:** Most endpoints require JWT authentication
- **Consistent:** Standard response formats and error codes

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <access_token>
X-Request-ID: <optional-correlation-id>
```

### Response Format

**Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-10T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

**List Response:**
```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-10T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## Authentication

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Register/Login                                          │
│     POST /auth/register or POST /auth/login                 │
│          │                                                  │
│          ▼                                                  │
│  ┌───────────────────┐                                      │
│  │ Access Token (30m)│                                      │
│  │ Refresh Token (7d)│                                      │
│  └─────────┬─────────┘                                      │
│            │                                                │
│  2. Use Access Token                                        │
│     Authorization: Bearer <access_token>                    │
│            │                                                │
│            ▼                                                │
│  ┌───────────────────┐                                      │
│  │ API Requests      │                                      │
│  └─────────┬─────────┘                                      │
│            │                                                │
│  3. Token Expired?                                          │
│            │                                                │
│     ┌──────┴──────┐                                         │
│     │             │                                         │
│     ▼             ▼                                         │
│   No: Continue  Yes: Refresh                                │
│                   │                                         │
│  4. Refresh Token │                                         │
│     POST /auth/refresh                                      │
│            │                                                │
│            ▼                                                │
│  ┌───────────────────┐                                      │
│  │ New Access Token  │                                      │
│  └───────────────────┘                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Token Types

| Token | Duration | Purpose | Storage |
|-------|----------|---------|---------|
| Access Token | 30 minutes | API authentication | Memory/localStorage |
| Refresh Token | 7 days | Obtain new access token | httpOnly cookie |

---

## Common Patterns

### Pagination

Most list endpoints support pagination:

```http
GET /api/v1/cases?page=1&per_page=20
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)

**Response Headers:**
```http
X-Total-Count: 100
X-Total-Pages: 5
X-Current-Page: 1
```

### Filtering

Many endpoints support filtering:

```http
GET /api/v1/messages?case_id=xxx&status=sent&from=2026-01-01
```

### Sorting

Use `sort` parameter:

```http
GET /api/v1/expenses?sort=-created_at  # Descending
GET /api/v1/expenses?sort=amount       # Ascending
```

### Field Selection

Use `fields` parameter:

```http
GET /api/v1/cases?fields=id,case_name,status
```

### Expansion

Use `expand` for related objects:

```http
GET /api/v1/cases/xxx?expand=children,participants
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `TOKEN_INVALID` | 401 | Invalid token format |
| `PERMISSION_DENIED` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoints by Module

---

### Auth Endpoints

#### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1-555-123-4567"
}
```

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "email_verified": false,
      "created_at": "2026-01-10T12:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 1800
  }
}
```

**Errors:**
- `409 DUPLICATE_ENTRY`: Email already registered
- `422 VALIDATION_ERROR`: Invalid email or weak password

---

#### POST /auth/login
Authenticate user and get tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 1800
  }
}
```

**Errors:**
- `401 AUTH_REQUIRED`: Invalid credentials
- `403 PERMISSION_DENIED`: Account suspended

---

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 1800
  }
}
```

---

#### POST /auth/logout
Invalidate current tokens.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (204):** No content

---

#### GET /auth/me
Get current authenticated user.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-123-4567",
    "email_verified": true,
    "profile": {
      "avatar_url": "https://...",
      "timezone": "America/Los_Angeles",
      "locale": "en_US",
      "subscription_tier": "basic"
    },
    "created_at": "2026-01-10T12:00:00Z"
  }
}
```

---

#### POST /auth/verify-email
Verify email with token from email.

**Request:**
```json
{
  "token": "abc123xyz..."
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Email verified successfully"
  }
}
```

---

#### POST /auth/password-reset/request
Request password reset email.

> **v1.4.0:** Updated endpoint path from `/auth/forgot-password`

**Authentication:** Not required

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

> **Security Note:** Always returns success to prevent email enumeration attacks.

---

#### POST /auth/password-reset/confirm
Reset password with token from email.

> **v1.4.0:** Updated endpoint path from `/auth/reset-password`

**Authentication:** Not required

**Request:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Errors:**
- `400 BAD_REQUEST`: Token expired or invalid
- `422 VALIDATION_ERROR`: Password does not meet requirements

> **Token Details:**
> - Single-use: Token is invalidated after successful reset
> - Expires after 1 hour
> - Delivered via Supabase email integration

---

### Users Endpoints

#### GET /users/profile
Get current user's profile.

**Response (200):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "avatar_url": "https://storage.commonground.app/avatars/xxx.jpg",
    "bio": "Co-parent of two wonderful kids",
    "timezone": "America/Los_Angeles",
    "locale": "en_US",
    "address_line1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "zip_code": "90001",
    "subscription_tier": "basic",
    "subscription_status": "active",
    "notification_preferences": {
      "email_messages": true,
      "email_reminders": true,
      "push_messages": true
    }
  }
}
```

---

#### PUT /users/profile
Update user profile.

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1-555-123-4567",
  "timezone": "America/New_York",
  "notification_preferences": {
    "email_messages": false
  }
}
```

**Response (200):** Updated profile object

---

#### POST /users/avatar
Upload profile avatar.

**Request:** `multipart/form-data`
- `file`: Image file (JPEG, PNG, max 5MB)

**Response (200):**
```json
{
  "data": {
    "avatar_url": "https://storage.commonground.app/avatars/xxx.jpg"
  }
}
```

---

### Family Files Endpoints

Family Files are the primary organizational unit in CommonGround v1.5+, replacing the legacy Case system.

#### GET /family-files

List all family files for the current user.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Smith Family",
      "parent_a_id": "uuid",
      "parent_b_id": "uuid",
      "parent_a": { "id": "uuid", "email": "...", "first_name": "...", "last_name": "..." },
      "parent_b": { "id": "uuid", "email": "...", "first_name": "...", "last_name": "..." },
      "state": "CA",
      "status": "active",
      "children": [...],
      "created_at": "2026-01-17T12:00:00Z"
    }
  ]
}
```

#### POST /family-files

Create a new family file.

**Request:**
```json
{
  "name": "Smith Family",
  "state": "CA",
  "county": "Los Angeles"
}
```

#### GET /family-files/{id}

Get family file details.

#### PUT /family-files/{id}

Update family file details.

#### POST /family-files/{id}/invite

Invite co-parent to join family file.

**Request:**
```json
{
  "email": "coparent@example.com",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

---

### Dashboard Endpoints

#### GET /dashboard/summary/{family_file_id}

Get aggregated dashboard data for a family file.

**Response:**
```json
{
  "pending_expenses_count": 3,
  "unread_messages_count": 5,
  "agreements_needing_approval_count": 1,
  "court_notifications_count": 0,
  "upcoming_events": [
    {
      "id": "uuid",
      "title": "School pickup",
      "start_time": "2026-01-18T15:00:00Z",
      "event_type": "exchange",
      "event_category": "exchange"
    }
  ],
  "next_event": {...}
}
```

#### GET /dashboard/debug/events/{family_file_id}

Debug endpoint showing all exchange and event data for troubleshooting.

#### POST /dashboard/regenerate-instances/{family_file_id}

Regenerate future instances for all recurring custody exchanges.

**Query Parameters:**
- `weeks_ahead` (int, default: 8): Number of weeks to generate instances for

---

### Custody Time Endpoints

Track and report on actual custody time per child.

#### GET /custody-time/child/{child_id}/stats

Get custody time statistics for a child.

**Query Parameters:**
- `days` (int, default: 30): Number of days to analyze

**Response:**
```json
{
  "child_id": "uuid",
  "child_name": "Emma Smith",
  "period_days": 30,
  "parent_a_days": 18,
  "parent_b_days": 12,
  "parent_a_name": "John Smith",
  "parent_b_name": "Jane Smith",
  "parent_a_percentage": 60.0,
  "parent_b_percentage": 40.0
}
```

#### GET /custody-time/child/{child_id}/periods

Get custody periods (continuous stretches with one parent).

**Query Parameters:**
- `start_date` (date): Start of period
- `end_date` (date): End of period

**Response:**
```json
{
  "periods": [
    {
      "id": "uuid",
      "child_id": "uuid",
      "parent_id": "uuid",
      "parent_name": "John Smith",
      "start_date": "2026-01-10",
      "end_date": "2026-01-15",
      "days": 5
    }
  ]
}
```

#### POST /custody-time/child/{child_id}/record

Record a custody day for a child.

**Request:**
```json
{
  "date": "2026-01-17",
  "parent_id": "uuid"
}
```

---

### Cases Endpoints (Legacy)

> **Note:** Cases are being replaced by Family Files. Use Family Files endpoints for new integrations.

#### POST /cases
Create a new case.

**Request:**
```json
{
  "case_name": "Smith Family",
  "state": "CA",
  "county": "Los Angeles",
  "other_parent_email": "otherparent@example.com",
  "children": [
    {
      "first_name": "Emma",
      "last_name": "Smith",
      "date_of_birth": "2018-05-15"
    }
  ]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "case_number": null,
    "case_name": "Smith Family",
    "state": "CA",
    "county": "Los Angeles",
    "status": "pending",
    "created_at": "2026-01-10T12:00:00Z",
    "invitation": {
      "token": "inv_xxx",
      "expires_at": "2026-01-17T12:00:00Z",
      "status": "pending"
    },
    "children": [
      {
        "id": "child-uuid",
        "first_name": "Emma",
        "last_name": "Smith",
        "date_of_birth": "2018-05-15"
      }
    ],
    "participants": [
      {
        "user_id": "current-user-uuid",
        "role": "petitioner",
        "joined_at": "2026-01-10T12:00:00Z"
      }
    ]
  }
}
```

---

#### GET /cases
List all cases for current user.

**Query Parameters:**
- `status`: Filter by status (pending, active, closed)
- `role`: Filter by role (petitioner, respondent)

**Response (200):**
```json
{
  "data": [
    {
      "id": "case-uuid-1",
      "case_name": "Smith Family",
      "status": "active",
      "role": "petitioner",
      "other_parent": {
        "first_name": "Jane",
        "last_name": "Smith"
      },
      "children_count": 2,
      "created_at": "2026-01-10T12:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 20
  }
}
```

---

#### GET /cases/{case_id}
Get case details.

**Path Parameters:**
- `case_id`: UUID of the case

**Query Parameters:**
- `expand`: Comma-separated list (children, participants, agreements)

**Response (200):**
```json
{
  "data": {
    "id": "case-uuid",
    "case_number": "2026-FL-12345",
    "case_name": "Smith Family",
    "state": "CA",
    "county": "Los Angeles",
    "court": "Los Angeles Superior Court",
    "status": "active",
    "separation_date": "2025-06-01",
    "filing_date": "2025-07-15",
    "require_joint_approval": true,
    "children": [...],
    "participants": [...],
    "active_agreement": {...},
    "created_at": "2026-01-10T12:00:00Z"
  }
}
```

---

#### PUT /cases/{case_id}
Update case details.

**Request:**
```json
{
  "case_number": "2026-FL-12345",
  "court": "Los Angeles Superior Court",
  "filing_date": "2025-07-15"
}
```

**Response (200):** Updated case object

---

#### POST /cases/{case_id}/invite
Send invitation to other parent.

**Request:**
```json
{
  "email": "otherparent@example.com",
  "message": "Please join our co-parenting case on CommonGround."
}
```

**Response (201):**
```json
{
  "data": {
    "invitation_id": "inv-uuid",
    "token": "inv_token_xxx",
    "expires_at": "2026-01-17T12:00:00Z",
    "email_sent": true
  }
}
```

---

#### POST /cases/accept/{token}
Accept case invitation.

**Path Parameters:**
- `token`: Invitation token from email

**Response (200):**
```json
{
  "data": {
    "case": {
      "id": "case-uuid",
      "case_name": "Smith Family",
      "status": "active"
    },
    "message": "Successfully joined case"
  }
}
```

---

#### PUT /cases/{case_id}/status
Update case status.

**Request:**
```json
{
  "status": "suspended",
  "reason": "Court order pending review"
}
```

**Response (200):** Updated case object

---

### Children Endpoints

#### GET /cases/{case_id}/children
List children in case.

**Response (200):**
```json
{
  "data": [
    {
      "id": "child-uuid",
      "first_name": "Emma",
      "middle_name": "Rose",
      "last_name": "Smith",
      "preferred_name": "Emmy",
      "date_of_birth": "2018-05-15",
      "age": 7,
      "gender": "female",
      "approved_by_a": "parent-a-uuid",
      "approved_by_b": "parent-b-uuid",
      "is_active": true
    }
  ]
}
```

---

#### POST /cases/{case_id}/children
Add child to case.

**Request:**
```json
{
  "first_name": "Emma",
  "middle_name": "Rose",
  "last_name": "Smith",
  "preferred_name": "Emmy",
  "date_of_birth": "2018-05-15",
  "gender": "female",
  "allergies": ["peanuts", "penicillin"],
  "medications": [
    {
      "name": "Zyrtec",
      "dosage": "5mg",
      "frequency": "daily"
    }
  ],
  "pediatrician_name": "Dr. Johnson",
  "pediatrician_phone": "+1-555-123-4567",
  "school_name": "Lincoln Elementary",
  "grade_level": "2nd Grade"
}
```

**Response (201):** Created child object

---

#### PUT /cases/{case_id}/children/{child_id}
Update child information.

**Request:** Partial child object with fields to update

**Response (200):** Updated child object

---

#### DELETE /cases/{case_id}/children/{child_id}
Remove child from case.

**Response (204):** No content

---

#### POST /cases/{case_id}/children/{child_id}/approve
Approve child information (for dual-approval workflow).

**Response (200):**
```json
{
  "data": {
    "child_id": "child-uuid",
    "approved_by": "current-user-uuid",
    "fully_approved": true
  }
}
```

---

### Messages Endpoints

#### POST /messages
Send a message (with ARIA analysis).

**Request:**
```json
{
  "case_id": "case-uuid",
  "content": "Can we discuss the holiday schedule?",
  "thread_id": "thread-uuid"
}
```

**Response (201) - Message sent:**
```json
{
  "data": {
    "id": "message-uuid",
    "case_id": "case-uuid",
    "sender_id": "current-user-uuid",
    "content": "Can we discuss the holiday schedule?",
    "status": "sent",
    "is_flagged": false,
    "sent_at": "2026-01-10T12:00:00Z"
  }
}
```

**Response (200) - ARIA Intervention:**
```json
{
  "data": {
    "requires_intervention": true,
    "original_content": "Why do you ALWAYS change the schedule without asking?!",
    "analysis": {
      "toxicity_score": 0.65,
      "categories": {
        "hostility": 0.4,
        "blame": 0.7,
        "all_caps": 0.3
      }
    },
    "suggestions": [
      "I noticed a schedule change. Can we discuss this before making adjustments?",
      "I'd like to talk about how we communicate schedule changes."
    ],
    "temp_message_id": "temp-uuid"
  }
}
```

---

#### POST /messages/{temp_id}/resolve
Resolve ARIA intervention.

**Request:**
```json
{
  "action": "accept",
  "selected_suggestion": 0,
  "modified_content": null
}
```

**Actions:**
- `accept`: Use selected suggestion
- `modify`: Use modified_content
- `reject`: Don't send message
- `send_anyway`: Send original (logged)

**Response (201):** Sent message object

---

#### GET /messages
List messages.

**Query Parameters:**
- `case_id`: Required - Case UUID
- `thread_id`: Filter by thread
- `since`: ISO datetime - Messages after this time
- `before`: ISO datetime - Messages before this time
- `status`: Filter by status

**Response (200):**
```json
{
  "data": [
    {
      "id": "message-uuid",
      "sender": {
        "id": "sender-uuid",
        "first_name": "John",
        "last_name": "Doe"
      },
      "content": "Message content...",
      "sent_at": "2026-01-10T12:00:00Z",
      "status": "read",
      "is_flagged": false
    }
  ],
  "meta": {
    "total": 50,
    "page": 1
  }
}
```

---

#### GET /messages/{message_id}
Get single message details.

**Response (200):**
```json
{
  "data": {
    "id": "message-uuid",
    "case_id": "case-uuid",
    "thread_id": "thread-uuid",
    "sender": {...},
    "receiver": {...},
    "content": "Message content...",
    "original_content": null,
    "is_flagged": false,
    "analysis": null,
    "sent_at": "2026-01-10T12:00:00Z",
    "delivered_at": "2026-01-10T12:00:01Z",
    "read_at": "2026-01-10T12:05:00Z"
  }
}
```

---

#### PUT /messages/{message_id}/read
Mark message as read.

**Response (200):**
```json
{
  "data": {
    "id": "message-uuid",
    "status": "read",
    "read_at": "2026-01-10T12:05:00Z"
  }
}
```

---

### ARIA Endpoints

#### POST /aria/analyze
Analyze text for sentiment.

**Request:**
```json
{
  "text": "Why can't you ever follow the schedule?",
  "context": {
    "case_id": "case-uuid"
  }
}
```

**Response (200):**
```json
{
  "data": {
    "toxicity_score": 0.45,
    "is_toxic": true,
    "categories": {
      "hostility": 0.3,
      "blame": 0.6,
      "passive_aggressive": 0.2,
      "profanity": 0.0,
      "dismissive": 0.1,
      "controlling": 0.2
    },
    "reasoning": "The message contains blame language ('you ever') which may escalate conflict.",
    "suggestions": [
      "I've noticed some schedule inconsistencies. Can we discuss how to improve this?",
      "Following the agreed schedule is important. Let's talk about what's causing the changes."
    ]
  }
}
```

---

#### POST /aria/chat
Have a conversation with ARIA.

**Request:**
```json
{
  "case_id": "case-uuid",
  "message": "What does our agreement say about holiday schedules?",
  "conversation_id": "conv-uuid"
}
```

**Response (200):**
```json
{
  "data": {
    "conversation_id": "conv-uuid",
    "response": "According to Section 7 of your custody agreement, holidays are alternated annually between parents. Specifically:\n\n- Thanksgiving: Parent A has odd years, Parent B has even years\n- Christmas Eve: Parent who doesn't have Christmas Day\n- Christmas Day: Alternates annually\n\nThis year (2026), Parent B has Thanksgiving and Christmas Day.",
    "citations": [
      {
        "section": "Section 7: Holiday Schedule",
        "text": "Holidays shall alternate annually..."
      }
    ]
  }
}
```

---

#### POST /aria/quick-accord
Generate quick agreement for specific issue.

**Request:**
```json
{
  "case_id": "case-uuid",
  "topic": "summer_vacation",
  "details": "We need to agree on summer vacation dates for 2026. I'd like to take the kids to Florida June 15-22."
}
```

**Response (200):**
```json
{
  "data": {
    "draft_agreement": "## Summer Vacation Agreement 2026\n\n**Parent A** will have the children for vacation from June 15-22, 2026 for a trip to Florida.\n\n**Terms:**\n1. Parent A will provide itinerary 7 days before departure\n2. Parent A will provide contact information for accommodations\n3. Children will have daily phone/video call access with Parent B\n4. Return will be to Parent B's residence on June 22 by 6:00 PM\n\n**Agreed by both parents on [DATE]**",
    "requires_approval": true
  }
}
```

---

#### POST /aria/intake
Paralegal intake assistance.

**Request:**
```json
{
  "form_type": "FL-300",
  "case_id": "case-uuid",
  "request_type": "custody_modification",
  "details": "I need to modify custody because I got a new job with different hours."
}
```

**Response (200):**
```json
{
  "data": {
    "form_type": "FL-300",
    "form_name": "Request for Order",
    "pre_filled_data": {
      "petitioner_name": "John Doe",
      "respondent_name": "Jane Doe",
      "case_number": "2026-FL-12345",
      "request_type": "Modify child custody order",
      "facts": "..."
    },
    "required_attachments": [
      "FL-311 (Child Custody Agreement)",
      "Proof of employment change"
    ],
    "filing_instructions": "File with Los Angeles Superior Court, Family Law Division...",
    "estimated_filing_fee": "$60.00"
  }
}
```

---

#### GET /aria/settings
Get ARIA settings for case.

**Query Parameters:**
- `case_id`: Required

**Response (200):**
```json
{
  "data": {
    "enabled": true,
    "intervention_threshold": 0.30,
    "auto_suggest": true,
    "block_high_toxicity": true,
    "allow_send_anyway": true,
    "track_good_faith": true
  }
}
```

---

#### PUT /aria/settings
Update ARIA settings.

**Request:**
```json
{
  "case_id": "case-uuid",
  "intervention_threshold": 0.40,
  "allow_send_anyway": false
}
```

**Response (200):** Updated settings object

---

### Agreements Endpoints

#### POST /agreements
Create new agreement.

**Request:**
```json
{
  "case_id": "case-uuid",
  "title": "Parenting Plan 2026",
  "agreement_type": "parenting_plan",
  "effective_date": "2026-02-01"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "agreement-uuid",
    "case_id": "case-uuid",
    "title": "Parenting Plan 2026",
    "agreement_type": "parenting_plan",
    "status": "draft",
    "created_by": "current-user-uuid",
    "effective_date": "2026-02-01",
    "sections": [],
    "created_at": "2026-01-10T12:00:00Z"
  }
}
```

---

#### GET /agreements
List agreements for case.

**Query Parameters:**
- `case_id`: Required
- `status`: Filter by status

**Response (200):**
```json
{
  "data": [
    {
      "id": "agreement-uuid",
      "title": "Parenting Plan 2026",
      "status": "approved",
      "approved_by_a": "parent-a-uuid",
      "approved_by_b": "parent-b-uuid",
      "approved_at": "2026-01-15T12:00:00Z",
      "effective_date": "2026-02-01"
    }
  ]
}
```

---

#### GET /agreements/{agreement_id}
Get agreement details.

**Query Parameters:**
- `expand`: sections, versions

**Response (200):**
```json
{
  "data": {
    "id": "agreement-uuid",
    "case_id": "case-uuid",
    "title": "Parenting Plan 2026",
    "agreement_type": "parenting_plan",
    "status": "draft",
    "sections": [
      {
        "id": "section-uuid",
        "section_type": "legal_custody",
        "section_order": 4,
        "title": "Legal Custody",
        "content": {...},
        "is_completed": true
      }
    ],
    "progress": {
      "completed_sections": 12,
      "total_sections": 18,
      "percentage": 67
    }
  }
}
```

---

#### PUT /agreements/{agreement_id}/sections/{section_type}
Update agreement section.

**Path Parameters:**
- `section_type`: One of the 18 section types

**Request:**
```json
{
  "content": {
    "custody_type": "joint",
    "primary_decision_maker": null,
    "decision_areas": {
      "education": "joint",
      "healthcare": "joint",
      "religion": "parent_a",
      "extracurricular": "joint"
    }
  }
}
```

**Response (200):** Updated section object

---

#### POST /agreements/{agreement_id}/approve
Submit agreement approval.

**Response (200):**
```json
{
  "data": {
    "agreement_id": "agreement-uuid",
    "approved_by": "current-user-uuid",
    "approved_at": "2026-01-10T12:00:00Z",
    "fully_approved": false,
    "waiting_for": "other_parent"
  }
}
```

---

#### POST /agreements/{agreement_id}/reject
Reject agreement.

**Request:**
```json
{
  "reason": "I disagree with the holiday schedule in Section 7.",
  "sections_with_issues": ["holiday_schedule"]
}
```

**Response (200):**
```json
{
  "data": {
    "agreement_id": "agreement-uuid",
    "status": "rejected",
    "rejected_by": "current-user-uuid",
    "reason": "I disagree with the holiday schedule in Section 7."
  }
}
```

---

#### POST /agreements/{agreement_id}/generate-pdf
Generate PDF document.

**Response (200):**
```json
{
  "data": {
    "pdf_url": "https://storage.commonground.app/agreements/xxx.pdf",
    "generated_at": "2026-01-10T12:00:00Z",
    "file_size_bytes": 245000,
    "hash": "sha256:abc123..."
  }
}
```

---

#### GET /agreements/{agreement_id}/download
Download PDF.

**Response:** PDF file with appropriate headers

---

#### GET /agreements/{agreement_id}/rules
Get compiled rules for ARIA.

**Response (200):**
```json
{
  "data": {
    "custody": {
      "legal": "joint",
      "physical_primary": "parent_a"
    },
    "schedule": {
      "pattern": "2-2-5-5",
      "week_start": "monday"
    },
    "holidays": {
      "thanksgiving": {"2026": "parent_b", "2027": "parent_a"},
      "christmas": {"2026": "parent_a", "2027": "parent_b"}
    },
    "expenses": {
      "medical": 0.50,
      "education": 0.50,
      "extracurricular": 0.50
    },
    "communication": {
      "platform": "commonground",
      "response_time_hours": 24
    }
  }
}
```

---

### ClearFund Endpoints

#### POST /clearfund/expenses
Create expense request.

**Request:**
```json
{
  "case_id": "case-uuid",
  "child_id": "child-uuid",
  "category": "medical",
  "description": "Annual pediatrician checkup",
  "amount": 150.00,
  "expense_date": "2026-01-08",
  "receipt_url": "https://storage.commonground.app/receipts/xxx.jpg"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "expense-uuid",
    "case_id": "case-uuid",
    "child": {
      "id": "child-uuid",
      "first_name": "Emma"
    },
    "category": "medical",
    "description": "Annual pediatrician checkup",
    "amount": 150.00,
    "split_percentage": 0.50,
    "parent_a_share": 75.00,
    "parent_b_share": 75.00,
    "status": "pending",
    "submitted_by": "current-user-uuid",
    "created_at": "2026-01-10T12:00:00Z"
  }
}
```

---

#### GET /clearfund/expenses
List expenses.

**Query Parameters:**
- `case_id`: Required
- `status`: pending, approved, rejected
- `category`: medical, education, etc.
- `child_id`: Filter by child
- `from`: Start date
- `to`: End date

**Response (200):**
```json
{
  "data": [
    {
      "id": "expense-uuid",
      "category": "medical",
      "description": "Annual checkup",
      "amount": 150.00,
      "status": "approved",
      "expense_date": "2026-01-08"
    }
  ],
  "meta": {
    "total": 25,
    "total_amount": 3500.00
  }
}
```

---

#### POST /clearfund/expenses/{expense_id}/approve
Approve expense.

**Request:**
```json
{
  "notes": "Approved as per medical expense policy"
}
```

**Response (200):** Updated expense object

---

#### POST /clearfund/expenses/{expense_id}/reject
Reject expense.

**Request:**
```json
{
  "reason": "This expense should be categorized as education, not extracurricular"
}
```

**Response (200):** Updated expense object

---

#### GET /clearfund/balance
Get running balance.

**Query Parameters:**
- `case_id`: Required

**Response (200):**
```json
{
  "data": {
    "balance": 325.50,
    "balance_direction": "parent_a_owes_parent_b",
    "last_updated": "2026-01-10T12:00:00Z",
    "summary": {
      "total_expenses": 5200.00,
      "total_payments": 4874.50,
      "pending_expenses": 450.00
    }
  }
}
```

---

#### GET /clearfund/obligations
List recurring obligations.

**Query Parameters:**
- `case_id`: Required

**Response (200):**
```json
{
  "data": [
    {
      "id": "obligation-uuid",
      "obligation_type": "child_support",
      "payer": {
        "id": "parent-a-uuid",
        "first_name": "John"
      },
      "payee": {
        "id": "parent-b-uuid",
        "first_name": "Jane"
      },
      "amount": 1500.00,
      "frequency": "monthly",
      "next_due": "2026-02-01",
      "is_active": true
    }
  ]
}
```

---

#### POST /clearfund/obligations
Create recurring obligation.

**Request:**
```json
{
  "case_id": "case-uuid",
  "obligation_type": "child_support",
  "payee_id": "parent-b-uuid",
  "amount": 1500.00,
  "frequency": "monthly",
  "start_date": "2026-01-01"
}
```

**Response (201):** Created obligation object

---

#### GET /clearfund/ledger
Get full transaction ledger.

**Query Parameters:**
- `case_id`: Required
- `from`: Start date
- `to`: End date

**Response (200):**
```json
{
  "data": [
    {
      "id": "entry-uuid",
      "entry_type": "expense",
      "description": "Medical: Annual checkup",
      "amount": 75.00,
      "from": "parent_a",
      "to": "parent_b",
      "running_balance": 325.50,
      "created_at": "2026-01-10T12:00:00Z"
    }
  ]
}
```

---

### Wallet Endpoints (v1.1.2)

#### GET /wallets/me
Get current user's wallet.

**Response (200):**
```json
{
  "data": {
    "id": "wallet-uuid",
    "user_id": "user-uuid",
    "available_balance": "500.00",
    "pending_balance": "0.00",
    "currency": "usd",
    "onboarding_completed": true
  }
}
```

---

#### POST /wallets/pay-obligation
Pay an obligation from wallet or card.

**Request:**
```json
{
  "obligation_id": "obligation-uuid",
  "amount": 150.00,
  "payment_source": "card",
  "payment_method_id": "pm_xxx"
}
```

**Payment Sources:**
- `wallet` - Pay from wallet balance (no fees)
- `card` - Pay with credit/debit card (2.9% + $0.30 fee)

**Response (200):**
```json
{
  "data": {
    "id": "payment-uuid",
    "obligation_id": "obligation-uuid",
    "payer_id": "user-uuid",
    "amount": "150.00",
    "payment_source": "card",
    "status": "completed",
    "wallet_transaction_id": null,
    "stripe_payment_intent_id": "pi_xxx",
    "requires_action": false,
    "client_secret": null,
    "created_at": "2026-01-11T12:00:00Z",
    "completed_at": "2026-01-11T12:00:01Z"
  }
}
```

**3D Secure Response (200):**
When 3D Secure authentication is required:
```json
{
  "data": {
    "id": "payment-uuid",
    "status": "pending",
    "requires_action": true,
    "client_secret": "pi_xxx_secret_xxx"
  }
}
```

> **v1.1.2:** Added `requires_action` and `client_secret` fields for 3D Secure support

---

### Subscriptions Endpoints

Manage subscription plans, checkout, billing, and feature access.

> **v1.4.0:** Added subscription management system with Stripe integration

#### GET /subscriptions/plans
List all available subscription plans.

**Authentication:** Not required

**Response (200):**
```json
{
  "plans": [
    {
      "id": "plan_starter_001",
      "plan_code": "starter",
      "display_name": "Starter",
      "description": "Everything you need to get started with better co-parenting.",
      "badge": null,
      "price_monthly": 0.00,
      "price_annual": 0.00,
      "features": {
        "aria_manual_sentiment": true,
        "clearfund_fee_exempt": false,
        "quick_accords": false,
        "circle_contacts_limit": 0,
        "kidcoms_access": false
      },
      "trial_days": 14,
      "display_order": 0
    },
    {
      "id": "plan_plus_001",
      "plan_code": "plus",
      "display_name": "Plus",
      "description": "Better scheduling, no fees, and a trusted contact.",
      "badge": "Most Popular",
      "price_monthly": 12.00,
      "price_annual": 120.00,
      "features": {
        "aria_manual_sentiment": true,
        "clearfund_fee_exempt": true,
        "quick_accords": true,
        "circle_contacts_limit": 1,
        "kidcoms_access": false
      },
      "trial_days": 14,
      "display_order": 1
    },
    {
      "id": "plan_family_plus_001",
      "plan_code": "family_plus",
      "display_name": "Family+",
      "description": "Full access including KidComs video calls and theater mode.",
      "badge": null,
      "price_monthly": 25.00,
      "price_annual": 250.00,
      "features": {
        "aria_manual_sentiment": true,
        "aria_advanced": true,
        "clearfund_fee_exempt": true,
        "quick_accords": true,
        "circle_contacts_limit": 5,
        "kidcoms_access": true,
        "theater_mode": true
      },
      "trial_days": 14,
      "display_order": 2
    }
  ]
}
```

---

#### GET /subscriptions/current
Get the current user's subscription status.

**Authentication:** Required

**Response (200):**
```json
{
  "tier": "plus",
  "tier_display_name": "Plus",
  "status": "active",
  "stripe_subscription_id": "sub_xxx",
  "period_start": "2026-01-15T00:00:00Z",
  "period_end": "2026-02-15T00:00:00Z",
  "has_active_grant": false,
  "grant_nonprofit_name": null,
  "grant_expires_at": null,
  "is_trial": false,
  "trial_ends_at": null,
  "features": {
    "aria_manual_sentiment": { "has_access": true, "limit": null },
    "clearfund_fee_exempt": { "has_access": true, "limit": null },
    "quick_accords": { "has_access": true, "limit": null },
    "circle_contacts_limit": { "has_access": true, "limit": 1 },
    "kidcoms_access": { "has_access": false, "limit": null }
  }
}
```

---

#### POST /subscriptions/checkout
Subscribe to a plan or upgrade existing subscription.

**Authentication:** Required

**Request:**
```json
{
  "plan_code": "plus",
  "period": "monthly",
  "success_url": "https://app.commonground.app/billing?success=true",
  "cancel_url": "https://app.commonground.app/billing"
}
```

**Response (200) - New subscription (checkout required):**
```json
{
  "action": "checkout",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_xxx",
  "session_id": "cs_xxx"
}
```

**Response (200) - Existing subscription upgraded:**
```json
{
  "action": "upgraded",
  "new_tier": "family_plus",
  "message": "Successfully upgraded to Family+!"
}
```

**Errors:**
- `400 BAD_REQUEST`: Invalid plan code or already on this plan
- `404 NOT_FOUND`: Plan not found

---

#### POST /subscriptions/upgrade
Upgrade or change an existing subscription's plan.

**Authentication:** Required

**Request:**
```json
{
  "plan_code": "family_plus",
  "period": "monthly"
}
```

**Response (200):**
```json
{
  "success": true,
  "new_tier": "family_plus",
  "message": "Successfully upgraded to Family+!"
}
```

**Errors:**
- `400 BAD_REQUEST`: No active subscription to upgrade

---

#### POST /subscriptions/portal
Create a Stripe Customer Portal session for billing management.

**Authentication:** Required

**Request:**
```json
{
  "return_url": "https://app.commonground.app/settings/billing"
}
```

**Response (200):**
```json
{
  "portal_url": "https://billing.stripe.com/session/xxx"
}
```

---

#### POST /subscriptions/cancel
Cancel the current subscription.

**Authentication:** Required

**Request:**
```json
{
  "immediate": false
}
```

**Response (200):**
```json
{
  "cancelled": true,
  "cancel_at": "2026-02-15T00:00:00Z",
  "message": "Subscription will be cancelled at the end of the billing period."
}
```

> When `immediate: false` (default), subscription remains active until period end. When `immediate: true`, cancellation is immediate and user is downgraded to Starter.

---

#### POST /subscriptions/reactivate
Reactivate a cancelled subscription before it ends.

**Authentication:** Required

**Response (200):**
```json
{
  "reactivated": true,
  "message": "Subscription reactivated successfully."
}
```

**Errors:**
- `400 BAD_REQUEST`: No subscription to reactivate

---

#### GET /subscriptions/features
List all features and the current user's access level.

**Authentication:** Required

**Response (200):**
```json
{
  "tier": "plus",
  "features": {
    "aria_manual_sentiment": {
      "has_access": true,
      "limit": null,
      "required_tier": "starter"
    },
    "clearfund_fee_exempt": {
      "has_access": true,
      "limit": null,
      "required_tier": "plus"
    },
    "kidcoms_access": {
      "has_access": false,
      "limit": null,
      "required_tier": "family_plus"
    }
  }
}
```

---

#### GET /subscriptions/features/{feature}
Check if the current user has access to a specific feature.

**Authentication:** Required

**Response (200):**
```json
{
  "feature": "kidcoms_access",
  "has_access": false,
  "current_tier": "plus",
  "required_tier": "family_plus",
  "limit": null,
  "upgrade_message": "Upgrade to Family+ to access KidComs video calling."
}
```

---

#### POST /subscriptions/sync
Sync subscription status from Stripe (fallback when webhooks are delayed).

**Authentication:** Required

**Response (200):** Returns `SubscriptionStatusResponse` (same as GET /subscriptions/current)

---

### Grants Endpoints

Manage nonprofit grant code redemption for DV survivors.

> **v1.4.0:** Added grant code system for nonprofit partnerships

#### POST /grants/redeem
Redeem a nonprofit grant code.

**Authentication:** Required

**Request:**
```json
{
  "code": "SAFEHAVEN-ABC123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Grant code redeemed successfully! You now have Plus access.",
  "nonprofit_name": "Safe Haven",
  "granted_tier": "plus",
  "expires_at": "2026-07-15T00:00:00Z"
}
```

**Errors:**
- `400 BAD_REQUEST`: User already has active grant or paid subscription
- `404 NOT_FOUND`: Invalid grant code

---

#### GET /grants/status
Check if the current user has an active grant.

**Authentication:** Required

**Response (200) - With active grant:**
```json
{
  "has_active_grant": true,
  "grant_code": "SAFEHAVEN-ABC123",
  "nonprofit_name": "Safe Haven",
  "granted_tier": "plus",
  "granted_at": "2026-01-15T12:00:00Z",
  "expires_at": "2026-07-15T00:00:00Z"
}
```

**Response (200) - No active grant:**
```json
{
  "has_active_grant": false
}
```

---

#### GET /grants/validate/{code}
Validate a grant code without redeeming it.

**Authentication:** Not required (public endpoint)

**Response (200) - Valid code:**
```json
{
  "code": "SAFEHAVEN-ABC123",
  "nonprofit_name": "Safe Haven",
  "granted_tier": "plus",
  "is_valid": true
}
```

**Response (200) - Invalid code:**
```json
{
  "code": "INVALID-CODE",
  "nonprofit_name": "",
  "granted_tier": "",
  "is_valid": false,
  "reason": "Invalid grant code"
}
```

---

### Schedule Endpoints

#### POST /schedule/events
Create schedule event.

**Request:**
```json
{
  "case_id": "case-uuid",
  "event_type": "regular",
  "title": "Parenting Time - Parent A",
  "responsible_parent_id": "parent-a-uuid",
  "start_time": "2026-01-15T18:00:00Z",
  "end_time": "2026-01-18T18:00:00Z",
  "is_recurring": true,
  "recurrence_rule": {
    "frequency": "weekly",
    "interval": 2,
    "days": ["friday"]
  }
}
```

**Response (201):** Created event object

---

#### GET /schedule/events
List events.

**Query Parameters:**
- `case_id`: Required
- `from`: Start date/time
- `to`: End date/time
- `event_type`: regular, holiday, vacation
- `parent_id`: Filter by responsible parent

**Response (200):**
```json
{
  "data": [
    {
      "id": "event-uuid",
      "event_type": "regular",
      "title": "Parenting Time - Parent A",
      "responsible_parent": {
        "id": "parent-a-uuid",
        "first_name": "John"
      },
      "start_time": "2026-01-15T18:00:00Z",
      "end_time": "2026-01-18T18:00:00Z",
      "status": "scheduled"
    }
  ]
}
```

---

#### GET /schedule/calendar
Get calendar view data.

**Query Parameters:**
- `case_id`: Required
- `month`: YYYY-MM format
- `view`: month, week

**Response (200):**
```json
{
  "data": {
    "month": "2026-01",
    "events": [...],
    "exchanges": [...],
    "holidays": [
      {
        "date": "2026-01-01",
        "name": "New Year's Day",
        "parent": "parent_a"
      }
    ],
    "busy_periods": [...]
  }
}
```

---

#### GET /schedule/compliance
Get compliance metrics.

**Query Parameters:**
- `case_id`: Required
- `period`: month, quarter, year

**Response (200):**
```json
{
  "data": {
    "period": "2026-01",
    "parent_a": {
      "total_exchanges": 8,
      "on_time": 7,
      "grace_period_used": 1,
      "late": 0,
      "missed": 0,
      "on_time_rate": 0.875,
      "compliance_score": 95
    },
    "parent_b": {
      "total_exchanges": 8,
      "on_time": 6,
      "grace_period_used": 1,
      "late": 1,
      "missed": 0,
      "on_time_rate": 0.75,
      "compliance_score": 85
    }
  }
}
```

---

### Exchanges Endpoints

#### GET /exchanges
List custody exchanges.

**Query Parameters:**
- `case_id`: Required
- `status`: pending, completed, cancelled
- `from`: Start date
- `to`: End date

**Response (200):**
```json
{
  "data": [
    {
      "id": "exchange-uuid",
      "scheduled_time": "2026-01-15T18:00:00Z",
      "location": "Lincoln Elementary School",
      "location_type": "school",
      "dropoff_parent": {...},
      "pickup_parent": {...},
      "status": "pending",
      "children": [...]
    }
  ]
}
```

---

#### POST /exchanges/{exchange_id}/checkin
Check in to exchange.

**Request:**
```json
{
  "checkin_type": "dropoff",
  "gps_latitude": 34.0522,
  "gps_longitude": -118.2437,
  "notes": "Arrived on time"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "checkin-uuid",
    "exchange_id": "exchange-uuid",
    "checkin_type": "dropoff",
    "scheduled_time": "2026-01-15T18:00:00Z",
    "actual_time": "2026-01-15T17:55:00Z",
    "was_on_time": true,
    "grace_period_used": false,
    "gps_verified": true
  }
}
```

---

#### POST /exchanges/{exchange_id}/complete
Mark exchange as complete.

**Request:**
```json
{
  "notes": "Exchange completed successfully"
}
```

**Response (200):** Updated exchange object

---

#### POST /exchanges/{exchange_id}/cancel
Cancel exchange.

**Request:**
```json
{
  "reason": "Child is sick - doctor appointment confirmed",
  "request_makeup": true,
  "proposed_makeup_time": "2026-01-16T18:00:00Z"
}
```

**Response (200):** Updated exchange object

---

### KidComs Endpoints

#### POST /kidcoms/sessions
Create video call session.

**Request:**
```json
{
  "case_id": "case-uuid",
  "child_id": "child-uuid",
  "scheduled_time": "2026-01-10T19:00:00Z",
  "duration_minutes": 30
}
```

**Response (201):**
```json
{
  "data": {
    "id": "session-uuid",
    "child": {
      "id": "child-uuid",
      "first_name": "Emma"
    },
    "scheduled_time": "2026-01-10T19:00:00Z",
    "status": "pending",
    "daily_room_url": "https://commonground.daily.co/cg-abc123"
  }
}
```

---

#### GET /kidcoms/sessions
List call sessions.

**Query Parameters:**
- `case_id`: Required
- `status`: pending, active, completed
- `child_id`: Filter by child

**Response (200):** List of session objects

---

#### POST /kidcoms/sessions/{session_id}/join
Join active call.

**Response (200):**
```json
{
  "data": {
    "session_id": "session-uuid",
    "meeting_token": "eyJhbGciOiJIUzI1NiIs...",
    "room_url": "https://commonground.daily.co/cg-abc123"
  }
}
```

---

#### POST /kidcoms/sessions/{session_id}/end
End call session.

**Response (200):**
```json
{
  "data": {
    "session_id": "session-uuid",
    "status": "completed",
    "duration_seconds": 1523,
    "ended_at": "2026-01-10T19:25:23Z"
  }
}
```

---

#### GET /kidcoms/settings
Get KidComs settings.

**Query Parameters:**
- `case_id`: Required
- `child_id`: Optional

**Response (200):**
```json
{
  "data": {
    "enabled": true,
    "require_scheduling": false,
    "max_call_duration": 30,
    "allow_recording": false,
    "allowed_hours": {
      "start": "08:00",
      "end": "20:00"
    }
  }
}
```

---

### Cubbie Endpoints

#### GET /cubbie/{child_id}
Get child's Cubbie overview.

**Response (200):**
```json
{
  "data": {
    "child_id": "child-uuid",
    "child_name": "Emma",
    "categories": [
      {
        "id": "cat-uuid",
        "name": "Medical",
        "icon": "medical",
        "item_count": 5
      }
    ],
    "total_items": 23,
    "essential_items": 8,
    "handoff_items": 12
  }
}
```

---

#### GET /cubbie/{child_id}/items
List all Cubbie items.

**Query Parameters:**
- `category`: Filter by category
- `essential_only`: boolean

**Response (200):**
```json
{
  "data": [
    {
      "id": "item-uuid",
      "name": "EpiPen",
      "category": "medical",
      "description": "For peanut allergy emergencies",
      "is_essential": true,
      "include_in_handoff": true,
      "expires_at": "2027-01-15"
    }
  ]
}
```

---

#### POST /cubbie/{child_id}/items
Add Cubbie item.

**Request:**
```json
{
  "category_id": "cat-uuid",
  "name": "School Backpack",
  "description": "Blue Jansport with all school supplies",
  "is_essential": false,
  "include_in_handoff": true,
  "photo_url": "https://storage.commonground.app/cubbie/xxx.jpg"
}
```

**Response (201):** Created item object

---

#### GET /cubbie/{child_id}/handoff
Get handoff checklist.

**Response (200):**
```json
{
  "data": {
    "child_id": "child-uuid",
    "items": [
      {
        "id": "item-uuid",
        "name": "EpiPen",
        "category": "medical",
        "is_essential": true
      },
      {
        "id": "item-uuid",
        "name": "School Backpack",
        "category": "educational",
        "is_essential": false
      }
    ],
    "notes": "Remember to include homework folder"
  }
}
```

---

### My Circle Endpoints

#### GET /my-circle
List circle contacts.

**Query Parameters:**
- `case_id`: Required

**Response (200):**
```json
{
  "data": [
    {
      "id": "contact-uuid",
      "first_name": "Mary",
      "last_name": "Smith",
      "relationship": "grandmother",
      "email": "mary@example.com",
      "permission_level": "emergency",
      "can_use_kidcoms": true,
      "approved_by_both": true,
      "room_number": 3
    }
  ]
}
```

> **v1.1.2:** Added `room_number` field for direct room assignment tracking

---

#### POST /my-circle
Add/invite circle contact.

**Request:**
```json
{
  "case_id": "case-uuid",
  "email": "grandma@example.com",
  "first_name": "Mary",
  "last_name": "Smith",
  "relationship": "grandmother",
  "permission_level": "emergency",
  "can_use_kidcoms": true,
  "children_access": ["child-uuid-1", "child-uuid-2"]
}
```

**Response (201):** Created contact with invitation details

---

#### PUT /my-circle/{contact_id}/permissions
Update contact permissions.

**Request:**
```json
{
  "permission_level": "full",
  "can_use_kidcoms": true,
  "can_view_schedule": true,
  "can_view_cubbie": true
}
```

**Response (200):** Updated contact object

---

### Court Portal Endpoints

#### GET /court/cases
List accessible cases (for professionals).

**Response (200):**
```json
{
  "data": [
    {
      "id": "case-uuid",
      "case_number": "2026-FL-12345",
      "case_name": "Smith v. Smith",
      "role": "gal",
      "access_level": "read",
      "access_expires": "2026-04-10"
    }
  ]
}
```

---

#### GET /court/cases/{case_id}
Get case overview for professional.

**Response (200):**
```json
{
  "data": {
    "id": "case-uuid",
    "case_number": "2026-FL-12345",
    "case_name": "Smith v. Smith",
    "status": "active",
    "parties": {
      "petitioner": {...},
      "respondent": {...}
    },
    "children": [...],
    "summary": {
      "messages_count": 150,
      "agreements_count": 2,
      "compliance_score_a": 95,
      "compliance_score_b": 85
    }
  }
}
```

---

#### POST /court/access
Grant professional access.

**Request:**
```json
{
  "case_id": "case-uuid",
  "professional_email": "attorney@lawfirm.com",
  "professional_name": "Jane Attorney",
  "role": "attorney_petitioner",
  "access_level": "read",
  "end_date": "2026-04-10",
  "bar_number": "CA123456"
}
```

**Response (201):** Created access record

---

#### POST /court/events
Create court event.

**Request:**
```json
{
  "case_id": "case-uuid",
  "event_type": "hearing",
  "title": "Custody Modification Hearing",
  "event_date": "2026-02-15",
  "start_time": "09:00",
  "location": "Department 5, Los Angeles Superior Court",
  "is_mandatory": true,
  "petitioner_required": true,
  "respondent_required": true
}
```

**Response (201):** Created event object

---

#### POST /court/forms/{form_type}
Generate court form.

**Path Parameters:**
- `form_type`: FL-300, FL-311, FL-341, etc.

**Request:**
```json
{
  "case_id": "case-uuid",
  "additional_data": {
    "relief_requested": "Modify custody arrangement",
    "facts": "Employment schedule changed..."
  }
}
```

**Response (200):**
```json
{
  "data": {
    "form_type": "FL-300",
    "pdf_url": "https://storage.commonground.app/forms/xxx.pdf",
    "generated_at": "2026-01-10T12:00:00Z"
  }
}
```

---

### Exports Endpoints

#### POST /exports
Create export package.

**Request:**
```json
{
  "case_id": "case-uuid",
  "export_type": "full_case",
  "title": "Court Package - January 2026",
  "date_range_start": "2025-07-01",
  "date_range_end": "2026-01-10",
  "sections": ["communications", "schedule", "compliance", "financial"],
  "include_metadata": true,
  "redactions": ["medical_details"]
}
```

**Response (202):**
```json
{
  "data": {
    "id": "export-uuid",
    "status": "processing",
    "estimated_completion": "2026-01-10T12:05:00Z"
  }
}
```

---

#### GET /exports/{export_id}
Get export status/details.

**Response (200):**
```json
{
  "data": {
    "id": "export-uuid",
    "export_type": "full_case",
    "title": "Court Package - January 2026",
    "status": "completed",
    "file_url": "https://storage.commonground.app/exports/xxx.zip",
    "file_size_bytes": 2450000,
    "file_hash": "sha256:abc123...",
    "generated_at": "2026-01-10T12:04:32Z",
    "expires_at": "2026-04-10T12:04:32Z"
  }
}
```

---

#### POST /exports/{export_id}/verify
Verify export integrity.

**Request:**
```json
{
  "provided_hash": "sha256:abc123..."
}
```

**Response (200):**
```json
{
  "data": {
    "is_valid": true,
    "message": "Export integrity verified successfully"
  }
}
```

---

### Notifications Endpoints

#### GET /notifications
List notifications.

**Query Parameters:**
- `unread_only`: boolean
- `type`: Filter by notification type

**Response (200):**
```json
{
  "data": [
    {
      "id": "notif-uuid",
      "type": "message_received",
      "title": "New Message",
      "message": "Jane sent you a message",
      "is_read": false,
      "data": {
        "case_id": "case-uuid",
        "message_id": "message-uuid"
      },
      "created_at": "2026-01-10T12:00:00Z"
    }
  ],
  "meta": {
    "unread_count": 5
  }
}
```

---

#### PUT /notifications/{notification_id}/read
Mark notification as read.

**Response (200):**
```json
{
  "data": {
    "id": "notif-uuid",
    "is_read": true,
    "read_at": "2026-01-10T12:05:00Z"
  }
}
```

---

#### GET /notifications/preferences
Get notification preferences.

**Response (200):**
```json
{
  "data": {
    "email_messages": true,
    "email_reminders": true,
    "email_agreements": true,
    "push_messages": true,
    "push_reminders": true,
    "quiet_hours": {
      "enabled": true,
      "start": "22:00",
      "end": "07:00"
    }
  }
}
```

---

### Professional Portal Endpoints

> **v1.6.0:** New section for legal professional case management

The Professional Portal provides a complete case management system for attorneys, mediators, paralegals, and other family law professionals.

---

#### GET /professional/profile
Get current professional's profile.

**Response (200):**
```json
{
  "data": {
    "id": "profile-uuid",
    "user_id": "user-uuid",
    "professional_type": "attorney",
    "license_number": "CA12345",
    "license_state": "CA",
    "license_verified": true,
    "credentials": {
      "bar_number": "12345",
      "certifications": ["family_law"]
    },
    "practice_areas": ["custody", "divorce", "mediation"],
    "is_active": true,
    "onboarded_at": "2026-01-15T10:00:00Z"
  }
}
```

---

#### POST /professional/profile
Create professional profile (onboarding).

**Request:**
```json
{
  "professional_type": "attorney",
  "license_number": "CA12345",
  "license_state": "CA",
  "practice_areas": ["custody", "divorce"],
  "credentials": {
    "bar_number": "12345"
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "profile-uuid",
    "professional_type": "attorney",
    "license_verified": false,
    "is_active": true
  }
}
```

---

#### PATCH /professional/profile
Update professional profile.

**Request:**
```json
{
  "practice_areas": ["custody", "divorce", "mediation"],
  "notification_preferences": {
    "email_new_cases": true,
    "email_daily_digest": true
  }
}
```

---

#### GET /professional/firms
List firms the professional belongs to.

**Response (200):**
```json
{
  "data": [
    {
      "id": "firm-uuid",
      "name": "Smith Family Law",
      "slug": "smith-family-law",
      "firm_type": "law_firm",
      "role": "owner",
      "member_count": 5,
      "is_active": true
    }
  ]
}
```

---

#### POST /professional/firms
Create a new firm.

**Request:**
```json
{
  "name": "Smith Family Law",
  "firm_type": "law_firm",
  "email": "contact@smithlaw.com",
  "phone": "+1-555-123-4567",
  "address": {
    "line1": "123 Legal St",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001"
  },
  "is_public": true
}
```

**Response (201):**
```json
{
  "data": {
    "id": "firm-uuid",
    "name": "Smith Family Law",
    "slug": "smith-family-law",
    "firm_type": "law_firm"
  }
}
```

---

#### GET /professional/firms/{firm_id}/members
List firm members.

**Response (200):**
```json
{
  "data": [
    {
      "id": "membership-uuid",
      "professional_id": "prof-uuid",
      "user_name": "John Smith",
      "user_email": "john@smithlaw.com",
      "role": "owner",
      "status": "active",
      "joined_at": "2026-01-01T10:00:00Z"
    }
  ]
}
```

---

#### POST /professional/firms/{firm_id}/members/invite
Invite a new member to the firm.

**Request:**
```json
{
  "email": "newlawyer@smithlaw.com",
  "role": "attorney",
  "custom_permissions": {
    "can_manage_templates": true
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "membership-uuid",
    "email": "newlawyer@smithlaw.com",
    "role": "attorney",
    "status": "invited",
    "invited_at": "2026-01-18T10:00:00Z"
  }
}
```

---

#### GET /professional/dashboard
Get aggregated dashboard data.

**Query Parameters:**
- `firm_id`: Filter by specific firm (optional)

**Response (200):**
```json
{
  "data": {
    "case_count": 15,
    "pending_intakes": 3,
    "pending_approvals": 2,
    "unread_messages": 8,
    "upcoming_events": [
      {
        "id": "event-uuid",
        "title": "Status Hearing - Smith v. Jones",
        "event_date": "2026-01-20",
        "event_type": "hearing",
        "is_mandatory": true
      }
    ],
    "alerts": [
      {
        "type": "court_deadline",
        "severity": "high",
        "title": "Response Due",
        "message": "Response to motion due in 3 days",
        "case_id": "case-uuid"
      }
    ],
    "recent_activity": [
      {
        "activity_type": "intake_completed",
        "title": "New Client Intake",
        "description": "Sarah Johnson completed intake",
        "timestamp": "2026-01-18T09:30:00Z"
      }
    ]
  }
}
```

---

#### GET /professional/cases
List assigned cases.

**Query Parameters:**
- `status`: Filter by status (active, on_hold, completed)
- `assignment_role`: Filter by role (lead_attorney, associate, paralegal)
- `firm_id`: Filter by firm
- `search`: Search case names
- `page`, `per_page`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "family-file-uuid",
      "case_name": "Smith v. Jones",
      "assignment_role": "lead_attorney",
      "representing": "parent_a",
      "status": "active",
      "parent_a": {
        "id": "user-uuid",
        "name": "John Smith"
      },
      "parent_b": {
        "id": "user-uuid",
        "name": "Jane Jones"
      },
      "children_count": 2,
      "unread_messages": 3,
      "next_event": {
        "title": "Mediation Session",
        "date": "2026-01-22"
      }
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "per_page": 20
  }
}
```

---

#### GET /professional/cases/{family_file_id}
Get case overview.

**Response (200):**
```json
{
  "data": {
    "id": "family-file-uuid",
    "case_name": "Smith v. Jones",
    "status": "active",
    "assignment": {
      "role": "lead_attorney",
      "representing": "parent_a",
      "access_scopes": ["agreement", "schedule", "messages", "financials"],
      "can_control_aria": true,
      "assigned_at": "2026-01-15T10:00:00Z"
    },
    "parent_a": {
      "id": "user-uuid",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1-555-111-2222"
    },
    "parent_b": {
      "id": "user-uuid",
      "name": "Jane Jones",
      "email": "jane@example.com"
    },
    "children": [
      {
        "id": "child-uuid",
        "first_name": "Emma",
        "age": 8
      }
    ],
    "agreements": [
      {
        "id": "agreement-uuid",
        "type": "custody",
        "status": "approved",
        "approved_at": "2026-01-10T10:00:00Z"
      }
    ],
    "compliance_summary": {
      "exchange_compliance": 92,
      "financial_compliance": 88,
      "overall_score": 90
    },
    "aria_summary": {
      "good_faith_score": 0.85,
      "recent_interventions": 2,
      "communication_trend": "improving"
    }
  }
}
```

---

#### GET /professional/cases/{family_file_id}/timeline
Get chronological case timeline.

**Query Parameters:**
- `event_types`: Filter by types (message, exchange, agreement, court, aria)
- `start_date`, `end_date`: Date range
- `limit`, `offset`: Pagination

**Response (200):**
```json
{
  "data": {
    "events": [
      {
        "id": "event-uuid",
        "event_type": "message",
        "title": "Message from John to Jane",
        "description": "Regarding pickup time change",
        "timestamp": "2026-01-18T14:30:00Z",
        "metadata": {
          "sender": "John Smith",
          "flagged": false
        }
      },
      {
        "id": "event-uuid",
        "event_type": "exchange",
        "title": "Custody Exchange",
        "status": "completed",
        "timestamp": "2026-01-18T18:00:00Z",
        "metadata": {
          "location": "School",
          "on_time": true
        }
      },
      {
        "id": "event-uuid",
        "event_type": "aria",
        "title": "ARIA Intervention",
        "description": "Message rewrite suggested",
        "timestamp": "2026-01-17T09:15:00Z",
        "metadata": {
          "intervention_type": "rewrite_suggested",
          "action_taken": "accepted"
        }
      }
    ],
    "summary": {
      "total_events": 45,
      "messages": 30,
      "exchanges": 8,
      "agreements": 2,
      "court_events": 3,
      "aria_interventions": 5
    }
  }
}
```

---

#### GET /professional/cases/{family_file_id}/communications
View parent-to-parent message threads.

**Query Parameters:**
- `flagged_only`: Show only ARIA-flagged messages
- `start_date`, `end_date`: Date range
- `limit`, `offset`: Pagination

**Response (200):**
```json
{
  "data": {
    "threads": [
      {
        "id": "thread-uuid",
        "participants": ["John Smith", "Jane Jones"],
        "message_count": 15,
        "last_message_at": "2026-01-18T14:30:00Z",
        "flagged_count": 2
      }
    ],
    "messages": [
      {
        "id": "message-uuid",
        "sender": "John Smith",
        "content": "Can we change pickup to 5pm?",
        "sent_at": "2026-01-18T14:30:00Z",
        "is_flagged": false,
        "flag_details": null
      }
    ],
    "stats": {
      "total_messages": 150,
      "flagged_messages": 8,
      "intervention_rate": 0.05
    }
  }
}
```

---

#### GET /professional/cases/{family_file_id}/aria
Get ARIA settings for case.

**Response (200):**
```json
{
  "data": {
    "enabled": true,
    "sensitivity_level": "high",
    "intervention_mode": "suggest",
    "blocked_categories": ["profanity", "threats"],
    "allow_bypass": false,
    "custom_triggers": [],
    "last_updated_by": "prof-uuid",
    "last_updated_at": "2026-01-15T10:00:00Z"
  }
}
```

---

#### PATCH /professional/cases/{family_file_id}/aria
Update ARIA settings.

**Request:**
```json
{
  "sensitivity_level": "medium",
  "intervention_mode": "suggest",
  "blocked_categories": ["profanity", "threats", "hostility"]
}
```

---

#### GET /professional/cases/{family_file_id}/aria/flags
Get ARIA intervention history.

**Query Parameters:**
- `action_taken`: Filter by action (accepted, rejected, modified)
- `limit`, `offset`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "flag-uuid",
      "message_id": "message-uuid",
      "original_content": "You never care about the kids!",
      "suggested_content": "I feel concerned about coordination for the children's activities.",
      "toxicity_score": 0.75,
      "categories": ["blame", "hostility"],
      "action_taken": "accepted",
      "created_at": "2026-01-17T09:15:00Z"
    }
  ],
  "meta": {
    "total": 8,
    "accepted": 5,
    "rejected": 2,
    "modified": 1
  }
}
```

---

#### GET /professional/messages
List all professional messages.

**Query Parameters:**
- `case_id`: Filter by case
- `unread_only`: Show only unread
- `limit`, `offset`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "message-uuid",
      "case_id": "case-uuid",
      "case_name": "Smith v. Jones",
      "recipient": "John Smith",
      "subject": "Document Request",
      "content_preview": "Please provide the following...",
      "is_read": false,
      "sent_at": "2026-01-18T10:00:00Z"
    }
  ]
}
```

---

#### POST /professional/messages/case/{family_file_id}
Send message to client.

**Request:**
```json
{
  "recipient_id": "user-uuid",
  "subject": "Case Update",
  "content": "I wanted to update you on the hearing scheduled for next week..."
}
```

**Response (201):**
```json
{
  "data": {
    "id": "message-uuid",
    "recipient_id": "user-uuid",
    "subject": "Case Update",
    "sent_at": "2026-01-18T11:00:00Z"
  }
}
```

---

#### GET /professional/intake/sessions
List intake sessions.

**Query Parameters:**
- `status`: Filter by status (draft, in_progress, completed, archived)
- `firm_id`: Filter by firm
- `limit`, `offset`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "session-uuid",
      "client_name": "Sarah Johnson",
      "client_email": "sarah@example.com",
      "status": "completed",
      "intake_type": "custody",
      "created_at": "2026-01-17T14:00:00Z",
      "completed_at": "2026-01-17T15:30:00Z",
      "message_count": 24
    }
  ]
}
```

---

#### POST /professional/intake/sessions
Create new intake session.

**Request:**
```json
{
  "client_name": "New Client",
  "client_email": "client@example.com",
  "client_phone": "+1-555-000-0000",
  "intake_type": "custody",
  "template_id": "template-uuid"
}
```

---

#### GET /professional/intake/sessions/{session_id}
Get intake session details.

**Response (200):**
```json
{
  "data": {
    "id": "session-uuid",
    "client_name": "Sarah Johnson",
    "status": "completed",
    "messages": [
      {
        "role": "assistant",
        "content": "Welcome! Let's start with some basic information.",
        "timestamp": "2026-01-17T14:00:00Z"
      },
      {
        "role": "user",
        "content": "Hi, I'm looking for help with custody arrangements.",
        "timestamp": "2026-01-17T14:01:00Z"
      }
    ],
    "extracted_data": {
      "client_info": {
        "name": "Sarah Johnson",
        "address": "456 Oak St, Los Angeles, CA"
      },
      "children": [
        {
          "name": "Emma Johnson",
          "age": 8
        }
      ],
      "custody_preferences": {
        "schedule_type": "50-50",
        "concerns": ["school schedule", "extracurriculars"]
      }
    },
    "summary": "Sarah Johnson is seeking joint custody arrangements for her 8-year-old daughter Emma..."
  }
}
```

---

#### GET /professional/access-requests
List pending access requests.

**Response (200):**
```json
{
  "data": [
    {
      "id": "request-uuid",
      "family_file_id": "file-uuid",
      "case_name": "New Client Case",
      "requested_by": "parent",
      "parent_name": "John Smith",
      "requested_scopes": ["agreement", "schedule", "messages"],
      "status": "pending",
      "created_at": "2026-01-18T09:00:00Z"
    }
  ]
}
```

---

#### POST /professional/access-requests/{request_id}/accept
Accept case invitation.

**Request:**
```json
{
  "assignment_role": "lead_attorney",
  "representing": "parent_a"
}
```

**Response (200):**
```json
{
  "data": {
    "assignment_id": "assignment-uuid",
    "family_file_id": "file-uuid",
    "status": "active"
  }
}
```

---

#### POST /professional/access-requests/{request_id}/decline
Decline case invitation.

**Request:**
```json
{
  "reason": "Conflict of interest"
}
```

---

#### GET /professional/directory
Search public firm directory.

**Query Parameters:**
- `query`: Search term
- `state`: Filter by state
- `firm_type`: Filter by type (law_firm, mediation_practice, solo_practice)
- `page`, `per_page`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "firm-uuid",
      "name": "Smith Family Law",
      "slug": "smith-family-law",
      "firm_type": "law_firm",
      "city": "Los Angeles",
      "state": "CA",
      "practice_areas": ["custody", "divorce"],
      "member_count": 5,
      "logo_url": "https://..."
    }
  ]
}
```

---

## Webhooks

CommonGround can send webhooks for real-time event notifications.

### Application Webhook Events

| Event | Trigger |
|-------|---------|
| `case.created` | New case created |
| `case.invitation.accepted` | Other parent joined |
| `message.sent` | Message sent |
| `message.flagged` | ARIA flagged message |
| `agreement.approved` | Agreement fully approved |
| `expense.submitted` | New expense request |
| `expense.approved` | Expense approved |
| `exchange.checkin` | Parent checked in |
| `export.completed` | Export ready |

### Stripe Webhook Events (v1.4.0)

The backend processes the following Stripe webhooks at `POST /api/v1/webhooks/stripe`:

| Event | Trigger | Action |
|-------|---------|--------|
| `checkout.session.completed` | User completes Stripe checkout | Create subscription, update user tier |
| `customer.subscription.created` | New subscription created | Sync subscription to user profile |
| `customer.subscription.updated` | Subscription plan or status changed | Update tier, status, period dates |
| `customer.subscription.deleted` | Subscription cancelled | Downgrade user to Starter tier |
| `invoice.paid` | Successful payment/renewal | Extend subscription period |
| `invoice.payment_failed` | Payment failed | Mark subscription as `past_due` |
| `payment_intent.succeeded` | Wallet deposit successful | Credit user wallet balance |
| `transfer.created` | Payout initiated | Log payout to wallet |

**Stripe Webhook Configuration:**
- Endpoint URL: `https://api.commonground.app/api/v1/webhooks/stripe`
- Events: Select the events listed above
- Signing secret: Set in `STRIPE_WEBHOOK_SECRET` environment variable

### Webhook Payload

```json
{
  "event": "message.sent",
  "timestamp": "2026-01-10T12:00:00Z",
  "data": {
    "message_id": "message-uuid",
    "case_id": "case-uuid",
    "sender_id": "sender-uuid"
  },
  "signature": "sha256=xxx"
}
```

### Verifying Webhooks

```python
import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

---

## Rate Limiting

### Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 10 | 1 minute |
| Read operations | 100 | 1 minute |
| Write operations | 30 | 1 minute |
| ARIA analysis | 60 | 1 minute |
| Exports | 5 | 1 hour |

### Response Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704902400
```

### Rate Limit Exceeded

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retry_after": 45
  }
}
```

---

## SDK Examples

### Python

```python
import requests

class CommonGroundClient:
    def __init__(self, access_token: str):
        self.base_url = "https://api.commonground.app/api/v1"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

    def get_cases(self):
        response = requests.get(
            f"{self.base_url}/cases",
            headers=self.headers
        )
        return response.json()["data"]

    def send_message(self, case_id: str, content: str):
        response = requests.post(
            f"{self.base_url}/messages",
            headers=self.headers,
            json={
                "case_id": case_id,
                "content": content
            }
        )
        return response.json()["data"]

# Usage
client = CommonGroundClient("your_access_token")
cases = client.get_cases()
```

### TypeScript

```typescript
interface Case {
  id: string;
  case_name: string;
  status: string;
}

class CommonGroundClient {
  private baseUrl = "https://api.commonground.app/api/v1";

  constructor(private accessToken: string) {}

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    const json = await response.json();
    return json.data;
  }

  async getCases(): Promise<Case[]> {
    return this.fetch<Case[]>("/cases");
  }

  async sendMessage(caseId: string, content: string) {
    return this.fetch("/messages", {
      method: "POST",
      body: JSON.stringify({ case_id: caseId, content }),
    });
  }
}

// Usage
const client = new CommonGroundClient("your_access_token");
const cases = await client.getCases();
```

---

## Document Index

This API reference is part of the comprehensive documentation suite:

| Document | Location | Purpose |
|----------|----------|---------|
| **API_REFERENCE.md** | `/docs/api/` | This document |
| AUTHENTICATION.md | `/docs/api/` | Auth deep dive |
| OVERVIEW.md | `/docs/architecture/` | System overview |
| FEATURES_BREAKDOWN.md | `/docs/architecture/` | Feature details |

---

*Last Updated: January 18, 2026*
*API Version: 1.6.0*

---

## Document: AUTHENTICATION.md

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

---

