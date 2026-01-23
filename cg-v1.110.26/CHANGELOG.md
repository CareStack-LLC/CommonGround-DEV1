# Changelog

All notable changes to CommonGround will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-01-22

### Added

#### Design System Unification - Phase 7 Final Polish
Complete design system refinement across all parent-facing pages with consistent typography, colors, and visual hierarchy.

**Typography Enhancements:**
- Applied **Crimson Text** serif font to all major page headers and titles
- Consistent font hierarchy across Dashboard, Messages, Family Files, and Find Professionals
- Improved visual distinction between headers (serif) and body text (sans-serif)
- Enhanced section labels from uppercase small text to larger, more prominent titles

**Page-Specific Improvements:**

*Dashboard (`app/dashboard/page.tsx`):*
- Updated all section headers: "Action Stream", "Coming Up", "Quick Actions", "Family Files", "Recent Activity"
- Added chevron icon to "View all" links for better visual affordance
- Improved spacing and visual consistency across sections
- Enhanced greeting header with Crimson Text

*Messages (`app/messages/page.tsx`):*
- Applied Crimson Text to "The Neutral Zone" welcome message
- Enhanced chat header with family file name styling
- Improved conversation selector typography
- Updated empty states with better font hierarchy

*Family Files (`app/family-files/page.tsx`, `app/family-files/[id]/page.tsx`):*
- Enhanced main family file titles with serif typography
- Updated settings modal headers
- Improved visual consistency with other pages

*Find Professionals (`app/find-professionals/page.tsx`):*
- Updated page header "Find Professionals" with Crimson Text
- Enhanced firm card titles with serif font
- Applied consistent typography to:
  - Firm detail modal titles
  - "Practice Areas" section label
  - "Team Members" section label
  - "Select Family File" section label
- Upgraded section labels to semibold for better hierarchy

**Loading Screen Modernization:**
- Replaced old spinner designs with modern border-spin animation
- Updated background gradients from tan/beige to white gradient
- Consistent loading pattern: `bg-gradient-to-br from-slate-50 via-white to-slate-50`
- Applied modern loading states to:
  - Dashboard
  - Messages
  - Family Files (list and detail)
  - Find Professionals

**Navigation Improvements:**
- Fixed Messages back arrow to use `router.back()` for proper navigation history
- Improved back button behavior across all pages

#### KidComs Theater Content Library
Expanded watch-together content for parent-child video calls.

**New Video Content (available locally, pending Git LFS setup):**
- `Crunch.mp4` - Animated short about an alien who loves cereal (79.70 MB)
- `Johnny Express.mp4` - Space delivery adventure
- `The Bread.mp4` - Charming story about bread

**Note:** Video files exceed GitHub's 50MB limit and will be added using Git LFS in a future commit.

**New Storybook Content:**
- `Luna_And_Midnight_.pdf` - Luna and Midnight adventure story

**Documentation:**
- Created comprehensive `/frontend/public/kidsComms/README.md` guide
- Instructions for adding new videos and PDFs
- Copyright and licensing guidelines
- Content recommendations and sources
- Technical limits and troubleshooting

**Content Guidelines:**
- Family-friendly (G or PG rated)
- Educational or entertaining focus
- Safe for co-parent viewing
- Legally licensed or copyright-free

#### Custody Tracker Verification (Workstream 7)
Complete verification and documentation of custody time tracking system.

**Deliverables:**
- Comprehensive test suite (`backend/tests/test_custody_tracker_verification.py`)
- Full system documentation (`docs/features/CUSTODY_TRACKER.md`)
- Verified date counting logic (inclusive date range calculation)
- Verified backfill accuracy (one record per day)
- Verified exchange integration

**Key Findings:**
- Backend logic already correct: `total_days = (end_date - start_date).days + 1`
- Backfill loop properly creates one custody record per day
- Exchange records create exactly one record per child
- Dashboard displays total custody days accurately
- No code changes needed - documentation and tests added for verification

#### Subscription System Implementation Plan (Workstream 1)
Detailed implementation documentation for subscription tier overhaul.

**Document:** `/docs/WS1_SUBSCRIPTION_IMPLEMENTATION.md`

**Subscription Tiers:**
- **Starter** (Free) - Basic co-parenting tools, 1 family file
- **Essential** ($9.99/month) - Full features, 3 family files, priority support
- **Professional** ($49.99/month) - Legal practice management, unlimited cases

**Features:**
- Stripe integration with subscription lifecycle management
- Entitlements system for feature gating
- Usage tracking and limits enforcement
- Billing portal integration
- Trial periods and promotional pricing
- Backend sync script (`backend/scripts/sync_stripe_products.py`)

#### Marketing & Client Documentation

**Marketing Campaign:** (`docs/marketing/campaign_dv_safety_2026.md`)
- Domestic violence awareness campaign
- Social media content strategy
- Visual assets for toxic message blocking
- Flyer designs for family courts

**Email Templates:** (`docs/client_docs/`)
- Complete Supabase email template collection (13 templates)
- Change email notification
- Email confirmation
- Magic link authentication
- MFA enrollment/unenrollment
- Password reset and change
- Phone number change
- Reauth email
- Identity linking/unlinking

#### Project Planning & Documentation

**Project Roadmap:** (`docs/PROJECT_ROADMAP_v1.120.md`)
- Comprehensive 4-6 week roadmap
- 9 major workstreams with detailed tasks
- Timeline and deployment strategy
- Risk mitigation plans
- Success metrics and testing strategy

**Progress Update:** (`docs/PROGRESS_UPDATE_2026-01-22.md`)
- Session summary for January 22, 2026
- Completed workstreams documentation
- Test results and verification reports

### Changed

**Design Consistency:**
- Unified color palette: #2C5F5D (primary teal) across all pages
- Consistent card styling with proper shadows and transitions
- Standardized badge variants and sizing
- Unified spacing patterns (mb-4 for section headers, consistent gaps)

**Typography System:**
- Headers: Crimson Text (Georgia fallback)
- Body: System font stack
- Consistent font weights and sizes
- Improved visual hierarchy

**Loading States:**
- Modern spinning border indicator
- Consistent background gradients
- Better loading messages

### Fixed

**Navigation:**
- Messages back arrow now properly returns to previous screen (`router.back()`)
- Improved navigation history handling

**Settings Page:**
- Added Shield icon back to imports (was causing build error)
- Fixed TypeScript errors in settings components

**Dashboard:**
- Custody tracking cards now consistently show total days
- Fixed days display to always show count (even when 0)
- Improved "With Me" button visibility

**Child Profile:**
- Updated header gradient and button styling
- Improved profile page consistency

**Find Professionals:**
- Enhanced firm card design
- Improved firm detail modal styling
- Better professional directory layout

### Security
- No security changes in this release

### Performance
- Optimized loading screen rendering
- Improved component re-render performance with consistent patterns

---

## [1.6.0] - 2026-01-18

### Added

#### Professional Portal - Complete Legal Practice Management System

A comprehensive portal enabling attorneys, mediators, intake coordinators, and practice administrators to manage high-conflict custody cases efficiently within CommonGround.

**Core Infrastructure:**
- **Professional Profiles** - Complete onboarding for legal professionals with license verification
- **Firm Management** - Create and manage law firms, mediation practices, or solo practices
- **Team Collaboration** - Invite colleagues with role-based permissions (Owner, Admin, Attorney, Paralegal, Intake, Readonly)
- **Firm Templates** - Shared intake forms and document templates across practice

**Case Management:**
- **Case Dashboard** - Aggregated view of all assigned cases with key metrics
- **Case Assignment** - Assign cases by role (Lead Attorney, Associate, Paralegal, Mediator, Parenting Coordinator)
- **Case Timeline** - Chronological event feed with filtering (messages, exchanges, agreements, court events, ARIA flags)
- **Communications View** - Monitor parent-to-parent messages with ARIA intervention history
- **Compliance Tracking** - Exchange compliance, financial obligations, court deadlines

**ARIA Control Panel:**
- **Professional ARIA Controls** - Adjust ARIA sensitivity levels for assigned cases
- **Intervention History** - Review all ARIA flags, suggestions, and parent actions
- **Good Faith Metrics** - Track communication quality trends over time
- **Alert System** - Real-time notifications for concerning communication patterns

**Professional-Client Messaging:**
- **Secure Messaging** - Direct communication channel between professionals and clients
- **Thread Management** - Organized conversation threads per case
- **Audit Trail** - Complete logging of all professional communications

**Access & Security:**
- **Invitation System** - Parents can invite professionals by email or browse firm directory
- **Dual-Parent Consent** - Both parents must approve professional access (configurable)
- **Scoped Permissions** - Granular access control (agreements, schedules, messages, financials)
- **Access Logging** - Complete audit trail of professional activity

**Intake Center (ARIA Pro):**
- **Intake Sessions** - Create and manage client intake with firm templates
- **Transcript Review** - Full conversation transcripts with highlights
- **Extracted Data** - Structured data extraction for court forms
- **Session Status Tracking** - Draft, In Progress, Completed, Archived

**Export & Reporting:**
- **Court Packages** - Generate comprehensive case exports for court
- **Timeline Exports** - Export chronological case history
- **Compliance Reports** - Exchange and financial compliance summaries

**Frontend Implementation:**
- `/professional/dashboard` - Main dashboard with case load, alerts, upcoming events
- `/professional/cases` - Case list with filters and quick actions
- `/professional/cases/[id]` - Case overview with timeline, communications, ARIA, compliance
- `/professional/intake` - Intake center for managing client interviews
- `/professional/firm` - Firm settings, team management, templates
- `/professional/profile` - Professional profile and license management
- `/professional/access-requests` - Pending case invitations

**New Database Models:**
- `ProfessionalProfile` - User professional credentials and settings
- `Firm` - Law firm / practice organization
- `FirmMembership` - Many-to-many linking professionals to firms with roles
- `CaseAssignment` - Professional assignment to family files
- `FirmTemplate` - Shared intake and document templates
- `ProfessionalAccessLog` - Audit logging for professional actions
- `ProfessionalAccessRequest` - Invitation/access request workflow
- `ProfessionalMessage` - Professional-client messaging

**New API Endpoints:**
- `GET/POST/PATCH /professional/profile` - Profile management
- `GET/POST/PATCH/DELETE /professional/firms` - Firm CRUD
- `GET/POST/PATCH/DELETE /professional/firms/{id}/members` - Team management
- `GET /professional/dashboard` - Dashboard aggregation
- `GET /professional/cases` - Case list with filters
- `GET /professional/cases/{id}` - Case overview
- `GET /professional/cases/{id}/timeline` - Case timeline
- `GET /professional/cases/{id}/communications` - Message view
- `GET/PATCH /professional/cases/{id}/aria` - ARIA controls
- `GET/POST /professional/messages` - Professional messaging
- `GET/POST /professional/intake/sessions` - Intake management
- `GET/POST /professional/access-requests` - Access workflow

### Changed
- Dashboard now includes Professional Portal link for users with professional profiles
- Firm directory available for parent case invitation workflows
- Backend router includes new `/professional` prefix routes

### Fixed
- TypeScript build errors in Professional Portal frontend components
- Missing UI components (accordion, avatar, dropdown-menu, progress, scroll-area, tabs)
- Badge variant type mismatches in Professional Portal pages

---

## [1.5.0] - 2026-01-17

### Added

#### Custody Time Tracking System
- **Parenting Time Statistics** - Track actual custody time per child with visual reports
- **Custody Day Records** - Log daily custody with parent assignment
- **Custody Periods** - Track continuous custody periods with start/end times
- **Custody Stats API** - `GET /custody-time/child/{id}/stats` returns time distribution
- **Parenting Time Widget** - Dashboard card showing custody breakdown with bar graph
- **"With Me" Check-in** - Quick button to record child is with you today

#### Dashboard Enhancements
- **Multi-Family File Aggregation** - Dashboard now fetches and merges data from ALL family files
- **Coming Up Section** - Shows upcoming events across all family files, sorted by time
- **Child Photos in Avatars** - Child profile photos displayed in dashboard status cards
- **Custody Tracker Cards** - Visual cards showing current custody status per child
- **Debug Endpoints** - `/dashboard/debug/events/{id}` for troubleshooting event display

#### Exchange System Improvements
- **Instance Regeneration** - `POST /dashboard/regenerate-instances/{id}` refreshes recurring instances
- **Legacy Case ID Support** - Exchanges linked to legacy cases now appear in Coming Up
- **Status-Based Filtering** - Only scheduled/pending instances shown in upcoming

#### Security Enhancements
- **Real MFA with TOTP** - Supabase TOTP-based multi-factor authentication
- **Authenticator App Support** - QR code setup for Google Authenticator, Authy, etc.
- **MFA Challenge Flow** - Secure verification during login

#### Family File Improvements
- **Parent Info in List** - Family files list includes parent names and details
- **Child Profile Photos** - Photos displayed in children section

### Fixed
- **Dashboard Event Aggregation** - Fixed issue where only first family file's events were shown
- **Custody Stats Fetching** - Properly fetch stats for family file with children
- **Hydration Errors** - Fixed React hydration mismatches in custody components
- **Parent Names Display** - Real parent names shown instead of "Parent A/B"
- **CustodyDayRecord Creation** - Fixed "With Me" button to properly create records

---

## [1.4.0] - 2026-01-15

### Added

#### GTM Subscription System
- **3-Tier Subscription Plans** - Starter (free), Plus ($12/mo), Family+ ($25/mo)
- **Stripe Checkout Integration** - Create checkout sessions for new subscribers
- **Subscription Upgrade Flow** - In-app upgrades with automatic proration
- **Stripe Customer Portal** - Self-service billing management via `/subscriptions/portal`
- **Feature Gating Service** - Control feature access by subscription tier

#### Subscription Management Endpoints
- `GET /subscriptions/plans` - List available plans with pricing and features
- `GET /subscriptions/current` - Get current user's subscription status
- `POST /subscriptions/checkout` - Create Stripe checkout session or upgrade existing subscription
- `POST /subscriptions/portal` - Generate Stripe Customer Portal session
- `POST /subscriptions/cancel` - Cancel subscription (end of period or immediate)
- `POST /subscriptions/reactivate` - Reactivate a cancelled subscription
- `GET /subscriptions/features` - List features available for current tier
- `POST /subscriptions/sync` - Sync subscription status from Stripe

#### DV Nonprofit Grant System
- **Grant Code Redemption** - Partners provide free subscription access to DV survivors
- **Grant Validation** - Public endpoint to check code validity before redemption
- **Grant Status Tracking** - Monitor active grants with expiration dates
- `POST /grants/redeem` - Redeem a nonprofit grant code
- `GET /grants/status` - Get active grant information
- `GET /grants/validate/{code}` - Validate grant code (public)

#### Password Reset Flow
- **Email-Based Reset** - Request password reset via email link
- **Secure Token Workflow** - Single-use tokens with 1-hour expiration
- `POST /auth/password-reset/request` - Request password reset email
- `POST /auth/password-reset/confirm` - Complete reset with token

#### Pricing Page Enhancements
- **Direct Checkout** - Logged-in users go straight to Stripe from pricing page
- **Plan Comparison** - Feature matrix comparing all subscription tiers
- **Current Plan Indicator** - Visual indicator of active subscription

#### Mini & Mega Multiplayer v3
- **Updated Visual Assets** - New character sprites from Nano Banana Pro
- **Carry Mechanic** - Mini can be carried by Mega character
- **Bridge Puzzle** - Collaborative puzzle element requiring both characters

### Fixed
- **Stripe API Access Pattern** - Fixed dict-style access for Stripe objects (`sub.get("field")` instead of `sub.field`)
- **Cancel Subscription 422 Error** - Fixed by sending JSON body with `{ immediate: false }`
- **Pricing Page Hover Colors** - Changed to subtle opacity-based hover states

---

## [1.3.0] - 2026-01-12

### Added

#### ARIA v2 Agreement Support
- **V2 Summary Generation** - `generate_summary_v2` method for 7-section agreements
- **V2 Extraction Preview** - `generate_extraction_preview_v2` for structured data extraction
- **Version-Aware API** - Endpoints automatically detect agreement version and call appropriate methods
- **Section Mapping** - Proper mapping from v2 sections to summary format

#### Features Page Redesign
- **Competitor Comparison** - Side-by-side comparison with TalkingParents and OurFamily Wizard
- **Feature Cards** - Visual cards highlighting ARIA, SharedCare, ClearFund, KidComs
- **Trust Indicators** - Court-ready compliance and security badges
- **Responsive Layout** - Mobile-optimized design with proper spacing

#### KidComs Theater Mode
- **Synchronized Viewing** - Watch videos and read storybooks together in real-time
- **Content Library Modal** - Tabbed interface for Videos, Storybooks, and YouTube
- **PiP Video Tiles** - Picture-in-picture video overlays during content viewing
- **YouTube Integration** - Paste any YouTube URL to watch together

### Changed

#### KidComs Brand Theming
- **Emerald/Teal Color Scheme** - Replaced purple/magenta with CommonGround brand colors
- **Video Call UI** - Loading spinner, avatar backgrounds, control bar styling updated
- **Content Library** - Header icons, tabs, content cards use emerald gradients
- **Theater Mode** - Badge styling, PiP borders, empty states match brand
- **Shadow Effects** - Added emerald glow effects (shadow-emerald-500/20)
- **Gradient Buttons** - Consistent from-emerald-500 to-teal-600 gradients

### Fixed
- ARIA summary generation now correctly handles v2 7-section agreements
- PDF generation uses version-appropriate summary method

---

## [1.2.0] - 2025-01-11

### Added

#### SharedCare Agreement v2 - Simplified Structure
- **7-Section Standard Agreement** - Reduced from 18 sections for easier completion
- **5-Section Lite Agreement** - For low-conflict cooperative parents
- **ARIA Conflict Detection** - Automatically assesses conflict level from conversation
- **Dynamic Version Selection** - ARIA recommends lite/standard/professional based on signals
- **Quick Accord Suggestions** - Post-section suggestions for holidays, travel, etc.
- **New Builder V2 UI** - Simplified 7-step wizard at `/agreements/[id]/builder-v2`

#### V2 Section Structure
1. Parties & Children - Who is covered
2. Scope & Duration - When agreement is effective
3. Parenting Time Structure - Baseline schedule pattern
4. Logistics & Transitions - Exchange details
5. Decision-Making & Communication - Authority and methods
6. Expenses & Financial Cooperation - Shared costs (optional)
7. Modification, Disputes & Acknowledgment - Close the loop

#### Backend V2 Support
- **agreement_version field** - Track v1/v2_standard/v2_lite per agreement
- **SECTION_TEMPLATES_V2** - New section templates in agreement_v2.py
- **Extraction Schema V2** - Simplified extraction for 7 sections
- **Conflict Signal Detection** - High/moderate/low conflict assessment
- **V2 ARIA Methods** - `send_message_v2`, `extract_structured_data_v2`, `finalize_agreement_v2`

#### Quick Accords Integration
- Holiday Schedule Quick Accord suggestion
- Summer Vacation Quick Accord suggestion
- Travel Consent Quick Accord suggestion
- School Breaks Quick Accord suggestion
- Extracurricular Activities Quick Accord suggestion

### Changed
- Default new agreements to v2_standard (7 sections)
- Existing agreements remain as v1 (18 sections)
- ARIA prompts updated for focused, section-specific guidance

---

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
| 1.6.0 | 2026-01-18 | Professional Portal, Firm Management, Case Timeline, ARIA Controls, Legal Messaging |
| 1.5.0 | 2026-01-17 | Custody Time Tracking, Dashboard Aggregation, Real MFA, Child Photos |
| 1.4.0 | 2026-01-15 | GTM Subscription System, Grant Codes, Password Reset, Mini & Mega v3 |
| 1.3.0 | 2026-01-12 | ARIA v2 support, Features page redesign, KidComs brand theming |
| 1.2.0 | 2025-01-11 | SharedCare Agreement v2, 7-section format, Quick Accords |
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
