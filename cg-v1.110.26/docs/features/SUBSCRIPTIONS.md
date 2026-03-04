# Subscriptions & Feature Gating System

**Last Updated:** January 17, 2026
**Version:** 1.5.0
**Module:** Subscription Management & Monetization

---

## Table of Contents

1. [Overview](#overview)
2. [Subscription Tiers](#subscription-tiers)
3. [Feature Matrix](#feature-matrix)
4. [System Architecture](#system-architecture)
5. [Stripe Integration](#stripe-integration)
6. [API Reference](#api-reference)
7. [Webhook Handling](#webhook-handling)
8. [Grant Code System](#grant-code-system)
9. [Feature Gating](#feature-gating)
10. [Frontend Integration](#frontend-integration)
11. [Configuration](#configuration)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### What is the Subscription System?

The CommonGround subscription system provides tiered access to platform features, enabling sustainable monetization while ensuring core functionality remains accessible. Built on Stripe's billing infrastructure, it supports:

- **3-Tier Plans** - Starter (free), Plus ($12/mo), Family+ ($25/mo)
- **Stripe Checkout** - Secure payment collection
- **Customer Portal** - Self-service billing management
- **Feature Gating** - Control feature access by tier
- **Grant Codes** - Nonprofit partner access for DV survivors

### Key Design Principles

1. **Core Features Free** - Essential co-parenting tools available in Starter tier
2. **Upgrade Incentives** - Premium features provide clear value
3. **No Cliff Edges** - Downgraded users retain data, just with limited access
4. **DV Support** - Grant codes provide full access for survivors

### Core Value Proposition

| Traditional SaaS | CommonGround Subscriptions |
|------------------|---------------------------|
| Pay-to-use basic features | Core co-parenting always free |
| Complex pricing tiers | Simple 3-tier structure |
| Vendor lock-in | Data always exportable |
| No nonprofit support | Grant codes for DV organizations |

---

## Subscription Tiers

### Tier Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SUBSCRIPTION TIERS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   STARTER    │    │    PLUS      │    │   FAMILY+    │          │
│  │    Free      │    │  $12/month   │    │  $25/month   │          │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤          │
│  │ Basic Msg    │    │ ARIA Rewrite │    │ All Plus     │          │
│  │ Basic Sched  │    │ Priority     │    │ Unlimited    │          │
│  │ Manual Track │    │ Advanced Cal │    │ Multi-Child  │          │
│  │ 1 Child      │    │ Analytics    │    │ Court Docs   │          │
│  └──────────────┘    │ PDF Export   │    │ KidComs Video│          │
│                      └──────────────┘    └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tier Details

#### Starter (Free)
- **Price:** $0/month
- **Target:** New users evaluating the platform
- **Features:**
  - Basic messaging (no ARIA rewrites)
  - Simple scheduling
  - Manual compliance tracking
  - 1 child profile
  - Email support

#### Plus ($12/month)
- **Price:** $12/month or $120/year
- **Target:** Active co-parents needing communication help
- **Features:**
  - ARIA message analysis & rewrites
  - Priority support
  - Advanced calendar views
  - Compliance analytics
  - PDF exports
  - Up to 3 child profiles

#### Family+ ($25/month)
- **Price:** $25/month or $250/year
- **Target:** Complex custody situations, legal proceedings
- **Features:**
  - All Plus features
  - Unlimited child profiles
  - Court-ready document generation
  - KidComs video calls
  - Custom reporting
  - Dedicated support line

---

## Feature Matrix

### Feature Access by Tier

| Feature | Starter | Plus | Family+ |
|---------|---------|------|---------|
| **Messaging** ||||
| Basic messaging | Yes | Yes | Yes |
| ARIA sentiment analysis | View only | Full | Full |
| ARIA rewrites | No | Yes | Yes |
| Message history | 90 days | Unlimited | Unlimited |
| **Scheduling** ||||
| Basic calendar | Yes | Yes | Yes |
| Advanced views | No | Yes | Yes |
| Holiday templates | No | Yes | Yes |
| Schedule export | No | Yes | Yes |
| **Children** ||||
| Child profiles | 1 | 3 | Unlimited |
| **Compliance** ||||
| Manual tracking | Yes | Yes | Yes |
| Automated metrics | No | Yes | Yes |
| Analytics dashboard | No | Yes | Yes |
| **Documents** ||||
| Basic agreements | Yes | Yes | Yes |
| PDF export | No | Yes | Yes |
| Court documents | No | No | Yes |
| Evidence packages | No | No | Yes |
| **Communication** ||||
| Text-only KidComs | No | Yes | Yes |
| Video KidComs | No | No | Yes |
| **Support** ||||
| Email support | Yes | Yes | Yes |
| Priority support | No | Yes | Yes |
| Dedicated line | No | No | Yes |

### Feature Keys

The system uses feature keys to control access:

```python
FEATURE_KEYS = [
    "aria_rewrites",           # ARIA message rewriting
    "aria_analysis",           # ARIA sentiment analysis
    "advanced_calendar",       # Advanced calendar views
    "compliance_analytics",    # Compliance dashboard
    "pdf_export",              # Export to PDF
    "court_documents",         # Court-ready docs
    "evidence_packages",       # Legal evidence export
    "kidcoms_text",            # KidComs text chat
    "kidcoms_video",           # KidComs video calls
    "unlimited_children",      # No child limit
    "unlimited_history",       # Full message history
    "priority_support",        # Priority support queue
    "dedicated_support"        # Dedicated support line
]
```

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   SUBSCRIPTION SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Pricing    │───▶│   Checkout   │───▶│   Stripe     │      │
│  │    Page      │    │    Flow      │    │   Payment    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                       │               │
│         │                                       │               │
│         ▼                                       ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Plan       │    │   Webhook    │    │  Subscription│      │
│  │   Service    │◀───│   Handler    │◀───│   Events     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Feature    │───▶│    User      │    │    Grant     │      │
│  │    Gate      │    │   Service    │◀───│    Codes     │      │
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
│   ├── subscription.py      # SubscriptionPlan model
│   └── user.py              # User.subscription_tier field
├── schemas/
│   └── subscription.py      # Pydantic schemas
├── services/
│   ├── stripe_service.py    # Stripe API interactions
│   └── feature_gate.py      # Feature access control
└── api/v1/endpoints/
    ├── subscriptions.py     # Subscription endpoints
    └── grants.py            # Grant code endpoints
```

---

## Stripe Integration

### Stripe Products & Prices

Each tier maps to a Stripe Product with monthly and annual Price objects:

```python
STRIPE_PRICE_MAP = {
    "starter": {
        "monthly": None,  # Free tier
        "yearly": None
    },
    "plus": {
        "monthly": "price_plus_monthly_xxx",
        "yearly": "price_plus_yearly_xxx"
    },
    "family_plus": {
        "monthly": "price_family_monthly_xxx",
        "yearly": "price_family_yearly_xxx"
    }
}
```

### Checkout Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      CHECKOUT FLOW                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Upgrade" on pricing page                        │
│     │                                                            │
│     ▼                                                            │
│  POST /api/v1/subscriptions/checkout                             │
│  { "plan": "plus", "interval": "monthly" }                       │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────┐                      │
│  │ Backend processing:                    │                      │
│  │ a. Get or create Stripe customer       │                      │
│  │ b. Create Checkout Session             │                      │
│  │ c. Return checkout URL                 │                      │
│  └───────────────────┬────────────────────┘                      │
│                      │                                           │
│  2. Response                                                     │
│     │                                                            │
│     ▼                                                            │
│  { "checkout_url": "https://checkout.stripe.com/xxx" }           │
│                                                                  │
│  3. Frontend redirects to Stripe Checkout                        │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────┐                      │
│  │       STRIPE CHECKOUT (Hosted)         │                      │
│  │ - Payment method collection            │                      │
│  │ - 3D Secure if required                │                      │
│  │ - Tax calculation                      │                      │
│  └───────────────────┬────────────────────┘                      │
│                      │                                           │
│  4. On success, Stripe redirects to success_url                  │
│     │                                                            │
│     ▼                                                            │
│  5. Webhook: checkout.session.completed                          │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────┐                      │
│  │ Webhook handler:                       │                      │
│  │ a. Extract subscription ID             │                      │
│  │ b. Update user.subscription_tier       │                      │
│  │ c. Store stripe_subscription_id        │                      │
│  │ d. Set period dates                    │                      │
│  └────────────────────────────────────────┘                      │
│                                                                  │
│  6. User returns to app with active subscription                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Customer Portal

Users can manage their subscription via Stripe's Customer Portal:

```python
# Generate portal session
portal_session = stripe.billing_portal.Session.create(
    customer=user.stripe_customer_id,
    return_url="https://app.commonground.co/settings"
)

# Returns portal URL for redirect
return {"portal_url": portal_session.url}
```

Portal capabilities:
- Update payment method
- View invoice history
- Download invoices
- Cancel subscription
- Upgrade/downgrade plan

---

## API Reference

### Subscription Endpoints

#### List Available Plans

```http
GET /api/v1/subscriptions/plans
```

**Response:**
```json
{
  "plans": [
    {
      "id": "starter",
      "name": "Starter",
      "description": "Basic co-parenting tools",
      "monthly_price": 0,
      "yearly_price": 0,
      "features": ["basic_messaging", "basic_calendar", "1_child"]
    },
    {
      "id": "plus",
      "name": "Plus",
      "description": "Enhanced communication with ARIA",
      "monthly_price": 1200,
      "yearly_price": 12000,
      "features": ["aria_rewrites", "advanced_calendar", "analytics"]
    },
    {
      "id": "family_plus",
      "name": "Family+",
      "description": "Complete platform access",
      "monthly_price": 2500,
      "yearly_price": 25000,
      "features": ["all_plus", "court_documents", "kidcoms_video"]
    }
  ]
}
```

#### Get Current Subscription

```http
GET /api/v1/subscriptions/current
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tier": "plus",
  "status": "active",
  "current_period_start": "2026-01-15T00:00:00Z",
  "current_period_end": "2026-02-15T00:00:00Z",
  "cancel_at_period_end": false,
  "stripe_subscription_id": "sub_xxx",
  "features": ["aria_rewrites", "advanced_calendar", "analytics", "pdf_export"]
}
```

#### Create Checkout Session

```http
POST /api/v1/subscriptions/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "plus",
  "interval": "monthly"
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_xxx"
}
```

#### Upgrade Subscription

```http
POST /api/v1/subscriptions/upgrade
Authorization: Bearer <token>
Content-Type: application/json

{
  "new_plan": "family_plus"
}
```

**Response:**
```json
{
  "message": "Subscription upgraded successfully",
  "new_tier": "family_plus",
  "effective_immediately": true
}
```

#### Access Customer Portal

```http
POST /api/v1/subscriptions/portal
Authorization: Bearer <token>
```

**Response:**
```json
{
  "portal_url": "https://billing.stripe.com/p/session/xxx"
}
```

#### Cancel Subscription

```http
POST /api/v1/subscriptions/cancel
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Subscription will be cancelled at end of billing period",
  "cancel_at": "2026-02-15T00:00:00Z"
}
```

#### Reactivate Subscription

```http
POST /api/v1/subscriptions/reactivate
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Subscription reactivated",
  "tier": "plus",
  "status": "active"
}
```

#### Check Feature Access

```http
GET /api/v1/subscriptions/features/{feature_key}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "feature": "aria_rewrites",
  "has_access": true,
  "tier_required": "plus",
  "current_tier": "plus"
}
```

#### List All Features

```http
GET /api/v1/subscriptions/features
Authorization: Bearer <token>
```

**Response:**
```json
{
  "features": {
    "aria_rewrites": true,
    "aria_analysis": true,
    "advanced_calendar": true,
    "compliance_analytics": true,
    "pdf_export": true,
    "court_documents": false,
    "evidence_packages": false,
    "kidcoms_text": true,
    "kidcoms_video": false,
    "unlimited_children": false,
    "unlimited_history": true
  }
}
```

---

## Webhook Handling

### Configured Webhooks

The system listens for these Stripe webhook events:

| Event | Trigger | Action |
|-------|---------|--------|
| `checkout.session.completed` | User completes checkout | Create subscription, update tier |
| `customer.subscription.created` | New subscription created | Sync subscription data |
| `customer.subscription.updated` | Plan or status changed | Update tier, sync period |
| `customer.subscription.deleted` | Subscription cancelled | Downgrade to Starter |
| `invoice.paid` | Successful payment | Extend period, send receipt |
| `invoice.payment_failed` | Payment failed | Mark past_due, notify user |

### Webhook Handler

```python
# app/api/v1/endpoints/webhooks.py

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhook events."""

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")

    # Route to appropriate handler
    if event["type"] == "checkout.session.completed":
        await handle_checkout_completed(db, event["data"]["object"])
    elif event["type"] == "customer.subscription.updated":
        await handle_subscription_updated(db, event["data"]["object"])
    elif event["type"] == "customer.subscription.deleted":
        await handle_subscription_deleted(db, event["data"]["object"])
    elif event["type"] == "invoice.payment_failed":
        await handle_payment_failed(db, event["data"]["object"])

    return {"received": True}
```

### Event Processing

```python
async def handle_checkout_completed(db: AsyncSession, session: dict):
    """Handle successful checkout completion."""

    # Get user from metadata or customer
    user_id = session.get("client_reference_id")
    if not user_id:
        customer_id = session.get("customer")
        user = await get_user_by_stripe_customer(db, customer_id)
        user_id = user.id

    # Get subscription details
    subscription_id = session.get("subscription")
    subscription = stripe.Subscription.retrieve(subscription_id)

    # Determine tier from price
    price_id = subscription["items"]["data"][0]["price"]["id"]
    tier = get_tier_from_price(price_id)

    # Update user
    await update_user_subscription(
        db,
        user_id=user_id,
        tier=tier,
        stripe_subscription_id=subscription_id,
        current_period_start=datetime.fromtimestamp(subscription["current_period_start"]),
        current_period_end=datetime.fromtimestamp(subscription["current_period_end"])
    )
```

---

## Grant Code System

### Overview

Grant codes provide free access to premium features for DV survivors through nonprofit partnerships. Each code has:

- **Unique code string** (e.g., `HAVEN-2026-XXXX`)
- **Partner organization** (e.g., "Safe Haven DV Center")
- **Tier granted** (typically `family_plus`)
- **Duration** (typically 12 months)
- **Usage limits** (number of redemptions)

### Grant Endpoints

#### Redeem Grant Code

```http
POST /api/v1/grants/redeem
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "HAVEN-2026-XXXX"
}
```

**Success Response:**
```json
{
  "message": "Grant code redeemed successfully",
  "tier": "family_plus",
  "valid_until": "2027-01-15T00:00:00Z",
  "partner": "Safe Haven DV Center"
}
```

**Error Responses:**
```json
// 400 - Invalid or expired code
{
  "detail": "Invalid or expired grant code"
}

// 400 - Already redeemed
{
  "detail": "Grant code has already been used"
}

// 400 - User already has grant
{
  "detail": "You already have an active grant"
}
```

#### Get Grant Status

```http
GET /api/v1/grants/status
Authorization: Bearer <token>
```

**Response (with grant):**
```json
{
  "has_grant": true,
  "tier": "family_plus",
  "partner": "Safe Haven DV Center",
  "valid_until": "2027-01-15T00:00:00Z",
  "days_remaining": 365
}
```

**Response (no grant):**
```json
{
  "has_grant": false
}
```

#### Validate Grant Code (Public)

```http
GET /api/v1/grants/validate/{code}
```

**Response:**
```json
{
  "valid": true,
  "tier": "family_plus",
  "partner": "Safe Haven DV Center",
  "duration_months": 12
}
```

### Grant Models

```python
class GrantCode(Base, UUIDMixin, TimestampMixin):
    """Nonprofit partner grant codes."""

    __tablename__ = "grant_codes"

    code: str                    # Unique code string
    partner_name: str            # Partner organization
    tier_granted: str            # Tier to grant (family_plus)
    duration_months: int         # How long grant lasts

    max_redemptions: int         # Total allowed uses
    current_redemptions: int     # Current use count

    valid_from: datetime         # When code becomes active
    valid_until: datetime        # When code expires

    is_active: bool              # Admin can disable


class GrantRedemption(Base, UUIDMixin, TimestampMixin):
    """Record of grant code redemption."""

    __tablename__ = "grant_redemptions"

    user_id: str                 # User who redeemed
    grant_code_id: str           # Code that was used

    tier_granted: str            # What tier they got
    granted_at: datetime         # When granted
    expires_at: datetime         # When access expires

    is_active: bool              # Currently active?
```

---

## Feature Gating

### Feature Gate Service

```python
# app/services/feature_gate.py

class FeatureGateService:
    """Control feature access based on subscription tier."""

    TIER_FEATURES = {
        "starter": [
            "basic_messaging",
            "basic_calendar",
            "manual_compliance"
        ],
        "plus": [
            "basic_messaging",
            "basic_calendar",
            "manual_compliance",
            "aria_rewrites",
            "aria_analysis",
            "advanced_calendar",
            "compliance_analytics",
            "pdf_export",
            "kidcoms_text",
            "unlimited_history"
        ],
        "family_plus": [
            # All plus features +
            "court_documents",
            "evidence_packages",
            "kidcoms_video",
            "unlimited_children",
            "dedicated_support"
        ]
    }

    async def has_feature(
        self,
        db: AsyncSession,
        user_id: str,
        feature: str
    ) -> bool:
        """Check if user has access to a feature."""

        user = await get_user(db, user_id)

        # Check for active grant first
        if user.has_active_grant:
            grant_tier = user.grant_tier
            return feature in self.TIER_FEATURES.get(grant_tier, [])

        # Check subscription tier
        tier = user.subscription_tier or "starter"
        return feature in self.TIER_FEATURES.get(tier, [])

    async def require_feature(
        self,
        db: AsyncSession,
        user_id: str,
        feature: str
    ) -> None:
        """Raise exception if user lacks feature access."""

        if not await self.has_feature(db, user_id, feature):
            raise HTTPException(
                status_code=403,
                detail=f"Feature '{feature}' requires a higher subscription tier"
            )
```

### Using Feature Gates in Endpoints

```python
# app/api/v1/endpoints/messages.py

@router.post("/messages/{id}/rewrite")
async def rewrite_message(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    feature_gate: FeatureGateService = Depends(get_feature_gate)
):
    """Rewrite message with ARIA. Requires Plus or higher."""

    # Check feature access
    await feature_gate.require_feature(
        db, current_user.id, "aria_rewrites"
    )

    # Proceed with rewrite...
```

### Frontend Feature Checks

```typescript
// lib/features.ts

export async function hasFeature(feature: string): Promise<boolean> {
  const response = await api.get(`/subscriptions/features/${feature}`);
  return response.data.has_access;
}

export async function getAllFeatures(): Promise<Record<string, boolean>> {
  const response = await api.get('/subscriptions/features');
  return response.data.features;
}

// Usage in component
function MessageComposer() {
  const [canRewrite, setCanRewrite] = useState(false);

  useEffect(() => {
    hasFeature('aria_rewrites').then(setCanRewrite);
  }, []);

  return (
    <div>
      <textarea />
      {canRewrite ? (
        <Button onClick={handleRewrite}>ARIA Rewrite</Button>
      ) : (
        <UpgradePrompt feature="aria_rewrites" />
      )}
    </div>
  );
}
```

---

## Frontend Integration

### Pricing Page Components

```typescript
// app/(marketing)/pricing/page.tsx

// Plan card component
interface PlanCardProps {
  plan: Plan;
  isCurrentPlan: boolean;
  onSelect: (plan: Plan) => void;
}

function PlanCard({ plan, isCurrentPlan, onSelect }: PlanCardProps) {
  return (
    <div className={cn(
      "border rounded-lg p-6",
      plan.highlighted && "border-primary ring-2 ring-primary"
    )}>
      <h3>{plan.name}</h3>
      <div className="text-3xl font-bold">
        ${plan.monthly_price / 100}/mo
      </div>
      <ul className="mt-4 space-y-2">
        {plan.features.map(feature => (
          <li key={feature} className="flex items-center">
            <CheckIcon className="text-green-500 mr-2" />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className="mt-6 w-full"
      >
        {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
      </Button>
    </div>
  );
}
```

### Checkout Integration

```typescript
// lib/subscriptions.ts

export async function startCheckout(
  plan: string,
  interval: 'monthly' | 'yearly'
): Promise<void> {
  const response = await api.post('/subscriptions/checkout', {
    plan,
    interval
  });

  // Redirect to Stripe Checkout
  window.location.href = response.data.checkout_url;
}

export async function openPortal(): Promise<void> {
  const response = await api.post('/subscriptions/portal');
  window.location.href = response.data.portal_url;
}
```

### Subscription Context

```typescript
// lib/subscription-context.tsx

interface SubscriptionState {
  tier: string;
  status: string;
  features: Record<string, boolean>;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    tier: 'starter',
    status: 'active',
    features: {},
    loading: true
  });

  useEffect(() => {
    async function loadSubscription() {
      const [current, features] = await Promise.all([
        api.get('/subscriptions/current'),
        api.get('/subscriptions/features')
      ]);

      setState({
        tier: current.data.tier,
        status: current.data.status,
        features: features.data.features,
        loading: false
      });
    }

    loadSubscription();
  }, []);

  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('Must be used within SubscriptionProvider');
  return context;
}
```

### Upgrade Prompts

```typescript
// components/upgrade-prompt.tsx

interface UpgradePromptProps {
  feature: string;
  variant?: 'inline' | 'modal' | 'banner';
}

export function UpgradePrompt({ feature, variant = 'inline' }: UpgradePromptProps) {
  const featureInfo = FEATURE_INFO[feature];

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LockIcon className="h-4 w-4" />
        <span>Upgrade to {featureInfo.minTier} to unlock {featureInfo.name}</span>
        <Link href="/pricing" className="text-primary underline">
          View Plans
        </Link>
      </div>
    );
  }

  // Modal and banner variants...
}
```

---

## Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx         # API secret key
STRIPE_PUBLISHABLE_KEY=pk_test_xxx    # Frontend publishable key
STRIPE_WEBHOOK_SECRET=whsec_xxx       # Webhook signing secret

# Price IDs
STRIPE_PRICE_PLUS_MONTHLY=price_xxx
STRIPE_PRICE_PLUS_YEARLY=price_xxx
STRIPE_PRICE_FAMILY_MONTHLY=price_xxx
STRIPE_PRICE_FAMILY_YEARLY=price_xxx

# Subscription Settings
SUBSCRIPTION_TRIAL_DAYS=0             # Free trial period (0 = none)
SUBSCRIPTION_GRACE_PERIOD_DAYS=3      # Days after failed payment
```

### Stripe Dashboard Setup

1. **Create Products:**
   - Starter (free tier - no product needed)
   - Plus
   - Family+

2. **Create Prices for each product:**
   - Monthly recurring price
   - Yearly recurring price (with discount)

3. **Configure Customer Portal:**
   - Enable plan switching
   - Enable cancellation
   - Configure invoice history

4. **Set up Webhooks:**
   - Endpoint: `https://api.commonground.co/api/v1/webhooks/stripe`
   - Events: checkout, subscription, invoice events

---

## Troubleshooting

### Common Issues

#### 1. Checkout redirect fails

**Cause:** Missing or invalid Stripe keys
**Solution:**
```python
# Verify Stripe configuration
import stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Test with simple call
customers = stripe.Customer.list(limit=1)
print(f"Stripe connected: {len(customers.data)} customers")
```

#### 2. Webhook events not processing

**Cause:** Invalid webhook signature
**Solution:**
```bash
# Verify webhook secret matches Stripe dashboard
echo $STRIPE_WEBHOOK_SECRET

# Test with Stripe CLI
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
```

#### 3. User tier not updating after checkout

**Cause:** Webhook handler not finding user
**Solution:**
```python
# Ensure client_reference_id is set in checkout session
session = stripe.checkout.Session.create(
    client_reference_id=str(user.id),  # Include user ID
    customer=user.stripe_customer_id,
    # ...
)
```

#### 4. Feature gate blocking when it shouldn't

**Cause:** Stale subscription data
**Solution:**
```python
# Force sync from Stripe
await sync_subscription_from_stripe(db, user_id)
```

### Debug Endpoints

```http
# Check Stripe connection
GET /api/v1/subscriptions/debug/stripe-status

# Force sync subscription
POST /api/v1/subscriptions/debug/sync
```

---

## Document Index

| Document | Location | Description |
|----------|----------|-------------|
| **SUBSCRIPTIONS.md** | `/docs/features/` | This document |
| API_REFERENCE.md | `/docs/api/` | Complete API documentation |
| AUTHENTICATION.md | `/docs/api/` | Auth & permissions |
| CLEARFUND.md | `/docs/features/` | Financial system |

---

*Last Updated: January 15, 2026*
*Document Version: 1.0.0*
