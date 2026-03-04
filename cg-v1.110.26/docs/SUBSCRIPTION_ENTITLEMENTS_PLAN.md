# Subscription Entitlements Implementation Plan

> **Goal:** Make features respect subscription tiers - grey out locked features, show users what they're missing, and prompt upgrades.

---

## Current State

### Subscription Tiers
| Tier | Code | Price | Description |
|------|------|-------|-------------|
| **Web Starter** | `web_starter` | $0 | Free, web-only, basic features |
| **Plus** | `plus` | $17.99/mo | Automation, tracking, mobile |
| **Complete** | `complete` | $34.99/mo | Full suite, court-ready, KidComs |

### Existing Backend Infrastructure
- `FEATURE_DEFINITIONS` in `/backend/app/services/feature_gate.py` (complete)
- `FeatureGate` service with `has_feature()`, `get_limit()`, `get_required_tier()`
- API endpoints: `GET /subscriptions/features`, `GET /subscriptions/features/{feature}`
- User profile has `subscription_tier` and `subscription_status`

### Existing Frontend Infrastructure
- `subscriptionAPI.hasFeature(feature)` - Check single feature
- `subscriptionAPI.getFeatures()` - Get all features
- `subscriptionAPI.getCurrentSubscription()` - Get subscription status
- Billing page with upgrade flow

---

## Feature Entitlements Matrix

| Feature | Web Starter | Plus | Complete |
|---------|-------------|------|----------|
| ARIA manual sentiment | ✓ | ✓ | ✓ |
| ARIA advanced suggestions | ✗ | ✓ | ✓ |
| ClearFund tracking | ✓ | ✓ | ✓ |
| ClearFund fee exempt ($1.50) | ✗ | ✓ | ✓ |
| QuickAccords | ✗ | ✓ | ✓ |
| Auto scheduling | ✗ | ✓ | ✓ |
| Custody dashboard | ✗ | ✓ | ✓ |
| PDF summaries/exports | ✗ | ✓ | ✓ |
| My Circle contacts | 0 | 1 | 5 |
| KidComs access | ✗ | ✗ | ✓ |
| Theater mode | ✗ | ✗ | ✓ |
| Court reporting | ✗ | ✗ | ✓ |
| Silent Handoff GPS | ✓ | ✓ | ✓ |
| TimeBridge calendar | ✓ | ✓ | ✓ |
| TimeBridge manual only | Yes | No | No |

---

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 Create SubscriptionContext
**File:** `/frontend/contexts/subscription-context.tsx`

```tsx
interface SubscriptionContextValue {
  // State
  tier: string;                    // "web_starter" | "plus" | "complete"
  tierDisplayName: string;
  status: string;                  // "trial" | "active" | "past_due" | "cancelled" | "grant"
  features: Record<string, boolean | number>;
  isLoading: boolean;

  // Feature checks
  hasFeature: (feature: string) => boolean;
  getLimit: (feature: string) => number;

  // Tier checks
  isPaid: () => boolean;
  isComplete: () => boolean;
  isPlus: () => boolean;
  isFree: () => boolean;

  // Helpers
  getRequiredTier: (feature: string) => string;
  getUpgradeMessage: (feature: string) => string;

  // Actions
  refresh: () => Promise<void>;
}
```

Fetch features on mount and cache, refresh on window focus.

#### 1.2 Create useFeatureGate Hook
**File:** `/frontend/hooks/use-feature-gate.ts`

```tsx
interface UseFeatureGateResult {
  hasAccess: boolean;
  limit?: number;
  requiredTier: string;
  currentTier: string;
  isLoading: boolean;
}

function useFeatureGate(feature: string): UseFeatureGateResult
```

Simple wrapper around SubscriptionContext for single-feature checks.

#### 1.3 Add Provider to Layout
**File:** `/frontend/app/layout.tsx`

Add `<SubscriptionProvider>` after `<AuthProvider>`.

---

### Phase 2: UI Components

#### 2.1 FeatureGate Component (Wrapper)
**File:** `/frontend/components/feature-gate.tsx`

```tsx
interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;          // Show when locked (default: LockedFeatureCard)
  showUpgradePrompt?: boolean;   // Default true
}

function FeatureGate({ feature, children, fallback, showUpgradePrompt }: FeatureGateProps)
```

Wraps content - shows children if has access, otherwise shows fallback/locked state.

#### 2.2 LockedFeatureCard Component
**File:** `/frontend/components/locked-feature-card.tsx`

```tsx
interface LockedFeatureCardProps {
  feature: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  preview?: ReactNode;           // Blurred/greyed preview of feature
  compact?: boolean;
}
```

Design:
- Grey/muted styling with lock icon
- Shows required tier badge ("Plus" or "Complete")
- Brief description of what it does
- "Upgrade to unlock" button → `/settings/billing`
- Optional preview with blur overlay

#### 2.3 UpgradeBanner Component
**File:** `/frontend/components/upgrade-banner.tsx`

```tsx
interface UpgradeBannerProps {
  variant: 'inline' | 'floating' | 'card';
  feature?: string;              // If specified, mentions specific feature
  dismissible?: boolean;
}
```

Variants:
- **inline**: Slim banner at top of page section
- **floating**: Bottom-right floating prompt
- **card**: Full card CTA for upgrade

#### 2.4 UpgradeModal Component
**File:** `/frontend/components/upgrade-modal.tsx`

Modal that shows:
- Current plan vs. target plan comparison
- Features user will gain
- Pricing
- "Upgrade Now" button → Stripe checkout

#### 2.5 FeaturePreview Component
**File:** `/frontend/components/feature-preview.tsx`

Shows a greyed/blurred preview of locked feature with overlay:
- "This feature requires Plus/Complete"
- Shows what the feature would look like
- Click triggers upgrade modal

---

### Phase 3: Feature Integration

#### 3.1 KidComs (Complete tier only)
**Location:** `/frontend/app/kidcoms/*`

- Wrap KidComs pages with `<FeatureGate feature="kidcoms_access">`
- Fallback shows preview of video call interface with lock overlay
- Navigation item greyed with "Complete" badge

#### 3.2 QuickAccords (Plus+ only)
**Location:** `/frontend/app/family-files/[id]/quick-accord/*`

- Gate the "New QuickAccord" button
- Show locked card in dashboard if no access
- Existing accords still viewable (historical data)

#### 3.3 Auto Scheduling (Plus+ only)
**Location:** Schedule creation/editing

- "Recurring" option greyed with upgrade prompt
- "Manual Only" shown for free tier
- Free users can view but not create recurring exchanges

#### 3.4 Custody Dashboard (Plus+ only)
**Location:** `/frontend/app/family-files/[id]/custody-dashboard`

- Full page gate with preview
- Dashboard link in nav greyed with badge

#### 3.5 ARIA Advanced (Plus+ only)
**Location:** Message composer

- Advanced rewrite suggestions gated
- Free tier gets basic flagging only
- Show "ARIA Plus" badge on locked suggestions

#### 3.6 PDF Exports (Plus+ only)
**Location:** Export functionality throughout app

- Gate PDF download buttons
- Show "PDF exports require Plus" prompt

#### 3.7 Court Reporting (Complete only)
**Location:** `/frontend/app/court/*`, export pages

- Gate court export bundles
- Show preview of court-ready package

#### 3.8 My Circle Limits (0/1/5)
**Location:** Circle management

- Show limit badge: "0/0", "0/1", "3/5"
- Grey out "Add Contact" when at limit
- Show upgrade prompt when limit reached

#### 3.9 ClearFund Fee Notice (Web Starter)
**Location:** ClearFund payout flow

- Show $1.50 fee notice for free tier
- "Upgrade to avoid fees" CTA

---

### Phase 4: Navigation & Dashboard

#### 4.1 Navigation Updates
**File:** `/frontend/components/navigation.tsx`

Add visual indicators:
- Lock icon on gated features
- "Plus" / "Complete" badges
- Greyed styling for locked items
- Click still navigates but shows locked state

Example nav items with gating:
```tsx
{
  label: 'KidComs',
  href: '/kidcoms',
  icon: Video,
  feature: 'kidcoms_access',      // Gates this item
  tierBadge: 'Complete',
}
```

#### 4.2 Dashboard Updates
**File:** `/frontend/app/dashboard/page.tsx`

- Show "Upgrade to unlock X more features" card
- Feature cards show locked state with upgrade CTA
- Quick Actions section highlights what user could do

#### 4.3 Settings Billing Integration
Ensure `/settings/billing` page:
- Shows current entitlements clearly
- Highlights features user doesn't have
- Easy upgrade path with plan comparison

---

### Phase 5: Upgrade Prompts & Nudges

#### 5.1 Contextual Upgrade Prompts
Show upgrade prompt when user:
- Tries to access locked feature
- Hits a limit (My Circle contacts)
- Views a page with locked sections
- Completes a free tier action (subtle "get more with Plus")

#### 5.2 Passive Upgrade Awareness
- "Free Plan" badge in header/nav
- Periodic "Did you know?" tooltips
- Feature comparison in settings

#### 5.3 Trial Prompts (for paid tiers)
If user on trial:
- Show days remaining
- "Trial ends in X days" banner
- Highlight trial features they're using

---

## Files to Create

| File | Purpose |
|------|---------|
| `/frontend/contexts/subscription-context.tsx` | Global subscription state |
| `/frontend/hooks/use-feature-gate.ts` | Feature access hook |
| `/frontend/components/feature-gate.tsx` | Wrapper component |
| `/frontend/components/locked-feature-card.tsx` | Locked feature display |
| `/frontend/components/upgrade-banner.tsx` | Upgrade prompts |
| `/frontend/components/upgrade-modal.tsx` | Upgrade flow modal |
| `/frontend/components/feature-preview.tsx` | Blurred preview |

## Files to Modify

| File | Changes |
|------|---------|
| `/frontend/app/layout.tsx` | Add SubscriptionProvider |
| `/frontend/components/navigation.tsx` | Add feature badges/locks |
| `/frontend/app/dashboard/page.tsx` | Add upgrade awareness |
| `/frontend/app/kidcoms/*` | Gate KidComs features |
| `/frontend/app/family-files/[id]/quick-accord/*` | Gate QuickAccords |
| `/frontend/app/schedule/*` | Gate auto scheduling |
| `/frontend/app/court/*` | Gate court features |

---

## Implementation Order

1. **Core Context & Hook** (subscription-context, use-feature-gate)
2. **UI Components** (feature-gate, locked-feature-card, upgrade-banner)
3. **Layout Integration** (add provider, nav updates)
4. **Feature Integration** (KidComs, QuickAccords, etc.)
5. **Dashboard & Prompts** (upgrade awareness)
6. **Polish & Testing** (all tiers work correctly)

---

## Design Patterns

### Locked Feature Card Design
```
┌─────────────────────────────────────┐
│  🔒  [Complete]                     │
│                                     │
│  KidsCom Video Calls               │
│  ─────────────────────             │
│  Connect with your children         │
│  through secure video calls.        │
│                                     │
│  [Preview showing blurred UI]       │
│                                     │
│  ┌─────────────────────────┐       │
│  │  Upgrade to Complete    │       │
│  └─────────────────────────┘       │
└─────────────────────────────────────┘
```

### Navigation Item with Lock
```
📅 Schedule
💬 Messages
📝 QuickAccords 🔒 [Plus]
👨‍👧 KidsCom 🔒 [Complete]
📊 Custody Dashboard 🔒 [Plus]
```

### Upgrade Banner (inline)
```
┌─────────────────────────────────────────────────────┐
│ ⭐ Unlock auto-scheduling, PDF exports & more with  │
│    Plus - just $17.99/month  [Upgrade Now →]       │
└─────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] Free users see all features but locked ones are greyed/disabled
- [ ] Locked features show clear "Upgrade to [tier]" prompts
- [ ] Users can preview what features look like before upgrading
- [ ] Navigation shows tier badges on locked items
- [ ] Dashboard promotes upgrade to free users
- [ ] Upgrade flow is smooth (click → billing → Stripe)
- [ ] No features break for paid users
- [ ] Historical data accessible regardless of tier

---

## Notes

- Always show features, never hide them completely (FOMO drives upgrades)
- Use consistent color coding: grey for locked, teal for Plus, coral for Complete
- Ensure downgrade doesn't break existing data access
- Test all three tiers in development environment
