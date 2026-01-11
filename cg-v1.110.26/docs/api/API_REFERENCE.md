# CommonGround V1 - Complete API Reference

**Last Updated:** January 11, 2026
**API Version:** 1.1.2
**Base URL:** `https://api.commonground.app/api/v1`
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
   - [Cases](#cases-endpoints)
   - [Children](#children-endpoints)
   - [Messages](#messages-endpoints)
   - [ARIA](#aria-endpoints)
   - [Agreements](#agreements-endpoints)
   - [ClearFund](#clearfund-endpoints)
   - [Wallet](#wallet-endpoints-v112)
   - [Schedule](#schedule-endpoints)
   - [Exchanges](#exchanges-endpoints)
   - [KidComs](#kidcoms-endpoints)
   - [Cubbie](#cubbie-endpoints)
   - [My Circle](#my-circle-endpoints)
   - [Court Portal](#court-portal-endpoints)
   - [Exports](#exports-endpoints)
   - [Notifications](#notifications-endpoints)
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

#### POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Password reset email sent"
  }
}
```

---

#### POST /auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset_token_xxx",
  "new_password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Password reset successfully"
  }
}
```

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

### Cases Endpoints

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

## Webhooks

CommonGround can send webhooks for real-time event notifications.

### Webhook Events

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

*Last Updated: January 10, 2026*
*API Version: 1.0.0*
