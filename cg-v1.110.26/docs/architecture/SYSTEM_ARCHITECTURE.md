# CommonGround V1 - System Architecture

**Last Updated:** January 10, 2026
**Version:** 1.0.0
**Status:** Production MVP

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Request/Response Lifecycle](#requestresponse-lifecycle)
7. [Integration Points](#integration-points)
8. [Module Dependencies](#module-dependencies)
9. [Security Architecture](#security-architecture)
10. [Scalability Design](#scalability-design)

---

## Architecture Overview

CommonGround follows a **three-tier architecture** with clear separation between presentation, business logic, and data layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION TIER                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      Next.js 14 Frontend Application                    │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │ │
│  │  │ Dashboard │ │   Cases   │ │ Agreements│ │ Messages  │ │ Schedule  │ │ │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │ │
│  │  │  KidComs  │ │ ClearFund │ │  Cubbie   │ │   Court   │ │ Settings  │ │ │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST API (HTTPS)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BUSINESS LOGIC TIER                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        FastAPI Backend Application                       │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                      API Layer (Endpoints)                       │   │ │
│  │  │  /auth  /cases  /agreements  /messages  /schedule  /kidcoms ... │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                  │                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                      Service Layer (Logic)                       │   │ │
│  │  │  AuthService  CaseService  ARIAService  ScheduleService ...     │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                  │                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                       Model Layer (ORM)                          │   │ │
│  │  │  User  Case  Agreement  Message  ScheduleEvent  KidComsSession  │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ SQL (async)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                DATA TIER                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                PostgreSQL 15 (Supabase)                                 │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐               │ │
│  │  │   Users   │ │   Cases   │ │ Agreements│ │ Messages  │  + 26 more   │ │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Async-First**: All I/O operations use async/await for non-blocking execution
2. **Separation of Concerns**: Endpoints handle HTTP, services handle business logic, models handle data
3. **Dependency Injection**: FastAPI's Depends() for database sessions and authentication
4. **Type Safety**: Pydantic schemas for request/response validation, TypeScript on frontend
5. **Immutability**: Message logs and event logs are append-only for legal compliance
6. **Privacy by Design**: Granular permissions, field-level access control, audit logging

---

## System Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    COMMONGROUND SYSTEM                                   │
│                                                                                          │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐       │
│  │   Web Client  │    │ Court Portal  │    │  Child Portal │    │ Circle Portal │       │
│  │  (Next.js)    │    │  (Next.js)    │    │   (Next.js)   │    │   (Next.js)   │       │
│  └───────┬───────┘    └───────┬───────┘    └───────┬───────┘    └───────┬───────┘       │
│          │                    │                    │                    │               │
│          └─────────────────┬──┴────────────────────┴────────────────────┘               │
│                            │                                                             │
│                            ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              FastAPI Backend                                      │   │
│  │                                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │                           API Routers (16 modules)                          │ │   │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │ │   │
│  │  │  │Auth │ │Users│ │Cases│ │Agmts│ │Msgs │ │Sched│ │Court│ │Cfund│ │Kcom │  │ │   │
│  │  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘ │   │
│  │                                      │                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │                         Services Layer (35+ services)                       │ │   │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │   │
│  │  │  │ AuthService  │ │ CaseService  │ │ ARIAService  │ │ ExportService│       │ │   │
│  │  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │ │   │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │   │
│  │  │  │ScheduleServ │ │ KidComsServ  │ │ClearFundServ │ │ DailyVideoSv│       │ │   │
│  │  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘ │   │
│  │                                      │                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐ │   │
│  │  │                         Models Layer (27+ models)                           │ │   │
│  │  │  User, Case, FamilyFile, Child, Agreement, Message, ScheduleEvent, ...     │ │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                               │
│          ┌───────────────────────────────┼───────────────────────────────┐              │
│          │                               │                               │              │
│          ▼                               ▼                               ▼              │
│  ┌───────────────┐            ┌───────────────────┐           ┌──────────────────┐     │
│  │  PostgreSQL   │            │    Supabase Auth  │           │   File Storage   │     │
│  │   Database    │            │   (JWT + Email)   │           │   (Supabase)     │     │
│  └───────────────┘            └───────────────────┘           └──────────────────┘     │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
              ┌───────────────────────────┬┴──────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
      ┌───────────────┐          ┌───────────────┐           ┌───────────────┐
      │   Anthropic   │          │    Daily.co   │           │   SendGrid    │
      │  Claude API   │          │   Video API   │           │     Email     │
      │   (ARIA)      │          │   (KidComs)   │           │               │
      └───────────────┘          └───────────────┘           └───────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| Web Client | Parent-facing interface for all features | Next.js 14, TypeScript, Tailwind |
| Court Portal | Professional access for GALs, attorneys | Next.js 14 (shared codebase) |
| Child Portal | Simplified interface for children | Next.js 14 (My Circle routes) |
| Circle Portal | Approved contacts interface | Next.js 14 (My Circle routes) |
| FastAPI Backend | All business logic and data access | Python 3.11, FastAPI, SQLAlchemy |
| PostgreSQL | Persistent data storage | PostgreSQL 15 via Supabase |
| Supabase Auth | User authentication and email verification | Supabase Auth + JWT |
| File Storage | Document and image uploads | Supabase Storage |
| Anthropic Claude | ARIA AI for sentiment and agreements | Claude Sonnet 4 |
| Daily.co | Video calling infrastructure | Daily.co REST + WebRTC |
| SendGrid | Transactional email delivery | SendGrid SMTP |

---

## Backend Architecture

### Directory Structure

```
mvp/backend/
├── app/
│   ├── main.py                    # Application entry point
│   ├── core/                      # Core configuration
│   │   ├── config.py             # Settings management (Pydantic)
│   │   ├── database.py           # SQLAlchemy async setup
│   │   ├── security.py           # JWT, password hashing
│   │   ├── supabase.py           # Supabase client
│   │   └── websocket.py          # WebSocket handler
│   ├── models/                    # SQLAlchemy ORM models (27+)
│   │   ├── base.py               # Base mixins (UUID, Timestamp)
│   │   ├── user.py               # User, UserProfile
│   │   ├── case.py               # Case, CaseParticipant
│   │   ├── family_file.py        # FamilyFile, CourtCustodyCase
│   │   ├── child.py              # Child
│   │   ├── agreement.py          # Agreement, Section, Version
│   │   ├── message.py            # Message, Thread, Flag
│   │   ├── schedule.py           # ScheduleEvent, ExchangeCheckIn
│   │   ├── custody_exchange.py   # CustodyExchange, Instance
│   │   ├── clearfund.py          # Obligation, Funding, Artifact
│   │   ├── court.py              # CourtProfessional, AccessGrant
│   │   ├── court_form.py         # FormSubmission, Hearing
│   │   ├── custody_order.py      # CustodyOrder (FL-311)
│   │   ├── kidcoms.py            # Session, Message, Settings
│   │   ├── circle.py             # CircleContact, Permission
│   │   ├── cubbie.py             # CubbieItem, ExchangeItem
│   │   ├── intake.py             # IntakeSession, Extraction
│   │   ├── activity.py           # Activity feed
│   │   ├── audit.py              # AuditLog, EventLog
│   │   ├── export.py             # CaseExport, ExportSection
│   │   └── ...
│   ├── schemas/                   # Pydantic request/response (22+)
│   ├── services/                  # Business logic (35+)
│   │   ├── auth.py               # Registration, login, tokens
│   │   ├── case.py               # Case management
│   │   ├── aria.py               # Sentiment analysis
│   │   ├── aria_agreement.py     # Agreement building AI
│   │   ├── aria_paralegal.py     # Legal intake AI
│   │   ├── aria_quick_accord.py  # Quick accord AI
│   │   ├── schedule.py           # Calendar operations
│   │   ├── custody_exchange.py   # Exchange tracking
│   │   ├── clearfund.py          # Financial obligations
│   │   ├── kidcoms.py            # Video calling
│   │   ├── daily_video.py        # Daily.co integration
│   │   ├── court.py              # Court access
│   │   └── export/               # Export generation
│   │       ├── generators/       # PDF generators
│   │       └── ...
│   └── api/v1/                    # REST endpoints
│       ├── router.py             # Main router combining all
│       └── endpoints/             # Endpoint files (16+)
├── alembic/                       # Database migrations
├── tests/                         # Test suite
└── requirements.txt               # Python dependencies
```

### API Router Organization

The main router (`app/api/v1/router.py`) organizes 16+ endpoint groups:

```python
# Router Structure (Logical Grouping)

# 1. Authentication & Users
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])

# 2. Case Management
api_router.include_router(cases.router, prefix="/cases", tags=["Cases"])
api_router.include_router(family_files.router, prefix="/family-files", tags=["Family Files"])
api_router.include_router(children.router, prefix="/children", tags=["Children"])

# 3. Agreements
api_router.include_router(agreements.router, prefix="/agreements", tags=["Agreements"])
api_router.include_router(quick_accords.router, prefix="/quick-accords", tags=["Quick Accords"])

# 4. Communication
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(kidcoms.router, prefix="/kidcoms", tags=["KidComs"])
api_router.include_router(my_circle.router, prefix="/my-circle", tags=["My Circle"])

# 5. Scheduling
api_router.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])
api_router.include_router(exchanges.router, prefix="/exchanges", tags=["Exchanges"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])

# 6. Financial
api_router.include_router(clearfund.router, prefix="/clearfund", tags=["ClearFund"])

# 7. Court & Legal
api_router.include_router(court.router, prefix="/court", tags=["Court"])
api_router.include_router(exports.router, prefix="/exports", tags=["Exports"])
api_router.include_router(intake.router, prefix="/intake", tags=["Intake"])

# 8. Content
api_router.include_router(cubbie.router, prefix="/cubbie", tags=["Cubbie"])

# 9. Dashboard & Activity
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(activities.router, prefix="/activities", tags=["Activities"])
```

### Service Layer Pattern

Services encapsulate business logic, keeping endpoints thin:

```python
# Example: app/services/case.py

class CaseService:
    """Case management business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_case(
        self,
        creator: User,
        data: CaseCreate
    ) -> Case:
        """
        Create a new co-parenting case.

        1. Generate unique case number
        2. Create case record
        3. Add creator as petitioner
        4. Generate invitation token
        5. Log activity
        """
        case_number = await self._generate_case_number()

        case = Case(
            case_number=case_number,
            case_name=data.case_name,
            state=data.state,
            status="pending",
            invitation_token=generate_token()
        )

        self.db.add(case)
        await self.db.flush()

        participant = CaseParticipant(
            case_id=case.id,
            user_id=creator.id,
            role="petitioner",
            parent_type=data.parent_type,
            is_active=True
        )

        self.db.add(participant)
        await self.db.commit()

        return case

    async def accept_invitation(
        self,
        user: User,
        case_id: str,
        token: str
    ) -> Case:
        """Second parent accepts invitation and joins case."""
        # Validation, status update, notification...
```

### Model Relationships

Key model relationships using SQLAlchemy 2.0:

```python
# app/models/case.py

class Case(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "cases"

    # Columns
    case_number = Column(String, unique=True, index=True)
    case_name = Column(String, nullable=False)
    status = Column(String, default="pending")

    # Relationships
    participants = relationship(
        "CaseParticipant",
        back_populates="case",
        cascade="all, delete-orphan"
    )
    children = relationship(
        "Child",
        back_populates="case",
        cascade="all, delete-orphan"
    )
    agreements = relationship(
        "Agreement",
        back_populates="case",
        cascade="all, delete-orphan"
    )
    messages = relationship(
        "Message",
        back_populates="case",
        cascade="all, delete-orphan"
    )

# app/models/user.py

class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email = Column(String, unique=True, index=True)
    supabase_id = Column(String, unique=True, index=True)

    # Relationships
    profile = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    cases_as_participant = relationship(
        "CaseParticipant",
        back_populates="user",
        cascade="all, delete-orphan"
    )
```

---

## Frontend Architecture

### Directory Structure

```
mvp/frontend/
├── app/                           # Next.js 14 App Router
│   ├── layout.tsx                # Root layout (AuthProvider)
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Global styles
│   │
│   ├── (marketing)/              # Public marketing pages
│   │   ├── about/
│   │   ├── features/
│   │   └── ...
│   │
│   ├── login/                    # Authentication
│   ├── register/
│   │
│   ├── dashboard/                # Main dashboard
│   │   └── page.tsx
│   │
│   ├── cases/                    # Case management
│   │   ├── page.tsx             # List cases
│   │   ├── new/page.tsx         # Create case
│   │   └── [id]/                # Dynamic routes
│   │       ├── page.tsx         # Case details
│   │       ├── children/        # Child management
│   │       ├── court-forms/     # Legal forms
│   │       └── exports/         # Court exports
│   │
│   ├── agreements/               # Agreement builder
│   │   ├── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── builder/         # 18-section wizard
│   │       └── aria/            # ARIA builder
│   │
│   ├── messages/                 # ARIA messaging
│   ├── schedule/                 # Calendar
│   ├── payments/                 # ClearFund
│   ├── kidcoms/                  # Video calls
│   ├── my-circle/                # Contacts
│   └── settings/                 # User settings
│
├── components/                    # Reusable components (96+)
│   ├── ui/                       # shadcn/ui base
│   ├── navigation.tsx            # Main navigation
│   ├── protected-route.tsx       # Auth wrapper
│   ├── layout/                   # Layout components
│   ├── dashboard/                # Dashboard widgets
│   ├── messages/                 # Chat components
│   ├── agreements/               # Agreement wizard
│   │   └── sections/            # 20 section components
│   ├── schedule/                 # Calendar components
│   ├── kidcoms/                  # Video call UI
│   ├── clearfund/                # Payment components
│   └── ...
│
├── lib/                          # Utilities
│   ├── api.ts                   # API client (4,000+ lines)
│   ├── auth-context.tsx         # Global auth state
│   ├── timezone.ts              # Timezone utilities
│   └── utils.ts                 # Helpers
│
├── hooks/                        # Custom React hooks
└── public/                       # Static assets
```

### API Client Architecture

The frontend uses a comprehensive type-safe API client (`lib/api.ts`):

```typescript
// lib/api.ts - Structure

// Base fetch wrapper with auth handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options?.headers
    }
  });

  if (response.status === 401) {
    // Token refresh logic
    const newToken = await authAPI.refresh();
    // Retry with new token
  }

  return response.json();
}

// API namespaces
export const authAPI = {
  login: (data) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  refresh: () => fetchAPI('/auth/refresh', { method: 'POST' }),
  me: () => fetchAPI('/auth/me'),
};

export const casesAPI = {
  create: (data) => fetchAPI('/cases/', { method: 'POST', body: JSON.stringify(data) }),
  list: () => fetchAPI('/cases/'),
  get: (id) => fetchAPI(`/cases/${id}`),
  // ...
};

export const messagesAPI = {
  send: (data) => fetchAPI('/messages/', { method: 'POST', body: JSON.stringify(data) }),
  list: (caseId) => fetchAPI(`/messages/?case_id=${caseId}`),
  analyze: (content) => fetchAPI('/messages/analyze', { method: 'POST', body: JSON.stringify({ content }) }),
};

// ... 15+ more API namespaces
```

### State Management

```typescript
// lib/auth-context.tsx

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  timezone: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authAPI.me();
        setUser(currentUser);
        const userProfile = await usersAPI.getProfile();
        setProfile(userProfile);
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  // ... login, logout, etc.
}
```

---

## Data Flow Patterns

### Pattern 1: User Registration Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│   Next.js    │────▶│   FastAPI    │────▶│   Supabase   │
│              │     │   Frontend   │     │   Backend    │     │     Auth     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │  1. Submit Form    │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  2. POST /auth/    │                    │
       │                    │     register       │                    │
       │                    │───────────────────▶│                    │
       │                    │                    │  3. signUp()       │
       │                    │                    │───────────────────▶│
       │                    │                    │                    │
       │                    │                    │◀─────── 4. User ───│
       │                    │                    │                    │
       │                    │                    │  5. Create local   │
       │                    │                    │     User + Profile │
       │                    │                    │         │          │
       │                    │                    │         ▼          │
       │                    │                    │  ┌──────────────┐  │
       │                    │                    │  │  PostgreSQL  │  │
       │                    │                    │  └──────────────┘  │
       │                    │                    │                    │
       │                    │◀──── 6. Tokens ────│                    │
       │                    │                    │                    │
       │◀─ 7. Set Token ────│                    │                    │
       │   + Redirect       │                    │                    │
```

### Pattern 2: ARIA Message Analysis Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │     │   FastAPI    │     │ ARIA Service │     │   Anthropic  │
│              │     │   Backend    │     │              │     │    Claude    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │  1. Send Message   │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  2. analyze()      │                    │
       │                    │───────────────────▶│                    │
       │                    │                    │                    │
       │                    │                    │  3. Fast Path:     │
       │                    │                    │     Regex Check    │
       │                    │                    │         │          │
       │                    │                    │  4. If toxic:      │
       │                    │                    │     Deep Path      │
       │                    │                    │───────────────────▶│
       │                    │                    │                    │
       │                    │                    │◀─ 5. Analysis ─────│
       │                    │                    │    Score, Suggest  │
       │                    │                    │                    │
       │                    │◀─ 6. Intervention ─│                    │
       │                    │    if toxic        │                    │
       │                    │                    │                    │
       │◀─ 7. Show UI ──────│                    │                    │
       │    for rewrite     │                    │                    │
       │                    │                    │                    │
       │  8. Accept/Reject  │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  9. Store message  │                    │
       │                    │     + flag record  │                    │
       │                    │         │          │                    │
       │                    │         ▼          │                    │
       │                    │  ┌──────────────┐  │                    │
       │                    │  │  PostgreSQL  │  │                    │
       │                    │  │  messages +  │  │                    │
       │                    │  │  message_flags│ │                    │
       │                    │  └──────────────┘  │                    │
```

### Pattern 3: KidComs Video Call Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Parent    │     │   FastAPI    │     │   Daily.co   │     │    Child     │
│   Browser    │     │   Backend    │     │    Server    │     │   Browser    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │  1. Create Session │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  2. Create Room    │                    │
       │                    │───────────────────▶│                    │
       │                    │                    │                    │
       │                    │◀── 3. Room URL ────│                    │
       │                    │                    │                    │
       │                    │  4. Generate Token │                    │
       │                    │      (parent)      │                    │
       │                    │                    │                    │
       │◀─ 5. Session + ────│                    │                    │
       │      Token         │                    │                    │
       │                    │                    │                    │
       │  6. Connect to     │                    │                    │
       │     Daily Room     │                    │                    │
       │────────────────────┼───────────────────▶│                    │
       │                    │                    │                    │
       │                    │  7. Notify child   │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │                    │                    │◀── 8. Child Joins ─│
       │                    │                    │                    │
       │◀───────────────────┼─── 9. WebRTC ──────┼───────────────────▶│
       │                    │                    │                    │
       │  10. Video/Audio   │                    │                    │
       │     Streaming      │                    │                    │
       │◀═══════════════════╪════════════════════╪═══════════════════▶│
```

### Pattern 4: Court Export Generation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Professional │     │   FastAPI    │     │   Export     │     │   Storage    │
│   Browser    │     │   Backend    │     │   Service    │     │  (Supabase)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │  1. Request Export │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  2. Queue job      │                    │
       │                    │───────────────────▶│                    │
       │◀─ 3. Export ID ────│                    │                    │
       │    (status:        │                    │                    │
       │     generating)    │                    │                    │
       │                    │                    │                    │
       │                    │  4. Gather data:   │                    │
       │                    │  - Messages        │                    │
       │                    │  - Agreements      │                    │
       │                    │  - Compliance      │                    │
       │                    │  - Financials      │                    │
       │                    │                    │                    │
       │                    │  5. Apply          │                    │
       │                    │     redactions     │                    │
       │                    │                    │                    │
       │                    │  6. Generate PDF   │                    │
       │                    │     (ReportLab)    │                    │
       │                    │                    │                    │
       │                    │  7. Calculate      │                    │
       │                    │     SHA-256 hash   │                    │
       │                    │                    │                    │
       │                    │                    │  8. Upload PDF     │
       │                    │                    │───────────────────▶│
       │                    │                    │                    │
       │                    │◀── 9. File URL ────│                    │
       │                    │                    │                    │
       │  10. Poll status   │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │                    │                    │
       │◀── 11. Complete ───│                    │                    │
       │     + Download URL │                    │                    │
```

---

## Request/Response Lifecycle

### Complete HTTP Request Lifecycle

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         HTTP REQUEST LIFECYCLE                              │
└────────────────────────────────────────────────────────────────────────────┘

1. CLIENT REQUEST
   │
   │  POST /api/v1/messages/
   │  Authorization: Bearer <JWT>
   │  Content-Type: application/json
   │  {"case_id": "...", "content": "Hello", "receiver_id": "..."}
   │
   ▼
2. CORS MIDDLEWARE
   │
   │  - Check Origin header against allowed origins
   │  - Add CORS headers to response
   │  - Handle preflight OPTIONS requests
   │
   ▼
3. AUTHENTICATION MIDDLEWARE
   │
   │  - Extract token from Authorization header
   │  - Decode JWT with secret key
   │  - Verify token type (access, not refresh)
   │  - Check expiration
   │  - Load user from database
   │
   ▼
4. REQUEST VALIDATION (Pydantic)
   │
   │  - Parse JSON body
   │  - Validate against MessageCreate schema
   │  - Raise 422 if validation fails
   │
   ▼
5. ENDPOINT HANDLER
   │
   │  @router.post("/")
   │  async def send_message(
   │      data: MessageCreate,
   │      db: AsyncSession = Depends(get_db),
   │      current_user: User = Depends(get_current_user)
   │  ):
   │
   ▼
6. AUTHORIZATION CHECK
   │
   │  - Verify user is participant in case
   │  - Check user has messaging permissions
   │
   ▼
7. BUSINESS LOGIC (Service Layer)
   │
   │  message_service = MessageService(db)
   │
   │  a. ARIA Analysis
   │     - Call aria_service.analyze(content)
   │     - Get toxicity score, categories, suggestions
   │
   │  b. Create Message Record
   │     - Store content (or original_content if rewritten)
   │     - Generate content hash
   │
   │  c. Create Flag Record (if toxic)
   │     - Store toxicity_score, categories
   │     - Store suggested_rewrite
   │
   │  d. Commit Transaction
   │
   ▼
8. RESPONSE SERIALIZATION (Pydantic)
   │
   │  - Convert SQLAlchemy model to Pydantic schema
   │  - MessageResponse.model_validate(message)
   │
   ▼
9. RESPONSE
   │
   │  HTTP/1.1 201 Created
   │  Content-Type: application/json
   │
   │  {
   │    "id": "uuid",
   │    "content": "Hello",
   │    "was_flagged": false,
   │    "toxicity_score": 0.1,
   │    "sent_at": "2026-01-10T12:00:00Z"
   │  }
```

### Error Response Flow

```
REQUEST VALIDATION ERROR (422):
{
  "detail": [
    {
      "loc": ["body", "content"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}

AUTHENTICATION ERROR (401):
{
  "detail": "Could not validate credentials"
}

AUTHORIZATION ERROR (403):
{
  "detail": "You are not a participant in this case"
}

NOT FOUND ERROR (404):
{
  "detail": "Case not found"
}

INTERNAL ERROR (500):
{
  "detail": "An unexpected error occurred"
}
```

---

## Integration Points

### External Service Integrations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICE INTEGRATIONS                       │
├─────────────────┬───────────────────────────────────────────────────────┤
│                 │                                                        │
│  ┌───────────┐  │  Anthropic Claude API                                 │
│  │   ARIA    │──┼──────────────────────────────────────────────────────▶│
│  │ Services  │  │  • Sentiment analysis (aria.py)                       │
│  └───────────┘  │  • Agreement building (aria_agreement.py)             │
│                 │  • Legal intake (aria_paralegal.py)                   │
│                 │  • Quick accords (aria_quick_accord.py)               │
│                 │                                                        │
│  ┌───────────┐  │  OpenAI API (Fallback)                                │
│  │   ARIA    │──┼──────────────────────────────────────────────────────▶│
│  │ Fallback  │  │  • GPT-4 for analysis when Claude unavailable         │
│  └───────────┘  │                                                        │
│                 │                                                        │
├─────────────────┼────────────────────────────────────────────────────────┤
│                 │                                                        │
│  ┌───────────┐  │  Supabase                                             │
│  │   Auth    │──┼──────────────────────────────────────────────────────▶│
│  │ Service   │  │  • User registration/login                            │
│  └───────────┘  │  • Email verification                                 │
│                 │  • Password reset                                      │
│  ┌───────────┐  │                                                        │
│  │ Database  │──┼──────────────────────────────────────────────────────▶│
│  │ Service   │  │  • PostgreSQL hosting                                 │
│  └───────────┘  │  • Connection pooling                                 │
│                 │                                                        │
│  ┌───────────┐  │                                                        │
│  │  Storage  │──┼──────────────────────────────────────────────────────▶│
│  │ Service   │  │  • File uploads (receipts, photos)                    │
│  └───────────┘  │  • Export PDFs                                        │
│                 │                                                        │
├─────────────────┼────────────────────────────────────────────────────────┤
│                 │                                                        │
│  ┌───────────┐  │  Daily.co                                             │
│  │  KidComs  │──┼──────────────────────────────────────────────────────▶│
│  │ Service   │  │  • Room creation/management                           │
│  └───────────┘  │  • Token generation for participants                  │
│                 │  • WebRTC infrastructure                               │
│                 │                                                        │
├─────────────────┼────────────────────────────────────────────────────────┤
│                 │                                                        │
│  ┌───────────┐  │  SendGrid                                             │
│  │  Email    │──┼──────────────────────────────────────────────────────▶│
│  │ Service   │  │  • Transactional emails                               │
│  └───────────┘  │  • Invitations, notifications                         │
│                 │                                                        │
└─────────────────┴────────────────────────────────────────────────────────┘
```

### Internal Module Communication

```python
# Example: How endpoints use services, and services use each other

# app/api/v1/endpoints/messages.py
@router.post("/")
async def send_message(
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Endpoint uses MessageService
    message_service = MessageService(db)

    # MessageService internally uses ARIAService
    message = await message_service.send_message(
        sender=current_user,
        data=data
    )

    return MessageResponse.model_validate(message)


# app/services/message.py
class MessageService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.aria_service = ARIAService()  # Composition

    async def send_message(self, sender: User, data: MessageCreate) -> Message:
        # Use ARIA for analysis
        analysis = await self.aria_service.analyze_message(
            content=data.content,
            case_context=await self._get_case_context(data.case_id)
        )

        # Create message with analysis results
        message = Message(
            case_id=data.case_id,
            sender_id=sender.id,
            content=data.content,
            was_flagged=analysis.is_toxic
        )

        if analysis.is_toxic:
            # Create flag record
            flag = MessageFlag(
                message_id=message.id,
                toxicity_score=analysis.score,
                suggested_content=analysis.suggestion
            )
            self.db.add(flag)

        self.db.add(message)
        await self.db.commit()

        return message
```

---

## Module Dependencies

### Backend Module Dependency Graph

```
                                    ┌─────────────────┐
                                    │      main.py    │
                                    │  (Application)  │
                                    └────────┬────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │    core/    │    │   api/v1/   │    │   models/   │
                   │   config    │    │   router    │    │   (all)     │
                   │   database  │    │             │    │             │
                   │   security  │    │             │    │             │
                   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                          │                  │                  │
                          ▼                  ▼                  ▼
          ┌───────────────┴──────────────────┴──────────────────┴───────────────┐
          │                                                                      │
          │                          services/                                   │
          │                                                                      │
          │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
          │  │   auth   │  │   case   │  │   aria   │  │ schedule │            │
          │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
          │       │             │             │             │                   │
          │       ▼             ▼             ▼             ▼                   │
          │  ┌──────────────────────────────────────────────────────────────┐  │
          │  │                      Database Layer                          │  │
          │  │              (SQLAlchemy AsyncSession)                       │  │
          │  └──────────────────────────────────────────────────────────────┘  │
          │                                                                      │
          └──────────────────────────────────────────────────────────────────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │  Anthropic  │    │   Daily.co  │    │  Supabase   │
                   │    Claude   │    │             │    │             │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

### Frontend Module Dependency Graph

```
                                    ┌─────────────────┐
                                    │   layout.tsx    │
                                    │  (Root Layout)  │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  AuthProvider   │
                                    │(auth-context.tsx)│
                                    └────────┬────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │  app/pages  │    │ components/ │    │    lib/     │
                   │             │    │             │    │   api.ts    │
                   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                          │                  │                  │
                          └──────────────────┼──────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  FastAPI API    │
                                    │   (Backend)     │
                                    └─────────────────┘
```

### Service Layer Dependencies

| Service | Depends On | Used By |
|---------|-----------|---------|
| `AuthService` | Supabase, Database | Auth endpoints |
| `CaseService` | Database | Case, FamilyFile endpoints |
| `ARIAService` | Anthropic, OpenAI | MessageService, AgreementService |
| `MessageService` | ARIAService, Database | Message endpoints |
| `AgreementService` | ARIAService, Database | Agreement endpoints |
| `ScheduleService` | Database | Schedule endpoints |
| `CustodyExchangeService` | Database, GeolocationService | Exchange endpoints |
| `KidComsService` | DailyVideoService, Database | KidComs endpoints |
| `DailyVideoService` | Daily.co API | KidComsService |
| `ClearFundService` | Database, Stripe | ClearFund endpoints |
| `ExportService` | All data services, ReportLab | Export endpoints |
| `CourtService` | Database, ExportService | Court endpoints |

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. USER AUTHENTICATION                                                  │
│     ┌───────────┐                      ┌───────────┐                    │
│     │  Browser  │──── Login Request ──▶│  Backend  │                    │
│     │           │                      │           │                    │
│     │           │◀─ Access + Refresh ──│           │                    │
│     │           │       Tokens         │           │                    │
│     └───────────┘                      └─────┬─────┘                    │
│                                              │                           │
│                                              ▼                           │
│                                        ┌───────────┐                    │
│                                        │  Supabase │                    │
│                                        │   Auth    │                    │
│                                        └───────────┘                    │
│                                                                          │
│  2. TOKEN TYPES                                                          │
│     ┌────────────────────────────────────────────────────────────────┐  │
│     │ Access Token  │ Short-lived (30 min) │ Used for API requests   │  │
│     │ Refresh Token │ Long-lived (7 days)  │ Used to get new access  │  │
│     │ Child Token   │ Limited scope        │ For child portal        │  │
│     │ Circle Token  │ Limited scope        │ For circle contacts     │  │
│     └────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  3. TOKEN REFRESH FLOW                                                   │
│     Request fails (401) ──▶ Refresh token ──▶ New access token          │
│                         ──▶ Retry request                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Authorization Levels

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AUTHORIZATION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ROLE-BASED ACCESS CONTROL (RBAC)                                       │
│                                                                          │
│  ┌───────────────┬──────────────────────────────────────────────────┐   │
│  │ Role          │ Permissions                                       │   │
│  ├───────────────┼──────────────────────────────────────────────────┤   │
│  │ Parent        │ Full access to own cases, children, messages      │   │
│  │ (Petitioner)  │ Can grant legal access                           │   │
│  │ (Respondent)  │ Can approve agreements, expenses                 │   │
│  ├───────────────┼──────────────────────────────────────────────────┤   │
│  │ Child         │ Limited to My Circle portal                      │   │
│  │               │ Can make approved video calls                    │   │
│  │               │ Cannot access case details                       │   │
│  ├───────────────┼──────────────────────────────────────────────────┤   │
│  │ Circle        │ Can receive calls from approved children         │   │
│  │ Contact       │ Limited messaging if enabled                     │   │
│  │               │ No case access                                   │   │
│  ├───────────────┼──────────────────────────────────────────────────┤   │
│  │ GAL           │ Read-only case access                            │   │
│  │               │ Can generate exports                             │   │
│  │               │ Time-limited (120 days default)                  │   │
│  ├───────────────┼──────────────────────────────────────────────────┤   │
│  │ Attorney      │ Read-only access to client's case                │   │
│  │               │ Can generate exports                             │   │
│  │               │ Time-limited (90 days default)                   │   │
│  ├───────────────┼──────────────────────────────────────────────────┤   │
│  │ Mediator      │ Read-only access to both parties                 │   │
│  │               │ Limited export capabilities                      │   │
│  └───────────────┴──────────────────────────────────────────────────┘   │
│                                                                          │
│  RESOURCE-LEVEL ACCESS                                                   │
│                                                                          │
│  Every API request checks:                                               │
│  1. Is user authenticated? (valid token)                                │
│  2. Is user authorized for this resource? (case participant)            │
│  3. Does user have permission for this action? (role-based)             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Protection

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA PROTECTION LAYERS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. ENCRYPTION                                                           │
│     ┌────────────────────────────────────────────────────────────────┐  │
│     │ In Transit │ TLS 1.3 for all HTTPS connections                 │  │
│     │ At Rest    │ Database encryption (Supabase managed)            │  │
│     │ Passwords  │ bcrypt hashing (12 rounds)                        │  │
│     │ Tokens     │ HS256 JWT with secret key rotation                │  │
│     │ Exports    │ SHA-256 integrity verification                    │  │
│     └────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  2. INPUT VALIDATION                                                     │
│     • Pydantic schemas validate all request bodies                      │
│     • SQL injection prevented by SQLAlchemy parameterization            │
│     • XSS prevented by React auto-escaping + Bleach sanitization       │
│                                                                          │
│  3. AUDIT LOGGING                                                        │
│     ┌────────────────────────────────────────────────────────────────┐  │
│     │ audit_logs   │ User actions with IP, user agent, timestamp     │  │
│     │ event_logs   │ Blockchain-like chain for legal evidence        │  │
│     │ access_logs  │ Professional access tracking (court access)     │  │
│     └────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  4. DATA PRIVACY                                                         │
│     • Field-level access control for sensitive data                     │
│     • Court-restricted fields (address, medical info)                   │
│     • Redaction rules for exports (HIPAA-adjacent)                      │
│     • Time-limited professional access with expiration                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Scalability Design

### Current Architecture (MVP)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CURRENT DEPLOYMENT (MVP)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Single-Instance Deployment                                              │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         Vercel (Frontend)                        │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │  Next.js App (Serverless Functions)                         ││    │
│  │  │  • Static pages CDN-cached                                  ││    │
│  │  │  • API routes for server-side operations                    ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       Railway (Backend)                          │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │  FastAPI App (Single Instance)                              ││    │
│  │  │  • Connection pool to database                              ││    │
│  │  │  • In-memory session caching                                ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       Supabase (Database)                        │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │  PostgreSQL 15                                              ││    │
│  │  │  • Connection pooling (PgBouncer)                           ││    │
│  │  │  • Automatic backups                                        ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Capacity: ~1,000 concurrent users                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Future Architecture (Scale-Out)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FUTURE DEPLOYMENT (SCALED)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      CDN (CloudFlare)                            │    │
│  │  • Static asset caching                                          │    │
│  │  • DDoS protection                                               │    │
│  │  • Global edge distribution                                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────▼───────────────────────────────┐    │
│  │                      Load Balancer                               │    │
│  └────────────────────┬────────────────────────┬───────────────────┘    │
│                       │                        │                         │
│  ┌────────────────────▼────────┐  ┌───────────▼────────────────┐       │
│  │       API Instance 1        │  │       API Instance 2        │       │
│  │         (FastAPI)           │  │         (FastAPI)           │       │
│  └────────────────────┬────────┘  └───────────┬────────────────┘       │
│                       │                        │                         │
│  ┌────────────────────▼────────────────────────▼───────────────────┐    │
│  │                          Redis Cluster                           │    │
│  │  • Session caching                                               │    │
│  │  • Rate limiting                                                 │    │
│  │  • Real-time pub/sub                                            │    │
│  └────────────────────────────────┬────────────────────────────────┘    │
│                                   │                                      │
│  ┌────────────────────────────────▼────────────────────────────────┐    │
│  │                    PostgreSQL Cluster                            │    │
│  │  ┌─────────────────┐    ┌─────────────────┐                     │    │
│  │  │  Primary (Write)│───▶│ Replica (Read)  │                     │    │
│  │  └─────────────────┘    └─────────────────┘                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Task Queue (Celery)                         │    │
│  │  • Export generation                                             │    │
│  │  • Email notifications                                           │    │
│  │  • ARIA analysis (async)                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Capacity: ~100,000 concurrent users                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Performance Optimizations

| Optimization | Current State | Future Enhancement |
|--------------|---------------|-------------------|
| Database Queries | Async SQLAlchemy | Query caching, read replicas |
| API Responses | JSON serialization | Response compression, pagination |
| Static Assets | Vercel CDN | CloudFlare edge caching |
| ARIA Analysis | Synchronous | Async task queue |
| File Uploads | Direct to Supabase | CDN + optimized upload |
| Real-time | Polling | WebSocket + Redis pub/sub |

---

## Quick Reference

### Key Configuration Files

| File | Purpose |
|------|---------|
| `app/core/config.py` | All application settings (Pydantic Settings) |
| `app/core/database.py` | SQLAlchemy async engine and session |
| `app/core/security.py` | JWT creation, password hashing |
| `app/api/v1/router.py` | Main API router combining all endpoints |
| `alembic.ini` | Database migration configuration |
| `requirements.txt` | Python dependencies |
| `next.config.ts` | Next.js configuration |
| `lib/api.ts` | Frontend API client |

### Environment Variables

```bash
# Core
ENVIRONMENT=development|production
SECRET_KEY=<jwt-secret>
API_VERSION=v1

# Database
DATABASE_URL=postgresql+asyncpg://...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_KEY=<key>

# AI Services
ANTHROPIC_API_KEY=<key>
OPENAI_API_KEY=<key>
ARIA_DEFAULT_PROVIDER=claude|openai

# Video
DAILY_API_KEY=<key>
DAILY_DOMAIN=cg-mvp.daily.co

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASSWORD=<key>

# Payments
STRIPE_SECRET_KEY=<key>
STRIPE_PUBLISHABLE_KEY=<key>
```

---

## See Also

- [OVERVIEW.md](./OVERVIEW.md) - Executive system overview
- [TECHNICAL_STACK.md](./TECHNICAL_STACK.md) - Technology breakdown
- [FEATURES_BREAKDOWN.md](./FEATURES_BREAKDOWN.md) - Feature documentation
- [API_REFERENCE.md](../api/API_REFERENCE.md) - Complete API documentation
- [SCHEMA.md](../database/SCHEMA.md) - Database schema

---

*For questions or clarifications, see the detailed documentation in each section.*
