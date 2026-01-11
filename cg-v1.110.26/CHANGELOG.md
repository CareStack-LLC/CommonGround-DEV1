# Changelog

All notable changes to CommonGround will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-01-11

### Added

#### ClearFund Stripe Payment Integration
- **Obligation Card Payments** - Pay obligations directly with credit/debit card via Stripe
- **Stripe Elements Integration** - CardElement with real-time validation and error handling
- **3D Secure Support** - Automatic handling of 3D Secure authentication when required
- **Payment Source Selection** - Choose between wallet balance (no fees) or card (2.9% + $0.30)
- **Dynamic Fee Calculation** - Real-time fee display for card payments
- **Payment Method Creation** - Creates Stripe PaymentMethod before processing

#### Parent Wallet Enhancements
- **Wallet Balance Display** - Shows available balance for obligation payments
- **Insufficient Balance Warning** - Clear indication when wallet balance is insufficient
- **No-Fee Wallet Payments** - Wallet payments bypass card processing fees

#### Room Number Tracking
- **CircleContactResponse** - Added `room_number` field to schema for direct room lookup
- **CircleContact Interface** - Added `room_number` to frontend TypeScript interface
- **Auto Room Assignment** - Contacts created via invite are automatically assigned to available rooms (3-10)

### Changed

#### My Circle Page Refactor
- **Simplified Contacts View** - Removed tabs system, contacts now display directly with room info
- **Room Info on Contact Cards** - Each contact card shows assigned room number and name
- **Edit Button Integration** - Edit button now opens permission modal directly
- **Invite Link Enhancement** - Link icon copies login URL to clipboard with email pre-filled
- **Login URL Fix** - Changed from broken `/my-circle/login?contact=...` to `/my-circle/contact?email=...`
- **Email Pre-fill** - Circle contact login page pre-fills email from URL parameter

### Fixed
- **Suspense Boundary** - Added Suspense wrapper for useSearchParams on circle contact login page (Next.js requirement)
- **Room Lookup Logic** - Changed from name-based matching to direct room_number lookup for reliability

---

## [1.1.1] - 2025-01-10

### Added

#### My Circle Email Invitations
- **SendGrid Email Integration** - Circle contacts now receive email invitations
- **Invitation Emails** - Beautiful purple-themed HTML emails with login links
- **Resend Invite Endpoint** - `POST /api/v1/my-circle/circle-users/{id}/resend-invite` for re-sending invitations
- **Token Regeneration** - Expired invitation tokens automatically regenerated on resend

### Fixed

#### KidComs Notification Timing
- **Incoming Call Persistence** - Fixed issue where incoming call notifications disappeared too quickly
- **Session Status Logic** - Sessions now stay in WAITING status until the recipient (not initiator) joins
- **Call Initiator Tracking** - Properly distinguish between call initiator and recipient for status transitions
- **3-Minute Timeout** - Incoming call notifications now correctly persist for full 3-minute window

---

## [1.1.0] - 2025-01-10

### Added

#### KidComs - Child Communication System
- **Video Calling** - Daily.co integration with FaceTime-style responsive layout
- **Theater Mode** - Watch-together experience with synced YouTube playback
- **PDF Storybooks** - Synced page navigation for reading together
- **Voice Calls** - Audio-only calling option
- **Chat** - Text messaging between children and approved contacts
- **Incoming Call Notifications** - Banner alerts for incoming calls with 3-minute timeout
- **Child-to-Parent Call Routing** - Children can initiate calls to parents
- **Circle Contact Calling** - Extended family can participate in calls

#### My Circle - Contact Management
- **Complete Communication Portal** - Full UI for managing approved contacts
- **Circle Invitations** - Invite grandparents, aunts/uncles, family friends
- **Permission Management** - Control what circle contacts can access
- **Auto-Create Permissions** - Automatic permission setup on invite acceptance
- **Circle Contact Authentication** - Separate auth flow for circle users

#### Activity Feed & Notifications
- **Activity Logging** - Track events, expenses, and user actions
- **Action Stream** - Real-time dashboard feed with auto-refresh
- **Read/Unread Tracking** - Mark activities as read
- **Notification System** - In-app notification infrastructure

#### Dashboard Enhancements
- **Custody Status Card** - Progress bar showing current custody period
- **Coming Up Section** - All upcoming events consolidated
- **Auto-Mark Read** - Activities marked read when viewing dashboard
- **Child Photo Handling** - Graceful error handling for missing photos

#### Schedule Improvements
- **ARIA Conflict Detection** - Detect overlapping schedule events
- **Timezone Handling** - Proper co-parent time display across timezones
- **Viewer-Perspective Roles** - Show custody from viewer's perspective

#### UI/UX Improvements
- **CommonGround Design System** - Unified component styling
- **Sage/Amber Theme** - Consistent brand colors throughout
- **Mobile Navigation** - Improved bottom padding for mobile nav
- **Message Modal** - Constrained height for better UX

### Changed
- Child profile UI polished to match app design system
- Quick Actions updated to Video Call, Voice Call, Chat
- Family File page includes My Circle in Quick Actions
- KidComs moved to family-files route structure

### Fixed
- Child approval workflow with self-healing logic
- UUID comparison made case-insensitive
- Profile editing enabled with proper save handling
- Custody status fallbacks when children not assigned
- Duplicate DailyIframe instances in React Strict Mode
- CSP configuration for Daily.co and PDF viewer
- TypeScript build errors across My Circle pages

### Security
- Production Vercel URL added to CORS allowed origins
- bcrypt used directly instead of passlib for compatibility

---

## [1.0.0] - 2025-01-05

### Added

#### ARIA Enhancements
- **Mediator Templates** - Enhanced suggestion engine with professional mediation patterns
- **Blocking Logic** - Prevent sending of highly toxic messages
- **Improved Claude Prompts** - Better AI guidance for message analysis

#### Family File System
- **Invitation Flow** - Invite co-parent to join family file
- **Join Workflow** - Accept invitations and link to family
- **Agreement-Centric Architecture** - Family Files organized around agreements

#### Marketing & Public Pages
- **Landing Page** - Marketing navigation and content
- **Blog System** - Newsletter signup with client-side form
- **Contact Page** - With Suspense boundaries for search params
- **Help/Legal Pages** - Comprehensive information pages

### Changed
- Dashboard auto-refresh for Action Stream
- Frontend redesign with sage/amber theme

### Fixed
- Dataclass field order in aria.py preventing TypeError
- Duplicate imports and state declarations in frontend
- Migration issues with cubbie_items and custody_orders tables

---

## [0.9.0] - 2025-01-02

### Added

#### Deployment Infrastructure
- **Render Configuration** - Backend deployment setup
- **Vercel Deployment** - Frontend hosting configuration
- **CORS Regex** - Allow Vercel preview URLs dynamically
- **Startup Migrations** - Auto-run migrations on deployment

### Fixed
- API URL configuration ensuring /api/v1 suffix
- DATABASE_URL async driver format conversion
- CSP headers for Render backend connections
- Missing dependencies: pymupdf, jinja2, email-validator

---

## [0.8.0] - 2025-01-01

### Added

#### Silent Handoff System
- **GPS Verification** - Location-based exchange confirmation
- **Proximity Detection** - Automatic check-in when parents are nearby
- **Exchange Logging** - Complete audit trail of custody transfers

#### Court Portal Enhancements
- **California Court Forms** - FL-300, FL-311, FL-320, FL-340, FL-341, FL-342
- **Form Workflow System** - Guided form completion
- **Court-Ready Output** - Properly formatted documents

#### KidsCubbie (ChildVault)
- **Item Tracking** - Track items that travel between homes
- **Exchange Integration** - Link items to custody exchanges
- **Child Profile System** - Comprehensive child information

### Changed
- UI improvements for payments and court portal
- Create Exchange button updated to sage theme

---

## [0.7.0] - 2024-12-31

### Added

#### ClearFund Payment System
- **Expense Tracking** - Log and categorize shared expenses
- **Payment Requests** - Request reimbursement from co-parent
- **Split Calculations** - Automatic splitting based on agreement
- **Court Portal Integration** - Expense history for legal review

#### Case Export System
- **Court-Ready PDFs** - Professional document generation
- **Evidence Compilation** - Messages, agreements, compliance data
- **SHA-256 Verification** - Document integrity hashing

#### Court Access Mode
- **Legal Professional Portal** - Read-only access for attorneys/GALs
- **Time-Limited Access** - Automatic expiration
- **Audit Logging** - Track all professional access

#### Custody Exchange System
- **Calendar Integration** - Visual exchange scheduling
- **Check-In System** - Confirm custody transfers
- **Compliance Tracking** - On-time/late metrics

### Changed
- Frontend polish with responsive design improvements

---

## [0.6.0] - 2024-12-30

### Added

#### 18-Section Agreement Wizard
- Complete custody agreement builder with all sections:
  1. Parent Information
  2. Other Parent Information
  3. Children Information
  4. Legal Custody
  5. Physical Custody
  6. Parenting Schedule
  7. Holiday Schedule
  8. Exchange Logistics
  9. Transportation
  10. Child Support
  11. Medical/Healthcare
  12. Education
  13. Parent Communication
  14. Child Communication
  15. Travel
  16. Relocation
  17. Dispute Resolution
  18. Other Provisions
  19. Review & Submit

#### TimeBridge Scheduling
- Schedule event management
- Exchange check-ins
- Compliance metrics
- Calendar API

#### Email Notifications
- Case invitation emails
- Agreement approval notifications
- Exchange reminders

### Changed
- V1.1 roadmap documentation added

---

## [0.5.0] - 2024-12-29

### Added

#### Security Enhancements
- Comprehensive security audit
- Input validation throughout
- Rate limiting implementation
- Audit logging for sensitive operations

#### Frontend Application
- Next.js 14 with App Router
- TypeScript throughout
- Tailwind CSS styling
- shadcn/ui components
- Protected routes
- Auth context

---

## [0.4.0] - 2024-12-29

### Added

#### ARIA Messaging System
- Real-time toxicity analysis
- 7-category pattern detection
- Smart message rewrites
- Intervention workflow
- Good faith metrics
- Trend analysis

---

## [0.3.0] - 2024-12-29

### Added

#### Agreement Builder
- Agreement creation and management
- Section completion tracking
- Dual-parent approval
- PDF generation
- Version control

---

## [0.2.0] - 2024-12-28

### Added

#### Case Management
- Case creation workflow
- Two-parent invitation system
- Child management (CRUD)
- Access control

---

## [0.1.0] - 2024-12-28

### Added

#### Authentication System
- Supabase Auth integration
- JWT tokens (access + refresh)
- User registration/login
- Profile management
- Password hashing (bcrypt)

#### Infrastructure
- FastAPI backend
- PostgreSQL with async SQLAlchemy
- Alembic migrations
- Docker Compose
- CORS middleware

---

## Version Summary

| Version | Date | Highlights |
|---------|------|------------|
| 1.1.2 | 2025-01-11 | Stripe obligation payments, My Circle refactor, room tracking |
| 1.1.1 | 2025-01-10 | My Circle email invitations, KidComs notification fix |
| 1.1.0 | 2025-01-10 | KidComs video calling, My Circle, Activity Feed |
| 1.0.0 | 2025-01-05 | ARIA enhancements, Family File invitations, Marketing pages |
| 0.9.0 | 2025-01-02 | Render/Vercel deployment, CORS fixes |
| 0.8.0 | 2025-01-01 | Silent Handoff, Court Forms, KidsCubbie |
| 0.7.0 | 2024-12-31 | ClearFund, Case Export, Court Access Mode |
| 0.6.0 | 2024-12-30 | 18-Section Agreement Wizard, TimeBridge, Emails |
| 0.5.0 | 2024-12-29 | Security enhancements, Frontend application |
| 0.4.0 | 2024-12-29 | ARIA Messaging System |
| 0.3.0 | 2024-12-29 | Agreement Builder |
| 0.2.0 | 2024-12-28 | Case Management |
| 0.1.0 | 2024-12-28 | Authentication, Infrastructure |
