# Professional Portal - Legal Practice Management System

**Last Updated:** January 18, 2026
**Version:** 1.6.0
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Types & Roles](#user-types--roles)
4. [Core Features](#core-features)
5. [Access Control Model](#access-control-model)
6. [Database Models](#database-models)
7. [API Integration](#api-integration)
8. [Frontend Routes](#frontend-routes)
9. [Workflows](#workflows)
10. [Configuration](#configuration)
11. [Security & Compliance](#security--compliance)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Professional Portal is a comprehensive case management system designed specifically for family law professionals. It enables attorneys, mediators, paralegals, and other legal professionals to efficiently manage high-conflict custody cases within CommonGround.

### Design Philosophy

The Professional Portal operates on these core principles:

1. **Attorney-Client Privilege**: All communications are encrypted and access-controlled
2. **Audit Trail**: Every action is logged for compliance and accountability
3. **Child-First Focus**: Case data presentation emphasizes child welfare
4. **Court-Ready**: All exports meet legal documentation standards
5. **Dual-Parent Consent**: Professionals access cases only with parent authorization

### Key Capabilities

| Capability | Description |
|------------|-------------|
| Case Management | View and manage assigned custody cases |
| ARIA Controls | Configure AI mediation settings per case |
| Timeline View | Chronological feed of all case events |
| Communications | Monitor parent-to-parent messages |
| Client Messaging | Direct attorney-client communication |
| Intake Center | AI-assisted client interviews |
| Compliance Tracking | Exchange and financial compliance metrics |
| Court Exports | Generate evidence packages for court |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Professional Portal Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │ Frontend Layer  │   │  API Layer      │   │ Service Layer   │           │
│  │                 │   │                 │   │                 │           │
│  │ • Dashboard     │   │ /professional/* │   │ FirmService     │           │
│  │ • Case Views    │◄──►• Profile       │◄──►• DashboardSvc   │           │
│  │ • ARIA Panel    │   │ • Firms        │   │ • TimelineSvc   │           │
│  │ • Intake Center │   │ • Cases        │   │ • AccessSvc     │           │
│  │ • Messaging     │   │ • Messaging    │   │ • MessageSvc    │           │
│  └─────────────────┘   │ • Intake       │   │ • IntakeSvc     │           │
│                        └─────────────────┘   └────────┬────────┘           │
│                                                       │                     │
│                                         ┌─────────────▼─────────────┐       │
│                                         │     Database Layer        │       │
│                                         ├───────────────────────────┤       │
│                                         │ • ProfessionalProfile     │       │
│                                         │ • Firm / FirmMembership   │       │
│                                         │ • CaseAssignment          │       │
│                                         │ • ProfessionalMessage     │       │
│                                         │ • ProfessionalAccessLog   │       │
│                                         └───────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
Backend:
mvp/backend/app/
├── models/professional.py          # All Professional Portal models
├── schemas/professional.py         # Pydantic schemas
├── api/v1/endpoints/professional.py # API endpoints
└── services/professional/
    ├── __init__.py
    ├── firm_service.py             # Firm CRUD, membership
    ├── assignment_service.py       # Case assignments
    ├── dashboard_service.py        # Dashboard aggregation
    ├── timeline_service.py         # Case timeline generation
    ├── access_service.py           # Access requests/invitations
    ├── messaging_service.py        # Professional-client messaging
    └── compliance_service.py       # Compliance metrics

Frontend:
mvp/frontend/app/professional/
├── layout.tsx                      # Portal layout with navigation
├── dashboard/page.tsx              # Main dashboard
├── cases/
│   ├── page.tsx                    # Case list
│   └── [familyFileId]/
│       ├── page.tsx                # Case overview
│       ├── timeline/page.tsx       # Case timeline
│       ├── communications/page.tsx # Parent messages
│       ├── aria/page.tsx           # ARIA controls
│       ├── compliance/page.tsx     # Compliance dashboard
│       ├── exports/page.tsx        # Export generation
│       └── messages/page.tsx       # Client messaging
├── intake/
│   ├── page.tsx                    # Intake list
│   ├── new/page.tsx                # Create intake
│   └── [sessionId]/page.tsx        # Intake detail
├── firm/
│   ├── page.tsx                    # Firm settings
│   ├── team/page.tsx               # Team management
│   └── templates/page.tsx          # Template management
├── profile/page.tsx                # Professional profile
├── onboarding/page.tsx             # First-time setup
└── access-requests/page.tsx        # Pending invitations
```

---

## User Types & Roles

### Professional Types

| Type | Description | Typical Access |
|------|-------------|----------------|
| `practice_admin` | Firm administrator | Full firm access, all cases |
| `intake_coordinator` | Client intake specialist | Intake sessions, limited case view |
| `attorney` | Licensed attorney | Full case access for assigned cases |
| `paralegal` | Legal assistant | Limited case access, no ARIA controls |
| `mediator` | Neutral mediator | Both parties, read-only ARIA |
| `parenting_coordinator` | Court-appointed PC | Both parties, compliance focus |

### Firm Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full firm control, billing, delete firm |
| `admin` | Manage members, templates, settings |
| `attorney` | View/manage assigned cases |
| `paralegal` | View assigned cases, limited actions |
| `intake` | Create intakes, view intake data |
| `readonly` | View-only access |

### Assignment Roles

| Role | Description | Representing |
|------|-------------|--------------|
| `lead_attorney` | Primary case attorney | One parent |
| `associate` | Supporting attorney | One parent |
| `paralegal` | Legal support staff | One parent |
| `mediator` | Neutral third party | Both parents |
| `parenting_coordinator` | Court-appointed | Both parents (court) |
| `intake_coordinator` | Initial client contact | Varies |

---

## Core Features

### 1. Dashboard

The professional dashboard aggregates data across all assigned cases:

**Key Metrics:**
- Active case count
- Pending intakes
- Unread messages
- Pending access approvals

**Alerts System:**
```python
Alert Types:
- court_deadline: Upcoming court deadlines
- intake_pending: Intakes awaiting review
- access_request: New case invitations
- aria_flag: High-severity ARIA interventions
- compliance_issue: Exchange or financial issues
```

**Upcoming Events:**
- Court hearings
- Mediation sessions
- Custody exchanges
- Document deadlines

### 2. Case Management

**Case List Features:**
- Filter by status (active, on_hold, completed)
- Filter by assignment role
- Filter by firm
- Search by case name or parent name
- Sort by activity, deadline, name

**Case Overview:**
- Parent information and contact details
- Children profiles
- Agreement status
- Compliance summary
- ARIA health metrics
- Recent activity feed

### 3. Case Timeline

Chronological view of all case events:

**Event Types:**
| Type | Icon | Description |
|------|------|-------------|
| `message` | MessageSquare | Parent-to-parent messages |
| `exchange` | Calendar | Custody exchange events |
| `agreement` | FileText | Agreement updates |
| `court` | Scale | Court events |
| `aria` | Bot | ARIA interventions |

**Features:**
- Filter by event type
- Date range selection
- Export to PDF
- Click-through to details

### 4. ARIA Control Panel

Professionals with `can_control_aria` permission can:

**View:**
- Current ARIA settings
- Intervention history
- Good faith metrics
- Communication trends

**Configure:**
- Sensitivity level (low, medium, high, very_high)
- Intervention mode (suggest, block, monitor)
- Blocked categories
- Custom triggers

**Review:**
- All ARIA flags with original/suggested content
- Parent actions (accepted, rejected, modified)
- Trend analysis over time

### 5. Professional-Client Messaging

Secure communication channel between professionals and their clients:

**Features:**
- Subject line for organization
- Thread management
- Read receipts
- Notification settings
- Audit logging

**Security:**
- Messages encrypted at rest
- Access logged
- Visible only to assigned professional and client
- Not visible to other parent (unless both-party role)

### 6. Intake Center

AI-assisted client intake management:

**Session States:**
- `draft`: Not yet sent to client
- `in_progress`: Client actively completing
- `completed`: Client finished, pending review
- `archived`: Reviewed and closed

**Features:**
- Create intake with firm template
- Send intake link to client
- View conversation transcript
- Review extracted data
- Request clarification
- Generate summary
- Convert to case

### 7. Compliance Tracking

Monitor case compliance metrics:

**Exchange Compliance:**
- On-time percentage
- Missed exchanges
- Late notifications
- GPS verification status

**Financial Compliance:**
- Obligation fulfillment rate
- Payment timeliness
- Disputed expenses
- Outstanding balances

---

## Access Control Model

### Access Request Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Access Request Workflow                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. Initiation                                                            │
│     ┌─────────────────┐                 ┌─────────────────┐              │
│     │ Parent Invites  │      OR         │ Professional    │              │
│     │ Professional    │                 │ Requests Access │              │
│     └────────┬────────┘                 └────────┬────────┘              │
│              │                                   │                        │
│              └─────────────┬─────────────────────┘                        │
│                            ▼                                              │
│  2. Access Request Created                                                │
│     ┌───────────────────────────────────────────┐                        │
│     │ ProfessionalAccessRequest                 │                        │
│     │ • family_file_id                          │                        │
│     │ • professional_email or professional_id   │                        │
│     │ • requested_scopes                        │                        │
│     │ • status: pending                         │                        │
│     └───────────────────────┬───────────────────┘                        │
│                             │                                             │
│  3. Consent Collection (if required)                                      │
│              ┌──────────────┴──────────────┐                              │
│              ▼                             ▼                              │
│     ┌─────────────────┐           ┌─────────────────┐                    │
│     │ Parent A        │           │ Parent B        │                    │
│     │ Approves        │           │ Approves        │                    │
│     └────────┬────────┘           └────────┬────────┘                    │
│              │                             │                              │
│              └─────────────┬───────────────┘                              │
│                            ▼                                              │
│  4. Both Parents Approved                                                 │
│     ┌───────────────────────────────────────────┐                        │
│     │ Access Request: status = approved          │                        │
│     └───────────────────────┬───────────────────┘                        │
│                             │                                             │
│  5. Assignment Created                                                    │
│     ┌───────────────────────────────────────────┐                        │
│     │ CaseAssignment                            │                        │
│     │ • professional_id                         │                        │
│     │ • family_file_id                          │                        │
│     │ • assignment_role                         │                        │
│     │ • access_scopes                           │                        │
│     │ • status: active                          │                        │
│     └───────────────────────────────────────────┘                        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Access Scopes

| Scope | Description | Data Access |
|-------|-------------|-------------|
| `agreement` | View/manage agreements | Agreement text, versions, approval status |
| `schedule` | View schedule | Events, exchanges, calendar |
| `messages` | View communications | Parent-to-parent messages, ARIA flags |
| `financials` | View finances | ClearFund expenses, obligations |
| `compliance` | View compliance | Exchange/financial metrics |
| `interventions` | View ARIA data | All ARIA interventions, metrics |

### Dual-Parent Consent

By default, both parents must approve professional access. This can be configured:

```python
# Case-level setting
consent_required = "both"  # Both parents must approve
consent_required = "one"   # Either parent can grant access
consent_required = "court" # Court-appointed, no parent consent needed
```

---

## Database Models

### ProfessionalProfile

```python
class ProfessionalProfile(Base):
    __tablename__ = "professional_profiles"

    id: UUID
    user_id: UUID (FK -> users.id, unique)
    professional_type: Enum  # attorney, mediator, paralegal, etc.

    # License information
    license_number: str
    license_state: str
    license_verified: bool
    license_verified_at: datetime

    # Credentials
    credentials: JSON  # bar_number, certifications
    practice_areas: JSON  # ["custody", "divorce", "mediation"]

    # Settings
    default_intake_template: UUID
    notification_preferences: JSON

    # Status
    is_active: bool
    onboarded_at: datetime

    # Legacy migration
    court_professional_id: UUID  # Link to old CourtProfessional if migrated
```

### Firm

```python
class Firm(Base):
    __tablename__ = "firms"

    id: UUID
    name: str
    slug: str (unique)
    firm_type: Enum  # law_firm, mediation_practice, court_services, solo_practice

    # Contact
    email: str
    phone: str
    website: str

    # Address
    address_line1: str
    address_line2: str
    city: str
    state: str
    zip_code: str

    # Branding
    logo_url: str
    primary_color: str

    # Settings
    settings: JSON  # default_intake_forms, aria_provider

    # Billing
    stripe_customer_id: str
    subscription_tier: str
    subscription_status: str

    # Status
    is_active: bool
    is_public: bool  # Visible in directory
    created_by: UUID (FK -> users.id)
```

### FirmMembership

```python
class FirmMembership(Base):
    __tablename__ = "firm_memberships"

    id: UUID
    professional_id: UUID (FK -> professional_profiles.id)
    firm_id: UUID (FK -> firms.id)

    role: Enum  # owner, admin, attorney, paralegal, intake, readonly
    custom_permissions: JSON

    status: Enum  # active, invited, suspended, removed
    invited_at: datetime
    joined_at: datetime
    invited_by: UUID (FK -> users.id)

    __table_args__ = (UniqueConstraint('professional_id', 'firm_id'),)
```

### CaseAssignment

```python
class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id: UUID
    professional_id: UUID (FK -> professional_profiles.id)
    firm_id: UUID (FK -> firms.id)
    family_file_id: UUID (FK -> family_files.id)
    case_id: UUID (FK -> cases.id, nullable)  # Legacy support

    assignment_role: Enum  # lead_attorney, associate, paralegal, mediator, etc.
    representing: Enum  # parent_a, parent_b, both, court

    # Permissions
    access_scopes: JSON  # ["agreement", "schedule", "messages", "financials"]
    can_control_aria: bool
    aria_preferences: JSON
    can_message_client: bool

    # Status
    status: Enum  # active, on_hold, completed, withdrawn
    assigned_at: datetime
    completed_at: datetime
    internal_notes: str
```

### ProfessionalAccessRequest

```python
class ProfessionalAccessRequest(Base):
    __tablename__ = "professional_access_requests"

    id: UUID
    family_file_id: UUID (FK -> family_files.id)

    # Professional (one of these)
    professional_id: UUID (FK, nullable)  # If known professional
    professional_email: str  # If inviting by email
    firm_id: UUID (FK, nullable)

    # Request details
    requested_by: Enum  # parent, professional
    requested_by_user_id: UUID (FK -> users.id)
    requested_scopes: JSON

    # Consent tracking
    status: Enum  # pending, approved, declined, expired
    parent_a_approved: bool
    parent_b_approved: bool
    parent_a_approved_at: datetime
    parent_b_approved_at: datetime

    # Resolution
    approved_at: datetime
    declined_at: datetime
    decline_reason: str
    expires_at: datetime
```

### ProfessionalMessage

```python
class ProfessionalMessage(Base):
    __tablename__ = "professional_messages"

    id: UUID
    family_file_id: UUID (FK -> family_files.id)
    case_assignment_id: UUID (FK -> case_assignments.id)

    sender_id: UUID (FK -> users.id)
    sender_type: Enum  # professional, parent
    recipient_id: UUID (FK -> users.id)

    subject: str
    content: str

    is_read: bool
    read_at: datetime
    sent_at: datetime
    thread_id: UUID  # For threading
```

### ProfessionalAccessLog

```python
class ProfessionalAccessLog(Base):
    __tablename__ = "professional_access_logs"

    id: UUID
    professional_id: UUID (FK -> professional_profiles.id)
    firm_id: UUID (FK, nullable)
    family_file_id: UUID (FK -> family_files.id)

    action: Enum  # view_messages, export_report, control_aria, send_intake, message_client
    resource_type: str
    resource_id: UUID
    details: JSON

    ip_address: str
    user_agent: str
    logged_at: datetime
```

---

## API Integration

### Authentication

All Professional Portal endpoints require:
1. Valid JWT access token
2. Active ProfessionalProfile linked to user
3. Active FirmMembership (for firm-scoped operations)

```python
@router.get("/professional/cases")
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    professional: ProfessionalProfile = Depends(get_current_professional)
):
    # professional dependency validates:
    # - User has professional profile
    # - Profile is active
    # - Returns ProfessionalProfile object
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `PROFESSIONAL_PROFILE_REQUIRED` | 403 | User doesn't have professional profile |
| `PROFESSIONAL_PROFILE_INACTIVE` | 403 | Professional profile is deactivated |
| `FIRM_MEMBERSHIP_REQUIRED` | 403 | Not a member of any firm |
| `FIRM_ACCESS_DENIED` | 403 | Not authorized for this firm |
| `CASE_NOT_ASSIGNED` | 403 | Not assigned to this case |
| `SCOPE_NOT_GRANTED` | 403 | Missing required access scope |
| `ARIA_CONTROL_DENIED` | 403 | Cannot control ARIA for this case |
| `ACCESS_REQUEST_EXPIRED` | 400 | Access request has expired |
| `DUAL_CONSENT_REQUIRED` | 400 | Both parents must approve |

### Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Dashboard | 60 | 1 minute |
| Case views | 100 | 1 minute |
| ARIA updates | 10 | 1 minute |
| Message send | 30 | 1 minute |
| Export generation | 5 | 1 hour |

---

## Frontend Routes

### Route Structure

| Route | Page | Description |
|-------|------|-------------|
| `/professional` | Redirect | Redirects to /dashboard |
| `/professional/dashboard` | Dashboard | Main overview |
| `/professional/cases` | CaseList | All assigned cases |
| `/professional/cases/[id]` | CaseOverview | Case detail |
| `/professional/cases/[id]/timeline` | Timeline | Event timeline |
| `/professional/cases/[id]/communications` | Communications | Parent messages |
| `/professional/cases/[id]/aria` | ARIAPanel | ARIA controls |
| `/professional/cases/[id]/compliance` | Compliance | Metrics dashboard |
| `/professional/cases/[id]/exports` | Exports | Generate exports |
| `/professional/cases/[id]/messages` | ClientMessaging | Attorney-client chat |
| `/professional/intake` | IntakeList | All intakes |
| `/professional/intake/new` | CreateIntake | New intake |
| `/professional/intake/[id]` | IntakeDetail | Session detail |
| `/professional/intake/[id]/transcript` | Transcript | Full conversation |
| `/professional/intake/[id]/outputs` | Outputs | Summary, data |
| `/professional/firm` | FirmSettings | Firm configuration |
| `/professional/firm/team` | TeamManagement | Members |
| `/professional/firm/templates` | Templates | Intake templates |
| `/professional/profile` | Profile | Professional settings |
| `/professional/onboarding` | Onboarding | First-time setup |
| `/professional/access-requests` | AccessRequests | Pending invitations |

### Protected Layout

The `/professional/*` routes are wrapped in a layout that:
1. Validates professional profile exists
2. Provides professional context (profile, firms, active firm)
3. Renders sidebar navigation
4. Shows firm switcher in header

---

## Workflows

### 1. Professional Onboarding

```
1. User clicks "Register as Professional"
2. Redirected to /professional/onboarding
3. Complete profile form:
   - Professional type
   - License information
   - Practice areas
   - Credentials
4. ProfessionalProfile created
5. Option to create firm or join existing
6. If creating firm:
   - Complete firm details
   - Become firm owner
7. Redirected to /professional/dashboard
```

### 2. Parent Invites Professional

```
1. Parent goes to /family-files/[id]/settings
2. Clicks "Invite Professional"
3. Enters professional email OR searches firm directory
4. Selects access scopes
5. ProfessionalAccessRequest created
6. If dual consent required:
   - Other parent notified
   - Both must approve
7. Professional receives email notification
8. Professional logs in, sees pending request
9. Professional accepts, selects role
10. CaseAssignment created
11. Case appears in professional's dashboard
```

### 3. Case Review Workflow

```
1. Professional opens case from dashboard
2. Reviews case overview (parties, children, status)
3. Views timeline for recent activity
4. Reviews communications if concerning
5. Checks ARIA intervention history
6. Adjusts ARIA settings if needed
7. Reviews compliance metrics
8. Sends message to client if action needed
9. Generates export for court if required
```

### 4. Intake Completion Workflow

```
1. Intake coordinator creates new intake
2. Client receives email with intake link
3. Client completes AI-guided interview
4. Session marked as completed
5. Coordinator receives notification
6. Coordinator reviews transcript
7. Reviews extracted data
8. Requests clarification if needed
9. Generates summary
10. Creates case assignment if applicable
```

---

## Configuration

### Environment Variables

```bash
# Professional Portal specific
PROFESSIONAL_LICENSE_VERIFICATION_API=https://...  # Optional: auto-verify licenses
PROFESSIONAL_DEFAULT_CONSENT_MODE=both  # both, one, court
PROFESSIONAL_ACCESS_REQUEST_EXPIRY_DAYS=7
PROFESSIONAL_MAX_FIRMS_PER_USER=5
```

### Firm Settings

```json
{
  "default_intake_forms": ["custody_standard", "divorce_standard"],
  "aria_provider": "anthropic",
  "require_license_verification": true,
  "allow_paralegal_aria_control": false,
  "default_access_scopes": ["agreement", "schedule", "messages"],
  "auto_assign_intakes": true,
  "notification_preferences": {
    "new_case_email": true,
    "daily_digest": true,
    "aria_alerts": true
  }
}
```

---

## Security & Compliance

### Data Access Controls

1. **Role-Based Access**: Permissions based on professional type and firm role
2. **Scope-Based Access**: Case access limited by granted scopes
3. **Time-Based Access**: Access requests expire after 7 days
4. **Audit Logging**: All actions logged with IP/user agent

### Audit Log Events

| Action | Logged Data |
|--------|-------------|
| `view_case` | case_id, scopes_used |
| `view_messages` | case_id, message_count |
| `update_aria` | case_id, old_settings, new_settings |
| `send_message` | case_id, recipient_id |
| `generate_export` | case_id, export_type |
| `access_granted` | case_id, scopes, granted_by |
| `access_revoked` | case_id, revoked_by, reason |

### Compliance Considerations

- **HIPAA**: Child health information protected
- **Attorney-Client Privilege**: Professional messages segregated
- **Court Orders**: Access can be mandated by court
- **Data Retention**: Logs retained per jurisdiction requirements

---

## Troubleshooting

### Common Issues

**Issue: "Professional profile required" error**
```
Solution: User must complete onboarding at /professional/onboarding
```

**Issue: Case not appearing in dashboard**
```
Check:
1. CaseAssignment exists and status = 'active'
2. Professional is logged in with correct account
3. Firm filter is not hiding the case
```

**Issue: Cannot modify ARIA settings**
```
Check:
1. Assignment has can_control_aria = true
2. Professional type is authorized (not paralegal by default)
3. Case status is active
```

**Issue: Access request stuck in pending**
```
Check:
1. Both parents have been notified
2. Request hasn't expired (7 days default)
3. Parent accounts are active
```

### Debug Endpoints

```
GET /professional/debug/profile     # Current professional profile
GET /professional/debug/assignments # All case assignments
GET /professional/debug/access-log  # Recent access log entries
```

---

## Related Documentation

| Document | Location | Description |
|----------|----------|-------------|
| API Reference | `/docs/api/API_REFERENCE.md` | Full endpoint documentation |
| Setup Guide | `/docs/guides/SETUP_GUIDE.md` | Development setup |
| ARIA Documentation | `/docs/features/ARIA.md` | ARIA system details |
| Security Guide | `/docs/operations/SECURITY.md` | Security best practices |

---

*Last Updated: January 18, 2026*
*Version: 1.6.0*
