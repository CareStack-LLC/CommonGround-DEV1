# CommonGround V1 - Complete Feature Analysis

**Last Updated:** January 10, 2026
**Version:** 1.0.0
**Status:** Production MVP

---

## Table of Contents

1. [Feature Overview Matrix](#feature-overview-matrix)
2. [Feature Dependencies Graph](#feature-dependencies-graph)
3. [Detailed Feature Documentation](#detailed-feature-documentation)
   - [Authentication & User Management](#1-authentication--user-management)
   - [Family Files & Case Management](#2-family-files--case-management)
   - [ARIA AI System](#3-aria-ai-system)
   - [Agreement Builder](#4-agreement-builder)
   - [ClearFund Expense Management](#5-clearfund-expense-management)
   - [TimeBridge Scheduling](#6-timebridge-scheduling)
   - [KidComs Video Communication](#7-kidcoms-video-communication)
   - [Cubbie Child Profiles](#8-cubbie-child-profiles)
   - [My Circle Contact Network](#9-my-circle-contact-network)
   - [Court Portal](#10-court-portal)
   - [Export System](#11-export-system)
   - [Notification System](#12-notification-system)
4. [Feature Integration Points](#feature-integration-points)
5. [Configuration Options](#configuration-options)
6. [Known Limitations](#known-limitations)

---

## Feature Overview Matrix

| Feature | Status | Priority | Backend Files | Frontend Pages | DB Tables | API Endpoints |
|---------|--------|----------|---------------|----------------|-----------|---------------|
| **Authentication** | ✅ Complete | Critical | 4 | 3 | 3 | 8 |
| **Case Management** | ✅ Complete | Critical | 5 | 4 | 5 | 12 |
| **ARIA AI** | ✅ Complete | Critical | 5 | 2 | 4 | 10 |
| **Agreement Builder** | ✅ Complete | High | 4 | 4 | 3 | 15 |
| **ClearFund** | ✅ Complete | High | 4 | 3 | 5 | 12 |
| **Schedule/TimeBridge** | ✅ Complete | High | 5 | 3 | 6 | 14 |
| **KidComs** | ✅ Complete | Medium | 4 | 2 | 4 | 11 |
| **Cubbie** | ✅ Complete | Medium | 3 | 2 | 3 | 8 |
| **My Circle** | ✅ Complete | Medium | 3 | 2 | 3 | 9 |
| **Court Portal** | ✅ Complete | High | 5 | 6 | 4 | 16 |
| **Exports** | ✅ Complete | High | 6 | 2 | 2 | 8 |
| **Notifications** | ✅ Partial | Medium | 2 | 1 | 2 | 4 |

---

## Feature Dependencies Graph

```
                              ┌─────────────────────────────────────┐
                              │         AUTHENTICATION              │
                              │  (Foundation for all features)      │
                              └──────────────┬──────────────────────┘
                                             │
                              ┌──────────────▼──────────────────────┐
                              │       CASE MANAGEMENT               │
                              │  (Container for family data)        │
                              └──────────────┬──────────────────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
     ┌────────▼────────┐          ┌──────────▼──────────┐        ┌──────────▼──────────┐
     │    CHILDREN     │          │      MESSAGING      │        │     AGREEMENTS      │
     │  (Cubbie/Child) │          │    (ARIA-powered)   │        │   (Builder/Rules)   │
     └────────┬────────┘          └──────────┬──────────┘        └──────────┬──────────┘
              │                              │                              │
              │                   ┌──────────▼──────────┐                   │
              │                   │       ARIA AI       │                   │
              │                   │  (Analysis Engine)  │───────────────────┘
              │                   └──────────┬──────────┘
              │                              │
     ┌────────▼────────┐          ┌──────────▼──────────┐        ┌──────────┐
     │    SCHEDULE     │          │     CLEARFUND       │        │ KIDCOMS  │
     │  (TimeBridge)   │          │  (Expense Tracking) │        │ (Video)  │
     └────────┬────────┘          └──────────┬──────────┘        └────┬─────┘
              │                              │                        │
     ┌────────▼────────┐                     │              ┌─────────▼─────────┐
     │    EXCHANGES    │                     │              │     MY CIRCLE     │
     │  (Check-ins)    │                     │              │ (Trusted Contacts)│
     └────────┬────────┘                     │              └───────────────────┘
              │                              │
              └──────────────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      COURT PORTAL       │
                    │  (Professional Access)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      EXPORT SYSTEM      │
                    │  (Court Documentation)  │
                    └─────────────────────────┘
```

### Dependency Rules

1. **Authentication** → Required by ALL features
2. **Case Management** → Required by all case-scoped features
3. **Children** → Required by KidComs, Cubbie, Schedule
4. **Agreements** → Informs Schedule, ClearFund split ratios
5. **ARIA** → Enhances Messaging, Agreement Builder
6. **Schedule** → Tracks Exchanges, generates Compliance
7. **All Features** → Feed into Export System

---

## Detailed Feature Documentation

### 1. Authentication & User Management

**Purpose:** Secure user identity, access control, and session management

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/core/supabase.py` | Supabase client initialization | `get_supabase_client()` |
| `app/core/security.py` | JWT handling, password hashing | `create_access_token()`, `verify_password()` |
| `app/services/auth.py` | Authentication business logic | `register_user()`, `authenticate_user()` |
| `app/api/v1/endpoints/auth.py` | REST endpoints | Login, register, refresh, logout |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/auth/register` | POST | Create new user account | No |
| `/api/v1/auth/login` | POST | Authenticate and get tokens | No |
| `/api/v1/auth/refresh` | POST | Refresh access token | Yes (refresh token) |
| `/api/v1/auth/logout` | POST | Invalidate tokens | Yes |
| `/api/v1/auth/me` | GET | Get current user profile | Yes |
| `/api/v1/auth/verify-email` | POST | Verify email address | No |
| `/api/v1/auth/forgot-password` | POST | Initiate password reset | No |
| `/api/v1/auth/reset-password` | POST | Complete password reset | No |

#### Database Tables

```sql
-- users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_id UUID UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    bio TEXT,
    timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
    locale VARCHAR(10) DEFAULT 'en_US',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US',
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_status VARCHAR(20) DEFAULT 'active',
    notification_preferences JSONB DEFAULT '{}'
);

-- refresh_tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Frontend Pages/Components

| Page/Component | Path | Purpose |
|----------------|------|---------|
| Login Page | `/login/page.tsx` | User authentication |
| Register Page | `/register/page.tsx` | New user registration |
| Auth Context | `lib/auth-context.tsx` | Global auth state management |
| Protected Route | `components/protected-route.tsx` | Route guard wrapper |

#### Configuration Options

```python
# app/core/config.py
class Settings:
    # Token settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Password requirements
    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
```

#### Known Limitations

1. **Email Verification:** Supabase requires email confirmation by default
2. **SSO Not Implemented:** No Google/Apple/Microsoft OAuth yet
3. **MFA Optional:** Two-factor auth available but not enforced
4. **Session Storage:** Tokens stored in memory (frontend refresh on reload)

---

### 2. Family Files & Case Management

**Purpose:** Core container for co-parenting relationships, children, and shared data

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/models/case.py` | Case and participant models | `Case`, `CaseParticipant` |
| `app/models/child.py` | Child information model | `Child` |
| `app/services/case.py` | Case business logic | `create_case()`, `invite_parent()` |
| `app/api/v1/endpoints/cases.py` | REST endpoints | CRUD operations |
| `app/schemas/case.py` | Request/response schemas | Validation |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/cases/` | POST | Create new case | Yes |
| `/api/v1/cases/` | GET | List user's cases | Yes |
| `/api/v1/cases/{id}` | GET | Get case details | Yes |
| `/api/v1/cases/{id}` | PUT | Update case | Yes |
| `/api/v1/cases/{id}/invite` | POST | Invite other parent | Yes |
| `/api/v1/cases/accept/{token}` | POST | Accept case invitation | Yes |
| `/api/v1/cases/{id}/children` | GET | List children in case | Yes |
| `/api/v1/cases/{id}/children` | POST | Add child to case | Yes |
| `/api/v1/cases/{id}/children/{child_id}` | PUT | Update child | Yes |
| `/api/v1/cases/{id}/children/{child_id}` | DELETE | Remove child | Yes |
| `/api/v1/cases/{id}/participants` | GET | List case participants | Yes |
| `/api/v1/cases/{id}/status` | PUT | Update case status | Yes |

#### Database Tables

```sql
-- cases table
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(100),
    case_name VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL,
    county VARCHAR(100),
    court VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, active, suspended, closed
    separation_date DATE,
    filing_date DATE,
    judgment_date DATE,
    require_joint_approval BOOLEAN DEFAULT TRUE,
    allow_modifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- case_participants table
CREATE TABLE case_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) NOT NULL,  -- petitioner, respondent
    parent_type VARCHAR(20),  -- mother, father, parent_a, parent_b
    is_active BOOLEAN DEFAULT TRUE,
    invitation_token VARCHAR(255),
    invitation_expires_at TIMESTAMP WITH TIME ZONE,
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    can_view_financials BOOLEAN DEFAULT TRUE,
    can_view_messages BOOLEAN DEFAULT TRUE,
    can_view_schedule BOOLEAN DEFAULT TRUE,
    can_edit_children BOOLEAN DEFAULT TRUE,
    UNIQUE(case_id, user_id)
);

-- children table
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    preferred_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    pronouns VARCHAR(50),
    allergies TEXT[],
    medications JSONB,
    medical_conditions TEXT[],
    pediatrician_name VARCHAR(255),
    pediatrician_phone VARCHAR(20),
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    school_name VARCHAR(255),
    grade_level VARCHAR(50),
    teacher_name VARCHAR(255),
    has_iep BOOLEAN DEFAULT FALSE,
    has_504_plan BOOLEAN DEFAULT FALSE,
    special_needs_notes TEXT,
    approved_by_a UUID REFERENCES users(id),
    approved_by_b UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- case_invitations table
CREATE TABLE case_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    inviter_id UUID REFERENCES users(id),
    invitee_email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, expired, revoked
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- case_status_history table
CREATE TABLE case_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Frontend Pages/Components

| Page/Component | Path | Purpose |
|----------------|------|---------|
| Cases List | `/cases/page.tsx` | View all user's cases |
| Case Detail | `/cases/[id]/page.tsx` | Single case view |
| New Case | `/cases/new/page.tsx` | Create case wizard |
| Accept Invite | `/cases/accept/[token]/page.tsx` | Join existing case |
| Case Card | `components/cases/case-card.tsx` | Case display component |
| Child Form | `components/cases/child-form.tsx` | Add/edit child |

#### Workflow: Case Creation & Invitation

```
┌──────────────────┐
│  Parent A        │
│  Creates Case    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Case Created    │
│  Status: Pending │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐      ┌──────────────────┐
│  Invitation      │─────→│  Email Sent      │
│  Generated       │      │  to Parent B     │
└────────┬─────────┘      └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Parent B        │
│  Clicks Link     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Token Validated │
│  Account Linked  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Case Updated    │
│  Status: Active  │
└──────────────────┘
```

#### Known Limitations

1. **Single Court Per Case:** Cannot track multi-jurisdiction cases
2. **Invitation Expiry:** Tokens expire after 7 days by default
3. **No Blended Family Support:** Case model assumes two biological parents
4. **State-Specific:** Rules don't adapt to different state requirements

---

### 3. ARIA AI System

**Purpose:** AI-powered communication mediation, sentiment analysis, and intelligent assistance

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/services/aria.py` | Main ARIA service | `analyze_message()`, `suggest_rewrite()` |
| `app/services/aria_agreement_builder.py` | Agreement assistance | `build_agreement_section()` |
| `app/services/aria_paralegal.py` | Court form help | `intake_form_assistance()` |
| `app/services/aria_quick_accord.py` | Quick agreement | `generate_quick_accord()` |
| `app/services/aria_extraction_schema.py` | Data extraction | `extract_structured_data()` |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/aria/analyze` | POST | Analyze message sentiment | Yes |
| `/api/v1/aria/suggest` | POST | Get rewrite suggestions | Yes |
| `/api/v1/aria/chat` | POST | ARIA Q&A conversation | Yes |
| `/api/v1/aria/quick-accord` | POST | Generate quick agreement | Yes |
| `/api/v1/aria/explain` | POST | Explain agreement section | Yes |
| `/api/v1/aria/intake` | POST | Paralegal intake assistance | Yes |
| `/api/v1/aria/extract` | POST | Extract structured data | Yes |
| `/api/v1/aria/settings` | GET | Get ARIA settings | Yes |
| `/api/v1/aria/settings` | PUT | Update ARIA settings | Yes |
| `/api/v1/aria/history` | GET | Get conversation history | Yes |

#### ARIA Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARIA 3-TIER ANALYSIS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Message Input                                                  │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────┐                                            │
│  │   TIER 1        │   Fast regex patterns for obvious toxicity │
│  │   Regex Layer   │   - ALL CAPS detection                     │
│  │                 │   - Profanity word list                    │
│  └────────┬────────┘   - Obvious threats                        │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │   TIER 2        │   Claude Sonnet 4 for nuanced analysis     │
│  │   Claude AI     │   - Context-aware sentiment                │
│  │                 │   - Passive-aggressive detection           │
│  └────────┬────────┘   - Rewrite suggestions                    │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │   TIER 3        │   OpenAI GPT-4 fallback                    │
│  │   OpenAI        │   - Used when Claude unavailable           │
│  │                 │   - Secondary opinion on edge cases        │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │   Result        │   Combined toxicity score and suggestions  │
│  │   Aggregation   │   - Score: 0.0 (safe) to 1.0 (toxic)       │
│  └─────────────────┘   - Categories: hostility, blame, etc.     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Tables

```sql
-- aria_conversations table
CREATE TABLE aria_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_type VARCHAR(50),  -- chat, quick_accord, intake, explain
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- aria_messages table
CREATE TABLE aria_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES aria_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- user, assistant, system
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- aria_settings table
CREATE TABLE aria_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    intervention_threshold DECIMAL(3,2) DEFAULT 0.30,
    auto_suggest BOOLEAN DEFAULT TRUE,
    block_high_toxicity BOOLEAN DEFAULT TRUE,
    allow_send_anyway BOOLEAN DEFAULT TRUE,
    track_good_faith BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- message_analysis table
CREATE TABLE message_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    toxicity_score DECIMAL(4,3),
    hostility_score DECIMAL(4,3),
    blame_score DECIMAL(4,3),
    passive_aggressive_score DECIMAL(4,3),
    profanity_score DECIMAL(4,3),
    dismissive_score DECIMAL(4,3),
    controlling_score DECIMAL(4,3),
    suggested_rewrite TEXT,
    user_action VARCHAR(20),  -- accepted, modified, rejected, sent_anyway
    analysis_model VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Toxicity Categories

| Category | Threshold | Examples | Weight |
|----------|-----------|----------|--------|
| Hostility | 0.40 | "You're pathetic", "I hate you" | 1.0 |
| Blame | 0.30 | "This is all your fault" | 0.8 |
| Passive-Aggressive | 0.30 | "I guess if you actually cared..." | 0.7 |
| Profanity | 0.50 | Explicit language | 0.6 |
| Dismissive | 0.30 | "Whatever", "I don't care" | 0.5 |
| Controlling | 0.40 | "You WILL do this", "I forbid" | 0.9 |
| All Caps | 0.20 | "YOU NEVER LISTEN" | 0.3 |

#### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| ARIA Intervention Modal | `components/messages/aria-intervention.tsx` | Show/accept suggestions |
| Message Compose | `components/messages/message-compose.tsx` | Composition with ARIA preview |
| ARIA Settings | `components/settings/aria-settings.tsx` | Configure ARIA behavior |
| Toxicity Indicator | `components/messages/toxicity-indicator.tsx` | Visual score display |

#### Configuration Options

```python
# ARIA configuration
class ARIASettings:
    # Thresholds
    INTERVENTION_THRESHOLD: float = 0.30
    BLOCK_THRESHOLD: float = 0.80

    # Models
    PRIMARY_MODEL: str = "claude-sonnet-4-20250514"
    FALLBACK_MODEL: str = "gpt-4"

    # Features
    AUTO_SUGGEST: bool = True
    ALLOW_SEND_ANYWAY: bool = True
    TRACK_GOOD_FAITH: bool = True

    # Rate limits
    MAX_ANALYSES_PER_MINUTE: int = 60
    MAX_SUGGESTIONS_PER_MESSAGE: int = 3
```

#### Known Limitations

1. **API Latency:** Claude API calls add 500-2000ms to message sending
2. **Context Window:** ARIA has limited view of conversation history
3. **False Positives:** Sometimes flags sarcasm or quotes incorrectly
4. **Language Support:** English-only sentiment analysis
5. **Cost:** AI API calls cost ~$0.003-0.01 per message

---

### 4. Agreement Builder

**Purpose:** Structured custody agreement creation with 18-section wizard

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/models/agreement.py` | Agreement models | `Agreement`, `AgreementSection`, `AgreementVersion` |
| `app/services/agreement.py` | Business logic | `create_agreement()`, `update_section()` |
| `app/api/v1/endpoints/agreements.py` | REST endpoints | CRUD + approval workflow |
| `app/services/pdf_generator.py` | PDF generation | `generate_agreement_pdf()` |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/agreements/` | POST | Create new agreement | Yes |
| `/api/v1/agreements/` | GET | List agreements for case | Yes |
| `/api/v1/agreements/{id}` | GET | Get agreement details | Yes |
| `/api/v1/agreements/{id}` | PUT | Update agreement metadata | Yes |
| `/api/v1/agreements/{id}/sections` | GET | Get all sections | Yes |
| `/api/v1/agreements/{id}/sections` | POST | Add section | Yes |
| `/api/v1/agreements/{id}/sections/{section_id}` | PUT | Update section | Yes |
| `/api/v1/agreements/{id}/approve` | POST | Submit approval | Yes |
| `/api/v1/agreements/{id}/reject` | POST | Reject agreement | Yes |
| `/api/v1/agreements/{id}/generate-pdf` | POST | Generate PDF | Yes |
| `/api/v1/agreements/{id}/download` | GET | Download PDF | Yes |
| `/api/v1/agreements/{id}/versions` | GET | Get version history | Yes |
| `/api/v1/agreements/{id}/rules` | GET | Get compiled rules | Yes |
| `/api/v1/agreements/{id}/duplicate` | POST | Clone agreement | Yes |
| `/api/v1/agreements/{id}/compare/{version_id}` | GET | Compare versions | Yes |

#### 18 Agreement Sections

| # | Section | Required | Description |
|---|---------|----------|-------------|
| 0 | Welcome | No | Introduction and instructions |
| 1 | Parent A Information | Yes | Petitioner details |
| 2 | Parent B Information | Yes | Respondent details |
| 3 | Children Information | Yes | All children details |
| 4 | Legal Custody | Yes | Decision-making authority |
| 5 | Physical Custody | Yes | Primary residence |
| 6 | Parenting Schedule | Yes | Weekly custody pattern |
| 7 | Holiday Schedule | Yes | Holiday custody allocation |
| 8 | Exchange Logistics | Yes | Pickup/dropoff details |
| 9 | Transportation | Yes | Travel cost sharing |
| 10 | Child Support | Yes | Financial support terms |
| 11 | Medical & Healthcare | Yes | Healthcare decisions |
| 12 | Education | Yes | School decisions |
| 13 | Parent Communication | Yes | How parents communicate |
| 14 | Child Communication | Yes | Child-parent contact rules |
| 15 | Travel | Yes | Vacation and travel rules |
| 16 | Relocation | Yes | Moving restrictions |
| 17 | Dispute Resolution | Yes | Conflict resolution process |
| 18 | Other Provisions | No | Custom terms |
| 19 | Review & Finalize | No | Summary and completion |

#### Database Tables

```sql
-- agreements table
CREATE TABLE agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    agreement_type VARCHAR(50) DEFAULT 'parenting_plan',
    status VARCHAR(20) DEFAULT 'draft',  -- draft, pending_approval, approved, rejected, expired
    created_by UUID REFERENCES users(id),
    approved_by_a UUID REFERENCES users(id),
    approved_by_b UUID REFERENCES users(id),
    approved_at_a TIMESTAMP WITH TIME ZONE,
    approved_at_b TIMESTAMP WITH TIME ZONE,
    effective_date DATE,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    compiled_rules JSONB,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- agreement_sections table
CREATE TABLE agreement_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID REFERENCES agreements(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL,
    section_order INTEGER NOT NULL,
    title VARCHAR(255),
    content JSONB,
    is_required BOOLEAN DEFAULT TRUE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- agreement_versions table
CREATE TABLE agreement_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID REFERENCES agreements(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    created_by UUID REFERENCES users(id),
    change_summary TEXT,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Frontend Pages/Components

| Page/Component | Path | Purpose |
|----------------|------|---------|
| Agreements List | `/agreements/page.tsx` | View all agreements |
| Agreement Detail | `/agreements/[id]/page.tsx` | Single agreement view |
| Agreement Builder | `/agreements/[id]/builder/page.tsx` | 18-section wizard |
| Section Components | `components/agreements/sections/*.tsx` | 20 section forms |
| Progress Bar | `components/agreements/progress-bar.tsx` | Wizard progress |
| Approval Button | `components/agreements/approval-button.tsx` | Dual approval UI |

#### Approval Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                    AGREEMENT APPROVAL WORKFLOW                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                 │
│  │   DRAFT     │  Parent A creates/edits agreement               │
│  │             │  Both parents can make changes                  │
│  └──────┬──────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │  PENDING    │  One parent submits for approval                │
│  │  APPROVAL   │  Locked from further edits                      │
│  └──────┬──────┘                                                 │
│         │                                                        │
│    ┌────┴────┐                                                   │
│    │         │                                                   │
│    ▼         ▼                                                   │
│  ┌─────┐  ┌─────┐                                                │
│  │ A ✓ │  │ B ✓ │  Each parent reviews and approves              │
│  └──┬──┘  └──┬──┘                                                │
│     │        │                                                   │
│     └────┬───┘                                                   │
│          │                                                       │
│     Both Approved?                                               │
│          │                                                       │
│     ┌────┴────┐                                                  │
│     │         │                                                  │
│     ▼         ▼                                                  │
│  ┌─────┐  ┌─────────┐                                            │
│  │ YES │  │   NO    │  If rejected, returns to DRAFT             │
│  └──┬──┘  └────┬────┘                                            │
│     │          │                                                 │
│     ▼          ▼                                                 │
│  ┌─────────┐  ┌─────────┐                                        │
│  │ APPROVED│  │ REJECTED│  Version created, can restart          │
│  │         │  │         │                                        │
│  └────┬────┘  └─────────┘                                        │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐                                                 │
│  │ PDF         │  Generate court-ready document                  │
│  │ Generated   │  SHA-256 hash for integrity                     │
│  └─────────────┘                                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Known Limitations

1. **State Templates:** No state-specific legal language templates
2. **Signing:** No digital signature integration (future: DocuSign)
3. **Court Filing:** No direct court e-filing integration
4. **Version Merging:** No conflict resolution for concurrent edits
5. **PDF Customization:** Limited formatting options

---

### 5. ClearFund Expense Management

**Purpose:** Transparent tracking and splitting of child-related expenses

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/models/clearfund.py` | Expense models | `Expense`, `ExpenseRequest`, `Obligation` |
| `app/services/clearfund.py` | Business logic | `create_expense()`, `calculate_split()` |
| `app/api/v1/endpoints/clearfund.py` | REST endpoints | Expense CRUD + workflow |
| `app/services/receipt_ocr.py` | Receipt scanning | `extract_receipt_data()` |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/clearfund/expenses/` | POST | Create expense request | Yes |
| `/api/v1/clearfund/expenses/` | GET | List expenses for case | Yes |
| `/api/v1/clearfund/expenses/{id}` | GET | Get expense details | Yes |
| `/api/v1/clearfund/expenses/{id}` | PUT | Update expense | Yes |
| `/api/v1/clearfund/expenses/{id}/approve` | POST | Approve expense | Yes |
| `/api/v1/clearfund/expenses/{id}/reject` | POST | Reject expense | Yes |
| `/api/v1/clearfund/balance` | GET | Get running balance | Yes |
| `/api/v1/clearfund/obligations/` | GET | List obligations | Yes |
| `/api/v1/clearfund/obligations/` | POST | Create obligation | Yes |
| `/api/v1/clearfund/ledger` | GET | Full transaction ledger | Yes |
| `/api/v1/clearfund/summary` | GET | Financial summary | Yes |
| `/api/v1/clearfund/export` | GET | Export financial report | Yes |

#### Database Tables

```sql
-- expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    submitter_id UUID REFERENCES users(id),
    category VARCHAR(50) NOT NULL,  -- medical, education, sports, clothing, etc.
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    receipt_data JSONB,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, partial
    split_percentage DECIMAL(5,2),  -- From agreement
    parent_a_share DECIMAL(10,2),
    parent_b_share DECIMAL(10,2),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- expense_categories table
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_split_percentage DECIMAL(5,2),
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_threshold DECIMAL(10,2),  -- Auto-approve below this amount
    is_active BOOLEAN DEFAULT TRUE
);

-- obligations table (recurring payments)
CREATE TABLE obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    payer_id UUID REFERENCES users(id),
    payee_id UUID REFERENCES users(id),
    obligation_type VARCHAR(50) NOT NULL,  -- child_support, alimony, medical_premium
    amount DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL,  -- weekly, biweekly, monthly
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id),
    payer_id UUID REFERENCES users(id),
    payee_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- clearfund_ledger table
CREATE TABLE clearfund_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) NOT NULL,  -- expense, payment, adjustment
    reference_id UUID,  -- Links to expense or payment
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    running_balance_a DECIMAL(10,2),
    running_balance_b DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Expense Categories

| Category | Default Split | Approval Required | Examples |
|----------|--------------|-------------------|----------|
| Medical | 50/50 | Yes (>$100) | Doctor visits, prescriptions |
| Education | 50/50 | Yes (>$200) | Tuition, supplies, tutoring |
| Extracurricular | 50/50 | Yes | Sports, music lessons |
| Clothing | 50/50 | No (<$100) | School clothes, uniforms |
| Transportation | Based on custody | No | School bus, gas |
| Childcare | 50/50 | Yes | Daycare, babysitting |
| Camp | 50/50 | Yes | Summer camp, day camp |
| Device | 50/50 | Yes | Phone, tablet, computer |
| Other | Custom | Yes | Miscellaneous |

#### Frontend Pages/Components

| Page/Component | Path | Purpose |
|----------------|------|---------|
| ClearFund Dashboard | `/clearfund/page.tsx` | Financial overview |
| Expense List | `/clearfund/expenses/page.tsx` | View all expenses |
| New Expense | `/clearfund/expenses/new/page.tsx` | Submit expense request |
| Expense Detail | `/clearfund/expenses/[id]/page.tsx` | View/approve expense |
| Balance Summary | `components/clearfund/balance-summary.tsx` | Who owes whom |
| Receipt Upload | `components/clearfund/receipt-upload.tsx` | Upload receipts |

#### Known Limitations

1. **Payment Integration:** No Stripe/PayPal for direct payments
2. **OCR Accuracy:** Receipt scanning ~85% accurate
3. **Currency:** USD only (no international support)
4. **Tax Tracking:** No tax-related categorization
5. **Disputes:** No formal dispute workflow

---

### 6. TimeBridge Scheduling

**Purpose:** Custody schedule management with compliance tracking

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/models/schedule.py` | Event models | `ScheduleEvent`, `Exchange`, `BusyPeriod` |
| `app/services/schedule.py` | Business logic | `create_event()`, `generate_from_agreement()` |
| `app/services/compliance.py` | Compliance tracking | `calculate_compliance()` |
| `app/api/v1/endpoints/schedule.py` | REST endpoints | Events, exchanges, compliance |
| `app/api/v1/endpoints/exchanges.py` | Exchange endpoints | Check-in workflow |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/schedule/events/` | POST | Create event | Yes |
| `/api/v1/schedule/events/` | GET | List events (with filters) | Yes |
| `/api/v1/schedule/events/{id}` | GET | Get event details | Yes |
| `/api/v1/schedule/events/{id}` | PUT | Update event | Yes |
| `/api/v1/schedule/events/{id}` | DELETE | Delete event | Yes |
| `/api/v1/schedule/calendar` | GET | Calendar view data | Yes |
| `/api/v1/exchanges/` | GET | List exchanges | Yes |
| `/api/v1/exchanges/{id}/checkin` | POST | Check-in to exchange | Yes |
| `/api/v1/exchanges/{id}/complete` | POST | Complete exchange | Yes |
| `/api/v1/exchanges/{id}/cancel` | POST | Cancel exchange | Yes |
| `/api/v1/schedule/busy-periods` | GET | Get busy periods | Yes |
| `/api/v1/schedule/busy-periods` | POST | Create busy period | Yes |
| `/api/v1/schedule/compliance` | GET | Get compliance metrics | Yes |
| `/api/v1/schedule/generate` | POST | Generate from agreement | Yes |

#### Database Tables

```sql
-- schedule_events table
CREATE TABLE schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    event_type VARCHAR(50) NOT NULL,  -- regular, holiday, vacation, makeup
    title VARCHAR(255) NOT NULL,
    description TEXT,
    responsible_parent_id UUID REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    location TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,  -- iCal RRULE format
    recurrence_end DATE,
    color VARCHAR(20),
    category VARCHAR(50),  -- medical, school, sports, exchange
    status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, completed, cancelled, missed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- custody_exchanges table
CREATE TABLE custody_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    schedule_event_id UUID REFERENCES schedule_events(id),
    dropoff_parent_id UUID REFERENCES users(id),
    pickup_parent_id UUID REFERENCES users(id),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    location_type VARCHAR(50),  -- home_a, home_b, school, neutral, other
    exchange_type VARCHAR(50) DEFAULT 'standard',  -- standard, silent_handoff
    status VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- exchange_checkins table
CREATE TABLE exchange_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES custody_exchanges(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES users(id),
    checkin_type VARCHAR(20) NOT NULL,  -- dropoff, pickup
    scheduled_time TIMESTAMP WITH TIME ZONE,
    actual_time TIMESTAMP WITH TIME ZONE NOT NULL,
    gps_latitude DECIMAL(10,8),
    gps_longitude DECIMAL(11,8),
    gps_accuracy DECIMAL(10,2),
    was_on_time BOOLEAN,
    grace_period_used BOOLEAN DEFAULT FALSE,
    minutes_late INTEGER,
    notes TEXT,
    verified BOOLEAN DEFAULT FALSE,
    qr_code_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- busy_periods table
CREATE TABLE busy_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    visibility VARCHAR(20) DEFAULT 'private',  -- private, shared
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- my_time_collections table
CREATE TABLE my_time_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- time_blocks table
CREATE TABLE time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES my_time_collections(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Compliance Metrics

| Metric | Calculation | Good | Warning | Poor |
|--------|-------------|------|---------|------|
| On-Time Rate | Exchanges on time / Total exchanges | >90% | 70-90% | <70% |
| Grace Period Usage | Exchanges using grace / Total | <10% | 10-30% | >30% |
| Cancellation Rate | Cancelled / Scheduled | <5% | 5-15% | >15% |
| No-Show Rate | Missed / Scheduled | 0% | <5% | >5% |

#### Frontend Pages/Components

| Page/Component | Path | Purpose |
|----------------|------|---------|
| Schedule Calendar | `/schedule/page.tsx` | Calendar view |
| Event Detail | `/schedule/events/[id]/page.tsx` | Event details |
| New Event | `/schedule/events/new/page.tsx` | Create event |
| Exchange Check-in | `/schedule/exchanges/[id]/page.tsx` | Check-in flow |
| Compliance Dashboard | `/schedule/compliance/page.tsx` | Metrics display |
| Calendar View | `components/schedule/calendar-view.tsx` | Month/week calendar |
| Exchange Card | `components/schedule/exchange-card.tsx` | Exchange display |

#### Known Limitations

1. **Timezone Handling:** All times stored as UTC, display converts
2. **Calendar Sync:** No Google/Outlook sync yet
3. **GPS Accuracy:** Depends on device, requires permission
4. **Silent Handoff:** QR verification requires both apps open
5. **Recurring Events:** Complex patterns may need manual adjustment

---

### 7. KidComs Video Communication

**Purpose:** Monitored video calls between children and parents/approved contacts

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/models/kidcoms.py` | Call models | `KidComsSession`, `KidComsParticipant` |
| `app/services/kidcoms.py` | Business logic | `create_session()`, `join_call()` |
| `app/services/daily_video.py` | Daily.co integration | `create_room()`, `get_token()` |
| `app/api/v1/endpoints/kidcoms.py` | REST endpoints | Call management |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/kidcoms/sessions/` | POST | Create call session | Yes |
| `/api/v1/kidcoms/sessions/` | GET | List sessions | Yes |
| `/api/v1/kidcoms/sessions/{id}` | GET | Get session details | Yes |
| `/api/v1/kidcoms/sessions/{id}/join` | POST | Join call | Yes |
| `/api/v1/kidcoms/sessions/{id}/end` | POST | End call | Yes |
| `/api/v1/kidcoms/sessions/{id}/invite` | POST | Invite participant | Yes |
| `/api/v1/kidcoms/token` | GET | Get Daily.co token | Yes |
| `/api/v1/kidcoms/settings` | GET | Get KidComs settings | Yes |
| `/api/v1/kidcoms/settings` | PUT | Update settings | Yes |
| `/api/v1/kidcoms/recordings` | GET | List recordings | Yes |
| `/api/v1/kidcoms/recordings/{id}` | GET | Get recording | Yes |

#### Database Tables

```sql
-- kidcoms_sessions table
CREATE TABLE kidcoms_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    initiated_by UUID REFERENCES users(id),
    session_type VARCHAR(50) DEFAULT 'video',  -- video, audio_only
    status VARCHAR(20) DEFAULT 'pending',  -- pending, active, completed, cancelled
    scheduled_time TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    daily_room_name VARCHAR(255),
    daily_room_url TEXT,
    recording_enabled BOOLEAN DEFAULT FALSE,
    recording_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- kidcoms_participants table
CREATE TABLE kidcoms_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES kidcoms_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    circle_contact_id UUID REFERENCES my_circle_contacts(id),
    participant_type VARCHAR(20) NOT NULL,  -- parent, child, circle_contact
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    was_present BOOLEAN DEFAULT FALSE,
    connection_quality VARCHAR(20)  -- excellent, good, fair, poor
);

-- kidcoms_settings table
CREATE TABLE kidcoms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    enabled BOOLEAN DEFAULT TRUE,
    require_scheduling BOOLEAN DEFAULT FALSE,
    max_call_duration INTEGER DEFAULT 30,  -- minutes
    allow_recording BOOLEAN DEFAULT FALSE,
    allowed_hours_start TIME DEFAULT '08:00',
    allowed_hours_end TIME DEFAULT '20:00',
    blocked_dates DATE[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- kidcoms_blocked_users table
CREATE TABLE kidcoms_blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    blocked_user_id UUID REFERENCES users(id),
    blocked_by UUID REFERENCES users(id),
    reason TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Daily.co Integration

```python
# app/services/daily_video.py

class DailyVideoService:
    def __init__(self):
        self.api_key = settings.DAILY_API_KEY
        self.base_url = "https://api.daily.co/v1"

    async def create_room(self, session_id: str) -> dict:
        """Create a Daily.co room for the session"""
        room_name = f"cg-{session_id[:8]}"
        response = await self.client.post(
            f"{self.base_url}/rooms",
            json={
                "name": room_name,
                "properties": {
                    "max_participants": 10,
                    "enable_recording": True,
                    "enable_chat": False,  # Messages go through ARIA
                    "exp": int((datetime.utcnow() + timedelta(hours=2)).timestamp())
                }
            },
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        return response.json()

    async def get_meeting_token(
        self,
        room_name: str,
        user_id: str,
        is_owner: bool = False
    ) -> str:
        """Get a meeting token for a participant"""
        response = await self.client.post(
            f"{self.base_url}/meeting-tokens",
            json={
                "properties": {
                    "room_name": room_name,
                    "user_id": str(user_id),
                    "is_owner": is_owner,
                    "enable_recording_ui": False,
                    "exp": int((datetime.utcnow() + timedelta(hours=2)).timestamp())
                }
            },
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        return response.json()["token"]
```

#### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| KidComs Page | `/kidcoms/page.tsx` | Call list and initiation |
| Video Call | `/kidcoms/call/[id]/page.tsx` | Active call interface |
| Daily Embed | `components/kidcoms/daily-embed.tsx` | Daily.co video component |
| Call Controls | `components/kidcoms/call-controls.tsx` | Mute, end, etc. |

#### Known Limitations

1. **Daily.co Dependency:** Requires Daily.co account and API key
2. **Browser Support:** Works best in Chrome/Firefox, Safari has issues
3. **Mobile:** No native mobile app, web-only
4. **Recording Storage:** Recordings stored in Daily.co, not self-hosted
5. **Bandwidth:** Requires stable internet connection

---

### 8. Cubbie Child Profiles

**Purpose:** Comprehensive digital backpack for each child's information

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/models/cubbie.py` | Cubbie models | `CubbieItem`, `CubbieCategory` |
| `app/services/cubbie.py` | Business logic | `add_item()`, `get_handoff_list()` |
| `app/api/v1/endpoints/cubbie.py` | REST endpoints | Item CRUD |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/cubbie/{child_id}` | GET | Get child's Cubbie | Yes |
| `/api/v1/cubbie/{child_id}/items` | GET | List all items | Yes |
| `/api/v1/cubbie/{child_id}/items` | POST | Add item | Yes |
| `/api/v1/cubbie/{child_id}/items/{id}` | PUT | Update item | Yes |
| `/api/v1/cubbie/{child_id}/items/{id}` | DELETE | Delete item | Yes |
| `/api/v1/cubbie/{child_id}/categories` | GET | List categories | Yes |
| `/api/v1/cubbie/{child_id}/handoff` | GET | Get handoff list | Yes |
| `/api/v1/cubbie/{child_id}/handoff` | PUT | Update handoff list | Yes |

#### Database Tables

```sql
-- cubbie_categories table
CREATE TABLE cubbie_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT TRUE
);

-- cubbie_items table
CREATE TABLE cubbie_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    category_id UUID REFERENCES cubbie_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    photo_url TEXT,
    is_essential BOOLEAN DEFAULT FALSE,
    include_in_handoff BOOLEAN DEFAULT FALSE,
    notes TEXT,
    expires_at DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- cubbie_handoff_lists table
CREATE TABLE cubbie_handoff_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'Standard Handoff',
    items UUID[] NOT NULL,  -- Array of cubbie_item IDs
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Default Categories

| Category | Icon | Description |
|----------|------|-------------|
| Medical | 🏥 | Medications, allergies, health info |
| Educational | 📚 | School supplies, homework, schedules |
| Clothing | 👕 | Clothes, sizes, special outfits |
| Comfort | 🧸 | Favorite toys, blankets, etc. |
| Activities | ⚽ | Sports gear, instruments, supplies |
| Documents | 📄 | ID, passport, insurance cards |
| Emergency | 🚨 | Emergency contacts, medical info |

#### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| Cubbie Dashboard | `/cubbie/[child_id]/page.tsx` | Child's full profile |
| Category View | `components/cubbie/category-view.tsx` | Items by category |
| Item Card | `components/cubbie/item-card.tsx` | Single item display |
| Handoff Checklist | `components/cubbie/handoff-checklist.tsx` | Exchange list |

#### Known Limitations

1. **Photo Storage:** Limited to 5MB per photo
2. **Medical Integration:** No direct EHR integration
3. **School Sync:** No API connection to school systems
4. **Inventory Tracking:** Manual updates required
5. **Expiration Alerts:** No automatic notifications for expired items

---

### 9. My Circle Contact Network

**Purpose:** Manage trusted family members and friends who can interact with children

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/models/my_circle.py` | Circle models | `CircleContact`, `CircleInvitation` |
| `app/services/my_circle.py` | Business logic | `invite_contact()`, `verify_access()` |
| `app/api/v1/endpoints/my_circle.py` | REST endpoints | Contact management |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/my-circle/` | GET | List circle contacts | Yes |
| `/api/v1/my-circle/` | POST | Add/invite contact | Yes |
| `/api/v1/my-circle/{id}` | GET | Get contact details | Yes |
| `/api/v1/my-circle/{id}` | PUT | Update contact | Yes |
| `/api/v1/my-circle/{id}` | DELETE | Remove contact | Yes |
| `/api/v1/my-circle/{id}/permissions` | PUT | Update permissions | Yes |
| `/api/v1/my-circle/invitations/{token}` | GET | Get invitation details | No |
| `/api/v1/my-circle/invitations/{token}/accept` | POST | Accept invitation | Yes |
| `/api/v1/my-circle/children-access` | GET | Get child access list | Yes |

#### Database Tables

```sql
-- my_circle_contacts table
CREATE TABLE my_circle_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id),
    user_id UUID REFERENCES users(id),  -- If they have an account
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    relationship VARCHAR(100),  -- grandparent, aunt, family friend, etc.
    permission_level VARCHAR(20) DEFAULT 'contact',  -- contact, emergency, full
    can_use_kidcoms BOOLEAN DEFAULT FALSE,
    can_view_schedule BOOLEAN DEFAULT FALSE,
    can_view_cubbie BOOLEAN DEFAULT FALSE,
    approved_by_both BOOLEAN DEFAULT FALSE,
    approved_by_a UUID REFERENCES users(id),
    approved_by_b UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- circle_invitations table
CREATE TABLE circle_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES my_circle_contacts(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- circle_child_access table
CREATE TABLE circle_child_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES my_circle_contacts(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    can_call BOOLEAN DEFAULT FALSE,
    can_message BOOLEAN DEFAULT FALSE,
    approved_by_a BOOLEAN DEFAULT FALSE,
    approved_by_b BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, child_id)
);
```

#### Permission Levels

| Level | Description | Capabilities |
|-------|-------------|--------------|
| **Contact** | Basic contact info only | View in emergency list |
| **Emergency** | Emergency contact access | Receive alerts, pickup authorization |
| **Full** | Complete access | KidComs, schedule view, Cubbie view |

#### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| My Circle Page | `/my-circle/page.tsx` | Contact list |
| Add Contact | `/my-circle/new/page.tsx` | Invite form |
| Contact Detail | `/my-circle/[id]/page.tsx` | View/edit contact |
| Permission Editor | `components/my-circle/permission-editor.tsx` | Set permissions |

#### Known Limitations

1. **Dual Approval:** Both parents must approve for full access
2. **No Background Checks:** No verification of contact identity
3. **Invitation Expiry:** Invitations expire after 30 days
4. **Limited to Case:** Contacts are case-specific, not user-wide
5. **No Group Management:** Cannot create contact groups

---

### 10. Court Portal

**Purpose:** Professional access portal for GALs, attorneys, mediators, and court staff

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/models/court_portal.py` | Access models | `LegalAccess`, `CourtEvent` |
| `app/services/court_portal.py` | Business logic | `grant_access()`, `generate_export()` |
| `app/api/v1/endpoints/court.py` | REST endpoints | Portal operations |
| `app/services/court_forms.py` | Form generation | `generate_fl300()`, `generate_fl311()` |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/court/cases` | GET | List accessible cases | Yes (Legal) |
| `/api/v1/court/cases/{id}` | GET | Get case overview | Yes (Legal) |
| `/api/v1/court/cases/{id}/messages` | GET | View messages | Yes (Legal) |
| `/api/v1/court/cases/{id}/agreements` | GET | View agreements | Yes (Legal) |
| `/api/v1/court/cases/{id}/schedule` | GET | View schedule | Yes (Legal) |
| `/api/v1/court/cases/{id}/compliance` | GET | View compliance | Yes (Legal) |
| `/api/v1/court/cases/{id}/financials` | GET | View financials | Yes (Legal) |
| `/api/v1/court/cases/{id}/export` | POST | Generate export | Yes (Legal) |
| `/api/v1/court/events` | GET | List court events | Yes (Legal) |
| `/api/v1/court/events` | POST | Create court event | Yes (Legal) |
| `/api/v1/court/forms/{form_type}` | POST | Generate court form | Yes (Legal) |
| `/api/v1/court/access` | GET | List granted access | Yes |
| `/api/v1/court/access` | POST | Grant professional access | Yes |
| `/api/v1/court/access/{id}` | DELETE | Revoke access | Yes |
| `/api/v1/court/intake` | POST | Submit intake form | No |
| `/api/v1/court/analytics` | GET | Get case analytics | Yes (Legal) |

#### Database Tables

```sql
-- legal_access table
CREATE TABLE legal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    professional_email VARCHAR(255) NOT NULL,
    professional_name VARCHAR(255),
    role VARCHAR(50) NOT NULL,  -- gal, attorney_petitioner, attorney_respondent, mediator, court_clerk
    organization VARCHAR(255),
    bar_number VARCHAR(100),
    granted_by UUID REFERENCES users(id),
    access_level VARCHAR(20) DEFAULT 'read',  -- read, read_write, export
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    verification_status VARCHAR(20) DEFAULT 'pending',  -- pending, verified, rejected
    verification_notes TEXT,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- legal_access_log table
CREATE TABLE legal_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_id UUID REFERENCES legal_access(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,  -- login, view_messages, view_schedule, export, etc.
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- court_events table
CREATE TABLE court_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,  -- hearing, mediation, conference, filing_deadline
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    virtual_link TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    petitioner_required BOOLEAN DEFAULT FALSE,
    respondent_required BOOLEAN DEFAULT FALSE,
    attorney_required BOOLEAN DEFAULT FALSE,
    documents_required TEXT[],
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- court_forms table
CREATE TABLE court_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    form_type VARCHAR(50) NOT NULL,  -- FL-300, FL-311, FL-341, etc.
    form_name VARCHAR(255),
    generated_by UUID REFERENCES users(id),
    data JSONB NOT NULL,
    pdf_url TEXT,
    status VARCHAR(20) DEFAULT 'draft',  -- draft, final, filed
    filed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Professional Roles

| Role | Access Duration | Permissions |
|------|-----------------|-------------|
| **GAL** | 120 days (renewable) | Full read, exports, child interviews |
| **Attorney (Pet.)** | 90 days | Client-side messages, agreements, financials |
| **Attorney (Resp.)** | 90 days | Client-side messages, agreements, financials |
| **Mediator** | 60 days | Messages, agreements, dispute history |
| **Court Clerk** | 30 days | Case status, forms, compliance |
| **Judge** | Case duration | Everything, read-only |

#### Court Forms Supported

| Form | State | Purpose |
|------|-------|---------|
| FL-300 | CA | Request for Order |
| FL-311 | CA | Child Custody Agreement |
| FL-341 | CA | Child Custody Information |
| FL-355 | CA | Schedule of Assets and Debts |

#### Frontend Pages/Components

| Page/Component | Path | Purpose |
|----------------|------|---------|
| Court Login | `/court-portal/login/page.tsx` | Professional auth |
| Dashboard | `/court-portal/page.tsx` | Case overview |
| Case Detail | `/court-portal/cases/[id]/page.tsx` | Full case view |
| Messages | `/court-portal/cases/[id]/messages/page.tsx` | Read-only messages |
| Events | `/court-portal/cases/[id]/events/page.tsx` | Court calendar |
| Export | `/court-portal/cases/[id]/export/page.tsx` | Generate packages |

#### Known Limitations

1. **State Coverage:** Only California forms currently
2. **E-Filing:** No direct court system integration
3. **Verification:** Manual bar number verification
4. **Access Tracking:** Limited to our platform
5. **Real-Time Updates:** No push notifications

---

### 11. Export System

**Purpose:** Generate court-ready evidence packages with integrity verification

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/services/export/generator.py` | Main export orchestrator | `generate_export()` |
| `app/services/export/pdf_builder.py` | PDF creation | `build_pdf()` |
| `app/services/export/integrity.py` | Hash verification | `generate_hash()` |
| `app/api/v1/endpoints/exports.py` | REST endpoints | Export operations |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/exports/` | POST | Create export | Yes |
| `/api/v1/exports/` | GET | List exports | Yes |
| `/api/v1/exports/{id}` | GET | Get export details | Yes |
| `/api/v1/exports/{id}/download` | GET | Download export | Yes |
| `/api/v1/exports/{id}/verify` | POST | Verify integrity | Yes |
| `/api/v1/exports/templates` | GET | List templates | Yes |
| `/api/v1/exports/preview` | POST | Preview export | Yes |
| `/api/v1/exports/{id}/share` | POST | Generate share link | Yes |

#### Export Types

| Type | Contents | Use Case |
|------|----------|----------|
| **Communication Log** | All messages with metadata | Discovery, evidence |
| **Compliance Report** | Schedule adherence data | Custody modification |
| **Financial Summary** | Expense and payment history | Support disputes |
| **Agreement Package** | All agreement versions | Court filing |
| **Full Case Export** | Everything | GAL investigation |
| **GPS Verification** | Exchange location data | Compliance proof |
| **Custom** | User-selected sections | Specific needs |

#### Database Tables

```sql
-- exports table
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    generated_by UUID REFERENCES users(id),
    date_range_start DATE,
    date_range_end DATE,
    sections_included TEXT[],
    redactions_applied TEXT[],
    include_metadata BOOLEAN DEFAULT TRUE,
    include_analytics BOOLEAN DEFAULT FALSE,
    file_url TEXT,
    file_size_bytes BIGINT,
    file_hash VARCHAR(64),  -- SHA-256
    hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',
    status VARCHAR(20) DEFAULT 'processing',  -- processing, completed, failed
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- export_access_log table
CREATE TABLE export_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_id UUID REFERENCES exports(id) ON DELETE CASCADE,
    accessed_by UUID REFERENCES users(id),
    access_type VARCHAR(20) NOT NULL,  -- view, download, verify
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Export Format

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPORT PACKAGE FORMAT                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  export_{case_id}_{timestamp}.zip                           │
│  │                                                          │
│  ├── manifest.json           # Export metadata              │
│  │   {                                                      │
│  │     "export_id": "...",                                  │
│  │     "case_id": "...",                                    │
│  │     "generated_at": "2026-01-10T...",                    │
│  │     "generated_by": "...",                               │
│  │     "date_range": {...},                                 │
│  │     "sections": [...],                                   │
│  │     "integrity_hash": "SHA256:abc123..."                 │
│  │   }                                                      │
│  │                                                          │
│  ├── communications/                                        │
│  │   ├── messages.pdf         # Formatted message log       │
│  │   ├── messages.csv         # Raw data                    │
│  │   └── analysis_summary.pdf # ARIA metrics                │
│  │                                                          │
│  ├── schedule/                                              │
│  │   ├── calendar.pdf         # Visual calendar             │
│  │   ├── exchanges.csv        # Exchange data               │
│  │   └── compliance.pdf       # Compliance report           │
│  │                                                          │
│  ├── financial/                                             │
│  │   ├── expenses.pdf         # Expense summary             │
│  │   ├── ledger.csv           # Transaction ledger          │
│  │   └── balance_history.pdf  # Balance over time           │
│  │                                                          │
│  ├── agreements/                                            │
│  │   ├── current_agreement.pdf # Active agreement           │
│  │   └── version_history/     # All versions                │
│  │                                                          │
│  ├── verification/                                          │
│  │   ├── checksums.txt        # File checksums              │
│  │   └── certificate.pdf      # Integrity certificate       │
│  │                                                          │
│  └── README.txt               # How to verify               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Integrity Verification

```python
# app/services/export/integrity.py

import hashlib
from typing import BinaryIO

def generate_file_hash(file: BinaryIO) -> str:
    """Generate SHA-256 hash of file contents"""
    sha256 = hashlib.sha256()
    for chunk in iter(lambda: file.read(8192), b""):
        sha256.update(chunk)
    return sha256.hexdigest()

def verify_export_integrity(export_id: str, provided_hash: str) -> bool:
    """Verify export file matches stored hash"""
    export = get_export(export_id)
    file = get_export_file(export.file_url)
    computed_hash = generate_file_hash(file)
    return computed_hash == export.file_hash == provided_hash
```

#### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| Export Wizard | `/exports/new/page.tsx` | Create export |
| Export List | `/exports/page.tsx` | View exports |
| Export Detail | `/exports/[id]/page.tsx` | View/download |
| Verification | `components/exports/verification.tsx` | Verify integrity |

#### Known Limitations

1. **File Size:** Max 500MB per export
2. **Processing Time:** Large exports take 5-10 minutes
3. **Storage:** Exports expire after 90 days
4. **Redaction:** Manual redaction of sensitive info
5. **Formatting:** PDF layout may vary with content length

---

### 12. Notification System

**Purpose:** Email and in-app notifications for system events

#### Backend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/services/notifications.py` | Notification logic | `send_notification()` |
| `app/services/email.py` | SendGrid integration | `send_email()` |
| `app/api/v1/endpoints/notifications.py` | REST endpoints | Notification management |

#### API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/notifications/` | GET | List notifications | Yes |
| `/api/v1/notifications/{id}/read` | PUT | Mark as read | Yes |
| `/api/v1/notifications/preferences` | GET | Get preferences | Yes |
| `/api/v1/notifications/preferences` | PUT | Update preferences | Yes |

#### Notification Types

| Type | Trigger | Channels | Priority |
|------|---------|----------|----------|
| Case Invitation | New case invite | Email, In-app | High |
| Invitation Accepted | Other parent joins | Email, In-app | Medium |
| New Message | Message received | In-app | Medium |
| ARIA Intervention | High toxicity | In-app | High |
| Agreement Update | Section changed | Email, In-app | Medium |
| Agreement Approval | Waiting for approval | Email, In-app | High |
| Expense Request | New expense | In-app | Medium |
| Exchange Reminder | 24h before exchange | Email, Push | High |
| Exchange Check-in | Other parent checked in | Push | Medium |
| Court Event | Upcoming hearing | Email, In-app | High |
| Export Ready | Export completed | Email | Low |
| KidComs Call | Incoming call | Push | High |

#### Database Tables

```sql
-- notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- notification_preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    UNIQUE(user_id, notification_type)
);
```

#### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| Notification Bell | `components/layout/notification-bell.tsx` | Header indicator |
| Notification List | `components/notifications/notification-list.tsx` | Dropdown list |
| Preferences | `/settings/notifications/page.tsx` | Settings page |

#### Known Limitations

1. **Push Notifications:** Not implemented (future)
2. **SMS:** Not implemented (future)
3. **Digest Mode:** No daily/weekly digest option
4. **Timezone:** Quiet hours use user's local time
5. **Rate Limiting:** No throttling for notification storms

---

## Feature Integration Points

### Cross-Feature Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEATURE INTEGRATION MAP                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AGREEMENTS ─────────────────────────────────────────────────┐  │
│       │                                                      │  │
│       ├───→ SCHEDULE (Generates events from rules)          │  │
│       │                                                      │  │
│       ├───→ CLEARFUND (Defines split percentages)           │  │
│       │                                                      │  │
│       └───→ ARIA (Compiles rules for Q&A)                   │  │
│                                                              │  │
│  MESSAGES ───────────────────────────────────────────────────┤  │
│       │                                                      │  │
│       └───→ ARIA (All messages analyzed)                    │  │
│                                                              │  │
│  SCHEDULE ───────────────────────────────────────────────────┤  │
│       │                                                      │  │
│       ├───→ EXCHANGES (Creates exchange events)              │  │
│       │                                                      │  │
│       └───→ COMPLIANCE (Tracks on-time performance)          │  │
│                                                              │  │
│  EXCHANGES ──────────────────────────────────────────────────┤  │
│       │                                                      │  │
│       └───→ CUBBIE (Handoff list for exchange)              │  │
│                                                              │  │
│  KIDCOMS ────────────────────────────────────────────────────┤  │
│       │                                                      │  │
│       └───→ MY CIRCLE (Approved contacts can join)          │  │
│                                                              │  │
│  ALL FEATURES ───────────────────────────────────────────────┤  │
│       │                                                      │  │
│       └───→ EXPORTS (All data exportable)                   │  │
│                                                              │  │
│       └───→ COURT PORTAL (Professional access)              │  │
│                                                              │  │
│       └───→ AUDIT LOGS (All actions logged)                 │  │
│                                                              │  │
└─────────────────────────────────────────────────────────────────┘
```

### Shared Services

| Service | Used By | Purpose |
|---------|---------|---------|
| `app/services/audit.py` | All features | Audit logging |
| `app/services/permissions.py` | All features | Access control |
| `app/services/notifications.py` | All features | User notifications |
| `app/core/database.py` | All features | Database connections |
| `app/core/security.py` | All features | Authentication |

---

## Configuration Options

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Authentication
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
ARIA_PRIMARY_MODEL=claude-sonnet-4-20250514
ARIA_FALLBACK_MODEL=gpt-4

# Video (KidComs)
DAILY_API_KEY=your-daily-key
DAILY_DOMAIN=your-domain.daily.co

# Email
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@commonground.app

# Storage
STORAGE_BUCKET=commonground-files
MAX_UPLOAD_SIZE_MB=50

# Features
FEATURE_KIDCOMS_ENABLED=true
FEATURE_CLEARFUND_ENABLED=true
FEATURE_EXPORTS_ENABLED=true
```

### Per-Case Configuration

| Setting | Location | Default |
|---------|----------|---------|
| ARIA Enabled | `aria_settings.enabled` | true |
| Intervention Threshold | `aria_settings.intervention_threshold` | 0.30 |
| Allow Send Anyway | `aria_settings.allow_send_anyway` | true |
| Joint Approval Required | `cases.require_joint_approval` | true |
| Grace Period (minutes) | Per agreement | 15 |
| Expense Auto-Approve Limit | Per category | $100 |

---

## Known Limitations

### Platform-Wide

| Limitation | Impact | Workaround | Future Fix |
|------------|--------|------------|------------|
| English only | Non-English speakers | Manual translation | i18n (Q3 2026) |
| Web-only | Mobile users | Responsive design | Native apps (Q4 2026) |
| US states only | International users | Manual adaptation | International (2027) |
| Single timezone per user | Traveling users | Manual adjust | Multi-timezone (Q2 2026) |

### Technical Debt

| Area | Issue | Priority | Target Fix |
|------|-------|----------|------------|
| Testing | 75% coverage | High | Q1 2026 |
| Caching | No Redis implementation | Medium | Q2 2026 |
| Search | Basic SQL LIKE | Low | Elasticsearch (2027) |
| Real-time | Polling, no WebSocket | Medium | Q2 2026 |

### Scale Considerations

| Threshold | Current Limit | Mitigation |
|-----------|---------------|------------|
| Users per case | 2 parents + unlimited professionals | By design |
| Children per case | 20 | Soft limit |
| Messages per case | 100,000 | Archive after 2 years |
| Exports per month | 50 | Rate limiting |
| API calls per minute | 100 per user | Rate limiting |

---

## Document Index

This feature breakdown is part of the comprehensive documentation suite:

| Document | Location | Purpose |
|----------|----------|---------|
| OVERVIEW.md | `/docs/architecture/` | Executive summary |
| TECHNICAL_STACK.md | `/docs/architecture/` | Technology details |
| SYSTEM_ARCHITECTURE.md | `/docs/architecture/` | Component diagrams |
| **FEATURES_BREAKDOWN.md** | `/docs/architecture/` | This document |
| API_REFERENCE.md | `/docs/api/` | Endpoint documentation |
| SCHEMA.md | `/docs/database/` | Database schema |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
