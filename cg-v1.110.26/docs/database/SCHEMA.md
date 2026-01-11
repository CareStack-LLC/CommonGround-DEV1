# CommonGround V1 - Complete Database Schema

**Last Updated:** January 10, 2026
**Version:** 1.0.0
**Database:** PostgreSQL 15
**ORM:** SQLAlchemy 2.0 (Async)

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Schema by Module](#schema-by-module)
   - [Core Tables](#core-tables)
   - [Case Management](#case-management)
   - [Messaging & ARIA](#messaging--aria)
   - [Agreements](#agreements)
   - [ClearFund (Finance)](#clearfund-finance)
   - [Schedule & Exchanges](#schedule--exchanges)
   - [KidComs (Video)](#kidcoms-video)
   - [Cubbie (Child Items)](#cubbie-child-items)
   - [My Circle](#my-circle)
   - [Court Portal](#court-portal)
   - [Exports](#exports)
   - [Audit & Logging](#audit--logging)
4. [Indexes](#indexes)
5. [Constraints](#constraints)
6. [Migration History](#migration-history)
7. [Common Queries](#common-queries)

---

## Overview

### Database Statistics

| Metric | Count |
|--------|-------|
| Total Tables | 35 |
| Core Tables | 5 |
| Feature Tables | 25 |
| Audit Tables | 5 |
| Total Columns | ~350 |
| Foreign Keys | ~50 |
| Indexes | ~40 |

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `cases`, `users` |
| Columns | snake_case | `first_name`, `created_at` |
| Primary Keys | `id` (UUID) | `id UUID PRIMARY KEY` |
| Foreign Keys | `{table}_id` | `case_id`, `user_id` |
| Timestamps | `{action}_at` | `created_at`, `updated_at` |
| Booleans | `is_` or `has_` prefix | `is_active`, `has_iep` |

### Common Column Types

```sql
-- UUID for all primary keys
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Timestamps with timezone
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- Soft delete pattern
is_active BOOLEAN DEFAULT TRUE
deleted_at TIMESTAMP WITH TIME ZONE

-- Status enums as VARCHAR
status VARCHAR(20) DEFAULT 'pending'
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         COMMONGROUND DATABASE ERD                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────┐                                                                       │
│  │  USERS   │ ◀────────────────────────────────────────────┐                        │
│  │          │                                              │                        │
│  └────┬─────┘                                              │                        │
│       │                                                    │                        │
│       │ 1:1                                                │                        │
│       ▼                                                    │                        │
│  ┌──────────────┐                                          │                        │
│  │USER_PROFILES │                                          │                        │
│  └──────────────┘                                          │                        │
│       │                                                    │                        │
│       │ 1:N                                                │                        │
│       ▼                                                    │                        │
│  ┌───────────────────┐      1:N      ┌─────────────┐       │                        │
│  │ CASE_PARTICIPANTS │ ◀────────────▶│   CASES     │       │                        │
│  └───────────────────┘               └──────┬──────┘       │                        │
│                                             │              │                        │
│                 ┌───────────────────────────┼──────────────┼────────────────┐       │
│                 │                           │              │                │       │
│                 ▼                           ▼              ▼                ▼       │
│  ┌──────────────────┐    ┌──────────────┐  ┌───────────┐  ┌────────────────┐       │
│  │    CHILDREN      │    │  AGREEMENTS  │  │ MESSAGES  │  │ SCHEDULE_EVENTS│       │
│  └────────┬─────────┘    └──────┬───────┘  └─────┬─────┘  └───────┬────────┘       │
│           │                     │                │                │                │
│           │                     ▼                ▼                ▼                │
│           │         ┌───────────────────┐ ┌────────────┐ ┌────────────────┐        │
│           │         │AGREEMENT_SECTIONS │ │MESSAGE_    │ │CUSTODY_        │        │
│           │         └───────────────────┘ │FLAGS       │ │EXCHANGES       │        │
│           │                               └────────────┘ └───────┬────────┘        │
│           │                                                      │                 │
│           │                                                      ▼                 │
│           │                                              ┌────────────────┐        │
│           │                                              │EXCHANGE_       │        │
│           │                                              │CHECKINS        │        │
│           │                                              └────────────────┘        │
│           │                                                                        │
│           │         ┌─────────────────────────────────────────────────┐            │
│           │         │                                                 │            │
│           ▼         ▼                                                 ▼            │
│  ┌──────────────┐  ┌─────────────────┐                    ┌───────────────────┐   │
│  │CUBBIE_ITEMS  │  │KIDCOMS_SESSIONS │                    │    EXPENSES       │   │
│  └──────────────┘  └─────────────────┘                    └───────────────────┘   │
│                                                                                    │
│  ┌───────────────────────────────────────────────────────────────────────────┐    │
│  │                          AUDIT & LOGGING                                   │    │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐                  │    │
│  │  │ AUDIT_LOGS   │  │ EVENT_LOGS    │  │ LEGAL_ACCESS_LOG│                  │    │
│  │  └──────────────┘  └───────────────┘  └─────────────────┘                  │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Schema by Module

### Core Tables

#### users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_id UUID UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_supabase_id ON users(supabase_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| supabase_id | UUID | Yes | - | Links to Supabase Auth |
| email | VARCHAR(255) | No | - | User email (unique) |
| email_verified | BOOLEAN | No | FALSE | Email verification status |
| first_name | VARCHAR(100) | Yes | - | First name |
| last_name | VARCHAR(100) | Yes | - | Last name |
| phone | VARCHAR(20) | Yes | - | Phone number |
| is_active | BOOLEAN | No | TRUE | Account active status |
| is_admin | BOOLEAN | No | FALSE | Platform admin flag |
| last_login | TIMESTAMP | Yes | - | Last login timestamp |
| created_at | TIMESTAMP | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | No | NOW() | Last update timestamp |

---

#### user_profiles

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| subscription_tier | VARCHAR(20) | 'free' | free, basic, premium, professional |
| subscription_status | VARCHAR(20) | 'active' | active, trial, expired, cancelled |
| notification_preferences | JSONB | {} | Email/push/in-app settings |

---

#### refresh_tokens

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_family VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(token_family);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

---

### Case Management

#### cases

```sql
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(100),
    case_name VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL,
    county VARCHAR(100),
    court VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    separation_date DATE,
    filing_date DATE,
    judgment_date DATE,
    require_joint_approval BOOLEAN DEFAULT TRUE,
    allow_modifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_state ON cases(state);
CREATE UNIQUE INDEX idx_cases_case_number ON cases(case_number) WHERE case_number IS NOT NULL;
```

| Column | Type | Description |
|--------|------|-------------|
| status | VARCHAR(20) | pending, active, suspended, closed |
| require_joint_approval | BOOLEAN | Require both parents to approve changes |
| allow_modifications | BOOLEAN | Allow agreement modifications |

---

#### case_participants

```sql
CREATE TABLE case_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) NOT NULL,
    parent_type VARCHAR(20),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(case_id, user_id)
);

-- Indexes
CREATE INDEX idx_case_participants_case_id ON case_participants(case_id);
CREATE INDEX idx_case_participants_user_id ON case_participants(user_id);
CREATE INDEX idx_case_participants_token ON case_participants(invitation_token);
```

| Column | Type | Description |
|--------|------|-------------|
| role | VARCHAR(20) | petitioner, respondent |
| parent_type | VARCHAR(20) | mother, father, parent_a, parent_b |

---

#### children

```sql
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    preferred_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    pronouns VARCHAR(50),

    -- Medical information
    allergies TEXT[],
    medications JSONB,
    medical_conditions TEXT[],
    blood_type VARCHAR(10),

    -- Healthcare
    pediatrician_name VARCHAR(255),
    pediatrician_phone VARCHAR(20),
    pediatrician_address TEXT,
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_group_number VARCHAR(100),

    -- Education
    school_name VARCHAR(255),
    school_address TEXT,
    school_phone VARCHAR(20),
    grade_level VARCHAR(50),
    teacher_name VARCHAR(255),
    teacher_email VARCHAR(255),
    has_iep BOOLEAN DEFAULT FALSE,
    has_504_plan BOOLEAN DEFAULT FALSE,
    special_needs_notes TEXT,

    -- Preferences
    clothing_size VARCHAR(50),
    shoe_size VARCHAR(20),
    favorite_foods TEXT[],
    dietary_restrictions TEXT[],
    bedtime TIME,
    wake_time TIME,
    comfort_items TEXT[],

    -- Approval workflow
    approved_by_a UUID REFERENCES users(id),
    approved_by_b UUID REFERENCES users(id),
    approved_at_a TIMESTAMP WITH TIME ZONE,
    approved_at_b TIMESTAMP WITH TIME ZONE,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_children_case_id ON children(case_id);
CREATE INDEX idx_children_active ON children(is_active) WHERE is_active = TRUE;
```

---

#### case_invitations

```sql
CREATE TABLE case_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id),
    invitee_email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_case_invitations_token ON case_invitations(token);
CREATE INDEX idx_case_invitations_email ON case_invitations(invitee_email);
```

---

### Messaging & ARIA

#### messages

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES message_threads(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'standard',
    status VARCHAR(20) DEFAULT 'sent',

    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,

    -- ARIA analysis
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_at TIMESTAMP WITH TIME ZONE,
    flag_reason TEXT,
    original_content TEXT,
    suggestion_accepted BOOLEAN,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_case_id ON messages(case_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_flagged ON messages(is_flagged) WHERE is_flagged = TRUE;
```

| Column | Type | Description |
|--------|------|-------------|
| message_type | VARCHAR(20) | standard, system, notification |
| status | VARCHAR(20) | sent, delivered, read, flagged |
| original_content | TEXT | Pre-ARIA content if modified |
| suggestion_accepted | BOOLEAN | True if used ARIA suggestion |

---

#### message_threads

```sql
CREATE TABLE message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    participants UUID[] NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_message_threads_case_id ON message_threads(case_id);
```

---

#### message_analysis

```sql
CREATE TABLE message_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

    -- Scores (0.0 to 1.0)
    toxicity_score DECIMAL(4,3),
    hostility_score DECIMAL(4,3),
    blame_score DECIMAL(4,3),
    passive_aggressive_score DECIMAL(4,3),
    profanity_score DECIMAL(4,3),
    dismissive_score DECIMAL(4,3),
    controlling_score DECIMAL(4,3),

    -- Suggestions
    suggested_rewrite TEXT,
    alternative_suggestions TEXT[],

    -- User response
    user_action VARCHAR(20),
    modified_content TEXT,

    -- Metadata
    analysis_model VARCHAR(100),
    analysis_duration_ms INTEGER,
    tokens_used INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_message_analysis_message_id ON message_analysis(message_id);
```

| Column | Type | Description |
|--------|------|-------------|
| user_action | VARCHAR(20) | accepted, modified, rejected, sent_anyway |
| analysis_model | VARCHAR(100) | claude-sonnet-4, gpt-4, regex |

---

#### aria_settings

```sql
CREATE TABLE aria_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    intervention_threshold DECIMAL(3,2) DEFAULT 0.30,
    auto_suggest BOOLEAN DEFAULT TRUE,
    block_high_toxicity BOOLEAN DEFAULT TRUE,
    high_toxicity_threshold DECIMAL(3,2) DEFAULT 0.80,
    allow_send_anyway BOOLEAN DEFAULT TRUE,
    track_good_faith BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(case_id)
);
```

---

#### aria_conversations

```sql
CREATE TABLE aria_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    conversation_type VARCHAR(50) NOT NULL,
    context JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_aria_conversations_case_user ON aria_conversations(case_id, user_id);
```

---

### Agreements

#### agreements

```sql
CREATE TABLE agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    agreement_type VARCHAR(50) DEFAULT 'parenting_plan',
    status VARCHAR(20) DEFAULT 'draft',

    -- Created by
    created_by UUID NOT NULL REFERENCES users(id),

    -- Approval tracking
    approved_by_a UUID REFERENCES users(id),
    approved_by_b UUID REFERENCES users(id),
    approved_at_a TIMESTAMP WITH TIME ZONE,
    approved_at_b TIMESTAMP WITH TIME ZONE,

    -- Rejection tracking
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Dates
    effective_date DATE,
    expiration_date DATE,

    -- Rules for ARIA
    compiled_rules JSONB,

    -- PDF
    pdf_url TEXT,
    pdf_hash VARCHAR(64),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agreements_case_id ON agreements(case_id);
CREATE INDEX idx_agreements_status ON agreements(status);
CREATE INDEX idx_agreements_active ON agreements(case_id, is_active) WHERE is_active = TRUE;
```

| Column | Type | Description |
|--------|------|-------------|
| agreement_type | VARCHAR(50) | parenting_plan, modification, temporary |
| status | VARCHAR(20) | draft, pending_approval, approved, rejected, expired |
| compiled_rules | JSONB | Structured rules for ARIA reference |

---

#### agreement_sections

```sql
CREATE TABLE agreement_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL,
    section_order INTEGER NOT NULL,
    title VARCHAR(255),
    content JSONB,
    is_required BOOLEAN DEFAULT TRUE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agreement_sections_agreement_id ON agreement_sections(agreement_id);
CREATE UNIQUE INDEX idx_agreement_sections_type ON agreement_sections(agreement_id, section_type);
```

**Section Types:**
```
welcome, parent_a_info, parent_b_info, children_info, legal_custody,
physical_custody, parenting_schedule, holiday_schedule, exchange_logistics,
transportation, child_support, medical_healthcare, education,
parent_communication, child_communication, travel, relocation,
dispute_resolution, other_provisions, review
```

---

#### agreement_versions

```sql
CREATE TABLE agreement_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    change_summary TEXT,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_agreement_versions_agreement_id ON agreement_versions(agreement_id);
```

---

### ClearFund (Finance)

#### expenses

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    submitter_id UUID NOT NULL REFERENCES users(id),

    -- Expense details
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,

    -- Receipt
    receipt_url TEXT,
    receipt_data JSONB,

    -- Split calculation
    split_percentage DECIMAL(5,2),
    parent_a_share DECIMAL(10,2),
    parent_b_share DECIMAL(10,2),

    -- Approval
    status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expenses_case_id ON expenses(case_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
```

| Category Values |
|-----------------|
| medical, education, extracurricular, clothing, transportation, childcare, camp, device, food, entertainment, other |

---

#### expense_categories

```sql
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_split_percentage DECIMAL(5,2) DEFAULT 50.00,
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_threshold DECIMAL(10,2),
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

#### obligations

```sql
CREATE TABLE obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id),
    payee_id UUID NOT NULL REFERENCES users(id),
    obligation_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    day_of_month INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_obligations_case_id ON obligations(case_id);
```

| Column | Values |
|--------|--------|
| obligation_type | child_support, alimony, medical_premium, education_fund |
| frequency | weekly, biweekly, monthly, quarterly |

---

#### payments

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id),
    expense_id UUID REFERENCES expenses(id),
    payer_id UUID NOT NULL REFERENCES users(id),
    payee_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_case_id ON payments(case_id);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);
```

---

#### clearfund_ledger

```sql
CREATE TABLE clearfund_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) NOT NULL,
    reference_id UUID,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    running_balance_a DECIMAL(10,2),
    running_balance_b DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clearfund_ledger_case_id ON clearfund_ledger(case_id);
CREATE INDEX idx_clearfund_ledger_date ON clearfund_ledger(created_at DESC);
```

---

### Schedule & Exchanges

#### schedule_events

```sql
CREATE TABLE schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    responsible_parent_id UUID REFERENCES users(id),

    -- Time
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,
    recurrence_end DATE,
    parent_event_id UUID REFERENCES schedule_events(id),

    -- Location
    location TEXT,
    location_type VARCHAR(50),

    -- Display
    color VARCHAR(20),
    category VARCHAR(50),

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled',
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,

    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schedule_events_case_id ON schedule_events(case_id);
CREATE INDEX idx_schedule_events_time ON schedule_events(start_time, end_time);
CREATE INDEX idx_schedule_events_parent ON schedule_events(responsible_parent_id);
CREATE INDEX idx_schedule_events_type ON schedule_events(event_type);
```

| Column | Values |
|--------|--------|
| event_type | regular, holiday, vacation, makeup, school, medical, sports, exchange |
| status | scheduled, completed, cancelled, missed |
| location_type | home_a, home_b, school, neutral, other |

---

#### custody_exchanges

```sql
CREATE TABLE custody_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    schedule_event_id UUID REFERENCES schedule_events(id),
    dropoff_parent_id UUID NOT NULL REFERENCES users(id),
    pickup_parent_id UUID NOT NULL REFERENCES users(id),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Location
    location TEXT,
    location_type VARCHAR(50),
    location_notes TEXT,

    -- Exchange type
    exchange_type VARCHAR(50) DEFAULT 'standard',

    -- Status
    status VARCHAR(20) DEFAULT 'pending',

    -- Silent handoff fields
    qr_code VARCHAR(255),
    verification_code VARCHAR(10),

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_custody_exchanges_case_id ON custody_exchanges(case_id);
CREATE INDEX idx_custody_exchanges_time ON custody_exchanges(scheduled_time);
CREATE INDEX idx_custody_exchanges_status ON custody_exchanges(status);
```

| Column | Values |
|--------|--------|
| exchange_type | standard, silent_handoff, school_transition, supervised |
| status | pending, in_progress, completed, cancelled, missed |

---

#### exchange_checkins

```sql
CREATE TABLE exchange_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID NOT NULL REFERENCES custody_exchanges(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES users(id),
    checkin_type VARCHAR(20) NOT NULL,

    -- Time
    scheduled_time TIMESTAMP WITH TIME ZONE,
    actual_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- GPS
    gps_latitude DECIMAL(10,8),
    gps_longitude DECIMAL(11,8),
    gps_accuracy DECIMAL(10,2),
    gps_address TEXT,

    -- Compliance
    was_on_time BOOLEAN,
    grace_period_used BOOLEAN DEFAULT FALSE,
    minutes_early INTEGER,
    minutes_late INTEGER,

    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50),
    qr_code_used BOOLEAN DEFAULT FALSE,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exchange_checkins_exchange_id ON exchange_checkins(exchange_id);
CREATE INDEX idx_exchange_checkins_parent_id ON exchange_checkins(parent_id);
```

---

#### busy_periods

```sql
CREATE TABLE busy_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    visibility VARCHAR(20) DEFAULT 'private',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_busy_periods_case_user ON busy_periods(case_id, user_id);
```

---

### KidComs (Video)

#### kidcoms_sessions

```sql
CREATE TABLE kidcoms_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    initiated_by UUID NOT NULL REFERENCES users(id),

    -- Session details
    session_type VARCHAR(50) DEFAULT 'video',
    status VARCHAR(20) DEFAULT 'pending',

    -- Scheduling
    scheduled_time TIMESTAMP WITH TIME ZONE,
    max_duration_minutes INTEGER DEFAULT 30,

    -- Actual timing
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    -- Daily.co integration
    daily_room_name VARCHAR(255),
    daily_room_url TEXT,

    -- Recording
    recording_enabled BOOLEAN DEFAULT FALSE,
    recording_url TEXT,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_kidcoms_sessions_case_id ON kidcoms_sessions(case_id);
CREATE INDEX idx_kidcoms_sessions_status ON kidcoms_sessions(status);
CREATE INDEX idx_kidcoms_sessions_time ON kidcoms_sessions(scheduled_time);
```

---

#### kidcoms_participants

```sql
CREATE TABLE kidcoms_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES kidcoms_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    circle_contact_id UUID REFERENCES my_circle_contacts(id),
    participant_type VARCHAR(20) NOT NULL,
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    was_present BOOLEAN DEFAULT FALSE,
    connection_quality VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_kidcoms_participants_session ON kidcoms_participants(session_id);
```

---

#### kidcoms_settings

```sql
CREATE TABLE kidcoms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id),
    enabled BOOLEAN DEFAULT TRUE,
    require_scheduling BOOLEAN DEFAULT FALSE,
    min_schedule_notice_hours INTEGER DEFAULT 0,
    max_call_duration INTEGER DEFAULT 30,
    allow_recording BOOLEAN DEFAULT FALSE,
    allowed_hours_start TIME DEFAULT '08:00',
    allowed_hours_end TIME DEFAULT '20:00',
    blocked_dates DATE[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE UNIQUE INDEX idx_kidcoms_settings_case_child ON kidcoms_settings(case_id, child_id);
```

---

### Cubbie (Child Items)

#### cubbie_categories

```sql
CREATE TABLE cubbie_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default categories inserted via migration
```

---

#### cubbie_items

```sql
CREATE TABLE cubbie_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES cubbie_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    photo_url TEXT,
    is_essential BOOLEAN DEFAULT FALSE,
    include_in_handoff BOOLEAN DEFAULT FALSE,
    location VARCHAR(100),
    notes TEXT,
    expires_at DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cubbie_items_child ON cubbie_items(child_id);
CREATE INDEX idx_cubbie_items_category ON cubbie_items(category_id);
CREATE INDEX idx_cubbie_items_handoff ON cubbie_items(child_id, include_in_handoff)
    WHERE include_in_handoff = TRUE;
```

---

### My Circle

#### my_circle_contacts

```sql
CREATE TABLE my_circle_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES users(id),
    user_id UUID REFERENCES users(id),

    -- Contact info
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    relationship VARCHAR(100),

    -- Permissions
    permission_level VARCHAR(20) DEFAULT 'contact',
    can_use_kidcoms BOOLEAN DEFAULT FALSE,
    can_view_schedule BOOLEAN DEFAULT FALSE,
    can_view_cubbie BOOLEAN DEFAULT FALSE,

    -- Approval
    approved_by_both BOOLEAN DEFAULT FALSE,
    approved_by_a UUID REFERENCES users(id),
    approved_by_b UUID REFERENCES users(id),
    approved_at_a TIMESTAMP WITH TIME ZONE,
    approved_at_b TIMESTAMP WITH TIME ZONE,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_my_circle_contacts_case ON my_circle_contacts(case_id);
CREATE INDEX idx_my_circle_contacts_email ON my_circle_contacts(email);
```

---

#### circle_invitations

```sql
CREATE TABLE circle_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES my_circle_contacts(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_circle_invitations_token ON circle_invitations(token);
```

---

#### circle_child_access

```sql
CREATE TABLE circle_child_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES my_circle_contacts(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    can_call BOOLEAN DEFAULT FALSE,
    can_message BOOLEAN DEFAULT FALSE,
    approved_by_a BOOLEAN DEFAULT FALSE,
    approved_by_b BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, child_id)
);

-- Index
CREATE INDEX idx_circle_child_access_contact ON circle_child_access(contact_id);
```

---

### Court Portal

#### legal_access

```sql
CREATE TABLE legal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    professional_email VARCHAR(255) NOT NULL,
    professional_name VARCHAR(255),
    organization VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    bar_number VARCHAR(100),

    -- Access details
    granted_by UUID NOT NULL REFERENCES users(id),
    access_level VARCHAR(20) DEFAULT 'read',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    verification_status VARCHAR(20) DEFAULT 'pending',
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(100),

    -- Usage tracking
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_legal_access_case ON legal_access(case_id);
CREATE INDEX idx_legal_access_email ON legal_access(professional_email);
CREATE INDEX idx_legal_access_user ON legal_access(user_id);
CREATE INDEX idx_legal_access_active ON legal_access(is_active, end_date);
```

---

#### legal_access_log

```sql
CREATE TABLE legal_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_id UUID NOT NULL REFERENCES legal_access(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_legal_access_log_access ON legal_access_log(access_id);
CREATE INDEX idx_legal_access_log_date ON legal_access_log(created_at DESC);
```

---

#### court_events

```sql
CREATE TABLE court_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    virtual_link TEXT,
    department VARCHAR(100),
    judge_name VARCHAR(255),
    is_mandatory BOOLEAN DEFAULT FALSE,
    petitioner_required BOOLEAN DEFAULT FALSE,
    respondent_required BOOLEAN DEFAULT FALSE,
    attorney_required BOOLEAN DEFAULT FALSE,
    documents_required TEXT[],
    reminder_sent BOOLEAN DEFAULT FALSE,
    outcome TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_court_events_case ON court_events(case_id);
CREATE INDEX idx_court_events_date ON court_events(event_date);
```

---

#### court_forms

```sql
CREATE TABLE court_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    form_type VARCHAR(50) NOT NULL,
    form_name VARCHAR(255),
    generated_by UUID NOT NULL REFERENCES users(id),
    data JSONB NOT NULL,
    pdf_url TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    filed_at TIMESTAMP WITH TIME ZONE,
    filing_confirmation VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_court_forms_case ON court_forms(case_id);
```

---

### Exports

#### exports

```sql
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    generated_by UUID NOT NULL REFERENCES users(id),

    -- Date range
    date_range_start DATE,
    date_range_end DATE,

    -- Configuration
    sections_included TEXT[],
    redactions_applied TEXT[],
    include_metadata BOOLEAN DEFAULT TRUE,
    include_analytics BOOLEAN DEFAULT FALSE,

    -- File details
    file_url TEXT,
    file_size_bytes BIGINT,
    file_hash VARCHAR(64),
    hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',

    -- Status
    status VARCHAR(20) DEFAULT 'processing',
    error_message TEXT,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exports_case ON exports(case_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_expires ON exports(expires_at);
```

---

#### export_access_log

```sql
CREATE TABLE export_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_id UUID NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
    accessed_by UUID REFERENCES users(id),
    access_type VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_export_access_log_export ON export_access_log(export_id);
```

---

### Audit & Logging

#### audit_logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_case ON audit_logs(case_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);

-- Partition by month for performance (optional)
-- CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

---

#### event_logs

```sql
CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,

    -- Blockchain-like integrity
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64) NOT NULL,
    sequence_number BIGINT NOT NULL,

    is_immutable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_event_logs_case ON event_logs(case_id);
CREATE INDEX idx_event_logs_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_sequence ON event_logs(case_id, sequence_number);
```

---

#### notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    priority VARCHAR(20) DEFAULT 'normal',

    -- Delivery status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_date ON notifications(created_at DESC);
```

---

#### notification_preferences

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Index
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
```

---

## Indexes

### Performance Indexes Summary

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| users | idx_users_email | email | Login lookup |
| cases | idx_cases_status | status | Filter by status |
| messages | idx_messages_sent_at | sent_at DESC | Recent messages |
| expenses | idx_expenses_date | expense_date DESC | Recent expenses |
| schedule_events | idx_schedule_events_time | start_time, end_time | Calendar queries |
| audit_logs | idx_audit_logs_date | created_at DESC | Recent activity |

### Composite Indexes

```sql
-- User's cases
CREATE INDEX idx_case_participants_user_active
    ON case_participants(user_id, is_active)
    WHERE is_active = TRUE;

-- Case messages by date
CREATE INDEX idx_messages_case_date
    ON messages(case_id, sent_at DESC);

-- Active agreements per case
CREATE INDEX idx_agreements_case_active
    ON agreements(case_id, is_active)
    WHERE is_active = TRUE;
```

---

## Constraints

### Check Constraints

```sql
-- Expense amount must be positive
ALTER TABLE expenses
    ADD CONSTRAINT chk_expense_amount_positive
    CHECK (amount > 0);

-- Split percentage between 0 and 100
ALTER TABLE expenses
    ADD CONSTRAINT chk_split_percentage_range
    CHECK (split_percentage >= 0 AND split_percentage <= 100);

-- Exchange scheduled time in future (on insert)
-- Handled in application layer

-- Child date of birth not in future
ALTER TABLE children
    ADD CONSTRAINT chk_dob_not_future
    CHECK (date_of_birth <= CURRENT_DATE);
```

### Foreign Key Actions

```sql
-- Cascade delete for child tables
REFERENCES parent_table(id) ON DELETE CASCADE

-- Set null for optional references
REFERENCES parent_table(id) ON DELETE SET NULL

-- Restrict for critical references (default)
REFERENCES parent_table(id) ON DELETE RESTRICT
```

---

## Migration History

### Migration Files Location
`mvp/backend/alembic/versions/`

### Key Migrations

| Version | Date | Description |
|---------|------|-------------|
| 001 | 2025-12-20 | Initial schema: users, cases |
| 002 | 2025-12-22 | Add case_participants, children |
| 003 | 2025-12-24 | Add messages, message_threads |
| 004 | 2025-12-26 | Add agreements, agreement_sections |
| 005 | 2025-12-28 | Add schedule_events, custody_exchanges |
| 006 | 2025-12-30 | Add expenses, obligations, payments |
| 007 | 2026-01-02 | Add kidcoms_sessions, kidcoms_participants |
| 008 | 2026-01-04 | Add cubbie_items, cubbie_categories |
| 009 | 2026-01-06 | Add my_circle_contacts, circle_invitations |
| 010 | 2026-01-08 | Add legal_access, court_events |
| 011 | 2026-01-09 | Add exports, audit_logs |
| 012 | 2026-01-10 | Add silent_handoff fields |

### Running Migrations

```bash
# Apply all migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# View current version
alembic current

# View migration history
alembic history
```

---

## Common Queries

### Get User's Cases

```sql
SELECT
    c.*,
    cp.role,
    (SELECT COUNT(*) FROM children WHERE case_id = c.id) as children_count
FROM cases c
JOIN case_participants cp ON c.id = cp.case_id
WHERE cp.user_id = :user_id
  AND cp.is_active = TRUE
ORDER BY c.updated_at DESC;
```

### Get Case Messages

```sql
SELECT
    m.*,
    u.first_name as sender_first_name,
    u.last_name as sender_last_name,
    ma.toxicity_score
FROM messages m
JOIN users u ON m.sender_id = u.id
LEFT JOIN message_analysis ma ON m.id = ma.message_id
WHERE m.case_id = :case_id
ORDER BY m.sent_at DESC
LIMIT 50;
```

### Get Compliance Metrics

```sql
SELECT
    ec.parent_id,
    COUNT(*) as total_exchanges,
    SUM(CASE WHEN ec.was_on_time THEN 1 ELSE 0 END) as on_time,
    SUM(CASE WHEN ec.grace_period_used THEN 1 ELSE 0 END) as grace_used,
    ROUND(
        100.0 * SUM(CASE WHEN ec.was_on_time THEN 1 ELSE 0 END) / COUNT(*),
        1
    ) as on_time_percentage
FROM exchange_checkins ec
JOIN custody_exchanges ce ON ec.exchange_id = ce.id
WHERE ce.case_id = :case_id
  AND ec.actual_time >= :start_date
  AND ec.actual_time <= :end_date
GROUP BY ec.parent_id;
```

### Get ClearFund Balance

```sql
SELECT
    COALESCE(SUM(
        CASE
            WHEN from_user_id = :parent_a_id THEN -amount
            WHEN to_user_id = :parent_a_id THEN amount
            ELSE 0
        END
    ), 0) as parent_a_balance
FROM clearfund_ledger
WHERE case_id = :case_id;
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **SCHEMA.md** | `/docs/database/` | This document |
| MIGRATIONS.md | `/docs/database/` | Migration procedures |
| API_REFERENCE.md | `/docs/api/` | API documentation |
| FEATURES_BREAKDOWN.md | `/docs/architecture/` | Feature analysis |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
