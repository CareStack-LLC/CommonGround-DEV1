# ClearFund - Purpose-Locked Financial Obligations System

**Last Updated:** January 10, 2026
**Version:** 1.0.0
**Module:** Financial Tracking & Expense Management

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Concepts](#core-concepts)
4. [Database Models](#database-models)
5. [Obligation Lifecycle](#obligation-lifecycle)
6. [API Reference](#api-reference)
7. [Funding & Payment Flow](#funding--payment-flow)
8. [Verification System](#verification-system)
9. [Ledger & FIFO Accounting](#ledger--fifo-accounting)
10. [Analytics & Reporting](#analytics--reporting)
11. [Court Integration](#court-integration)
12. [Configuration](#configuration)
13. [Frontend Integration](#frontend-integration)

---

## Overview

### What is ClearFund?

ClearFund is CommonGround's purpose-locked financial obligations system that transforms child-related expenses into verifiable, trackable transactions with court-ready records. Unlike traditional expense tracking, ClearFund ensures every dollar is allocated to a specific purpose and verified before completion.

### Key Invariants

The ClearFund system maintains seven critical invariants:

1. **Platform Never Holds Money** - All funds flow through Stripe; CommonGround is never a custodian
2. **Immutable Purpose** - Obligation purposes cannot be changed after creation
3. **FIFO Payment Application** - All credits are applied first-in, first-out to oldest obligations
4. **No Obligation Closes Without Verification** - Verification required before completion
5. **Spending Verification ≠ Surveillance** - Track purpose compliance, not micro-manage spending
6. **All State Transitions Logged** - Complete audit trail for court admissibility
7. **Parents Cannot Relabel History** - Historical records are immutable

### Core Value Proposition

| Traditional Expense Tracking | ClearFund |
|------------------------------|-----------|
| "Trust me, I spent it on the kids" | Cryptographic proof of purpose |
| After-the-fact arguments | Pre-agreed obligations with splits |
| No accountability | Attestations and verification |
| Manual record keeping | Automatic ledger with FIFO |
| Word-against-word in court | Court-ready evidence packages |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ClearFund System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Obligation  │───▶│   Funding    │───▶│ Verification │      │
│  │  Creation    │    │   Tracking   │    │   System     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              Payment Ledger (FIFO)                  │       │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │       │
│  │  │Entry 1 │→│Entry 2 │→│Entry 3 │→│Entry N │       │       │
│  │  └────────┘ └────────┘ └────────┘ └────────┘       │       │
│  └─────────────────────────────────────────────────────┘       │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Balance    │    │  Compliance  │    │    Court     │      │
│  │   Summary    │    │   Reports    │    │   Exports    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │      Stripe      │
                    │  (Payment Rail)  │
                    └──────────────────┘
```

### Service Components

```
app/
├── models/
│   ├── clearfund.py          # Obligation, Funding, Attestation, Verification
│   └── payment.py            # Payment, ExpenseRequest, PaymentLedger
├── schemas/
│   └── clearfund.py          # Pydantic schemas for all ClearFund operations
├── services/
│   └── clearfund.py          # ClearFundService, LedgerService
└── api/v1/endpoints/
    └── clearfund.py          # REST API endpoints
```

---

## Core Concepts

### 1. Obligations

An **Obligation** is a purpose-locked financial commitment that both parents must fund according to their agreed split. Key characteristics:

- **Immutable Purpose**: Cannot be changed after creation
- **Split Tracking**: Each parent's share is calculated and tracked
- **Lifecycle States**: Progress through defined states from open to completed
- **Verification Required**: Must prove funds were spent as intended

### 2. Purpose Categories

```python
OBLIGATION_CATEGORIES = [
    "medical",          # Doctor visits, prescriptions, therapy
    "education",        # Tuition, books, school supplies
    "sports",           # Equipment, fees, uniforms
    "device",           # Phones, tablets, computers
    "camp",             # Summer camp, day camp
    "clothing",         # Seasonal clothes, shoes
    "transportation",   # Travel, gas, car expenses
    "child_support",    # Monthly support payments
    "extracurricular",  # Music lessons, clubs
    "childcare",        # Daycare, babysitting
    "other"             # Miscellaneous
]
```

### 3. Source Types

Obligations can originate from:

```python
OBLIGATION_SOURCE_TYPES = [
    "court_order",      # Court-mandated expenses
    "agreement",        # From SharedCare Agreement
    "request"           # One-time expense request
]
```

### 4. Attestations

An **Attestation** is a sworn statement from the parent creating an expense request. It includes:

- **Purpose Declaration**: What the funds will be used for
- **Receipt Commitment**: Commitment to provide proof
- **Legal Acknowledgment**: Understanding that this is a legal record
- **Capture Details**: IP address, user agent, timestamp for authenticity

### 5. Verification Artifacts

**Verification Artifacts** are proof that funds were spent as intended:

```python
ARTIFACT_TYPES = [
    "transaction",          # Stripe/bank transaction data
    "receipt",              # Uploaded receipt image
    "vendor_confirmation",  # Direct vendor confirmation
    "manual"                # Manual verification entry
]
```

---

## Database Models

### Obligation Model

```python
class Obligation(Base, UUIDMixin, TimestampMixin):
    """Financial obligation for a specific purpose."""

    __tablename__ = "obligations"

    # Context (one should be set)
    case_id: Optional[str]           # Court case context (legacy)
    family_file_id: Optional[str]    # Family file context (preferred)
    agreement_id: Optional[str]      # SharedCare Agreement link

    # Source
    source_type: str                 # court_order, agreement, request
    source_id: Optional[str]         # Reference to source document

    # Purpose (immutable after creation)
    purpose_category: str            # medical, education, sports, etc.
    title: str                       # Brief description
    description: Optional[str]       # Detailed description
    child_ids: list                  # Children affected (JSON)

    # Financial Details
    total_amount: Decimal            # Total obligation amount
    petitioner_share: Decimal        # Amount petitioner owes
    respondent_share: Decimal        # Amount respondent owes
    petitioner_percentage: int       # Split percentage (0-100)

    # Tracking
    due_date: Optional[datetime]     # When payment is due
    status: str                      # Lifecycle status
    amount_funded: Decimal           # Total funded so far
    amount_spent: Decimal            # Amount spent
    amount_verified: Decimal         # Amount verified

    # Verification Requirements
    verification_required: bool      # Require verification?
    receipt_required: bool           # Require receipt upload?
    receipt_deadline_hours: int      # Hours after spend (default: 72)

    # Recurring Support
    is_recurring: bool               # Is this recurring?
    recurrence_rule: Optional[str]   # iCal RRULE format
    parent_obligation_id: Optional[str]  # Template link

    # Audit
    created_by: str                  # User ID who created

    # Lifecycle Timestamps
    funded_at: Optional[datetime]
    verified_at: Optional[datetime]
    completed_at: Optional[datetime]
    expired_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    cancellation_reason: Optional[str]
```

### ObligationFunding Model

```python
class ObligationFunding(Base, UUIDMixin, TimestampMixin):
    """Track funding contributions from each parent."""

    __tablename__ = "obligation_funding"

    obligation_id: str               # Link to obligation
    parent_id: str                   # User ID

    amount_required: Decimal         # What they owe
    amount_funded: Decimal           # What they've paid

    stripe_payment_intent_id: Optional[str]
    payment_method: Optional[str]    # card, bank_transfer, existing_credit

    is_fully_funded: bool            # Have they paid in full?
    funded_at: Optional[datetime]    # When they completed
    notes: Optional[str]
```

### Attestation Model

```python
class Attestation(Base, UUIDMixin, TimestampMixin):
    """Sworn statement from parent creating expense request."""

    __tablename__ = "attestations"

    obligation_id: str               # One-to-one with obligation
    attesting_parent_id: str         # Who made the attestation

    # The Sworn Statement (immutable)
    attestation_text: str            # Full sworn statement
    purpose_declaration: str         # Specific purpose declaration

    # Commitments
    receipt_commitment: bool         # "I will provide receipt"
    purpose_commitment: bool         # "Funds for stated purpose"
    legal_acknowledgment: bool       # "I understand this is legal"

    # Capture for Authenticity
    ip_address: Optional[str]
    user_agent: Optional[str]
    attested_at: datetime            # Precise timestamp
```

### VerificationArtifact Model

```python
class VerificationArtifact(Base, UUIDMixin, TimestampMixin):
    """Proof that funds were spent as intended."""

    __tablename__ = "verification_artifacts"

    obligation_id: str               # Link to obligation
    artifact_type: str               # transaction, receipt, etc.

    # Transaction Details
    stripe_transaction_id: Optional[str]
    vendor_name: Optional[str]
    vendor_mcc: Optional[str]        # Merchant category code
    transaction_date: Optional[datetime]

    amount_verified: Decimal         # How much this verifies

    # Receipt/Document
    receipt_url: Optional[str]
    receipt_file_name: Optional[str]
    receipt_file_type: Optional[str]
    receipt_hash: Optional[str]      # SHA-256 for integrity

    # Verification Metadata
    verified_by: Optional[str]       # User who verified
    verification_method: Optional[str]  # automatic, manual, court_order
    verification_notes: Optional[str]
    verified_at: datetime
```

### PaymentLedger Model

```python
class PaymentLedger(Base, UUIDMixin, TimestampMixin):
    """FIFO ledger entry for payment tracking."""

    __tablename__ = "payment_ledger"

    case_id: Optional[str]           # Case context
    family_file_id: Optional[str]    # Family file context

    entry_type: str                  # obligation, payment, credit, adjustment

    obligor_id: str                  # Who owes
    obligee_id: str                  # Who is owed

    amount: Decimal                  # Entry amount
    running_balance: Decimal         # Balance after this entry

    # References
    payment_id: Optional[str]
    expense_request_id: Optional[str]
    obligation_id: Optional[str]

    # FIFO Tracking
    fifo_applied_to: Optional[str]   # Which obligation consumed credit
    fifo_remaining: Optional[Decimal]  # Unapplied credit amount
    fifo_applied_at: Optional[datetime]

    credit_source: Optional[str]     # payment, prepayment, refund, adjustment

    description: str                 # Human-readable description
    effective_date: datetime         # When this takes effect

    is_reconciled: bool              # Has been reconciled?
    reconciled_at: Optional[datetime]
```

### Entity Relationships

```
Obligation (1) ─────────── (N) ObligationFunding
     │
     ├─────────── (1) Attestation
     │
     └─────────── (N) VerificationArtifact
     │
     └─────────── (1) VirtualCardAuthorization (v2)

PaymentLedger ──────────── References Obligations

Case/FamilyFile ─────────── (N) Obligations
```

---

## Obligation Lifecycle

### Status States

```python
OBLIGATION_STATUSES = [
    "open",                 # Created, awaiting funding
    "partially_funded",     # Some funds received
    "funded",               # Full amount received
    "authorized",           # Virtual card issued (v2)
    "pending_verification", # Awaiting receipt/confirmation
    "verified",             # Transaction confirmed
    "completed",            # Obligation fulfilled
    "expired",              # Due date passed
    "cancelled"             # Manually cancelled
]
```

### State Machine Diagram

```
                        ┌─────────────────┐
                        │     OPEN        │
                        │ (awaiting $)    │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
           partial funding              full funding
                    │                         │
                    ▼                         ▼
        ┌──────────────────┐      ┌──────────────────┐
        │ PARTIALLY_FUNDED │─────▶│     FUNDED       │
        │ (some $ received)│      │ (all $ received) │
        └──────────────────┘      └────────┬─────────┘
                                           │
                                   spending occurs
                                           │
                                           ▼
                               ┌──────────────────────┐
                               │ PENDING_VERIFICATION │
                               │ (awaiting proof)     │
                               └──────────┬───────────┘
                                          │
                                  verification added
                                          │
                                          ▼
                               ┌──────────────────┐
                               │    VERIFIED      │
                               │ (proof provided) │
                               └────────┬─────────┘
                                        │
                                mark complete
                                        │
                                        ▼
                               ┌──────────────────┐
                               │   COMPLETED      │
                               │ (obligation met) │
                               └──────────────────┘

Alternative Paths:
─────────────────
OPEN/PARTIALLY_FUNDED ──cancel──▶ CANCELLED
ANY_STATE ──due_date_passed──▶ EXPIRED (if not completed)
```

### State Transition Rules

| From State | To State | Trigger | Requirements |
|------------|----------|---------|--------------|
| open | partially_funded | record_funding | amount > 0, < total |
| open/partially_funded | funded | record_funding | amount >= total |
| funded | pending_verification | record_verification | first artifact added |
| pending_verification | verified | record_verification | amount_verified >= total |
| verified | completed | complete_obligation | verification_required met |
| funded | completed | complete_obligation | verification_required = false |
| open/partially_funded | cancelled | cancel_obligation | reason provided |
| any (non-terminal) | expired | system_check | due_date passed |

---

## API Reference

### Obligation Endpoints

#### Create Obligation

```http
POST /api/v1/clearfund/obligations/
Authorization: Bearer <token>
Content-Type: application/json

{
    "case_id": "uuid",              // Case or Family File ID
    "purpose_category": "medical",
    "title": "Annual checkup for Emma",
    "description": "Pediatrician visit and required vaccinations",
    "child_ids": ["child-uuid-1"],
    "total_amount": 250.00,
    "petitioner_percentage": 60,    // Parent A pays 60%
    "due_date": "2026-02-15T00:00:00Z",
    "verification_required": true,
    "receipt_required": true,
    "source_type": "request"
}
```

**Response (201 Created):**

```json
{
    "id": "obligation-uuid",
    "case_id": "uuid",
    "purpose_category": "medical",
    "title": "Annual checkup for Emma",
    "total_amount": "250.00",
    "petitioner_share": "150.00",
    "respondent_share": "100.00",
    "petitioner_percentage": 60,
    "status": "open",
    "amount_funded": "0.00",
    "amount_verified": "0.00",
    "is_fully_funded": false,
    "funding_percentage": 0.0,
    "created_at": "2026-01-10T12:00:00Z"
}
```

#### List Obligations

```http
GET /api/v1/clearfund/obligations/?case_id=<uuid>&status=open,funded&category=medical
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| case_id | string | Required. Case or Family File ID |
| agreement_id | string | Filter by SharedCare Agreement |
| status | string | Comma-separated statuses |
| category | string | Comma-separated categories |
| is_overdue | boolean | Only overdue obligations |
| page | integer | Page number (default: 1) |
| page_size | integer | Items per page (default: 20, max: 100) |

**Response:**

```json
{
    "items": [
        {
            "id": "uuid",
            "title": "Annual checkup for Emma",
            "total_amount": "250.00",
            "status": "open",
            "is_overdue": false
        }
    ],
    "total": 15,
    "page": 1,
    "page_size": 20,
    "has_more": false
}
```

#### Get Single Obligation

```http
GET /api/v1/clearfund/obligations/{obligation_id}
Authorization: Bearer <token>
```

#### Update Obligation

```http
PUT /api/v1/clearfund/obligations/{obligation_id}
Authorization: Bearer <token>
Content-Type: application/json

{
    "due_date": "2026-03-01T00:00:00Z",
    "notes": "Updated due date per agreement",
    "receipt_required": true
}
```

**Note:** Only `due_date`, `notes`, and `receipt_required` can be updated. Purpose and amounts are immutable.

#### Cancel Obligation

```http
POST /api/v1/clearfund/obligations/{obligation_id}/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
    "reason": "Expense no longer needed - insurance covered the cost"
}
```

### Funding Endpoints

#### Record Funding

```http
POST /api/v1/clearfund/obligations/{obligation_id}/fund
Authorization: Bearer <token>
Content-Type: application/json

{
    "amount": 150.00,
    "stripe_payment_intent_id": "pi_xxx",
    "payment_method": "card",
    "notes": "My share of the medical expense"
}
```

**Response:**

```json
{
    "funding_id": "uuid",
    "amount_funded": "150.00",
    "amount_required": "150.00",
    "is_fully_funded": true,
    "message": "Funding recorded successfully"
}
```

#### Get Funding Status

```http
GET /api/v1/clearfund/obligations/{obligation_id}/funding
Authorization: Bearer <token>
```

**Response:**

```json
{
    "obligation_id": "uuid",
    "total_amount": "250.00",
    "amount_funded": "150.00",
    "funding_percentage": 60.0,
    "is_fully_funded": false,
    "petitioner_funding": {
        "parent_id": "uuid",
        "amount_required": "150.00",
        "amount_funded": "150.00",
        "is_fully_funded": true,
        "funded_at": "2026-01-10T14:00:00Z"
    },
    "respondent_funding": {
        "parent_id": "uuid",
        "amount_required": "100.00",
        "amount_funded": "0.00",
        "is_fully_funded": false,
        "funded_at": null
    }
}
```

### Attestation Endpoints

#### Create Attestation

```http
POST /api/v1/clearfund/obligations/{obligation_id}/attest
Authorization: Bearer <token>
Content-Type: application/json

{
    "attestation_text": "I, John Smith, hereby attest that this expense request for Emma's annual pediatric checkup is a legitimate child-related expense. I understand that providing false information may have legal consequences.",
    "purpose_declaration": "Annual pediatric wellness visit and required vaccinations for Emma Smith, age 8.",
    "receipt_commitment": true,
    "purpose_commitment": true,
    "legal_acknowledgment": true
}
```

**Response (201 Created):**

```json
{
    "id": "attestation-uuid",
    "obligation_id": "obligation-uuid",
    "attesting_parent_id": "user-uuid",
    "attestation_text": "I, John Smith...",
    "purpose_declaration": "Annual pediatric...",
    "receipt_commitment": true,
    "purpose_commitment": true,
    "legal_acknowledgment": true,
    "attested_at": "2026-01-10T12:05:00Z"
}
```

#### Get Attestation

```http
GET /api/v1/clearfund/obligations/{obligation_id}/attestation
Authorization: Bearer <token>
```

### Verification Endpoints

#### Record Verification

```http
POST /api/v1/clearfund/obligations/{obligation_id}/verify
Authorization: Bearer <token>
Content-Type: application/json

{
    "artifact_type": "transaction",
    "vendor_name": "City Pediatrics",
    "vendor_mcc": "8011",
    "transaction_date": "2026-01-15T10:30:00Z",
    "amount_verified": 250.00,
    "stripe_transaction_id": "ch_xxx",
    "verification_notes": "Card transaction at pediatrician office"
}
```

#### Upload Receipt

```http
POST /api/v1/clearfund/obligations/{obligation_id}/receipt
Authorization: Bearer <token>

Query Parameters:
- receipt_url: string (required) - URL of uploaded receipt
- receipt_file_name: string (required) - Original filename
- receipt_file_type: string (default: "image/jpeg") - MIME type
- amount: float (required) - Receipt amount
- vendor_name: string (optional) - Vendor name
```

#### List Verification Artifacts

```http
GET /api/v1/clearfund/obligations/{obligation_id}/artifacts
Authorization: Bearer <token>
```

**Response:**

```json
[
    {
        "id": "artifact-uuid",
        "artifact_type": "receipt",
        "vendor_name": "City Pediatrics",
        "amount_verified": "250.00",
        "receipt_url": "https://storage.../receipt.jpg",
        "verified_at": "2026-01-15T11:00:00Z"
    }
]
```

#### Complete Obligation

```http
POST /api/v1/clearfund/obligations/{obligation_id}/complete
Authorization: Bearer <token>
```

**Requirements:**
- Obligation must be in `verified` or `funded` status
- If `verification_required`, must be in `verified` status

### Ledger Endpoints

#### Get Ledger Entries

```http
GET /api/v1/clearfund/ledger/?case_id=<uuid>&page=1&page_size=50
Authorization: Bearer <token>
```

**Response:**

```json
{
    "items": [
        {
            "id": "entry-uuid",
            "case_id": "case-uuid",
            "entry_type": "payment",
            "obligor_id": "user-uuid",
            "obligee_id": "other-user-uuid",
            "amount": "150.00",
            "running_balance": "100.00",
            "description": "Funding for: Annual checkup for Emma",
            "effective_date": "2026-01-10T14:00:00Z"
        }
    ],
    "total": 25,
    "page": 1,
    "page_size": 50,
    "has_more": false
}
```

#### Get Balance Summary

```http
GET /api/v1/clearfund/ledger/balance?case_id=<uuid>
Authorization: Bearer <token>
```

**Response:**

```json
{
    "case_id": "uuid",
    "petitioner_id": "user-uuid-a",
    "respondent_id": "user-uuid-b",
    "petitioner_balance": "1500.00",
    "respondent_balance": "1200.00",
    "petitioner_owes_respondent": "300.00",
    "respondent_owes_petitioner": "0.00",
    "net_balance": "-300.00",
    "total_obligations_open": 3,
    "total_obligations_funded": 2,
    "total_obligations_completed": 15,
    "total_this_month": "450.00",
    "total_overdue": "150.00"
}
```

#### Record Prepayment

```http
POST /api/v1/clearfund/ledger/prepayment?case_id=<uuid>
Authorization: Bearer <token>
Content-Type: application/json

{
    "amount": 500.00,
    "description": "Advance payment for upcoming school expenses",
    "stripe_payment_intent_id": "pi_xxx"
}
```

### Analytics Endpoints

#### Get Full Analytics

```http
GET /api/v1/clearfund/analytics/?case_id=<uuid>
Authorization: Bearer <token>
```

**Response:**

```json
{
    "case_id": "uuid",
    "balance_summary": { ... },
    "obligation_metrics": {
        "total_open": 3,
        "total_pending_funding": 1,
        "total_funded": 2,
        "total_verified": 1,
        "total_completed": 15,
        "total_overdue": 1,
        "total_cancelled": 0
    },
    "monthly_totals": [],
    "recent_activity": [ ... ]
}
```

#### Get Metrics Only

```http
GET /api/v1/clearfund/analytics/metrics?case_id=<uuid>
Authorization: Bearer <token>
```

---

## Funding & Payment Flow

### Complete Funding Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Parent    │     │  ClearFund  │     │   Stripe    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │  1. Initiate Pay   │                    │
       │───────────────────▶│                    │
       │                    │                    │
       │                    │  2. Create Intent  │
       │                    │───────────────────▶│
       │                    │                    │
       │                    │  3. Client Secret  │
       │                    │◀───────────────────│
       │                    │                    │
       │  4. Payment UI     │                    │
       │◀───────────────────│                    │
       │                    │                    │
       │  5. Card Details   │                    │
       │───────────────────────────────────────▶│
       │                    │                    │
       │  6. Confirmation   │                    │
       │◀───────────────────────────────────────│
       │                    │                    │
       │  7. Record Funding │                    │
       │───────────────────▶│                    │
       │                    │                    │
       │                    │  8. Verify Payment │
       │                    │───────────────────▶│
       │                    │                    │
       │                    │  9. Confirmed      │
       │                    │◀───────────────────│
       │                    │                    │
       │                    │  10. Update Ledger │
       │                    │──────────┐         │
       │                    │          │         │
       │                    │◀─────────┘         │
       │                    │                    │
       │  11. Success       │                    │
       │◀───────────────────│                    │
```

### FIFO Credit Application

When a prepayment or credit exists, it's applied to obligations in order:

```python
# Conceptual FIFO application
async def apply_fifo_credit(case_id: str, credit_amount: Decimal):
    """Apply credit to oldest open obligations first."""

    # Get open obligations, oldest first
    obligations = await db.execute(
        select(Obligation)
        .where(
            Obligation.case_id == case_id,
            Obligation.status.in_(["open", "partially_funded"])
        )
        .order_by(Obligation.created_at.asc())
    )

    remaining_credit = credit_amount

    for obligation in obligations.scalars():
        if remaining_credit <= 0:
            break

        needed = obligation.total_amount - obligation.amount_funded
        applied = min(remaining_credit, needed)

        # Apply credit
        obligation.amount_funded += applied
        remaining_credit -= applied

        # Update status
        if obligation.amount_funded >= obligation.total_amount:
            obligation.status = "funded"
            obligation.funded_at = datetime.utcnow()
        elif obligation.amount_funded > 0:
            obligation.status = "partially_funded"

        # Log ledger entry
        await create_ledger_entry(
            obligation_id=obligation.id,
            amount=applied,
            entry_type="fifo_application"
        )

    return remaining_credit  # Any unapplied credit
```

---

## Verification System

### Verification Methods

1. **Automatic (Stripe Transaction)**
   - Direct Stripe transaction data
   - MCC code validation
   - Amount matching
   - Timestamp verification

2. **Receipt Upload**
   - Image/PDF of receipt
   - SHA-256 hash for integrity
   - Vendor name extraction
   - Amount verification

3. **Vendor Confirmation**
   - Direct vendor confirmation
   - Invoice matching
   - Service verification

4. **Manual Entry**
   - For cash transactions
   - Court-ordered verification
   - Administrative adjustments

### Verification Workflow

```
                    ┌─────────────────┐
                    │   OBLIGATION    │
                    │    FUNDED       │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────┐ ┌──────────────┐
      │   STRIPE     │ │ RECEIPT  │ │   MANUAL     │
      │ TRANSACTION  │ │  UPLOAD  │ │   ENTRY      │
      └──────┬───────┘ └────┬─────┘ └──────┬───────┘
              │              │              │
              │   Validate   │   Validate   │
              │   Amount     │   Hash       │
              │   MCC        │   Amount     │
              ▼              ▼              ▼
      ┌─────────────────────────────────────────┐
      │        CREATE VERIFICATION ARTIFACT      │
      └────────────────────┬────────────────────┘
                           │
                           ▼
             ┌─────────────────────────────┐
             │  amount_verified >= total?  │
             └──────────┬──────────────────┘
                        │
               ┌────────┴────────┐
               │ YES             │ NO
               ▼                 ▼
      ┌──────────────┐   ┌──────────────────┐
      │   VERIFIED   │   │ PENDING_VERIFY   │
      └──────────────┘   │ (needs more)     │
                         └──────────────────┘
```

### Receipt Hash Verification

```python
import hashlib

def calculate_receipt_hash(file_content: bytes) -> str:
    """Calculate SHA-256 hash for receipt integrity."""
    return hashlib.sha256(file_content).hexdigest()

def verify_receipt_integrity(file_content: bytes, stored_hash: str) -> bool:
    """Verify receipt hasn't been tampered with."""
    return calculate_receipt_hash(file_content) == stored_hash
```

---

## Ledger & FIFO Accounting

### Ledger Entry Types

| Type | Description | Example |
|------|-------------|---------|
| obligation | New obligation created | "$250 medical expense created" |
| payment | Direct payment recorded | "$150 card payment" |
| credit | Credit added to account | "$500 prepayment" |
| adjustment | Manual adjustment | "$25 correction" |

### Running Balance Calculation

The running balance is calculated per parent pair:

```python
async def get_running_balance(
    case_id: str,
    obligor_id: str
) -> Decimal:
    """Get current balance for a parent."""

    result = await db.execute(
        select(func.sum(PaymentLedger.amount))
        .where(
            PaymentLedger.case_id == case_id,
            PaymentLedger.obligor_id == obligor_id
        )
    )
    return result.scalar() or Decimal("0")
```

### Sample Ledger

| Date | Type | Description | Amount | Running Balance |
|------|------|-------------|--------|-----------------|
| Jan 1 | obligation | School supplies | $100 | -$100 |
| Jan 5 | payment | Card payment | $100 | $0 |
| Jan 10 | obligation | Sports equipment | $200 | -$200 |
| Jan 12 | credit | Prepayment | $500 | $300 |
| Jan 15 | obligation | Medical copay | $50 | $250 |
| Jan 15 | fifo_apply | Applied to medical | -$50 | $200 |

---

## Analytics & Reporting

### Obligation Metrics

```python
class ObligationMetrics(BaseModel):
    """Dashboard metrics for obligations."""

    total_open: int              # Awaiting funding
    total_pending_funding: int   # Partially funded
    total_funded: int            # Fully funded
    total_verified: int          # Verified spending
    total_completed: int         # Completed obligations
    total_overdue: int           # Past due date
    total_cancelled: int         # Cancelled
```

### Balance Summary

```python
class BalanceSummary(BaseModel):
    """Balance summary for a case."""

    case_id: str
    petitioner_id: str
    respondent_id: str

    petitioner_balance: Decimal  # Total paid
    respondent_balance: Decimal  # Total paid

    petitioner_owes_respondent: Decimal  # Open obligation share
    respondent_owes_petitioner: Decimal  # Open obligation share
    net_balance: Decimal         # Who owes whom overall

    total_obligations_open: int
    total_obligations_funded: int
    total_obligations_completed: int

    total_this_month: Decimal    # New obligations this month
    total_overdue: Decimal       # Unfunded overdue amount
```

### Compliance Report

```python
class ComplianceReport(BaseModel):
    """Compliance report for court."""

    case_id: str
    generated_at: datetime
    period_start: datetime
    period_end: datetime

    # Summary
    total_obligations: int
    obligations_completed_on_time: int
    obligations_completed_late: int
    obligations_missed: int
    compliance_rate: float       # Percentage

    # By Parent
    petitioner_funded_on_time: int
    petitioner_funded_late: int
    petitioner_not_funded: int
    respondent_funded_on_time: int
    respondent_funded_late: int
    respondent_not_funded: int

    # Financial
    total_amount: Decimal
    amount_by_category: dict[str, Decimal]

    # Details
    obligations: list[ObligationResponse]
```

---

## Court Integration

### Evidence Package Components

ClearFund generates court-ready evidence packages containing:

1. **Obligation Summary**
   - All obligations with statuses
   - Funding timelines
   - Verification artifacts

2. **Payment Ledger**
   - Complete transaction history
   - Running balances
   - FIFO application records

3. **Attestations**
   - Sworn statements with timestamps
   - IP addresses and user agents
   - Legal acknowledgments

4. **Verification Artifacts**
   - Receipts with hash verification
   - Transaction records
   - Vendor confirmations

5. **Compliance Metrics**
   - On-time funding rates
   - Verification compliance
   - Historical trends

### Hash Chain Integrity

All ClearFund records can be verified for integrity:

```python
def verify_ledger_integrity(entries: list[PaymentLedger]) -> bool:
    """Verify ledger chain hasn't been tampered with."""

    for i, entry in enumerate(entries):
        if i == 0:
            expected_hash = hashlib.sha256(
                entry.description.encode()
            ).hexdigest()
        else:
            expected_hash = hashlib.sha256(
                (entries[i-1].hash + entry.description).encode()
            ).hexdigest()

        if entry.hash != expected_hash:
            return False

    return True
```

---

## Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# ClearFund Settings
CLEARFUND_RECEIPT_DEADLINE_HOURS=72     # Default receipt deadline
CLEARFUND_FIFO_ENABLED=true             # Enable FIFO credit application
CLEARFUND_AUTO_EXPIRE_DAYS=90           # Auto-expire overdue obligations

# Virtual Cards (v2)
STRIPE_ISSUING_ENABLED=false
CLEARFUND_CARD_EXPIRY_DAYS=30
```

### Category Configuration

Categories and their default splits can be configured per agreement:

```python
# Default expense splits from agreement
EXPENSE_SPLITS = {
    "medical": {
        "petitioner_percentage": 50,
        "verification_required": True,
        "receipt_required": True
    },
    "education": {
        "petitioner_percentage": 50,
        "verification_required": True,
        "receipt_required": True
    },
    "child_support": {
        "petitioner_percentage": 100,  # One parent pays full
        "verification_required": False,
        "receipt_required": False
    }
}
```

---

## Frontend Integration

### ClearFund Dashboard Components

```typescript
// Recommended component structure
components/
├── clearfund/
│   ├── ObligationList.tsx        // List all obligations
│   ├── ObligationCard.tsx        // Single obligation display
│   ├── ObligationCreate.tsx      // Create new obligation
│   ├── FundingProgress.tsx       // Funding progress bar
│   ├── VerificationUpload.tsx    // Upload receipts
│   ├── AttestationForm.tsx       // Sworn statement form
│   ├── LedgerView.tsx            // Transaction history
│   ├── BalanceSummary.tsx        // Who owes whom
│   └── ComplianceChart.tsx       // Compliance visualization
```

### API Client Functions

```typescript
// lib/api.ts - ClearFund API functions

export const clearfundAPI = {
  // Obligations
  createObligation: (data: ObligationCreate) =>
    api.post('/clearfund/obligations/', data),

  listObligations: (caseId: string, filters?: ObligationFilters) =>
    api.get('/clearfund/obligations/', { params: { case_id: caseId, ...filters }}),

  getObligation: (id: string) =>
    api.get(`/clearfund/obligations/${id}`),

  // Funding
  recordFunding: (obligationId: string, data: FundingCreate) =>
    api.post(`/clearfund/obligations/${obligationId}/fund`, data),

  getFundingStatus: (obligationId: string) =>
    api.get(`/clearfund/obligations/${obligationId}/funding`),

  // Verification
  uploadReceipt: (obligationId: string, file: File, metadata: ReceiptMetadata) =>
    api.post(`/clearfund/obligations/${obligationId}/receipt`, { ...metadata }),

  // Analytics
  getAnalytics: (caseId: string) =>
    api.get('/clearfund/analytics/', { params: { case_id: caseId }}),

  getBalance: (caseId: string) =>
    api.get('/clearfund/ledger/balance', { params: { case_id: caseId }})
};
```

### State Management

```typescript
// Recommended state structure for ClearFund
interface ClearFundState {
  obligations: {
    items: Obligation[];
    total: number;
    loading: boolean;
    error: string | null;
  };
  balance: {
    summary: BalanceSummary | null;
    loading: boolean;
  };
  metrics: {
    data: ObligationMetrics | null;
    loading: boolean;
  };
  selectedObligation: Obligation | null;
}
```

---

## Virtual Cards (v2 - Future)

### Planned Feature: Stripe Issuing Integration

The VirtualCardAuthorization model is prepared for future Stripe Issuing integration:

```python
class VirtualCardAuthorization(Base):
    """Virtual card for purpose-locked spending."""

    obligation_id: str              # One card per obligation
    stripe_card_id: Optional[str]   # Stripe Issuing card ID
    stripe_cardholder_id: Optional[str]
    card_last_four: Optional[str]   # Display only

    amount_authorized: Decimal      # Spending limit
    amount_spent: Decimal           # Current spend

    # Merchant Controls
    allowed_mccs: Optional[list]    # Allowed merchant codes
    blocked_mccs: Optional[list]    # Blocked merchant codes

    status: str                     # pending, active, used, expired
    expires_at: Optional[datetime]  # Card expiration
```

### Virtual Card Flow (Planned)

```
1. Obligation created and fully funded
2. Parent requests virtual card
3. System creates Stripe Issuing card with:
   - Spending limit = obligation amount
   - MCC restrictions for purpose category
   - Expiration date
4. Parent uses card at approved merchant
5. Transaction automatically verified
6. Obligation marked complete
```

---

## Best Practices

### Creating Obligations

1. **Always specify purpose clearly** - The title and description become legal records
2. **Include affected children** - Links expense to specific child(ren)
3. **Set realistic due dates** - Consider processing time
4. **Require verification for significant amounts** - Builds trust and evidence

### Funding Workflow

1. **Connect Stripe early** - Set up payment methods before obligations
2. **Fund promptly** - Overdue obligations affect compliance scores
3. **Keep receipts** - Even if not required, receipts strengthen evidence

### Verification

1. **Upload receipts immediately** - Before they're lost
2. **Include vendor details** - Helps with categorization
3. **Note any discrepancies** - Document if amount differs from expectation

### Court Preparation

1. **Run compliance reports monthly** - Catch issues early
2. **Verify ledger integrity** - Before generating court packages
3. **Include attestations** - Strengthen legal standing

---

## Document Index

| Document | Location | Description |
|----------|----------|-------------|
| **CLEARFUND.md** | `/docs/features/` | This document |
| ARIA.md | `/docs/features/` | ARIA sentiment analysis |
| KIDCOMS.md | `/docs/features/` | Child communication |
| API_REFERENCE.md | `/docs/api/` | Complete API documentation |
| SCHEMA.md | `/docs/database/` | Database schema details |

---

*Last Updated: January 10, 2026*
*Document Version: 1.0.0*
