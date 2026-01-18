# CommonGround V1 - Executive System Overview

**Last Updated:** January 17, 2026
**Version:** 1.5.0
**Status:** Production

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

- **Backend:** 33 API endpoint modules, 30 models, 40 services, 27 schemas
- **Frontend:** 123 pages, 109 components
- **Database:** 80+ Alembic migrations, PostgreSQL + Redis
- **API Endpoints:** 100+ REST endpoints across 33 modules
- **AI Integration:** Anthropic Claude (primary) + OpenAI (fallback)
- **Deployment:** Vercel (frontend), Render (backend), Supabase (database + auth)

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
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Component and data flow diagrams |
| [FEATURES_BREAKDOWN.md](./FEATURES_BREAKDOWN.md) | Complete feature analysis with dependencies |

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

### Operational Documentation (/docs/)

| Document | Description |
|----------|-------------|
| [SETUP_GUIDE.md](../guides/SETUP_GUIDE.md) | Local development setup |
| [DEPLOYMENT_GUIDE.md](../guides/DEPLOYMENT_GUIDE.md) | Production deployment |
| [ERROR_HANDLING.md](../errors/ERROR_HANDLING.md) | Error codes and handling |
| [SECURITY.md](../operations/SECURITY.md) | Security architecture |

---

## Quick Links

- **Repository:** `/Users/tj/Desktop/CommonGround/mvp/`
- **Backend:** `/Users/tj/Desktop/CommonGround/mvp/backend/`
- **Frontend:** `/Users/tj/Desktop/CommonGround/mvp/frontend/`
- **Existing Docs:** `/Users/tj/Desktop/CommonGround/mvp/docs/`
- **API Docs (Auto):** `http://localhost:8000/docs`

---

*For questions or clarifications, see the detailed documentation in each section or refer to the main CLAUDE.md file in the mvp/ directory.*
