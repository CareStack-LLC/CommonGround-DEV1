# Backend Changelog

All notable changes to the CommonGround Backend API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-01-11

### Added

#### ClearFund Stripe Payment Integration
- **Card Payment for Obligations** - `POST /api/v1/wallets/pay-obligation` now accepts `payment_method_id` for card payments
- **3D Secure Support** - Returns `requires_action` and `client_secret` when additional authentication needed
- **ObligationPaymentResponse** - Enhanced response schema with 3D Secure fields:
  - `client_secret: Optional[str]` - For Stripe confirmCardPayment
  - `requires_action: bool` - Indicates if 3D Secure confirmation required

#### Room Number Tracking
- **CircleContactResponse Schema** - Added `room_number: Optional[int]` field for direct room assignment tracking
- **Room Assignment in Responses** - Circle contacts now include their assigned room number in API responses

### Changed
- Room lookup now uses `room_number` field directly instead of name-based matching
- `create-and-invite` endpoint continues to auto-assign rooms (3-10) to new contacts
- Obligation payment endpoint supports both wallet and card payment sources

---

## [1.1.1] - 2025-01-10

### Added

#### My Circle Email Invitations
- **SendGrid Integration for Circle Invites**
  - `POST /api/v1/my-circle/circle-users/{id}/resend-invite` - Resend invitation email
  - Email sent automatically when inviting circle contacts
  - Purple-themed HTML email template with login link
  - Token regeneration for expired invitations
- **Invitation Email Content**
  - Personalized greeting with inviter name
  - Child name context for relationship clarity
  - Direct login link with pre-filled credentials
  - Mobile-responsive HTML design

### Fixed

#### KidComs Session Status
- **Incoming Call Notification Timing** - Fixed notifications disappearing before recipient could join
  - Root cause: `join_session` was changing status from WAITING to ACTIVE when initiator joined
  - Fix: Only change to ACTIVE when recipient joins, not initiator
  - Sessions now correctly persist in WAITING status for full 3-minute timeout
- **Child Join Session Logic** - Same fix applied to `child_join_session` endpoint
  - Check `initiated_by_id` before changing session status
  - Ensures incoming call banners remain visible until answered

### Changed
- Circle invitation endpoints now send emails via SendGrid when EMAIL_ENABLED=true
- `invite_circle_user` and `create_and_invite_circle_user` automatically trigger emails

---

## [1.1.0] - 2025-01-10

### Added

#### KidComs Video Calling System
- **Daily.co Integration** - Complete video calling infrastructure
  - `POST /api/v1/kidcoms/rooms` - Create video call rooms
  - `POST /api/v1/kidcoms/rooms/{room_id}/tokens` - Generate participant tokens
  - `GET /api/v1/kidcoms/rooms/{room_id}` - Get room details
  - `DELETE /api/v1/kidcoms/rooms/{room_id}` - End call and cleanup
- **Call Sessions** - Track active video/voice/chat sessions
  - `POST /api/v1/kidcoms/sessions` - Create new session
  - `GET /api/v1/kidcoms/sessions/{session_id}` - Get session status
  - `PUT /api/v1/kidcoms/sessions/{session_id}` - Update session state
- **Call Notifications** - Real-time call alerts
  - `GET /api/v1/kidcoms/notifications` - Get pending call notifications
  - `POST /api/v1/kidcoms/notifications/{id}/respond` - Accept/decline call
  - 3-minute notification timeout
- **Child Call Routing** - Child-initiated calls to parents
- **Session Types** - Support for video_call, voice_call, chat

#### My Circle Contact System
- **Circle Management Endpoints**
  - `GET /api/v1/circle/contacts` - List approved contacts
  - `POST /api/v1/circle/contacts` - Add new circle contact
  - `PUT /api/v1/circle/contacts/{id}` - Update contact details
  - `DELETE /api/v1/circle/contacts/{id}` - Remove contact
- **Invitation System**
  - `POST /api/v1/circle/invite` - Send circle invitation
  - `POST /api/v1/circle/accept` - Accept invitation
  - `GET /api/v1/circle/invites` - List pending invitations
- **Permission Management**
  - `GET /api/v1/circle/contacts/{id}/permissions` - Get contact permissions
  - `PUT /api/v1/circle/contacts/{id}/permissions` - Update permissions
  - Auto-create default permissions on invite acceptance
- **Circle Authentication**
  - `POST /api/v1/circle/auth/login` - Circle contact login
  - `POST /api/v1/circle/auth/register` - Circle contact registration
  - Separate auth flow with limited access scope

#### Activity & Notification System
- **Activity Logging Service**
  - Log events, expenses, messages, and user actions
  - `GET /api/v1/activities` - Get activity feed
  - `GET /api/v1/activities/unread` - Get unread count
  - `POST /api/v1/activities/{id}/read` - Mark as read
  - `POST /api/v1/activities/read-all` - Mark all as read
- **Activity Types** - event_created, expense_submitted, message_sent, etc.

#### Schedule Enhancements
- **ARIA Conflict Detection** - Detect overlapping schedule events
  - `POST /api/v1/schedule/events/check-conflicts` - Validate new events
  - Returns list of conflicting events with details
- **Timezone Support** - Proper handling across co-parent timezones
  - Store events in UTC, convert for display
  - `timezone` field on user profiles

### Changed
- `circle_permissions` table column types corrected for timestamps
- KidComs session status uses WAITING for circle contacts
- Call participants include circle contacts for notifications

### Fixed
- 500 error when circle contact initiates call
- Child notifications for parent-initiated calls
- Parent notifications scoped to invited participants only
- `invite_expires_at` made optional in response schema

### Security
- Production Vercel URL added to CORS `allowed_origins`
- bcrypt used directly (passlib compatibility issue resolved)
- Circle contact tokens have limited permission scope

---

## [1.0.0] - 2025-01-05

### Added

#### ARIA Service Enhancements
- **Mediator Templates** - Professional mediation suggestion patterns
  - 15+ template responses for common conflict scenarios
  - Context-aware selection based on toxicity categories
- **Blocking Logic** - Block highly toxic messages (score > 0.8)
  - Returns error with required rewrite
  - Logs blocked attempts for compliance
- **Improved Claude Prompts** - Better structured prompts for AI analysis
  - More specific toxicity category definitions
  - Better suggestion generation guidance

#### Family File Invitation System
- `POST /api/v1/family-files/{id}/invite` - Invite co-parent
- `POST /api/v1/family-files/accept-invite` - Accept invitation
- `GET /api/v1/family-files/{id}/invitation-status` - Check invite status
- Agreement-centric architecture for Family Files

### Fixed
- Dataclass field order in `aria.py` preventing TypeError
- Migration: cubbie_items table creation without duplicate columns
- Migration: custody_orders table population
- Migration: Removed redundant index=True preventing DuplicateTable

---

## [0.9.0] - 2025-01-02

### Added

#### Deployment Configuration
- **Render Support**
  - `render.yaml` configuration file
  - Startup script improvements
  - Auto-run migrations on deploy
- **Dynamic Database URL**
  - Convert `DATABASE_URL` to async driver format at runtime
  - Support for Render's PostgreSQL URLs

### Changed
- CORS configuration accepts Vercel preview URLs via regex pattern
- API URL suffix `/api/v1` enforced in configuration

### Fixed
- Missing dependencies added to requirements.txt:
  - `pymupdf` - PDF processing
  - `jinja2` - Email templates
  - `email-validator` - Email validation
- CSP headers for Render backend connections

---

## [0.8.0] - 2025-01-01

### Added

#### Silent Handoff System
- **GPS Verification Service**
  - `POST /api/v1/exchanges/{id}/silent-handoff` - Initiate silent handoff
  - `POST /api/v1/exchanges/{id}/verify-location` - Verify GPS proximity
  - Configurable proximity threshold (default 100m)
- **Exchange Models**
  - `gps_coordinates` field on exchange check-ins
  - `verification_method` enum (manual, gps, silent_handoff)
  - `proximity_verified` boolean flag

#### California Court Forms
- **Form Generation Endpoints**
  - `POST /api/v1/court/forms/fl-300` - Request for Order
  - `POST /api/v1/court/forms/fl-311` - Child Custody/Visitation Application
  - `POST /api/v1/court/forms/fl-320` - Responsive Declaration
  - `POST /api/v1/court/forms/fl-340` - Findings and Order After Hearing
  - `POST /api/v1/court/forms/fl-341` - Child Custody/Visitation Order Attachment
  - `POST /api/v1/court/forms/fl-342` - Child Support Order Attachment
- **Form Workflow**
  - `GET /api/v1/court/forms/templates` - List available forms
  - `GET /api/v1/court/forms/{id}/status` - Check form completion status

#### KidsCubbie (ChildVault)
- **Item Tracking**
  - `GET /api/v1/cubbie/items` - List tracked items
  - `POST /api/v1/cubbie/items` - Add new item
  - `PUT /api/v1/cubbie/items/{id}` - Update item location/status
  - `POST /api/v1/cubbie/items/{id}/transfer` - Record item transfer
- **Exchange Integration**
  - Link cubbie items to custody exchanges
  - Track which items should travel with child

---

## [0.7.0] - 2024-12-31

### Added

#### ClearFund Payment System
- **Expense Endpoints**
  - `GET /api/v1/clearfund/expenses` - List expenses
  - `POST /api/v1/clearfund/expenses` - Submit expense
  - `PUT /api/v1/clearfund/expenses/{id}` - Update expense
  - `POST /api/v1/clearfund/expenses/{id}/approve` - Approve expense
  - `POST /api/v1/clearfund/expenses/{id}/reject` - Reject expense
- **Payment Tracking**
  - `GET /api/v1/clearfund/balance` - Get running balance
  - `POST /api/v1/clearfund/payments` - Record payment
  - `GET /api/v1/clearfund/ledger` - Transaction history
- **Split Calculations**
  - Auto-calculate splits from agreement percentages
  - Support for category-specific splits

#### Case Export System
- **Export Endpoints**
  - `POST /api/v1/court/export` - Generate court package
  - `GET /api/v1/court/export/{id}` - Download export
  - `GET /api/v1/court/exports` - List generated exports
- **Export Types** - investigation, court_package, compliance_report
- **Content Selection** - Choose messages, agreements, schedule, expenses
- **SHA-256 Hashing** - Document integrity verification

#### Court Access Mode
- **Legal Access Endpoints**
  - `POST /api/v1/court/access/grant` - Grant professional access
  - `GET /api/v1/court/access` - List active access grants
  - `DELETE /api/v1/court/access/{id}` - Revoke access
  - `GET /api/v1/court/portal` - Legal professional dashboard
- **Access Roles** - attorney, gal, mediator, court_clerk
- **Time Limits** - Automatic expiration (default 90 days)
- **Audit Logging** - Track all professional access

#### Custody Exchange System
- **Exchange Endpoints**
  - `POST /api/v1/exchanges` - Create exchange
  - `GET /api/v1/exchanges` - List exchanges
  - `POST /api/v1/exchanges/{id}/check-in` - Record check-in
  - `GET /api/v1/exchanges/{id}/compliance` - Get compliance data
- **Calendar Integration**
  - `GET /api/v1/schedule/calendar` - Calendar view data
  - Exchange events included in calendar

---

## [0.6.0] - 2024-12-30

### Added

#### Email Notification Service
- **Notification Types**
  - Case invitation emails
  - Agreement approval notifications
  - Message notifications (digest)
  - Exchange reminders (24h, 1h before)
  - Monthly compliance reports
- **Email Templates** - Jinja2 HTML templates
- **SendGrid Integration** - Production email delivery

---

## [0.5.0] - 2024-12-30

### Added

#### TimeBridge Scheduling System
- **Schedule Event Endpoints**
  - `GET /api/v1/schedule/events` - List events
  - `POST /api/v1/schedule/events` - Create event
  - `PUT /api/v1/schedule/events/{id}` - Update event
  - `DELETE /api/v1/schedule/events/{id}` - Delete event
- **Exchange Check-In System**
  - `POST /api/v1/schedule/exchanges/{id}/check-in` - Record check-in
  - Timeliness tracking (on-time, grace period, late)
  - GPS location support (optional)
- **Compliance Metrics**
  - `GET /api/v1/schedule/compliance` - Get compliance stats
  - On-time percentage, grace period usage, late count
  - Trend analysis (improving, stable, worsening)
- **Calendar API**
  - `GET /api/v1/schedule/calendar` - Month/week view data
  - Event categorization by type
  - Grace period handling (default 15 minutes)

### Changed
- API router includes schedule endpoints
- Case models enhanced with schedule relationships

---

## [0.4.0] - 2024-12-30

### Added

#### ARIA Sentiment Shield
- **Message Analysis Service**
  - 3-tier analysis: regex patterns → Claude AI → OpenAI fallback
  - Toxicity scoring (0.0 - 1.0)
  - 7 detection categories: hostility, blame, passive_aggressive, profanity, dismissive, controlling, all_caps
- **Message Endpoints**
  - `GET /api/v1/messages` - List messages for case
  - `POST /api/v1/messages` - Send message with ARIA analysis
  - `POST /api/v1/messages/analyze` - Analyze without sending
  - `PUT /api/v1/messages/{id}/flag` - Flag message
- **Intervention Workflow**
  - Smart message rewrites preserving intent
  - User actions: accept, modify, reject, send_anyway
  - Track interventions in MessageFlag model
- **Good Faith Metrics**
  - `GET /api/v1/messages/analytics` - Get communication stats
  - Suggestion acceptance rate
  - Toxicity trend over time
  - Improvement tracking

### Security
- SHA-256 content hashing for message integrity
- Original message preservation for audit trail

---

## [0.3.0] - 2024-12-29

### Added

#### Agreement Builder System
- **Agreement Endpoints**
  - `GET /api/v1/agreements` - List agreements
  - `POST /api/v1/agreements` - Create agreement
  - `GET /api/v1/agreements/{id}` - Get agreement details
  - `PUT /api/v1/agreements/{id}/sections/{section}` - Update section
  - `POST /api/v1/agreements/{id}/approve` - Parent approval
  - `GET /api/v1/agreements/{id}/pdf` - Generate PDF
- **18 Section Templates**
  - parent_info, other_parent_info, children_info
  - legal_custody, physical_custody, parenting_schedule
  - holiday_schedule, exchange_logistics, transportation
  - child_support, medical_healthcare, education
  - parent_communication, child_communication, travel
  - relocation, dispute_resolution, other_provisions
- **Dual Approval Workflow**
  - Track approval by both parents
  - Status: draft → pending_approval → approved
  - Approval timestamps and signatures
- **PDF Generation** - ReportLab integration
- **Version Control** - Agreement version history

---

## [0.2.0] - 2024-12-29

### Added

#### Case Management System
- **Case Endpoints**
  - `GET /api/v1/cases` - List user's cases
  - `POST /api/v1/cases` - Create case
  - `GET /api/v1/cases/{id}` - Get case details
  - `PUT /api/v1/cases/{id}` - Update case
  - `POST /api/v1/cases/{id}/accept` - Accept invitation
- **Child Endpoints**
  - `GET /api/v1/cases/{id}/children` - List children
  - `POST /api/v1/cases/{id}/children` - Add child
  - `PUT /api/v1/children/{id}` - Update child
  - `DELETE /api/v1/children/{id}` - Remove child
- **Invitation System**
  - Generate invitation tokens
  - Email-based invitation workflow
  - Token validation and expiration
- **Access Control**
  - Participant verification on all endpoints
  - Role-based permissions (petitioner, respondent)

### Security
- Access control verification for all case operations
- Participant validation middleware
- Audit logging for case modifications

---

## [0.1.0] - 2024-12-28

### Added

#### Authentication System
- **Auth Endpoints**
  - `POST /api/v1/auth/register` - User registration
  - `POST /api/v1/auth/login` - User login
  - `POST /api/v1/auth/logout` - Logout
  - `POST /api/v1/auth/refresh` - Token refresh
  - `GET /api/v1/auth/me` - Get current user
  - `PUT /api/v1/auth/profile` - Update profile
- **Supabase Integration**
  - Email/password authentication
  - Email verification workflow
  - Supabase user sync
- **JWT Token Management**
  - Access tokens (15 min expiry)
  - Refresh tokens (7 day expiry)
  - Secure token storage
- **Password Security**
  - bcrypt hashing
  - Minimum complexity requirements

#### Database Models
- **User** - Core user data, Supabase ID link
- **UserProfile** - Extended profile, settings, subscription

#### Infrastructure
- **FastAPI Setup**
  - Async application
  - OpenAPI documentation
  - Health check endpoint
- **PostgreSQL + SQLAlchemy**
  - Async database sessions
  - Connection pooling
  - Model relationships
- **Alembic Migrations**
  - Version-controlled schema changes
  - Upgrade/downgrade support
- **Docker Compose**
  - PostgreSQL container
  - Redis container
  - Backend service
- **Middleware**
  - CORS configuration
  - Error handling
  - Request logging

### Security
- Bcrypt password hashing
- JWT token management
- Secure session handling
- Supabase authentication integration

---

## API Version Summary

| Version | Endpoints | Models | Key Features |
|---------|-----------|--------|--------------|
| 1.1.2 | 122+ | 35+ | Room tracking, Stripe obligation payments |
| 1.1.1 | 121+ | 35+ | Circle email invites, KidComs fix |
| 1.1.0 | 120+ | 35+ | KidComs, My Circle, Activities |
| 1.0.0 | 100+ | 32+ | ARIA enhancements, Family invites |
| 0.9.0 | 95+ | 30+ | Deployment, CORS |
| 0.8.0 | 90+ | 30+ | Silent Handoff, Court Forms, Cubbie |
| 0.7.0 | 75+ | 28+ | ClearFund, Court Export, Legal Access |
| 0.6.0 | 60+ | 25+ | Email notifications |
| 0.5.0 | 55+ | 22+ | TimeBridge scheduling |
| 0.4.0 | 45+ | 20+ | ARIA messaging |
| 0.3.0 | 35+ | 15+ | Agreement builder |
| 0.2.0 | 20+ | 10+ | Case management |
| 0.1.0 | 10+ | 5+ | Auth, infrastructure |

---

## Database Migration History

All migrations are managed via Alembic in `alembic/versions/`.

Key migrations:
- `001_initial` - Users, profiles, auth tables
- `002_cases` - Cases, participants, children
- `003_agreements` - Agreements, sections, versions
- `004_messages` - Messages, threads, flags
- `005_schedule` - Events, exchanges, check-ins
- `006_payments` - Expenses, payments, ledger
- `007_court` - Legal access, exports
- `008_cubbie` - Item tracking tables
- `009_kidcoms` - Sessions, rooms, notifications
- `010_circle` - Circle contacts, permissions
- `011_activities` - Activity feed tables
