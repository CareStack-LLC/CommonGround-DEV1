# Master Documentation: Architecture

This document is a consolidation of all documentation files in this directory.

---

## Document: API_SYSTEM_DESIGN.md

# CommonGround API System Design

This document describes the architectural patterns, security protocols, and lifecycle of the CommonGround REST API.

## Architectural Overview

The API is built using **FastAPI (Python 3.11)**, following an async-first approach to maximize performance and handle high-concurrency video/realtime workloads.

### Layered Structure
1.  **Endpoints (`app/api/v1/`)**: Thin routing layer. Responsible for parameter validation (Pydantic) and dependency injection.
2.  **Services (`app/services/`)**: The business logic heart. Services are stateless and handle complex operations (ARIA mediation, consensus logic, PDF generation).
3.  **Models (`app/models/`)**: SQLAlchemy 2.0 async ORM. Defines the schema and data integrity constraints.
4.  **Schemas (`app/schemas/`)**: Pydantic models for request validation and response serialization.

## Core Patterns

### 1. Dependency Injection
We use FastAPI's `Depends()` for robust, testable resource management:
- `get_db`: Yields an async database session per request.
- `get_current_user`: Handles JWT validation and loads the active user.
- `get_active_family_file`: Validates that the user is a participant in the requested case.

### 2. ARIA Mediation Pipeline
Messaging isn't a direct database write. It follows a monitored lifecycle:
1.  **Intake**: Parent submits message.
2.  **Tier 1 Analysis (Regex)**: Instant safety/threat check.
3.  **Tier 2 Analysis (AI)**: Claude 3.5 Sonnet scores sentiment and provides "Safe Suggestions."
4.  **Intervention**: If toxic, returns a 403-intercept with suggests; if clean, commits to `Message` table.

### 3. Dual-Parent Consensus Workflow
Endpoints managing "Shared Truth" (Children, Agreements, QuickAccords) follow a `Propose -> Approve -> Activate` flow:
- `POST /propose`: Creates a draft record.
- `POST /approve`: The other parent toggles their approval bit.
- `Finalization`: The system automatically promotes the record to `active` once both bits are set.

## Security & Reliability

### Authentication & Authorization
- **Auth**: Handled via Supabase Auth (JWT).
- **RBAC**: Role-Based Access Control is enforced at the service level.
- **Case Scoping**: Professionals use `CaseAssignment` tokens to access specific modules of a Family File.

### Error Handling
The API uses a global exception handler in `app/main.py`:
- Ensures **all** errors (including 500s) include proper CORS headers.
- Standardizes RFC-7807 problem details in responses.
- Automatically captures stack traces during development for rapid debugging.

### Real-Time Features
- **WebSockets**: Used for real-time chat updates and KidComs call signaling.
- **Background Tasks**: Long-running operations (PDF export, OCR, Email) are offloaded using FastAPI `BackgroundTasks`.

## API Best Practices for Engineers

- **Async Always**: Every I/O operation (DB, API, Storage) must use `await`.
- **Validation First**: Never trust client input. Use strict Pydantic models for every request.
- **Stateless Services**: Services should not hold state. Pass the `db` session and `current_user` explicitly.
- **Audit Everything**: Ensure sensitive operations (accessing children data, exporting evidence) are logged to the compliance/audit tables.

---

## Document: CommonGround_Professional_Portal_FINAL.md

**CommonGround**

**Professional Portal**

*Complete Implementation Specification*

**Version 2.1 - FINAL**

February 2026

*Confidential - Internal Use Only*

Table of Contents

*\[Generate TOC in Word: References \> Table of Contents \> Insert Table of Contents\]*

Executive Summary

The CommonGround Professional Portal is a comprehensive case management platform designed specifically for family law attorneys, mediators, and other legal professionals. This document outlines the complete feature set, pricing structure, technical architecture, and implementation roadmap.

Purpose

The Professional Portal transforms how family law practitioners manage high-conflict custody cases by providing:

-   Unified case dashboard with real-time compliance monitoring

-   Direct communication with clients via secure messaging and video calls

-   AI-powered intake system (ARIA Intake) with customizable questionnaires

-   OCR document processing for automatic data extraction from California court orders

-   Court-ready compliance reports and evidence exports

-   Firm management with team roles and case assignment

-   Professional directory with opt-in featured placement

Key Benefits

  ----------------------- ----------------------------------------------------------
  **Benefit**             **Impact**

  Time Savings            15-20 hours/week saved per attorney on case management

  Client Satisfaction     80% reduction in unnecessary crisis calls from clients

  Court Prep              70% reduction in evidence compilation time

  Revenue Growth          Capacity to handle 7+ additional cases per year

  Intake Efficiency       80+ minutes saved per client with ARIA Intake automation
  ----------------------- ----------------------------------------------------------

Professional Account Tiers

CommonGround offers five professional account tiers designed to scale from solo practitioners to large multi-office firms. Professionals choose their tier at signup or can start with the free Starter tier. All professionals must complete bar number/license verification before accepting cases.

**Key Account Rules:**

-   Professionals can be both individual practitioners AND firm members simultaneously

-   Bar number/license verification required before accepting first case

-   Each parent finds their own representation independently (Parent A can have different attorney than Parent B)

-   Parents don\'t need to know the other parent has representation unless legally required

Tier 1: Starter (FREE)

**Price:** \$0/month for first 3 cases

**Target:** New attorneys, those evaluating the platform

**Included Features:**

-   Up to 3 active family cases

-   Full case management dashboard

-   Client messaging (in-app only)

-   Voice & video calls (same system as parent calls)

-   Calendar and event scheduling

-   Document viewing and upload

-   Basic compliance reports

-   Court-ready exports (PDF only)

-   Email support

-   Standard 17-section ARIA Custody Intake (read-only)

**Upgrade Trigger:** When the 4th case is accepted, professional must upgrade to Solo tier or higher

Tier 2: Solo Practitioner

**Price:** \$99/month or \$999/year (17% annual discount)

**Target:** Individual attorneys, solo practices, 1-3 person firms

**Included Features:**

-   Up to 15 active family cases

-   Everything in Starter, plus:

    -   ARIA Intake with 1 custom questionnaire

    -   OCR document processing (up to 10 docs/month, California forms only)

    -   Advanced compliance reports

    -   Export to Word/Excel formats

    -   Custom message templates

    -   Priority email support

**Overages:** \$10/case over 15 cases

**★ ARIA Custom Intake Feature:** Solo tier and above can create ONE custom intake questionnaire. ARIA uses the same core system prompt but asks the professional\'s custom questions in addition to (or instead of) the standard 17-section custody intake.

Tier 3: Small Firm

**Price:** \$299/month or \$2,999/year (17% annual discount)

**Target:** 2-5 attorney firms

**Included Features:**

-   Up to 50 active family cases

-   Up to 3 team members included

-   Everything in Solo, plus:

    -   Firm management dashboard

    -   Case queue and dispatcher role

    -   Team collaboration features

    -   Unlimited OCR document processing (California forms)

    -   Custom branding on client-facing materials

    -   Call recording (up to 50 hours storage)

    -   Firm profile in Professional Directory

    -   Quarterly training webinars

    -   Phone and email support

**Overages:** \$8/case over 50 cases, \$49/month per additional team member

**★ RECOMMENDED FOR PILOT PROGRAM**

Tier 4: Mid-Size Firm

**Price:** \$799/month or \$7,999/year (17% annual discount)

**Target:** 6-15 attorney firms

**Included Features:**

-   Up to 150 active family cases

-   Up to 10 team members included

-   Everything in Small Firm, plus:

    -   Advanced analytics dashboard

    -   API access for custom integrations

    -   White-label client portal option

    -   Dedicated account manager

    -   Unlimited call recording storage

    -   Custom report templates

    -   Featured placement in Professional Directory

    -   MyCase integration (COMING Q3 2026)

    -   On-site training (up to 2 sessions/year)

    -   24/7 phone support

**Overages:** \$6/case over 150 cases, \$39/month per additional team member

Tier 5: Enterprise (Custom)

**Price:** Custom pricing (starting at \$1,999/month)

**Target:** Large firms (15+ attorneys), multi-office practices

**Included Features:**

-   Unlimited active cases

-   Unlimited team members

-   Everything in Mid-Size, plus:

    -   Custom contract terms

    -   Practice management software integrations (Clio, MyCase, PracticePanther)

    -   Custom feature development

    -   Multi-office management capabilities

    -   Dedicated technical support team

    -   SLA guarantees (99.9% uptime)

    -   Quarterly business reviews

ARIA Intake System

ARIA Intake is an AI-powered client intake TOOL that professionals use to gather comprehensive information from new clients. The system saves attorneys 80+ minutes per client by automating the intake interview process.

Standard vs. Custom Intake

**Standard 17-Section Custody Intake (All Tiers)**

All professional tiers include access to the standard ARIA custody intake, which covers all 17 sections of the SharedCare Agreement. This intake is designed for NEW clients who don\'t have an existing case/family file.

-   Used for prospective clients before case creation

-   Creates NEW agreements (not for updating existing ones)

-   Covers all custody, schedule, financial, and communication topics

**Custom Intake Questionnaires (Solo Tier and Above)**

Professionals on paid tiers (\$99/month and up) can create ONE custom intake questionnaire in addition to the standard custody intake. The custom intake:

-   Uses the same ARIA core system prompt and conversational style

-   Asks the professional\'s custom questions

-   Can be used alongside OR instead of the standard custody intake

-   Allows attorneys to gather practice-specific information

**Example Use Cases for Custom Intakes:**

-   Mediation-focused intake for parenting coordinators

-   High-conflict case screening questions

-   Domestic violence safety assessment

-   Military family specific questions

-   Relocation case intake

Intake Workflow

1.  Professional selects intake type (standard 17-section or custom)

2.  Professional generates unique intake link

3.  Professional sends link to prospective client via email

4.  Client starts conversation with ARIA via web interface

5.  ARIA guides client through questions (client can save progress and return)

6.  Upon completion, professional receives notification

7.  Professional reviews completed intake in dashboard

8.  Professional decides: Accept client (create case) OR Decline OR Request follow-up

9.  If accepted, intake data auto-populates new case file

OCR Document Processing

The OCR (Optical Character Recognition) system automatically extracts structured data from California court orders, eliminating manual data entry. At launch, only California forms are supported; additional states will be added in future releases.

Supported California Court Forms (Launch)

-   FL-341 - Child Custody and Visitation Application Attachment

-   FL-311 - Child Custody and Visitation Order Attachment

-   FL-312 - Request for Child Custody and Visitation Orders

-   FL-150 - Income and Expense Declaration

-   FL-342 - Child Support Information and Order Attachment

OCR Processing Workflow

10. Professional uploads ONE court order PDF per case

11. System detects document type (FL-341, FL-311, etc.)

12. OCR engine extracts text and identifies data fields

13. AI validates extracted data for consistency

14. If confidence is LOW: System alerts professional to acknowledge and double-check

15. System presents extracted data to professional for review

16. Professional approves or corrects any fields

17. Upon approval, system creates NEW agreement populated with court order data

18. New agreement becomes the ACTIVE agreement for the case

19. System locks populated fields from parent editing

20. Parents receive notification that court order has been filed

Field Locking After OCR

When a court order is processed via OCR, specific fields are locked to prevent unauthorized changes by parents. Parents must work through their attorney and obtain a new court order to modify locked fields.

**Locked Field Behavior:**

-   Locked fields display: 🔒 Locked by Case-\[case-number\]

-   Parents can VIEW but cannot EDIT locked content

-   Tooltip explains: \"This field is set by court order. Contact your attorney to request changes.\"

-   To change locked fields, parents must go through professional and obtain new court order

-   No in-app \"request change\" button (must contact attorney externally)

**Professional Unlock Capability:**

-   Professionals can unlock specific fields if needed (requires confirmation)

-   Unlock action is logged in case timeline with reason

-   Parents receive notification when fields are unlocked

-   Unlocked fields remain unlocked until a new court order is filed

Communication & Calling

Professional communication uses the SAME infrastructure as parent-to-parent communication (KidComs system). This ensures consistency, reliability, and leverages existing technology.

Messaging Features

-   Message one parent OR both parents simultaneously

-   Attach documents to messages

-   Use customizable message templates

-   Propose calendar events inline

-   View ARIA flags on hostile parent-to-parent messages

-   All messages timestamped and logged

-   Export message history for court

Voice & Video Calling

**Technical Implementation:** Uses the same WebRTC infrastructure as KidComs parent-child calls. This provides:

-   Consistent call quality across all user types

-   Reduced development and maintenance costs

-   Unified call logging and recording infrastructure

**Call Features:**

-   One-click voice or video calls with clients

-   Conference calls with both parents

-   Screen sharing capabilities

-   Call recording (Small Firm tier and above)

-   Automatic call duration logging

-   Post-call notes interface

Compliance Reports

Professionals can generate comprehensive compliance reports for court submission or client review. Reports must be downloaded and include both raw data and formatted summaries to ensure court acceptance.

Report Types

-   Exchange Compliance Summary - On-time vs. missed exchanges

-   Communication Analysis - ARIA interventions, message volume, hostility metrics

-   Financial Dispute History - Unresolved expense disputes

-   Full Case Timeline - Chronological event log

-   Custom Reports - Select specific date ranges and data points

Report Content & Format

**Each report includes:**

-   Executive summary with key findings

-   Formatted data tables and statistics

-   RAW data appendix (message text, timestamps, etc.)

-   SHA-256 verification code for authenticity

-   Attorney signature line

**Export Formats:**

-   PDF - Court-ready formatting (REQUIRED for submission)

-   Word - Editable format for attorney notes

-   Excel - Raw data for analysis

**Important:** Reports must be downloaded and submitted manually. There is NO automatic email-to-court functionality (attorneys maintain full control over submissions).

Professional Directory

The Professional Directory allows parents to search for and invite attorneys directly through the platform. Professionals and firms can opt in, opt out, or request featured placement.

Directory Features

-   Search by location (city, state, zip code)

-   Filter by practice area (family law, mediation, DV cases, military families)

-   Filter by language spoken

-   View professional profiles (bio, experience, bar number)

-   View firm profiles (team size, areas of focus)

-   Send invitation directly from directory

Visibility Options

**Standard Listing (All Tiers):**

-   Appears in directory search results

-   Listed alphabetically within location

-   Can opt OUT at any time in settings

**Opt Out (All Tiers):**

-   Professional/firm does NOT appear in directory

-   Can still accept direct invitations from parents who know their name

-   Useful for referral-only practices

**Featured Placement (Mid-Size tier and above):**

-   Appears at TOP of search results

-   Profile badge: \"Featured Professional\"

-   Enhanced profile with logo, photos, testimonials

-   Can request featured status (subject to CommonGround approval)

Firm Management & Downgrade Handling

Small Firm tier and above includes team collaboration features. This section details what happens during firm transitions and account changes.

Firm Downgrade or Dissolution

When a firm downgrades from Small Firm to Solo, or when a firm account is closed:

21. All team members automatically become FREE Starter tier individual accounts

22. Team members receive email notification about account change

23. All cases that came through the FIRM remain with the FIRM OWNER

24. Firm owner maintains full control and access to firm cases

25. Team members lose access to firm cases (unless they had individual assignments)

26. Any individual cases team members accepted separately remain with them

Individual + Firm Membership

Professionals can simultaneously have:

-   Their own individual professional account (any tier)

-   Membership in ONE or MORE firms

**Case Assignment Logic:**

-   Cases invited to the PROFESSIONAL directly → go to their individual account

-   Cases invited to the FIRM → go to firm queue, assigned by dispatcher

-   Professional sees both types in their dashboard (clearly labeled)

Billing & External Systems

CommonGround does NOT handle client billing or payments for legal services. Professionals must use external practice management systems (like MyCase, Clio, etc.) for invoicing and payment processing.

What CommonGround DOES Handle

-   Professional subscription billing (\$99, \$299, \$799/month)

-   Case overage charges (if applicable)

-   Team member add-on fees

What CommonGround DOES NOT Handle

-   Attorney fees to clients (retainers, hourly billing, flat fees)

-   Client invoicing

-   Payment processing for legal services

-   Trust account management

-   Time tracking for billable hours (professionals track externally)

**Future Consideration:** MyCase integration (Q3 2026) will allow automatic time entry logging from CommonGround activities (calls, messages) into MyCase for billing purposes.

Implementation Roadmap

Proposed 14-week development timeline for Professional Portal Phase 1 (excluding MyCase integration).

**Weeks 1-2: Core Dashboard & Account Setup**

-   Database schema implementation

-   Professional signup flow with tier selection

-   Bar number/license verification system

-   Professional dashboard with case list

-   Case invitation acceptance flow

-   Activity timeline

**Weeks 3-4: Messaging System**

-   Integrate with existing KidComs messaging infrastructure

-   Professional message composer (one or both parents)

-   Message templates system

-   File attachments

-   Email notifications

**Weeks 5-6: Calendar, Events & Calls**

-   Professional calendar view

-   Court event scheduler

-   Parent notifications system

-   Integrate professional calls with KidComs WebRTC

-   Call logging and post-call actions

**Weeks 7-8: Documents & OCR**

-   Document viewer and uploader

-   PaddleOCR integration

-   California form detection (FL-341, FL-311, FL-312, FL-150, FL-342)

-   Data extraction and validation

-   Professional review/approval interface

-   Field locking system

**Weeks 9-10: ARIA Intake & Reports**

-   Standard 17-section ARIA intake

-   Custom intake questionnaire builder (Solo tier+)

-   Intake link generation and tracking

-   Professional intake review dashboard

-   Compliance report generator

-   Export formats (PDF/Word/Excel)

**Weeks 11-12: Firm Management & Directory**

-   Firm creation and settings

-   Team member invitation and role assignment

-   Case queue and dispatcher workflow

-   Professional/firm directory

-   Directory search and filtering

-   Opt-in/opt-out settings

-   Featured placement system

**Weeks 13-14: Polish, Testing & Launch**

-   Mobile responsive design

-   Performance optimization

-   User testing with beta attorneys

-   Bug fixes and refinements

-   Documentation and training materials

-   Pilot program launch with 3-5 Small Firm tier firms

*Phase 2 (MyCase Integration) is planned for Q3 2026, pending completion of Phase 1 and feedback from pilot attorneys.*

Summary & Next Steps

This specification provides a complete blueprint for the CommonGround Professional Portal, incorporating all clarified requirements and design decisions.

Key Decisions Finalized

-   ✅ Five-tier pricing structure with clear upgrade paths

-   ✅ Bar verification required before case acceptance

-   ✅ Professionals can be both individual AND firm members

-   ✅ Each parent has independent representation

-   ✅ ARIA Intake as professional TOOL with custom questionnaires

-   ✅ OCR creates NEW agreements, California-only at launch

-   ✅ Field locking via court orders only

-   ✅ Uses existing KidComs infrastructure for calls

-   ✅ Reports downloaded only (no auto-send to court)

-   ✅ Professional directory with opt-in/out and featured placement

-   ✅ No client billing through CommonGround

-   ✅ Firm downgrade converts team members to free tier

Immediate Next Steps

27. Review and approve this specification

28. Assign development team resources

29. Begin Week 1-2 development (Dashboard & Account Setup)

30. Identify 3-5 pilot firms for beta testing

31. Prepare marketing materials for pilot recruitment

**--- END OF SPECIFICATION ---**

**Ready for Development**

---

## Document: DATABASE_SCHEMA.md

# CommonGround Database Encyclopedia (Data Scheme)

This document is the exhaustive technical source of truth for the CommonGround data architecture. It "over-explains" every entity, field significance, and inter-relationship that powers our "Sanctuary of Truth."

---

## 🏛️ Domain 1: Identity & Access Management
The foundation of who can see what and how they are authenticated.

### 👤 `User` table
The primary entity for parents on the platform.
- **Fields**: `email`, `password_hash`, `full_name`, `phone`, `role` (parent, admin), `is_active`.
- **Relationships**: Owns `FamilyFile` and `Subscription`. Linked to `Activity` logs.

### 🏛️ `CourtProfessional` table
Verified legal professionals (Attorneys, GALs, Mediators).
- **Over-Explanation**: These are distinct from Parents. They have `role` (judge, mediator, gal) and `credentials` (bar number). They enter the platform via `CourtAccessGrant`.
- **Integrity**: `is_verified` and `verified_at` track the manual approval of their legal status.

---

## 📁 Domain 2: The Core Container (Family File)

### 📂 `FamilyFile` table
The "Unified Digital Life" for a co-parenting pair.
- **Over-Explanation**: All child data, agreements, and message history are scoped to a `FamilyFile`. It acts as the multi-tenant boundary.
- **Fields**: `petitioner_id`, `respondent_id`, `file_number`, `status` (active, archived).
- **Consensus**: Most changes within a `FamilyFile` require dual-parent approval via a `ConsensusRecord`.

---

## 🛡️ Domain 3: Safety & Communication (KidComs & ARIA)

### 🎥 `KidComsSession` table
Tracks a live video, game, or theater session.
- **Fields**: `daily_room_url` (Daily.co integration), `session_type` (arcade, theater, whiteboard), `status` (ringing, active, missed).
- **Participants**: Stored in a JSON array to track joined/left timestamps for all parties (Parent, Child, Circle Contact).

### 💬 `Message` and `KidComsMessage` tables
- **ARIA Integration**: Every message has `aria_analyzed` (bool), `aria_flagged` (bool), and `aria_score`.
- **Redaction Logic**: `original_content` vs. `content`. If ARIA suggests a rewrite and the parent accepts/forced, the safe version is stored in `content`, while the legal record preserves `original_content` for professional review.

---

## 💰 Domain 4: Financial Integrity (ClearFund™)

### 💸 `Obligation` table
The core of child support and expense sharing.
- **Logic**: An obligation is "Purpose-Locked."
- **Fields**: `purpose_category` (medical, sports), `total_amount`, `petitioner_share`, `respondent_share`.
- **Verification**: `amount_funded` vs. `amount_spent` vs. `amount_verified`.

### ⚖️ `Attestation` table
- **Over-Explanation**: When a parent requests money, they must sign a digital `Attestation`.
- **Fields**: `attestation_text`, `ip_address`, `user_agent`. This creates a court-ready record of the "Sworn Statement" that the funds will be used correctly.

---

## 🧭 Domain 5: Logistics & Silent Handoff™

### 🔄 `CustodyExchange` and `Instance` tables
- **Silent Handoff**: Fields like `location_lat`, `location_lng`, and `geofence_radius_meters`.
- **The "Truth" Mechanism**: `from_parent_in_geofence` and `to_parent_in_geofence` (bools) are automatically set by GPS. `qr_confirmed_at` provides a mutual, high-integrity "handshake" timestamp.

---

## ⚖️ Domain 6: Agreements & Orders

### 📜 `Agreement` and `CustodyOrder` tables
- **SCA (SharedCare Agreement)**: The living digital contract.
- **18 Sections**: Mapped via JSON structures or linked `AgreementSection` records.
- **Activation**: `AgreementActivation` table tracks the dual-parent digital signatures (digital fingerprint) and the `activated_at` timestamp that locks the version.

---

## 📄 Domain 7: The Reporting Engine (Exports)

### 📊 `Export` and `InvestigationReport` tables
- **Parental Reports**: Created in `Export`, usually limited to 30 days of history.
- **Professional Reports**: Created in `InvestigationReport`. Includes `content_hash` (SHA-256) and `watermark_text` for legal chain of custody.
- **Metadata**: Tracks `download_count` and `last_downloaded_at`.

---

## 📈 ER Relationship Summary

```mermaid
erDiagram
    USER ||--o{ FAMILY_FILE : "is_parent_in"
    USER ||--o{ COURT_ACCESS_GRANT : "authorized_by"
    FAMILY_FILE ||--o{ CHILD : "contains"
    FAMILY_FILE ||--o{ AGREEMENT : "governed_by"
    FAMILY_FILE ||--o{ OBLIGATION : "has_expenses"
    AGREEMENT ||--o{ OBLIGATION : "defines_splits"
    OBLIGATION ||--o{ ATTESTATION : "signed_for"
    OBLIGATION ||--o{ VERIFICATION_ARTIFACT : "verified_by"
    KIDCOMS_SESSION ||--o{ KIDCOMS_MESSAGE : "contains"
    CUSTODY_EXCHANGE ||--o{ CUSTODY_EXCHANGE_INSTANCE : "defines_pattern"
    COURT_PROFESSIONAL ||--o{ COURT_ACCESS_GRANT : "holds"
    CASE ||--o{ INVESTIGATION_REPORT : "generates"
```

---

## 🔧 Technical Invariants for Engineers

1.  **UUIDs Everywhere**: All primary keys are `UUID4` (String 36).
2.  **UTC Only**: All `DateTime` fields are stored in UTC.
3.  **Soft Deletes**: Most tables use `is_active` to preserve legal history.
4.  **Immutability**: Tables ending in `_log`, `_instance`, or `_activation` are "Append-Only" to ensure court integrity.

---

## Document: FEATURES_BREAKDOWN.md

# CommonGround Feature Implementation Map

This document serves as a high-fidelity mapping of platform features to their respective code modules, services, and entry points. It is designed for engineers seeking to "trace the logic" from a user action to its backend execution.

---

## 🗺️ Feature Architecture Matrix

| Feature Domain | Backend Service (`backend/app/services/`) | API Endpoint (`backend/app/api/v1/`) | Frontend Entry View (`frontend/app/`) |
| :--- | :--- | :--- | :--- |
| **ARIA AI Pipeline** | `aria.py`, `aria_inference.py` | `messages.py` (intercept) | `/messages/` |
| **Agreement Builder**| `agreement.py`, `agreement_activation.py` | `agreements.py` | `/agreements/builder/` |
| **ClearFund Finance** | `clearfund.py`, `stripe_service.py` | `clearfund.py`, `wallet.py` | `/clearfund/` |
| **Silent Handoff™** | `custody_exchange.py`, `geolocation.py` | `exchanges.py` | `/schedule/exchanges/` |
| **KidComs™ Suite** | `daily_video.py`, `aria_call_monitor.py` | `kidcoms.py` | `/kidcoms/` |
| **Cubbie Profile** | `child.py` | `children.py` | `/children/[id]/cubbie/` |
| **Case Governance** | `family_file.py`, `case.py` | `family_files.py`, `cases.py` | `/dashboard/` |
| **Professional Access**| `court.py`, `access_control.py` | `professional.py` | `/professional/dashboard/` |

---

## 🛠️ Feature Deep-Dives

### 1. ARIA™ Safety Shield
- **Logic Path**: User Input → `WebSocket.on_message` → `AriaService.analyze_message` → `AriaInference (Claude 3.5)` → `Service Intervention` → Storage.
- **Key Files**: 
  - `backend/app/services/aria.py` (The brain)
  - `backend/app/services/aria_patterns.py` (Fast regex tier)
  - `frontend/lib/hooks/use-aria.ts` (State hook)

### 2. ClearFund™ Financial Engine
- **Logic Path**: Obligation Creation → Consensus Signature → `StripeService` Account Verification → `ClearFundService` Ledger Entry.
- **Verification**: `backend/app/services/exchange_compliance.py` verifies receipts against the obligation's `purpose_category`.

### 3. Silent Handoff™ & Verifiable Truth
- **Logic Path**: Mobile PWA Geo-Ping → `GeolocationService` → `CustodyExchangeService.verify_handshake` → `DB Instance Update`.
- **Integrity**: Uses PostGIS `ST_DWithin` queries to verify parent proximity without manual check-ins.

### 4. SharedCare Agreements (SCA)
- **Logic Path**: Wizard Progress → `AgreementService.update_section` → Digital Fingerprinting → `AgreementActivationService.finalize`.
- **Versioning**: Every activation creates an immutable snapshot in the `agreement_versions` table.

---

## 🔗 Traceability Links

For further detail, see:
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - For table-level field definitions.
- [PLATFORM_CAPABILITIES.md](./PLATFORM_CAPABILITIES.md) - For the user-facing capability matrix.
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - For the high-level data flow diagrams.

---

> [!NOTE]
> This document has been pruned of redundant schema definitions to maintain its role as an implementation "Source Map." For specific API schemas, refer to the auto-generated Swagger docs at `/docs` during development.

---

## Document: MOBILE_MULTIAPP_ARCHITECTURE.md

# CommonGround Mobile Architecture (Status & Roadmap)

**Version:** 2.1
**Date:** February 14, 2026
**Current Status:** **Unified PWA Implementation** (Roadmap for Native Multi-App Expansion)
**Author:** Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Monorepo Structure](#5-monorepo-structure)
6. [App Specifications](#6-app-specifications)
7. [Recording & Transcription](#7-recording--transcription)
8. [Database Schema Updates](#8-database-schema-updates)
9. [API Changes](#9-api-changes)
10. [Implementation Phases](#10-implementation-phases)
11. [Deployment Strategy](#11-deployment-strategy)
12. [Cost Estimates](#12-cost-estimates)
13. [Risk Assessment](#13-risk-assessment)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Current State: The Unified PWA
CommonGround currently operates as a **High-Fidelity Progressive Web App (PWA)**. This approach ensures:
- **Instant Updates**: Version 1.110.26 is served globally without App Store delays.
- **Shared Codebase**: 100% of the Next.js logic is shared between Desktop and Mobile.
- **Service Worker (`sw.js`)**: Handles background notifications and offline capabilities for the "Sanctuary of Truth."

### 1.2 Roadmap: Native Multi-App Expansion
The future strategy involves splitting the platform into specialized native apps:

| App | Users | Platforms | Purpose |
|-----|-------|-----------|---------|
| **CommonGround Parent** | Parents | Web, iOS, Android | Full co-parenting suite |
| **CommonGround Kids** | Children | iOS, Android | Safe video calls, games, content |
| **CommonGround Circle** | Contacts | iOS, Android | Video calls with connected children |

### 1.2 Key Requirements

- All apps must work from a **central platform** (shared backend)
- All apps must pull from the **same family files**
- **Server-side recording** for full auditability
- **Real-time transcription** with speaker diarization
- **Native iOS and Android** apps (not web wrappers)

### 1.3 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mobile Framework | **Expo SDK 52+** | Managed workflow, OTA updates, easier builds |
| Video Provider | **Daily.co** (Confirmed) | Has React Native SDK, server-side recording |
| AI Integration | **Claude 3.5 Sonnet** | Advanced real-time mediation |
| Recording | **Daily.co Cloud Recording** | Automatic, server-side, auditable |
| Transcription | **Daily.co + Deepgram** | Real-time, 36+ languages, speaker diarization |
| Storage | **Custom AWS S3** | Full control, no extra Daily.co storage fees |
| Monorepo Tool | **Turborepo + pnpm** | Fast builds, efficient package sharing |

---

## 2. Current State Analysis

### 2.1 Technology Stack

| Layer | Current Technology |
|-------|-------------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy 2.0 |
| **Database** | PostgreSQL 15 (Supabase) |
| **Video** | Daily.co (web SDK) |
| **Auth** | Supabase Auth + JWT |

### 2.2 Mobile Readiness Assessment

| Aspect | Current State | Mobile Readiness |
|--------|---------------|------------------|
| API Client | 7,742-line monolith | 70% reusable (fetch-based) |
| Authentication | localStorage tokens | Needs SecureStore adapter |
| Business Logic | React hooks | 80% reusable |
| WebSocket | Standard WebSocket | 95% reusable |
| UI Components | shadcn/ui (web) | 0% - must rebuild for native |
| Navigation | Next.js App Router | 0% - must use React Navigation |

### 2.3 Existing User Separation

The codebase already has partial separation:

```
Current Routes:
├── /dashboard, /messages, /agreements, etc.  → Parent routes
├── /my-circle/child/*                        → Child routes
├── /my-circle/contact/*                      → Circle contact routes
└── /court-portal/*                           → Professional routes

Current Auth Tokens:
├── access_token    → Parent/Professional users
├── child_token     → Child users (PIN-based)
└── circle_token    → Circle contact users (invite-based)
```

### 2.4 Existing Recording Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| `DailyVideoService` | ✅ Exists | Has start/stop recording methods |
| `WhisperTranscriptionService` | ✅ Exists | OpenAI Whisper integration |
| `ParentCallSession.recording_url` | ✅ Exists | Storage field present |
| `KidComsSettings.record_sessions` | ✅ Exists | Toggle for recording |
| Server-side recording | ⚠️ Partial | Methods exist, not production-ready |
| Webhook handlers | ❌ Missing | Need to implement |
| Custom S3 storage | ❌ Missing | Need to configure |

---

## 3. Target Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DAILY.CO CLOUD                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Video Rooms │  │ Recording   │  │Transcription│  │  Your S3    │    │
│  │             │──│ Service     │──│ (Deepgram)  │──│  Bucket     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘    │
└────────────────────────────────────────────────────────────┼────────────┘
                                                              │
                              Webhooks                        │
                                 │                            │
┌────────────────────────────────┼────────────────────────────┼───────────┐
│                    COMMONGROUND BACKEND                     │           │
│                         (FastAPI)                           │           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│           │
│  │ Auth API │  │ Family   │  │ Recording│  │ Webhook      ││           │
│  │          │  │ Files API│  │ Service  │◀─│ Handler      │◀───────────┘
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘│
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ Messages │  │ KidComs  │  │ Schedule │  │ ARIA         ││
│  │ API      │  │ API      │  │ API      │  │ Monitoring   ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘│
│                              │                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostgreSQL + Redis                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PARENT APP    │  │   KIDSCOM APP   │  │  MY CIRCLE APP  │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │ 🌐 Web    │  │  │  │ 📱 iOS    │  │  │  │ 📱 iOS    │  │
│  │ 📱 iOS    │  │  │  │ 📱 Android│  │  │  │ 📱 Android│  │
│  │ 📱 Android│  │  │  └───────────┘  │  │  └───────────┘  │
│  └───────────┘  │  │                  │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 3.2 Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        FAMILY FILE                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                     Shared Data                             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │  │
│  │  │ Parents │  │ Children│  │ Circle  │  │Agreements│       │  │
│  │  │         │  │         │  │ Contacts│  │         │       │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └─────────┘       │  │
│  │       │            │            │                          │  │
│  │       │            │            │                          │  │
│  │  ┌────┴────────────┴────────────┴────┐                    │  │
│  │  │          KidComs Sessions          │                    │  │
│  │  │  ┌─────────┐  ┌─────────────────┐ │                    │  │
│  │  │  │Recording│  │  Transcription  │ │                    │  │
│  │  │  │  (S3)   │  │     (S3)        │ │                    │  │
│  │  │  └─────────┘  └─────────────────┘ │                    │  │
│  │  └───────────────────────────────────┘                    │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌───────────┐        ┌───────────┐        ┌───────────┐
   │ Parent App│        │Kidscom App│        │Circle App │
   │ Full CRUD │        │ Read Only │        │ Read Only │
   └───────────┘        └───────────┘        └───────────┘
```

---

## 4. Technology Stack

### 4.1 Mobile Development

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| **Framework** | Expo | SDK 52+ | Managed workflow, OTA updates |
| **Navigation** | Expo Router | v4 | File-based routing (like Next.js) |
| **UI Styling** | NativeWind | v4 | Tailwind CSS for React Native |
| **Video SDK** | @daily-co/react-native-daily-js | 0.82+ | Same provider as web |
| **Secure Storage** | expo-secure-store | Latest | Encrypted token storage |
| **Notifications** | expo-notifications | Latest | FCM/APNs integration |
| **Location** | expo-location | Latest | Custody exchange check-ins |
| **Media** | expo-av | Latest | Video/audio playback |

### 4.2 Shared Infrastructure

| Component | Technology | Notes |
|-----------|------------|-------|
| **Monorepo** | Turborepo + pnpm | Fast, efficient caching |
| **Type System** | TypeScript 5 | Shared types across platforms |
| **API Client** | Custom fetch wrapper | Platform-agnostic |
| **State Management** | React Context + hooks | Shared business logic |

### 4.3 Backend (Unchanged)

| Component | Technology |
|-----------|------------|
| **Framework** | FastAPI (Python 3.11+) |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Auth** | Supabase Auth + JWT |

### 4.4 Recording & Transcription

| Component | Technology | Notes |
|-----------|------------|-------|
| **Video Recording** | Daily.co Cloud Recording | 1080p @ 30fps, H.264, MP4 |
| **Transcription** | Daily.co + Deepgram | Real-time, 36+ languages |
| **Storage** | AWS S3 (custom bucket) | Your control, no extra fees |
| **Speaker ID** | Deepgram Diarization | Unlimited speakers |

---

## 5. Monorepo Structure

### 5.1 Directory Layout

```
CommonGround/
├── turbo.json                      # Turborepo configuration
├── package.json                    # Root workspace
├── pnpm-workspace.yaml             # pnpm workspace config
│
├── apps/
│   │
│   │  ══════════ WEB APPS ══════════
│   ├── web-parent/                 # Parent web app (Next.js)
│   │   ├── app/                    # Next.js App Router
│   │   ├── components/             # Web-specific components
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   │  ══════════ MOBILE APPS (Expo) ══════════
│   ├── mobile-parent/              # Parent iOS + Android
│   │   ├── app/                    # Expo Router pages
│   │   │   ├── (tabs)/             # Tab navigation
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx       # Dashboard
│   │   │   │   ├── messages.tsx    # Messaging
│   │   │   │   ├── schedule.tsx    # Calendar
│   │   │   │   ├── family.tsx      # Family Files
│   │   │   │   └── settings.tsx    # Settings
│   │   │   ├── call/
│   │   │   │   └── [sessionId].tsx # Video call screen
│   │   │   ├── kidcoms/
│   │   │   │   ├── index.tsx       # KidComs dashboard
│   │   │   │   ├── settings.tsx    # KidComs settings
│   │   │   │   └── recordings.tsx  # Recording playback
│   │   │   ├── agreements/
│   │   │   │   └── [id].tsx        # Agreement viewer
│   │   │   ├── auth/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── forgot-password.tsx
│   │   │   └── _layout.tsx         # Root layout
│   │   ├── components/             # Mobile-specific components
│   │   ├── assets/                 # Images, fonts
│   │   ├── app.json                # Expo config
│   │   ├── eas.json                # EAS Build config
│   │   ├── tailwind.config.js      # NativeWind config
│   │   └── package.json
│   │
│   ├── mobile-kidscom/             # Kidscom iOS + Android
│   │   ├── app/
│   │   │   ├── index.tsx           # PIN login screen
│   │   │   ├── (main)/             # Authenticated routes
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── home.tsx        # Child dashboard
│   │   │   │   ├── my-circle.tsx   # Contact list
│   │   │   │   ├── arcade/         # Games
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── tic-tac-toe.tsx
│   │   │   │   │   ├── memory.tsx
│   │   │   │   │   └── drawing.tsx
│   │   │   │   ├── theater/        # Watch together
│   │   │   │   │   └── [contentId].tsx
│   │   │   │   └── library/        # Books/stories
│   │   │   │       ├── index.tsx
│   │   │   │       └── [bookId].tsx
│   │   │   └── call/
│   │   │       └── [sessionId].tsx # Video call
│   │   ├── components/             # Child-friendly UI
│   │   ├── assets/                 # Colorful assets
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── package.json
│   │
│   └── mobile-mycircle/            # My Circle iOS + Android
│       ├── app/
│       │   ├── index.tsx           # Login screen
│       │   ├── accept-invite.tsx   # Invitation acceptance
│       │   ├── (main)/
│       │   │   ├── _layout.tsx
│       │   │   ├── home.tsx        # Connected children
│       │   │   ├── children/
│       │   │   │   └── [childId].tsx
│       │   │   └── settings.tsx
│       │   └── call/
│       │       └── [sessionId].tsx
│       ├── components/
│       ├── app.json
│       ├── eas.json
│       └── package.json
│
├── packages/
│   │
│   │  ══════════ UNIVERSAL (Web + Mobile) ══════════
│   ├── api-client/                 # Shared API client
│   │   ├── src/
│   │   │   ├── index.ts            # Main exports
│   │   │   ├── core/
│   │   │   │   ├── config.ts       # API URL, environment
│   │   │   │   ├── fetch.ts        # Platform-agnostic fetch
│   │   │   │   ├── auth.ts         # Token management
│   │   │   │   ├── storage.ts      # Storage adapter interface
│   │   │   │   └── errors.ts       # APIError class
│   │   │   ├── adapters/
│   │   │   │   ├── web-storage.ts  # localStorage adapter
│   │   │   │   └── native-storage.ts # SecureStore adapter
│   │   │   ├── parent/             # Parent-specific APIs
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── agreements.ts
│   │   │   │   ├── schedule.ts
│   │   │   │   ├── family-files.ts
│   │   │   │   ├── kidcoms.ts
│   │   │   │   ├── recordings.ts
│   │   │   │   └── clearfund.ts
│   │   │   ├── child/              # Child-specific APIs
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts         # PIN login
│   │   │   │   ├── contacts.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   └── content.ts      # Arcade, theater, library
│   │   │   ├── circle/             # Circle contact APIs
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts         # Email/invite login
│   │   │   │   ├── children.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   └── sessions.ts
│   │   │   └── shared/             # Shared APIs
│   │   │       ├── kidcoms.ts      # Video session management
│   │   │       └── realtime.ts     # WebSocket utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── user.ts
│   │   │   ├── child.ts
│   │   │   ├── circle.ts
│   │   │   ├── family-file.ts
│   │   │   ├── agreement.ts
│   │   │   ├── message.ts
│   │   │   ├── schedule.ts
│   │   │   ├── kidcoms.ts
│   │   │   ├── recording.ts        # Recording/transcript types
│   │   │   └── payment.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/                       # Business logic hooks
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useMessages.ts
│   │   │   │   ├── useSchedule.ts
│   │   │   │   ├── useKidComs.ts
│   │   │   │   ├── useRecordings.ts
│   │   │   │   └── useRealtime.ts
│   │   │   └── utils/
│   │   │       ├── timezone.ts
│   │   │       ├── formatters.ts
│   │   │       └── validators.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── daily-client/               # Daily.co abstraction
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts            # Daily.co types
│   │   │   ├── web.ts              # Web-specific implementation
│   │   │   ├── native.ts           # React Native implementation
│   │   │   └── shared.ts           # Shared utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                      # Shared utilities
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── cn.ts               # classnames utility
│   │   │   └── constants.ts
│   │   └── package.json
│   │
│   │  ══════════ WEB ONLY ══════════
│   ├── ui-web/                     # shadcn/ui components
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (all shadcn components)
│   │   └── package.json
│   │
│   │  ══════════ MOBILE ONLY ══════════
│   ├── ui-mobile/                  # React Native components
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── VideoTile.tsx
│   │   │   ├── CallControls.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── package.json
│   │
│   └── config/                     # Shared configs
│       ├── eslint-config/
│       │   └── index.js
│       └── typescript-config/
│           ├── base.json
│           ├── nextjs.json
│           └── react-native.json
│
└── backend/                        # FastAPI (existing location)
    └── ... (see Section 9 for changes)
```

### 5.2 Root Configuration Files

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "build:ios": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "build:android": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Root package.json:**
```json
{
  "name": "commonground",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=web-parent",
    "dev:parent": "turbo dev --filter=mobile-parent",
    "dev:kidscom": "turbo dev --filter=mobile-kidscom",
    "dev:mycircle": "turbo dev --filter=mobile-mycircle",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "build:ios": "turbo build:ios",
    "build:android": "turbo build:android"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## 6. App Specifications

### 6.1 Parent App

#### 6.1.1 Overview

| Attribute | Value |
|-----------|-------|
| **Platforms** | Web, iOS, Android |
| **Users** | Parents, primary account holders |
| **Auth** | Email/password (Supabase) |
| **Token** | `access_token` |

#### 6.1.2 Feature Matrix

| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| Dashboard | ✅ | ✅ | ✅ |
| Family Files | ✅ | ✅ | ✅ |
| Messages (ARIA) | ✅ | ✅ | ✅ |
| Agreements | ✅ | ✅ (view) | ✅ (view) |
| Schedule/Calendar | ✅ | ✅ | ✅ |
| Custody Exchanges | ✅ | ✅ | ✅ |
| Payments (ClearFund) | ✅ | ✅ | ✅ |
| Parent Video Calls | ✅ | ✅ | ✅ |
| KidComs Management | ✅ | ✅ | ✅ |
| Recording Playback | ✅ | ✅ | ✅ |
| Circle Contact Mgmt | ✅ | ✅ | ✅ |
| Push Notifications | ✅ (web) | ✅ (native) | ✅ (native) |

#### 6.1.3 Navigation Structure (Mobile)

```
Tab Bar:
├── Home (Dashboard)
├── Messages
├── Schedule
├── Family
└── Settings

Stack Screens:
├── /call/[sessionId]        # Video call
├── /kidcoms/*               # KidComs management
├── /agreements/[id]         # Agreement viewer
├── /recordings/[id]         # Recording playback
└── /auth/*                  # Login/register
```

### 6.2 Kidscom App

#### 6.2.1 Overview

| Attribute | Value |
|-----------|-------|
| **Platforms** | iOS, Android only |
| **Users** | Children |
| **Auth** | PIN-based (4-6 digits) |
| **Token** | `child_token` |

#### 6.2.2 Feature Matrix

| Feature | iOS | Android |
|---------|-----|---------|
| PIN Login | ✅ | ✅ |
| Avatar Selection | ✅ | ✅ |
| My Circle (contacts) | ✅ | ✅ |
| Video Calls | ✅ | ✅ |
| Theater Mode | ✅ | ✅ |
| Arcade Games | ✅ | ✅ |
| Library/Books | ✅ | ✅ |
| Push Notifications | ✅ | ✅ |

#### 6.2.3 Navigation Structure

```
Login Screen:
├── Family selection (avatar grid)
├── PIN entry
└── → Main app

Main App (Tab Bar):
├── Home (child dashboard)
├── My Circle (contact grid)
├── Arcade (games)
├── Theater (videos)
└── Library (books)

Stack Screens:
├── /call/[sessionId]        # Video call
├── /arcade/[game]           # Individual game
├── /theater/[contentId]     # Video player
└── /library/[bookId]        # Book reader
```

#### 6.2.4 Design Guidelines

- **Large touch targets** (minimum 48x48dp)
- **Vibrant colors** (purple/cyan gradient theme)
- **Minimal text** - use icons and images
- **ARIA mascot** integration throughout
- **No external links** or ways to leave app
- **Parental controls** enforced server-side

### 6.3 My Circle App

#### 6.3.1 Overview

| Attribute | Value |
|-----------|-------|
| **Platforms** | iOS, Android only |
| **Users** | Approved circle contacts (grandparents, etc.) |
| **Auth** | Email/password (via invite) |
| **Token** | `circle_token` |

#### 6.3.2 Feature Matrix

| Feature | iOS | Android |
|---------|-----|---------|
| Email Login | ✅ | ✅ |
| Accept Invitation | ✅ | ✅ |
| Connected Children | ✅ | ✅ |
| Video Calls | ✅ | ✅ |
| Theater Mode | ✅ | ✅ |
| Permission Indicators | ✅ | ✅ |
| Push Notifications | ✅ | ✅ |

#### 6.3.3 Navigation Structure

```
Auth Screens:
├── Login
├── Accept Invite (from email link)
└── Forgot Password

Main App:
├── Home (connected children grid)
├── Settings
└── /call/[sessionId]
```

---

## 7. Recording & Transcription

### 7.1 Recording Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DAILY.CO CLOUD                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Video Room   │───▶│ Recording    │───▶│ Your S3      │       │
│  │ (Parent/     │    │ Service      │    │ Bucket       │       │
│  │  KidComs)    │    │              │    │              │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
│         │                   │                    │               │
│         ▼                   ▼                    │               │
│  ┌──────────────┐    ┌──────────────┐           │               │
│  │ Real-time    │───▶│ Transcription│           │               │
│  │ Transcription│    │ Storage      │───────────┤               │
│  │ (Deepgram)   │    │ (WebVTT)     │           │               │
│  └──────────────┘    └──────────────┘           │               │
│                                                  │               │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
                    Webhooks                       │
                       │                           │
                       ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  COMMONGROUND BACKEND (FastAPI)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ /webhooks/daily  │    │ RecordingService │                   │
│  │ - recording.ready│───▶│ - Process webhook│                   │
│  │ - transcript.ready    │ - Update DB      │                   │
│  └──────────────────┘    │ - Create audit   │                   │
│                          └──────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Recording Types

| Call Type | Recording Mode | Transcription | Auto-Start |
|-----------|---------------|---------------|------------|
| **Parent ↔ Parent** | Cloud (composite) | ✅ Real-time + stored | ✅ Yes |
| **Child ↔ Circle** | Cloud (composite) | ✅ Real-time + stored | ✅ Yes |
| **Theater Mode** | Audio-only (optional) | ❌ Not needed | Configurable |

### 7.3 Daily.co Configuration

#### Room Configuration
```python
room_config = {
    "name": room_name,
    "privacy": "private",
    "properties": {
        "enable_recording": "cloud",
        "recording_bucket": {
            "bucket_name": "commonground-recordings",
            "bucket_region": "us-east-1",
            "assume_role_arn": "arn:aws:iam::ACCOUNT:role/DailyRecordingRole",
            "path": f"{family_file_id}/{session_type}/{session_id}/"
        },
        "enable_transcription": True,
        "enable_transcription_storage": True,
        "transcription_bucket": {
            "bucket_name": "commonground-recordings",
            "bucket_region": "us-east-1",
            "assume_role_arn": "arn:aws:iam::ACCOUNT:role/DailyRecordingRole",
            "path": f"{family_file_id}/{session_type}/{session_id}/"
        }
    }
}
```

#### Meeting Token with Auto-Recording
```python
token_config = {
    "properties": {
        "room_name": room_name,
        "user_name": user_name,
        "user_id": user_id,
        "is_owner": True,
        "start_cloud_recording": True,  # Auto-start recording
        "enable_transcription": True,
    }
}
```

### 7.4 S3 Bucket Structure

```
commonground-recordings/
├── parent-calls/
│   └── {family_file_id}/
│       └── {session_id}/
│           ├── recording.mp4           # Video recording
│           ├── transcript.vtt          # WebVTT transcript
│           └── metadata.json           # Session metadata
│
├── kidcoms/
│   └── {family_file_id}/
│       └── {session_id}/
│           ├── recording.mp4
│           ├── transcript.vtt
│           └── metadata.json
│
└── exports/
    └── {family_file_id}/
        └── {export_id}/
            ├── court-report.pdf        # Generated report
            └── evidence-bundle.zip     # All recordings
```

### 7.5 Webhook Processing

```python
# POST /api/v1/webhooks/daily
@router.post("/webhooks/daily")
async def handle_daily_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    payload = await request.json()
    event_type = payload.get("type")

    # Log webhook for debugging
    await log_webhook(db, event_type, payload)

    if event_type == "recording.ready-to-download":
        await handle_recording_ready(db, payload)

    elif event_type == "transcript.ready-to-download":
        await handle_transcript_ready(db, payload)

    elif event_type == "recording.error":
        await handle_recording_error(db, payload)

    return {"status": "ok"}


async def handle_recording_ready(db: AsyncSession, payload: dict):
    """Process recording ready webhook."""
    room_name = payload["room_name"]
    session_id = extract_session_id(room_name)
    session_type = extract_session_type(room_name)

    update_data = {
        "recording_url": payload.get("download_link"),
        "recording_s3_key": payload.get("s3_key"),
        "recording_status": "ready",
        "recording_duration_seconds": payload.get("duration"),
        "recording_file_size_bytes": payload.get("size"),
    }

    if session_type == "parent":
        await update_parent_call_session(db, session_id, update_data)
    else:
        await update_kidcoms_session(db, session_id, update_data)

    # Create audit log
    await create_recording_audit_log(db, session_id, "recording_created")
```

### 7.6 Audit Trail

#### Recording Access Log
```python
class RecordingAccessLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "recording_access_logs"

    session_id: Mapped[str]
    session_type: Mapped[str]  # "parent_call" | "kidcoms"

    accessed_by_id: Mapped[str]  # User ID
    access_type: Mapped[str]     # "view" | "download" | "export" | "share"

    ip_address: Mapped[Optional[str]]
    user_agent: Mapped[Optional[str]]

    # For exports
    export_format: Mapped[Optional[str]]   # "pdf" | "mp4" | "vtt"
    export_reason: Mapped[Optional[str]]   # Court, personal, etc.
```

#### Access Logging Endpoint
```python
@router.get("/recordings/{session_id}/stream")
async def stream_recording(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    # Verify access permissions
    session = await get_session_with_permissions(db, session_id, current_user)

    # Log access
    await create_access_log(
        db,
        session_id=session_id,
        accessed_by_id=current_user.id,
        access_type="view",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    # Generate signed URL for streaming
    signed_url = generate_signed_s3_url(session.recording_s3_key)

    return {"stream_url": signed_url, "expires_in": 3600}
```

---

## 8. Database Schema Updates

### 8.1 New Fields for ParentCallSession

```python
class ParentCallSession(Base, UUIDMixin, TimestampMixin):
    # ... existing fields ...

    # Enhanced recording fields
    recording_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    recording_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending | recording | processing | ready | failed
    recording_duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    recording_file_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    recording_format: Mapped[str] = mapped_column(
        String(20), default="mp4"
    )

    # Enhanced transcript fields
    transcript_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    transcript_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending | processing | ready | failed
    transcript_word_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    transcript_language: Mapped[str] = mapped_column(
        String(10), default="en"
    )
```

### 8.2 New Fields for KidComsSession

```python
class KidComsSession(Base, UUIDMixin, TimestampMixin):
    # ... existing fields ...

    # Recording fields (same as ParentCallSession)
    recording_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    recording_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )
    recording_duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    recording_file_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Transcript fields
    transcript_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    transcript_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )
    transcript_word_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
```

### 8.3 New Models

#### RecordingAccessLog
```python
class RecordingAccessLog(Base, UUIDMixin, TimestampMixin):
    """Audit trail for recording access."""

    __tablename__ = "recording_access_logs"

    session_id: Mapped[str] = mapped_column(String(36), index=True)
    session_type: Mapped[str] = mapped_column(String(20))  # parent_call | kidcoms

    accessed_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )
    access_type: Mapped[str] = mapped_column(String(20))
    # view | download | export | share

    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    export_format: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    export_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    accessed_by = relationship("User")

    __table_args__ = (
        Index("ix_recording_access_logs_session", "session_id", "session_type"),
        Index("ix_recording_access_logs_user", "accessed_by_id", "created_at"),
    )
```

#### DailyWebhookLog
```python
class DailyWebhookLog(Base, UUIDMixin, TimestampMixin):
    """Log of Daily.co webhook events for debugging."""

    __tablename__ = "daily_webhook_logs"

    event_type: Mapped[str] = mapped_column(String(50), index=True)
    room_name: Mapped[str] = mapped_column(String(100), index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_daily_webhook_logs_type_time", "event_type", "created_at"),
    )
```

### 8.4 Migration Script

```python
"""Add recording and webhook tables

Revision ID: xxx
Create Date: 2026-01-24
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add fields to parent_call_sessions
    op.add_column('parent_call_sessions',
        sa.Column('recording_s3_key', sa.String(500), nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('recording_status', sa.String(20), default='pending'))
    op.add_column('parent_call_sessions',
        sa.Column('recording_duration_seconds', sa.Integer, nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('recording_file_size_bytes', sa.Integer, nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('recording_format', sa.String(20), default='mp4'))
    op.add_column('parent_call_sessions',
        sa.Column('transcript_s3_key', sa.String(500), nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('transcript_status', sa.String(20), default='pending'))
    op.add_column('parent_call_sessions',
        sa.Column('transcript_word_count', sa.Integer, nullable=True))
    op.add_column('parent_call_sessions',
        sa.Column('transcript_language', sa.String(10), default='en'))

    # Add fields to kidcoms_sessions
    op.add_column('kidcoms_sessions',
        sa.Column('recording_s3_key', sa.String(500), nullable=True))
    op.add_column('kidcoms_sessions',
        sa.Column('recording_status', sa.String(20), default='pending'))
    op.add_column('kidcoms_sessions',
        sa.Column('recording_duration_seconds', sa.Integer, nullable=True))
    op.add_column('kidcoms_sessions',
        sa.Column('recording_file_size_bytes', sa.Integer, nullable=True))
    op.add_column('kidcoms_sessions',
        sa.Column('transcript_s3_key', sa.String(500), nullable=True))
    op.add_column('kidcoms_sessions',
        sa.Column('transcript_status', sa.String(20), default='pending'))
    op.add_column('kidcoms_sessions',
        sa.Column('transcript_word_count', sa.Integer, nullable=True))

    # Create recording_access_logs table
    op.create_table(
        'recording_access_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, onupdate=sa.func.now()),
        sa.Column('session_id', sa.String(36), nullable=False),
        sa.Column('session_type', sa.String(20), nullable=False),
        sa.Column('accessed_by_id', sa.String(36), sa.ForeignKey('users.id')),
        sa.Column('access_type', sa.String(20), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('export_format', sa.String(20), nullable=True),
        sa.Column('export_reason', sa.Text, nullable=True),
    )
    op.create_index('ix_recording_access_logs_session', 'recording_access_logs',
        ['session_id', 'session_type'])
    op.create_index('ix_recording_access_logs_user', 'recording_access_logs',
        ['accessed_by_id', 'created_at'])

    # Create daily_webhook_logs table
    op.create_table(
        'daily_webhook_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, onupdate=sa.func.now()),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('room_name', sa.String(100), nullable=False),
        sa.Column('payload', sa.JSON, nullable=False),
        sa.Column('processed', sa.Boolean, default=False),
        sa.Column('error_message', sa.Text, nullable=True),
    )
    op.create_index('ix_daily_webhook_logs_type_time', 'daily_webhook_logs',
        ['event_type', 'created_at'])


def downgrade():
    op.drop_table('daily_webhook_logs')
    op.drop_table('recording_access_logs')
    # Drop columns... (reversed)
```

---

## 9. API Changes

### 9.1 New Endpoints

#### Webhook Handler
```
POST /api/v1/webhooks/daily
    - Receives Daily.co webhook events
    - Processes recording.ready-to-download
    - Processes transcript.ready-to-download
    - Logs all webhook events
```

#### Recording Management
```
GET  /api/v1/recordings/{session_type}/{session_id}
    - Get recording metadata and signed URL
    - Logs access in audit trail

GET  /api/v1/recordings/{session_type}/{session_id}/transcript
    - Get transcript content
    - Returns WebVTT or JSON format

POST /api/v1/recordings/{session_type}/{session_id}/export
    - Generate court-ready export
    - Options: pdf, evidence_bundle

GET  /api/v1/family-files/{id}/recordings
    - List all recordings for a family
    - Filterable by session_type, date range
```

### 9.2 Enhanced Endpoints

#### Meeting Token Generation
```python
# Enhanced to include auto-recording
@router.post("/parent-calls/{room_id}/join")
async def join_parent_call(...):
    # Generate token with auto-recording enabled
    token = await daily_service.create_meeting_token(
        room_name=room.daily_room_name,
        user_name=current_user.display_name,
        user_id=str(current_user.id),
        is_owner=True,
        start_cloud_recording=room.recording_enabled,  # NEW
        enable_transcription=True,  # NEW
    )
```

### 9.3 Endpoint Documentation

```yaml
# openapi.yaml additions

/api/v1/webhooks/daily:
  post:
    summary: Daily.co webhook handler
    tags: [Webhooks]
    security: []  # No auth (use webhook signature)
    requestBody:
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/DailyWebhookPayload'
    responses:
      200:
        description: Webhook processed

/api/v1/recordings/{session_type}/{session_id}:
  get:
    summary: Get recording for playback
    tags: [Recordings]
    parameters:
      - name: session_type
        in: path
        required: true
        schema:
          type: string
          enum: [parent_call, kidcoms]
      - name: session_id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      200:
        description: Recording metadata with signed URL
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecordingResponse'
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

| Task | Priority | Estimate |
|------|----------|----------|
| Set up Turborepo monorepo structure | High | 2 days |
| Create pnpm workspace configuration | High | 1 day |
| Extract `@commonground/types` package | High | 2 days |
| Extract `@commonground/api-client` package | High | 3 days |
| Create storage adapter interface | High | 1 day |
| Set up `@commonground/utils` package | Medium | 1 day |
| Configure shared TypeScript/ESLint | Medium | 1 day |

**Deliverables:**
- Working monorepo with `turbo dev` running
- Shared packages importable from apps
- Type-safe API client with platform adapters

### Phase 2: Backend Recording Infrastructure (Week 3)

| Task | Priority | Estimate |
|------|----------|----------|
| Create AWS S3 bucket | High | 0.5 days |
| Configure Daily.co S3 integration | High | 1 day |
| Create webhook endpoint | High | 1 day |
| Implement RecordingService | High | 2 days |
| Add database migration | High | 0.5 days |
| Update DailyVideoService for auto-recording | High | 1 day |
| Create recording access endpoints | Medium | 1 day |

**Deliverables:**
- Recordings automatically saved to S3
- Webhooks processing recording events
- Recordings playable via signed URLs

### Phase 3: Parent Mobile App (Weeks 4-6)

| Task | Priority | Estimate |
|------|----------|----------|
| Initialize Expo project | High | 0.5 days |
| Set up Expo Router navigation | High | 1 day |
| Implement NativeWind styling | High | 1 day |
| Build authentication screens | High | 2 days |
| Build dashboard screen | High | 2 days |
| Build messages screen | High | 2 days |
| Build schedule/calendar screen | High | 2 days |
| Build family files screen | Medium | 1 day |
| Integrate Daily.co React Native SDK | High | 2 days |
| Build video call screen | High | 3 days |
| Build recording playback screen | Medium | 1 day |
| Implement push notifications | Medium | 2 days |

**Deliverables:**
- Fully functional parent app for iOS/Android
- Video calling with recording
- Push notifications working

### Phase 4: Kidscom Mobile App (Weeks 7-8)

| Task | Priority | Estimate |
|------|----------|----------|
| Initialize Expo project | High | 0.5 days |
| Build PIN login screen | High | 2 days |
| Build child dashboard | High | 1 day |
| Build My Circle contact list | High | 1 day |
| Build video call screen | High | 2 days |
| Build Theater Mode | Medium | 2 days |
| Port Arcade games | Medium | 3 days |
| Build Library feature | Low | 1 day |
| Implement push notifications | Medium | 1 day |

**Deliverables:**
- Child-friendly app for iOS/Android
- Video calls with circle contacts
- Games and content working

### Phase 5: My Circle Mobile App (Week 9)

| Task | Priority | Estimate |
|------|----------|----------|
| Initialize Expo project | High | 0.5 days |
| Build login screen | High | 1 day |
| Build invite acceptance flow | High | 1 day |
| Build connected children list | High | 1 day |
| Build video call screen | High | 2 days |
| Implement permission UI | Medium | 1 day |
| Implement push notifications | Medium | 1 day |

**Deliverables:**
- Circle contact app for iOS/Android
- Video calls with children
- Permission-aware UI

### Phase 6: Web App Migration (Weeks 10-11)

| Task | Priority | Estimate |
|------|----------|----------|
| Move Next.js to apps/web-parent | High | 1 day |
| Update imports to use shared packages | High | 3 days |
| Add recording playback UI | Medium | 2 days |
| Integrate webhook-based recording | High | 1 day |
| Test all features | High | 3 days |

**Deliverables:**
- Web app using shared packages
- Recording playback in web UI
- Feature parity with current version

### Phase 7: Testing & Polish (Weeks 12-13)

| Task | Priority | Estimate |
|------|----------|----------|
| End-to-end testing (all platforms) | High | 3 days |
| Cross-platform call testing | High | 2 days |
| Recording/transcription verification | High | 1 day |
| ARIA monitoring testing | High | 1 day |
| Performance optimization | Medium | 2 days |
| Accessibility audit | Medium | 1 day |
| Bug fixes | High | ongoing |

### Phase 8: App Store Submission (Week 14)

| Task | Priority | Estimate |
|------|----------|----------|
| Create App Store screenshots | High | 1 day |
| Write app descriptions | High | 0.5 days |
| Update privacy policies | High | 0.5 days |
| TestFlight submission | High | 1 day |
| Play Console submission | High | 1 day |
| Address review feedback | High | 2-5 days |

---

## 11. Deployment Strategy

### 11.1 Domain Structure

| App | Domain | Notes |
|-----|--------|-------|
| **Parent Web** | app.commonground.family | Vercel |
| **API** | api.commonground.family | Render/Railway |
| **Webhooks** | webhooks.commonground.family | Vercel Functions |

### 11.2 App Store Information

| App | Bundle ID | App Store Name |
|-----|-----------|----------------|
| **Parent iOS** | com.commonground.parent | CommonGround - Co-Parenting |
| **Parent Android** | com.commonground.parent | CommonGround - Co-Parenting |
| **Kidscom iOS** | com.commonground.kidscom | CommonGround Kids |
| **Kidscom Android** | com.commonground.kidscom | CommonGround Kids |
| **Circle iOS** | com.commonground.circle | CommonGround Circle |
| **Circle Android** | com.commonground.circle | CommonGround Circle |

### 11.3 CI/CD Pipeline

```yaml
# .github/workflows/mobile-deploy.yml
name: Mobile App Deployment

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile-*/**'
      - 'packages/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      parent: ${{ steps.filter.outputs.parent }}
      kidscom: ${{ steps.filter.outputs.kidscom }}
      mycircle: ${{ steps.filter.outputs.mycircle }}
    steps:
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            parent:
              - 'apps/mobile-parent/**'
              - 'packages/**'
            kidscom:
              - 'apps/mobile-kidscom/**'
              - 'packages/**'
            mycircle:
              - 'apps/mobile-mycircle/**'
              - 'packages/**'

  build-parent:
    needs: detect-changes
    if: needs.detect-changes.outputs.parent == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd apps/mobile-parent && eas build --platform all --non-interactive

  # Similar jobs for kidscom and mycircle...
```

### 11.4 Environment Variables

#### Mobile Apps (app.json)
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.commonground.family",
      "eas": {
        "projectId": "xxx"
      }
    }
  }
}
```

#### Backend (.env)
```env
# Daily.co
DAILY_API_KEY=xxx
DAILY_DOMAIN=commonground.daily.co
DAILY_WEBHOOK_SECRET=xxx

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_RECORDING_BUCKET=commonground-recordings
AWS_S3_REGION=us-east-1

# Recording
RECORDING_ENABLED=true
TRANSCRIPTION_ENABLED=true
```

---

## 12. Cost Estimates

### 12.1 Monthly Infrastructure Costs

| Service | Base Cost | Per 1000 Families | Notes |
|---------|-----------|-------------------|-------|
| **Daily.co Video** | $0 | ~$720 | $0.004/participant-min |
| **Daily.co Recording** | $0 | ~$1,350 | $0.015/recorded-min |
| **Daily.co Transcription** | $0 | ~$1,800 | $0.02/transcribed-min |
| **AWS S3 Storage** | $0 | ~$150 | ~$0.023/GB |
| **AWS S3 Transfer** | $0 | ~$50 | Egress costs |
| **Vercel Pro** | $20 | $20 | Web hosting |
| **Render/Railway** | $50 | $100 | Backend hosting |
| **Supabase Pro** | $25 | $25 | Database |
| **Redis (Upstash)** | $0 | $10 | Free tier covers most |
| **Apple Developer** | $99/year | $8 | Annual fee |
| **Google Play** | $25 once | $2 | One-time fee |
| **EAS Build** | $0 | $0 | Free tier |

### 12.2 Scaling Estimates

| Families | Calls/Month | Recording Hours | Monthly Cost |
|----------|-------------|-----------------|--------------|
| 100 | 300 | 150 hrs | ~$500 |
| 500 | 1,500 | 750 hrs | ~$2,000 |
| 1,000 | 3,000 | 1,500 hrs | ~$4,200 |
| 5,000 | 15,000 | 7,500 hrs | ~$18,000 |
| 10,000 | 30,000 | 15,000 hrs | ~$35,000 |

*Assumes average call duration of 30 minutes*

### 12.3 Cost Optimization Strategies

1. **Audio-only recording** for Theater Mode (80% size reduction)
2. **S3 Intelligent Tiering** for old recordings
3. **Lifecycle policies** to archive after 1 year
4. **Daily.co volume discounts** at scale
5. **Compression** before S3 upload

---

## 13. Risk Assessment

### 13.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Daily.co RN SDK issues | Low | High | Test early, have WebView fallback |
| Recording failures | Low | High | Retry logic, fallback to client-side |
| App Store rejection | Medium | Medium | Follow guidelines, prepare appeals |
| Cross-platform bugs | Medium | Medium | Thorough testing, shared logic |
| Performance on old devices | Medium | Low | Limit video participants, test widely |

### 13.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Daily.co price changes | Low | Medium | Monitor, have LiveKit as backup |
| User adoption | Medium | High | Beta testing, iterate on UX |
| Compliance issues | Low | High | Legal review, privacy audit |

### 13.3 Rollback Plan

1. Keep web app fully functional during transition
2. Feature flags for new recording system
3. Database migrations are additive (no data loss)
4. Old mobile web still accessible

---

## 14. Appendices

### 14.1 Related Documentation

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - Overall system architecture
- [TECHNICAL_STACK.md](./TECHNICAL_STACK.md) - Technology stack details
- [KIDCOMS.md](../features/KIDCOMS.md) - KidComs feature specification
- [PARENT_CALLING.md](../features/PARENT_CALLING.md) - Parent calling feature

### 14.2 External References

- [Daily.co React Native SDK](https://github.com/daily-co/react-native-daily-js)
- [Daily.co Recording Guide](https://docs.daily.co/guides/products/live-streaming-recording/recording-calls-with-the-daily-api)
- [Daily.co Custom S3 Storage](https://docs.daily.co/guides/products/live-streaming-recording/storing-recordings-in-a-custom-s3-bucket)
- [Daily.co Transcription](https://docs.daily.co/guides/products/transcription)
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [Turborepo](https://turbo.build/repo/docs)

### 14.3 Glossary

| Term | Definition |
|------|------------|
| **KidComs** | Video communication system for children and their approved contacts |
| **My Circle** | The approved contacts for a child (grandparents, etc.) |
| **ARIA** | AI assistant that monitors communications for safety |
| **Family File** | Central data container for all family information |
| **Circle Contact** | An approved adult in a child's communication circle |
| **Theater Mode** | Watch-together feature during video calls |

### 14.4 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-24 | Architecture Team | Initial draft |
| 2.0 | 2026-01-24 | Architecture Team | Added server-side recording, native mobile |

---

*Document generated: January 24, 2026*

---

## Document: OVERVIEW.md

# CommonGround V1.110 - Executive System Overview

**Last Updated:** February 14, 2026
**Version:** 1.110.26
**Status:** Production (High-Integrity Suite)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Mission & Vision](#mission--vision)
3. [Core Value Proposition](#core-value-proposition)
4. [Key Stakeholders](#key-stakeholders)
5. [System Context](#system-context)
6. [Core Features Overview](#core-features-overview)
7. [Technology Summary](#technology-summary)
8. [Document Index](#document-index)

---

## Executive Summary

**CommonGround** is an AI-powered "Co-Parenting Operating System" designed to transform high-conflict custody situations into collaborative partnerships. The platform serves as a neutral third party—a "Sanctuary of Truth"—that mediates interactions between separated parents, filters hostile communication, organizes shared responsibilities, and provides court-ready documentation.

### What CommonGround Does

CommonGround addresses the core challenges of co-parenting after separation:

| Challenge | CommonGround Solution |
|-----------|----------------------|
| Hostile communication | ARIA AI filters and rewrites toxic messages |
| Schedule conflicts | TimeBridge automated scheduling with compliance tracking |
| Financial disputes | ClearFund transparent expense tracking and splitting |
| Custody agreement confusion | Agreement Builder with 7/18-section wizard (v2/v1) |
| Court documentation needs | Export packages with integrity verification |
| Child information sharing | Cubbie digital backpack for each child |
| Limited family support | My Circle trusted contact network |
| Child-parent communication | KidComs monitored video calls |
| Parenting time disputes | Custody Time Tracking with visual reports |
| Custody exchange verification | Silent Handoff with GPS and QR confirmation |

### Key Statistics

- **Backend:** 44 API endpoint modules, 35+ models, 53 services, 27+ schemas
- **Frontend:** 120+ pages, 110+ components
- **Database:** 100+ Alembic migrations, PostgreSQL (PostGIS) + Supabase
- **API Endpoints:** 150+ REST endpoints across 44 modules
- **AI Integration:** Anthropic Claude 3.5 Sonnet (Primary)
- **Deployment:** Vercel (Frontend), Render/Railway (Backend), Supabase (Auth/DB/Storage)

---

## Mission & Vision

### Mission Statement

> Reduce conflict in separated families through technology, transparency, and AI-powered communication tools, ensuring every child has parents who can communicate effectively.

### Vision

> CommonGround becomes the standard platform for family courts nationwide, reducing post-divorce conflict by 40%, saving courts thousands of hours of hearing time, and helping millions of children experience better co-parenting.

### Core Philosophy: "The Sanctuary of Truth"

1. **Conflict Reduction:** AI intercepts and rewrites hostile messages before transmission
2. **Child-Centric:** Child profiles are central entities; parents are contributors to child welfare
3. **Court-Readiness:** Every action, message, and transaction is logged for legal admissibility
4. **Privacy & Safety:** Granular permissions support restraining orders and abuse situations
5. **Transparency:** Both parents contribute to a single, immutable record of truth

---

## Core Value Proposition

### For Parents

- **Reduced Conflict:** ARIA prevents 70%+ of hostile exchanges before they escalate
- **Clear Agreements:** Step-by-step builder creates legally sound custody agreements
- **Fair Finances:** Automatic expense splitting based on agreed percentages
- **Organized Schedules:** Visual calendar with automated compliance tracking
- **Child Information:** Centralized medical, educational, and preference data
- **Communication Tools:** Video calls with children through monitored channels

### For Family Courts

- **Evidence Packages:** Court-ready exports with SHA-256 integrity verification
- **Compliance Metrics:** Objective exchange punctuality and agreement adherence data
- **GAL/Attorney Access:** Time-limited professional portals with audit logging
- **Reduced Hearings:** Self-managed agreements reduce court intervention needs
- **Case Overview:** Dashboard showing family file status and conflict indicators

### For Legal Professionals

- **Client Monitoring:** Read-only access to case communications and compliance
- **Document Generation:** Auto-filled court forms (FL-300, FL-311, etc.)
- **Intake Automation:** Digital intake forms reduce administrative burden
- **Export Generation:** Complete case history packages for proceedings

---

## Key Stakeholders

### Primary Users

| User Type | Description | Key Needs |
|-----------|-------------|-----------|
| **Parent A (Petitioner)** | Initiating parent in custody case | Create cases, manage children, communicate |
| **Parent B (Respondent)** | Invited parent in custody case | Join cases, respond to requests, track schedule |
| **Children** | Subjects of custody arrangements | Access KidComs, maintain Cubbie profiles |

### Secondary Users

| User Type | Description | Access Level |
|-----------|-------------|--------------|
| **GAL (Guardian ad Litem)** | Court-appointed child advocate | Read-only case access, export generation |
| **Attorney (Petitioner)** | Legal representation for Parent A | Client case access, document review |
| **Attorney (Respondent)** | Legal representation for Parent B | Client case access, document review |
| **Mediator** | Neutral dispute facilitator | Read access to communications, agreements |
| **Court Clerk** | Administrative court staff | Case status, form verification |
| **My Circle Contacts** | Trusted family/friends | Limited child communication, emergency info |

### System Actors

| Actor | Description |
|-------|-------------|
| **ARIA** | AI assistant for sentiment analysis, message rewriting, and Q&A |
| **System** | Automated notifications, reminders, compliance calculations |

---

## System Context

```
                              ┌─────────────────────────────────────────┐
                              │           COMMONGROUND SYSTEM           │
                              │                                         │
┌─────────────┐               │  ┌─────────────────────────────────┐   │
│   Parent A  │◄──────────────┼──│          Next.js Frontend       │   │
│  (Browser)  │               │  │     (React + TypeScript)        │   │
└─────────────┘               │  └──────────────┬──────────────────┘   │
                              │                 │                       │
┌─────────────┐               │                 │ REST API              │
│   Parent B  │◄──────────────┼─────────────────┤                       │
│  (Browser)  │               │                 │                       │
└─────────────┘               │  ┌──────────────▼──────────────────┐   │
                              │  │        FastAPI Backend          │   │
┌─────────────┐               │  │   (Python + SQLAlchemy Async)   │   │
│Court Portal │◄──────────────┼──│                                 │   │
│   (GAL)     │               │  └───────┬───────────┬─────────────┘   │
└─────────────┘               │          │           │                 │
                              │          │           │                 │
                              │  ┌───────▼───────┐   │                 │
                              │  │  PostgreSQL   │   │  ┌────────────┐ │
                              │  │   (Supabase)  │   └──│ Anthropic  │ │
                              │  └───────────────┘      │   Claude   │ │
                              │                         └────────────┘ │
                              │                                        │
                              │  ┌───────────────┐   ┌────────────────┐│
                              │  │   SendGrid    │   │     Daily      ││
                              │  │    (Email)    │   │   (Video API)  ││
                              │  └───────────────┘   └────────────────┘│
                              └────────────────────────────────────────┘

                                           EXTERNAL SERVICES
                              ┌────────────────────────────────────────┐
                              │  Supabase (Auth + Database + Storage)  │
                              │  Anthropic Claude (AI/ML)              │
                              │  OpenAI (Fallback AI)                  │
                              │  Daily (Video Calling - KidComs)       │
                              │  SendGrid (Transactional Email)        │
                              │  Vercel (Frontend Hosting)             │
                              │  Railway (Backend Hosting - Planned)   │
                              └────────────────────────────────────────┘
```

### Data Flow Overview

1. **Parents** interact with the **Next.js frontend** via web browser
2. **Frontend** communicates with **FastAPI backend** via REST API
3. **Backend** stores data in **PostgreSQL** (hosted on Supabase)
4. **ARIA** uses **Anthropic Claude** for message analysis and suggestions
5. **KidComs** uses **Daily** for video calling infrastructure
6. **Notifications** sent via **SendGrid** email service
7. **Court professionals** access via dedicated **Court Portal** interface

---

## Core Features Overview

### 1. ARIA (AI Relationship Intelligence Assistant)
**Purpose:** AI-powered communication mediation

- **Sentiment Analysis:** 3-tier analysis (Regex → Claude → OpenAI fallback)
- **Message Rewriting:** Suggests collaborative alternatives to hostile messages
- **Quick Accord:** AI-assisted agreement drafting for specific issues
- **Paralegal Mode:** Court-focused document analysis and form assistance
- **Q&A Assistant:** Answers questions about agreements and custody terms

### 2. Family Files & Cases
**Purpose:** Core container for co-parenting relationships

- **Dual-Parent Workflow:** Invitation, acceptance, joint management
- **Child Profiles:** Complete child information with dual-approval
- **Case Status:** Pending → Active → Approved → Closed lifecycle
- **Access Control:** Role-based permissions at case level

### 3. Agreement Builder
**Purpose:** Structured custody agreement creation

- **18-Section Wizard:** Complete parenting plan template
- **Dual Approval:** Both parents must approve before activation
- **Version History:** Track all changes and who made them
- **PDF Generation:** Court-ready document output
- **Rule Compilation:** ARIA uses agreement for decision reference

### 4. ClearFund
**Purpose:** Transparent expense management

- **Expense Requests:** Submit, approve, reject workflow
- **Split Calculations:** Automatic based on agreement percentages
- **Receipt Upload:** Document expenses with photos
- **Running Balance:** Track who owes whom at any time
- **Obligations:** Track recurring payments like child support

### 5. TimeBridge (Schedule)
**Purpose:** Custody schedule management

- **Visual Calendar:** Month/week view with color coding
- **Exchange Tracking:** Check-in/out with optional GPS
- **Compliance Metrics:** On-time percentage, grace period tracking
- **Busy Periods:** Block out unavailable times
- **My Time Collections:** Organize time with children

### 6. KidComs
**Purpose:** Monitored child-parent communication

- **Video Calls:** Daily-powered video calling
- **Session Management:** Scheduled and ad-hoc calls
- **Settings Control:** Parents manage child access
- **Circle Integration:** Approved contacts can participate
- **Recording Option:** Optional call recording for records

### 7. Cubbie
**Purpose:** Digital backpack for each child

- **Categories:** Medical, Educational, Personal, Emergency
- **Item Tracking:** Medications, documents, preferences
- **Handoff Lists:** What goes with child at exchanges
- **Photo Support:** Visual documentation of items

### 8. My Circle
**Purpose:** Trusted contact network

- **Invite System:** Parents invite trusted family/friends
- **Permission Levels:** Contact, Emergency, Full access
- **Child Access:** Approved contacts for KidComs
- **Expiration:** Time-limited invitations

### 9. Court Portal
**Purpose:** Professional access for legal stakeholders

- **Case Dashboard:** Overview of assigned cases
- **Message Review:** Read-only access to communications
- **Form Assistance:** Court form pre-filling (FL-300, FL-311)
- **Export Generation:** Create evidence packages
- **Event Management:** Court dates and hearing tracking

### 10. Exports
**Purpose:** Court-ready documentation packages

- **Communication Logs:** All messages with metadata
- **Compliance Reports:** Schedule adherence data
- **Financial Summaries:** Expense and payment history
- **GPS Verification:** Exchange location documentation
- **Integrity Hash:** SHA-256 verification for authenticity

### 11. Professional Portal (v1.6.0)
**Purpose:** Legal practice management for family law professionals

- **Firm Management:** Create law firms, invite team members, manage roles
- **Case Dashboard:** Overview of all assigned cases with alerts and metrics
- **Case Timeline:** Chronological feed of messages, exchanges, court events
- **ARIA Controls:** Adjust AI mediation sensitivity and intervention settings
- **Professional Messaging:** Secure attorney-client communication channel
- **Intake Center:** Conduct AI-assisted client intakes with structured data extraction
- **Compliance Tracking:** Exchange and financial compliance metrics
- **Access Workflow:** Parent invitation with dual-consent, scoped permissions

**User Types:**
- Attorneys (lead, associate)
- Mediators / Parenting Coordinators
- Paralegals / Intake Coordinators
- Practice Administrators

---

## Technology Summary

### Backend Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| Python | Primary language | 3.11+ |
| FastAPI | Web framework | 0.104+ |
| SQLAlchemy | ORM (async) | 2.0+ |
| Alembic | Database migrations | 1.12+ |
| Pydantic | Data validation | 2.0+ |
| PostgreSQL | Primary database | 15+ |
| Redis | Caching (planned) | 7+ |

### Frontend Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| TypeScript | Primary language | 5.0+ |
| Next.js | React framework | 14+ (App Router) |
| React | UI library | 18+ |
| Tailwind CSS | Styling | 4.0+ |
| shadcn/ui | Component library | Latest |
| Lucide | Icon library | Latest |

### External Services

| Service | Purpose |
|---------|---------|
| Supabase | Auth, Database hosting, Storage |
| Anthropic Claude | Primary AI (Sonnet 4) |
| OpenAI | Fallback AI (GPT-4) |
| Daily | Video calling infrastructure |
| SendGrid | Transactional email |

### Infrastructure

| Platform | Purpose |
|----------|---------|
| Vercel | Frontend hosting |
| Railway | Backend hosting (planned) |
| Docker | Local development |

---

## Document Index

This document is part of the comprehensive CommonGround V1 documentation suite:

### Architecture Documentation (/docs/architecture/)

| Document | Description |
|----------|-------------|
| **OVERVIEW.md** | This document - executive system overview |
| [TECHNICAL_STACK.md](./TECHNICAL_STACK.md) | Detailed technology breakdown |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | [NEW] Tiered architecture & AI Pipeline Encyclopedia |
| [PLATFORM_CAPABILITIES.md](./PLATFORM_CAPABILITIES.md) | [NEW] Comprehensive Feature Encyclopedia |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | [NEW] Field-level Database Encyclopedia |
| [FEATURES_BREAKDOWN.md](./FEATURES_BREAKDOWN.md) | Granular feature analysis with dependencies |
| [MOBILE_MULTIAPP_ARCHITECTURE.md](./MOBILE_MULTIAPP_ARCHITECTURE.md) | Roadmap for native mobile expansion |

### API Documentation (/docs/api/)

| Document | Description |
|----------|-------------|
| [API_REFERENCE.md](../api/API_REFERENCE.md) | Complete endpoint specification |
| [AUTHENTICATION.md](../api/AUTHENTICATION.md) | Auth mechanisms and flows |
| [ENDPOINTS_BY_RESOURCE.md](../api/ENDPOINTS_BY_RESOURCE.md) | Endpoints organized by resource |

### Database Documentation (/docs/database/)

| Document | Description |
|----------|-------------|
| [SCHEMA.md](../database/SCHEMA.md) | Complete database schema |
| [MIGRATIONS.md](../database/MIGRATIONS.md) | Migration history and procedures |

### Feature Documentation (/docs/features/)

| Document | Description |
|----------|-------------|
| [ARIA.md](../features/ARIA.md) | AI assistant documentation |
| [KIDCOMS.md](../features/KIDCOMS.md) | Video communication system |
| [CLEARFUND.md](../features/CLEARFUND.md) | Expense management |
| [SCHEDULE.md](../features/SCHEDULE.md) | Calendar and exchanges |
| [PROFESSIONAL_PORTAL.md](../features/PROFESSIONAL_PORTAL.md) | Legal practice management (v1.6.0) |

### Operational Documentation (/docs/)

| Document | Description |
|----------|-------------|
| [SETUP_GUIDE.md](../guides/SETUP_GUIDE.md) | Local development setup |
| [DEPLOYMENT_GUIDE.md](../guides/DEPLOYMENT_GUIDE.md) | Production deployment |
| [PROFESSIONAL_PORTAL_GUIDE.md](../guides/PROFESSIONAL_PORTAL_GUIDE.md) | Professional Portal workflow guide (v1.6.0) |
| [ERROR_HANDLING.md](../errors/ERROR_HANDLING.md) | Error codes and handling |
| [SECURITY.md](../operations/SECURITY.md) | Security architecture |

---

## Quick Links

- **Repository:** `/Users/tj/Desktop/CommonGround/cg-v1.110.26/`
- **Backend:** `/Users/tj/Desktop/CommonGround/cg-v1.110.26/backend/`
- **Frontend:** `/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/`
- **Encyclopedia:** `/Users/tj/Desktop/CommonGround/cg-v1.110.26/docs/architecture/PLATFORM_CAPABILITIES.md`
- **API Docs (Auto):** `http://localhost:8000/docs`

---

*For questions or clarifications, see the detailed documentation in each section or refer to the main CLAUDE.md file in the mvp/ directory.*

---

## Document: PLATFORM_CAPABILITIES.md

# CommonGround Platform Encyclopedia (Universal Capabilities)

This document is the exhaustive source of truth for every feature, tool, and capability within the CommonGround platform.

## 🛰️ Platform Availability Matrix

| Feature | Web Desktop | Mobile PWA | Professional Portal |
| :--- | :---: | :---: | :---: |
| **ARIA Messaging** | ✅ | ✅ | 👁️ (Read/Analyze) |
| **SCA Agreement Builder** | ✅ | 👁️ (Read) | ✅ |
| **KidComs Video/Games** | ✅ | ✅ | 👁️ (Audit Logs) |
| **ClearFund Payments** | ✅ | ✅ | 👁️ (Audit) |
| **Report Generation** | ✅ | ✅ | ✅ (Deep Reports) |
| **GPS Check-ins** | ❌ | ✅ | 👁️ (Review) |
| **Firm Management** | ❌ | ❌ | ✅ |

---

## 🛡️ ARIA™ Safety Shield (AI Mediation)

ARIA is a multi-tiered safety system designed to prevent litigation by reducing conflict at the source.

### Capabilities:
- **Toxicity Interception**: Prevents the "Send" button from working on messages that violate safety protocols until a rewrite is confirmed.
- **Sentiment Scoring**: Maps parental tone over time (Hostility vs. Cooperation).
- **Good Faith Indicator**: Calculates a score based on how often a parent listens to ARIA's suggestions.
- **Legal Summarization**: AI transforms 6 months of chat history into a 3-page neutral summary for mediators.

---

## 🎥 KidComs™ Arcade & Communication

Designed to give children a "Conflict-Free Zone" to interact with their parents.

### Capabilities:
- **PlayBridge™ Technology**: Synced Phaser.js games that allow a parent and child to play together while on video.
- **Controlled Circle**: A child's contact list is empty by default. Both parents must digitally sign to add a contact (e.g., a grandparent).
- **AriaCall Monitor**: Real-time voice-to-text safety monitoring. If adult language is detected, the session is flagged for professional review.
- **Memory Theater**: Collaborative video playback for watching movies or sharing screen content.

---

## 📄 The Reporting Infrastructure

High-fidelity PDF generation for self-service or legal evidence.

### Self-Service Parent Reports (30-Day Limit)
- **Custody Time**: Visual breakdown of overnights and parenting hours.
- **Communication Summary**: Stats on messages sent, response times, and ARIA usage.
- **Financial Log**: ClearFund overview of expense requests and payments.

### Professional Paid Reports (Unlimited History)
- **Court Investigation Package**: The full digital file. Every message, agreement version, and compliance log.
- **Communication Analysis**: Deep-dive into tone and toxicity triggers.
- **Financial Compliance**: Detailed expense auditing, including receipt images.
- **Custody Compliance**: Exact GPS lat/long entry and exit data for every exchange.

---

## 💰 ClearFund™ Financial System

Secure, transparent expense sharing and child support tracking.

### Capabilities:
- **The Ledger**: A shared immutable list of all obligations.
- **Split-Consensus**: Parent A proposes an expense; Parent B must approve for it to become a "Legal Obligation."
- **One-Click Settlement**: Integration with Stripe for immediate reimbursement.
- **Evidence Vault**: Direct attachment of receipts to expense requests.

---

## ⚖️ SharedCare Agreement (SCA™) Builder

Digital transformation of long-form legal custody orders.

### 18 Modular Sections:
1.  **Custody Schedule**: Regular recurring patterns.
2.  **Holiday Schedule**: Priority overrides for special days.
3.  **Exchanges**: Locations, times, and transition rules.
4.  **Education**: School choice and information access.
5.  **Healthcare**: Major medical and daily health decisions.
6.  **Extracurriculars**: Signing children up and covering costs.
7.  ... (and 12 more including Travel, Religion, and Discipline).

---

## 🏛️ Professional Portal (Legal/Mediator)

The enterprise-grade backend for firms managing hundreds of cases.

### Capabilities:
- **Case Dashboard**: At-a-glance view of "High Conflict" vs. "Stable" cases.
- **Assignment Scopes**: Assign a paralegal to "Financials only" or an attorney to "Messaging only."
- **Firm Templates**: Pre-set agreement templates for use across the firm.
- **ARIA Tuning**: Set the AI sensitivity level based on existing court orders or specific case volatility.

---

## Document: SYSTEM_ARCHITECTURE.md

# CommonGround System Architecture Encyclopedia

This document over-explains the high-level design, data flows, and technical orchestration that make the CommonGround platform "High-Integrity" and "Court-Ready."

---

## 🏗️ The 4-Tier Architecture

CommonGround follows a strict separation of concerns to ensure scalability and legal auditability.

### 1. Presentation Tier (Frontend Next.js)
- **Tech Stack**: Next.js 16 (App Router), Tailwind CSS, Framer Motion.
- **Role**: State-managed interfaces for Parents, Children (KidComs), and Professionals.
- **Communication**: REST for transactions; WebSockets for real-time presence/notifications.

### 2. API Gateway Tier (FastAPI Gateway)
- **Tech Stack**: FastAPI (Python 3.11), SQLAlchemy Async (PostgreSQL), Pydantic V2.
- **Role**: Authentication, Role-Based Access Control (RBAC), and request validation.
- **Endpoint Pattern**: Categorized into `/v1/parent/`, `/v1/professional/`, and `/v1/kidcoms/`.

### 3. Service Orchestration Tier (Business Logic)
- **Role**: This is where the "CommonGround Magic" happens. The API Layer calls the Service Layer (`backend/app/services/`) to perform complex multi-step actions.
- **Key Orchestrators**:
    - `AgreementService`: Manages versioning and consensus.
    - `AriaService`: Coordinates the AI safety pipeline.
    - `ClearFundService`: Manages the Stripe ledger and purpose-locked obligations.

### 4. Data & Infrastructure Tier
- **Database**: PostgreSQL (Supabase) with PostGIS for Silent Handoff™ geofencing.
- **File Storage**: Supabase Storage for receipts and Family Files.
- **Third-Party Integrations**:
    - **Stripe**: Payments and virtual card issuing (v2).
    - **Daily.co**: WebRTC video/audio for KidComs.
    - **Claude 3.5 Sonnet**: The intelligence behind ARIA.

---

## 🛡️ ARIA™ Safety Shield Pipeline

ARIA is not just a chatbot; it is a real-time mediation pipeline.

### The Interception Flow:
1.  **Ingress**: Parent sends a message via WebSocket.
2.  **Detection**: Message passes through `aria_patterns.py` (fast regex checks for immediate threats).
3.  **Inference**: Message is sent to `aria_inference.py` where Claude 3.5 Sonnet analyzes Sentiment, Toxicity, and Passive-Aggression.
4.  **Mitigation**: If flagged, the `AriaService` generates "Safe Suggestions."
5.  **Audit**: The original and rewritten versions are stored in the database for professional review.

---

## 📡 Real-Time & KidComs™ Architecture

KidComs requires synchronized state across video, games, and drawing.

- **WebSocket Orchestration**: `backend/app/core/websocket.py` handles room subscriptions and presence.
- **Shared State**: Phaser.js games in the frontend sync via low-latency WebSocket events.
- **Audio Monitoring**: `aria_call_monitor.py` listens to Daily.co audio streams (via Whisper transcription) to ensure safe language is used around children.

---

## 🧭 Silent Handoff™ (GPS & Geofencing)

A high-integrity system for verifying custody exchanges without parental interaction.

1.  **Geofence Definition**: When an exchange is scheduled, `GeolocationService` calculates a 100m radius around the address using PostGIS.
2.  **Background Check-in**: The mobile PWA sends periodic GPS pings during the "Exchange Window."
3.  **Automated Truth**: If both parents are detected within the geofence simultaneously, the `CustodyExchangeInstance` is marked as "Completed - GPS Verified."

---

## 🔒 Security & Legal Integrity

- **SHA-256 Hashing**: Every generated report is hashed and the hash is stored in the `investigation_reports` table.
- **Chain of Custody**: Professionals access data via "Grants" that expire automatically. Every "View" action is logged in `court_access_logs`.
- **Immutability**: Legal records (agreements, signed attestations) cannot be edited once "Activated." Any change requires a new `AgreementVersion`.

---

## Document: TECHNICAL_STACK.md

# CommonGround V1.110 - Technical Stack Breakdown

**Last Updated:** February 14, 2026
**Version:** 1.110.26

---

## Table of Contents

1. [Stack Overview](#stack-overview)
2. [Backend Technologies](#backend-technologies)
3. [Frontend Technologies](#frontend-technologies)
4. [Database Technologies](#database-technologies)
5. [AI/ML Components](#aiml-components)
6. [Infrastructure & Hosting](#infrastructure--hosting)
7. [Development Tools](#development-tools)
8. [External Services](#external-services)
9. [Package Versions](#package-versions)

---

## Stack Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Next.js 15 (App Router) + React 19 + TypeScript 5          │   │
│  │  Tailwind CSS v4 + shadcn/ui + Lucide Icons                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ REST API (HTTPS)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  FastAPI 0.104+ (Python 3.11+)                              │   │
│  │  Pydantic 2.0+ (Validation) + Python-Jose (JWT)             │   │
│  │  Async/Await throughout                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ SQLAlchemy Async ORM
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 15 (via Supabase)                               │   │
│  │  SQLAlchemy 2.0+ Async + Alembic Migrations                 │   │
│  │  30+ Tables, 27+ Models                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ External API Calls
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ Anthropic  │  │   OpenAI   │  │   Daily    │  │  SendGrid  │   │
│  │  Claude    │  │  (Backup)  │  │  (Video)   │  │  (Email)   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Backend Technologies

### Core Framework: FastAPI

**Version:** 0.104+

**Why FastAPI:**
- High performance (Starlette + Pydantic)
- Native async/await support
- Automatic OpenAPI documentation
- Type hints throughout
- Dependency injection system
- WebSocket support

**Key Features Used:**
```python
# Dependency Injection
@router.get("/cases/")
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ...

# Automatic Validation
@router.post("/cases/", response_model=CaseResponse)
async def create_case(data: CaseCreate, ...):
    ...

# Background Tasks
@router.post("/messages/")
async def send_message(..., background_tasks: BackgroundTasks):
    background_tasks.add_task(send_notification, ...)
```

**File Location:** `mvp/backend/app/main.py`

### Python Version: 3.11+

**Key Features Used:**
- Type hints with generics
- Async generators
- Exception groups
- Pattern matching
- Improved error messages

### ORM: SQLAlchemy 2.0 (Async)

**Version:** 2.0+

**Why Async SQLAlchemy:**
- Non-blocking database operations
- Works with FastAPI's async nature
- Better performance under load
- Modern relationship patterns

**Configuration:**
```python
# Database session management
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

**File Location:** `backend/app/core/database.py`

### Validation: Pydantic 2.0

**Version:** 2.0+

**Why Pydantic:**
- Fast validation (Rust core)
- IDE autocompletion
- JSON Schema generation
- Seamless FastAPI integration

**Schema Pattern:**
```python
class CaseCreate(BaseModel):
    case_name: str = Field(..., min_length=1, max_length=255)
    other_parent_email: EmailStr
    state: str = Field(..., min_length=2, max_length=2)

    model_config = ConfigDict(from_attributes=True)
```

**File Location:** `mvp/backend/app/schemas/`

### Authentication: JWT + Supabase

**Libraries:**
- `python-jose` - JWT encoding/decoding
- `passlib[bcrypt]` - Password hashing
- `supabase-py` - Supabase client

**Token Flow:**
1. User registers/logs in via Supabase Auth
2. Backend validates Supabase token
3. Backend issues its own JWT for API access
4. Tokens include user ID and role claims

**File Location:** `mvp/backend/app/core/security.py`

### HTTP Client: httpx

**Version:** 0.25+

**Usage:**
- Anthropic API calls
- OpenAI API calls
- Daily API integration
- External webhook calls

### PDF Generation: ReportLab + PyPDF

**Libraries:**
- `reportlab` - PDF creation
- `pypdf` - PDF manipulation
- `python-docx` - Word document generation

**Usage:**
- Agreement PDF generation
- Court form filling (FL-300, FL-311)
- Export package compilation

---

## Frontend Technologies

### Framework: Next.js 14 (App Router)

**Version:** 14.0+

**Why Next.js App Router:**
- Server Components (reduced bundle)
- Streaming and Suspense
- Improved routing patterns
- Built-in optimizations
- API routes if needed

**Key Patterns:**
```typescript
// Server Component (default)
export default async function DashboardPage() {
  const data = await fetchData();
  return <Dashboard data={data} />;
}

// Client Component
'use client';
export function MessageCompose() {
  const [content, setContent] = useState('');
  ...
}
```

**File Location:** `mvp/frontend/app/`

### UI Framework: React 18+

**Key Features Used:**
- Server Components
- Concurrent Rendering
- Automatic Batching
- Transitions
- Suspense for Data Fetching

### Language: TypeScript 5

**Version:** 5.0+

**Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

**File Location:** `mvp/frontend/tsconfig.json`

### Styling: Tailwind CSS 4

**Version:** 4.0+

**Why Tailwind:**
- Utility-first approach
- No CSS file management
- Consistent design tokens
- Purged for production
- Dark mode support ready

**Configuration:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...}
      }
    }
  }
}
```

### Component Library: shadcn/ui

**Why shadcn/ui:**
- Copy-paste components (no dependency)
- Full customization control
- Radix UI primitives underneath
- Accessible by default
- Tailwind styled

**Components Used:**
- Button, Card, Input, Label
- Dialog, Sheet, Dropdown
- Form, Select, Checkbox
- Table, Tabs, Toast
- Calendar, Badge, Avatar

**File Location:** `mvp/frontend/components/ui/`

### Icons: Lucide React

**Version:** Latest

**Usage:**
```typescript
import { Home, Settings, MessageSquare } from 'lucide-react';

<Home className="h-5 w-5" />
```

### State Management: React Context

**Pattern:**
```typescript
// Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**File Location:** `mvp/frontend/lib/auth-context.tsx`

### API Client: Custom Fetch Wrapper

**Pattern:**
```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new APIError(response);
  }

  return response.json();
}
```

**File Location:** `mvp/frontend/lib/api.ts`

---

## Database Technologies

### Primary Database: PostgreSQL 15

**Hosted On:** Supabase

**Why PostgreSQL:**
- ACID compliance
- Advanced JSON support
- Full-text search
- Row-level security (Supabase)
- Proven reliability

**Key Features Used:**
- UUID primary keys
- JSONB columns for flexible data
- Array columns
- Timestamp with timezone
- Check constraints

### ORM: SQLAlchemy 2.0 Async

**Model Pattern:**
```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    cases: Mapped[List["CaseParticipant"]] = relationship(
        back_populates="user"
    )
```

**File Location:** `mvp/backend/app/models/`

### Migrations: Alembic

**Version:** 1.12+

**Usage:**
```bash
# Generate migration
alembic revision --autogenerate -m "Add new column"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

**File Location:** `mvp/backend/alembic/`

### Connection Pooling

**Configuration:**
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300
)
```

---

## AI/ML Components

### Primary AI: Anthropic Claude

**Model:** Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)

**Usage Areas:**
1. **ARIA Sentiment Analysis** - Message toxicity detection
2. **ARIA Suggestions** - Collaborative message rewrites
3. **Quick Accord** - Issue-specific agreement drafting
4. **Paralegal Mode** - Court form assistance
5. **Extraction Schema** - Structured data extraction from documents

**Integration:**
```python
from anthropic import Anthropic

client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=ARIA_SYSTEM_PROMPT,
    messages=[{"role": "user", "content": message}]
)
```

**File Location:** `backend/app/services/aria.py`

### Fallback AI: OpenAI

**Model:** gpt-4o

**Usage:**
- Fallback when Claude is unavailable
- Second opinion for sentiment analysis
- Alternative suggestion generation

**Integration:**
```python
from openai import OpenAI

client = OpenAI(api_key=settings.OPENAI_API_KEY)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": ARIA_SYSTEM_PROMPT},
        {"role": "user", "content": message}
    ]
)
```

### Three-Tier Analysis Pipeline

```
Message Input
     │
     ▼
┌─────────────┐
│  Tier 1:    │ Fast pattern matching
│   Regex     │ Obvious toxicity detection
└─────┬───────┘
      │ If unclear
      ▼
┌─────────────┐
│  Tier 2:    │ Primary AI analysis
│   Claude    │ Nuanced sentiment detection
└─────┬───────┘
      │ If unavailable
      ▼
┌─────────────┐
│  Tier 3:    │ Fallback AI
│   OpenAI    │ Secondary analysis
└─────────────┘
```

---

## Infrastructure & Hosting

### Frontend Hosting: Vercel

**Why Vercel:**
- Native Next.js support
- Edge functions
- Automatic preview deployments
- CDN included
- Simple CI/CD

**Configuration:**
- Framework: Next.js
- Build Command: `npm run build`
- Output: `.next`

### Backend Hosting: Railway (Planned)

**Why Railway:**
- Docker support
- PostgreSQL integration
- Easy environment variables
- Automatic deployments
- Reasonable pricing

**Alternative:** Render, Fly.io

### Database Hosting: Supabase

**Services Used:**
1. **PostgreSQL Database** - Primary data storage
2. **Authentication** - User registration and login
3. **Storage** - File uploads (receipts, documents)
4. **Realtime** - WebSocket subscriptions (future)

**Configuration:**
```python
SUPABASE_URL = "https://xxx.supabase.co"
SUPABASE_ANON_KEY = "eyJ..."
SUPABASE_SERVICE_KEY = "eyJ..."  # Server-side only
```

### Local Development: Docker Compose

**Services:**
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: commonground
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

**File Location:** `mvp/docker-compose.yml`

---

## Development Tools

### Backend

| Tool | Purpose |
|------|---------|
| `pytest` | Testing framework |
| `pytest-asyncio` | Async test support |
| `black` | Code formatting |
| `isort` | Import sorting |
| `mypy` | Static type checking |
| `ruff` | Fast linter |

### Frontend

| Tool | Purpose |
|------|---------|
| `eslint` | Code linting |
| `prettier` | Code formatting |
| `vitest` | Testing (if configured) |
| `typescript` | Type checking |

### Version Control

| Tool | Purpose |
|------|---------|
| `git` | Version control |
| `GitHub` | Repository hosting |
| `Conventional Commits` | Commit message format |

---

## External Services

### Video Calling: Daily

**Purpose:** KidComs video call infrastructure

**Features:**
- WebRTC-based calls
- Room creation via API
- Participant management
- Recording capabilities

**Integration:**
```typescript
// Create a Daily room
const room = await daily.createRoom({
  name: `kidcoms-${sessionId}`,
  properties: {
    max_participants: 4,
    enable_recording: false
  }
});
```

### Email: SendGrid

**Purpose:** Transactional email delivery

**Email Types:**
- Case invitations
- Message notifications
- Schedule reminders
- Approval requests
- Password reset

**Integration:**
```python
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

message = Mail(
    from_email='noreply@commonground.app',
    to_emails=recipient,
    subject=subject,
    html_content=html_template
)
sg.send(message)
```

---

## Package Versions

### Backend Requirements

```
# Core Framework
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6

# Database
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
alembic>=1.12.0

# Authentication
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
supabase>=2.0.0

# AI/ML
anthropic>=0.7.0
openai>=1.0.0

# PDF/Documents
reportlab>=4.0.0
pypdf>=3.0.0
python-docx>=1.0.0

# HTTP Client
httpx>=0.25.0

# Utilities
python-dotenv>=1.0.0
pydantic>=2.0.0
pydantic-settings>=2.0.0

# Email
sendgrid>=6.10.0

# Video
daily-python>=0.5.0
```

**File Location:** `mvp/backend/requirements.txt`

### Frontend Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",

    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-label": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",

    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.300.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.0",

    "date-fns": "^3.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

**File Location:** `mvp/frontend/package.json`

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/commonground
DATABASE_SYNC_URL=postgresql://user:pass@host:5432/commonground

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Email
SENDGRID_API_KEY=SG....
FROM_EMAIL=noreply@commonground.app

# Video
DAILY_API_KEY=...

# Environment
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

*For detailed information about specific components, see the corresponding documentation in each section.*

---

