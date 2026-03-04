# CommonGround Partner Landing Page & Dashboard Architecture

## Overview
This document outlines the technical architecture for dynamically generated co-branded landing pages and partner dashboards, including data flow, privacy protection, and template-based implementation.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PARTNER ONBOARDING FLOW                      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Partnership Form (Google Form/Typeform)                         │
│  ├─ Org Info (name, logo, colors, mission)                      │
│  ├─ Contact Info (staff, emails, phone)                         │
│  ├─ Programs (services, populations served)                     │
│  └─ Preferences (reporting needs, outcomes tracked)             │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Database - partners table                              │
│  Creates single record with:                                     │
│  ├─ partner_slug (URL: safeharbor)                              │
│  ├─ partner_config (JSON: branding, settings)                   │
│  ├─ dashboard_config (JSON: metrics preferences)                │
│  └─ Created timestamp                                            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  PUBLIC LANDING PAGE             │  │  PARTNER DASHBOARD               │
│  URL: [slug].commonground.app    │  │  URL: dashboard.commonground... │
│  (Dynamic SSR via Next.js)       │  │  (Protected route, auth req'd)  │
└─────────────────────────────────┘  └─────────────────────────────────┘
                    │                               │
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  User activates grant code       │  │  Aggregated, anonymized data    │
│  Creates family_files record     │  │  No PII visible to partner      │
│  Links to partner_id             │  │  Shows impact metrics only      │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

---

## Database Schema

### Table: `partners`

```sql
CREATE TABLE partners (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_slug TEXT UNIQUE NOT NULL, -- URL slug (e.g., 'safeharbor')
  
  -- Organization Info
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  ein TEXT, -- Tax ID for legal compliance
  mission_statement TEXT,
  
  -- Contact Info
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  support_email TEXT,
  
  -- Branding Config (JSON)
  branding_config JSONB DEFAULT '{
    "logo_url": "",
    "primary_color": "#2C5F5D",
    "secondary_color": "#D4A853",
    "accent_color": "#4A90A4",
    "font_family": "system-ui",
    "hero_image_url": "",
    "tagline": ""
  }'::jsonb,
  
  -- Landing Page Config (JSON)
  landing_config JSONB DEFAULT '{
    "show_mission": true,
    "show_stats": true,
    "show_testimonials": false,
    "custom_welcome_message": "",
    "faq_items": [],
    "contact_method": "email"
  }'::jsonb,
  
  -- Dashboard Config (JSON)
  dashboard_config JSONB DEFAULT '{
    "metrics_enabled": {
      "codes_distributed": true,
      "activation_rate": true,
      "active_users": true,
      "conflict_reduction": true,
      "message_volume": true,
      "schedules_created": true,
      "expenses_tracked": true
    },
    "report_frequency": "weekly",
    "report_recipients": []
  }'::jsonb,
  
  -- Grant Code Config
  code_prefix TEXT, -- e.g., 'SAFEHARBOR'
  codes_allocated INT DEFAULT 25,
  codes_used INT DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, active, paused, terminated
  activation_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for fast slug lookups
CREATE INDEX idx_partners_slug ON partners(partner_slug);
CREATE INDEX idx_partners_status ON partners(status);
```

---

### Table: `grant_codes`

```sql
CREATE TABLE grant_codes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'SAFEHARBOR0001'
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Code Details
  tier TEXT DEFAULT 'pro', -- pro, premium
  duration_days INT DEFAULT 180,
  
  -- Usage Tracking
  is_activated BOOLEAN DEFAULT FALSE,
  activated_by UUID REFERENCES auth.users(id), -- user who activated
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Anonymization (Partner sees this, not real user data)
  anonymous_user_id TEXT, -- e.g., 'User-A1B2'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grant_codes_partner ON grant_codes(partner_id);
CREATE INDEX idx_grant_codes_code ON grant_codes(code);
CREATE INDEX idx_grant_codes_activated ON grant_codes(is_activated);
```

---

### Table: `partner_metrics` (Aggregated data cache)

```sql
CREATE TABLE partner_metrics (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Time Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  
  -- Activation Metrics
  codes_distributed INT DEFAULT 0,
  codes_activated INT DEFAULT 0,
  activation_rate DECIMAL(5,2), -- percentage
  
  -- Engagement Metrics
  active_users INT DEFAULT 0, -- users who logged in during period
  total_logins INT DEFAULT 0,
  avg_logins_per_user DECIMAL(5,2),
  
  -- Communication Metrics
  messages_sent INT DEFAULT 0,
  aria_interventions INT DEFAULT 0,
  aria_acceptance_rate DECIMAL(5,2), -- % of suggestions accepted
  conflict_score_avg DECIMAL(5,2), -- average toxicity before ARIA
  conflict_reduction_pct DECIMAL(5,2), -- % reduction in conflict
  
  -- Feature Usage
  schedules_created INT DEFAULT 0,
  exchanges_logged INT DEFAULT 0,
  expenses_tracked INT DEFAULT 0,
  agreements_started INT DEFAULT 0,
  
  -- Outcome Metrics
  avg_session_duration_minutes DECIMAL(10,2),
  retention_rate_30d DECIMAL(5,2), -- % still using after 30 days
  retention_rate_90d DECIMAL(5,2),
  client_nps_score DECIMAL(5,2), -- Net Promoter Score
  
  -- Estimated Impact (calculated)
  estimated_legal_fees_saved DECIMAL(10,2),
  estimated_conflicts_prevented INT,
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(partner_id, period_start, period_type)
);

CREATE INDEX idx_partner_metrics_partner ON partner_metrics(partner_id);
CREATE INDEX idx_partner_metrics_period ON partner_metrics(period_start, period_type);
```

---

## Co-Branded Landing Page

### URL Structure

**Pattern:** `{partner_slug}.commonground.app`

**Examples:**
- `safeharbor.commonground.app`
- `comunitadenpaz.commonground.app`
- `lafamilysupport.commonground.app`

**Technical Implementation:** 
- Next.js dynamic routing with subdomain handling
- Single template component that receives `partner_slug` as param
- Server-side renders with partner data from database

---

### Landing Page Template Design

**File:** `/app/[partner]/page.tsx` (Next.js App Router)

```typescript
// This is a SINGLE template that generates all partner landing pages

interface PartnerLandingPageProps {
  params: { partner: string }
}

export default async function PartnerLandingPage({ 
  params 
}: PartnerLandingPageProps) {
  // 1. Fetch partner data from Supabase
  const partner = await getPartnerBySlug(params.partner)
  
  // 2. If partner doesn't exist, show 404
  if (!partner) return notFound()
  
  // 3. Render template with partner data
  return <LandingPageTemplate partner={partner} />
}
```

---

### Landing Page Layout (Wireframe)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  ┌────────────┐                              ┌──────────────┐   │
│  │ Partner    │  CommonGround + Partner Name │  Start Free  │   │
│  │ Logo       │                              │  Trial       │   │
│  └────────────┘                              └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  HERO SECTION                                  [Hero Image]      │
│                                                                  │
│  Welcome from [Partner Name]                                     │
│                                                                  │
│  [Custom welcome message or default]                            │
│  "Through our partnership with CommonGround, we provide you     │
│  with free access to AI-powered co-parenting tools that help    │
│  you communicate peacefully, stay organized, and protect your   │
│  children from conflict."                                       │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │  Activate Grant Code │  ← Primary CTA                        │
│  └──────────────────────┘                                       │
│                                                                  │
│  Already have an account? Sign In                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  IMPACT STATS (if enabled in config)                            │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │    150     │  │    68%     │  │   $425K    │               │
│  │  Families  │  │  Conflict  │  │   Legal    │               │
│  │  Supported │  │  Reduction │  │   Fees     │               │
│  │            │  │            │  │   Saved    │               │
│  └────────────┘  └────────────┘  └────────────┘               │
│                                                                  │
│  * Stats from all [Partner Name] families using CommonGround    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  MISSION STATEMENT (if enabled)                                 │
│                                                                  │
│  About [Partner Name]                                           │
│                                                                  │
│  [Partner's mission statement]                                  │
│                                                                  │
│  "We've partnered with CommonGround to extend our support       │
│  beyond our walls—providing families with tools for lasting     │
│  peace and stability."                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  WHAT YOU GET                                                   │
│                                                                  │
│  ✓ AI-Powered Communication                                     │
│    ARIA mediates your messages, preventing conflict before      │
│    it starts                                                    │
│                                                                  │
│  ✓ Complete Organization                                        │
│    Schedules, expenses, agreements—all in one place            │
│                                                                  │
│  ✓ Court-Ready Documentation                                    │
│    Verified records accepted in all 50 states                   │
│                                                                  │
│  ✓ Child Protection                                             │
│    Your kids never see the conflict                            │
│                                                                  │
│  ✓ Free for 180 Days                                            │
│    $480 value, provided through [Partner Name]                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  HOW IT WORKS                                                   │
│                                                                  │
│  1. Activate Your Code                                          │
│     Enter the grant code provided by [Partner Name]            │
│                                                                  │
│  2. Create Your Account                                         │
│     10 minutes to set up your profile and family info          │
│                                                                  │
│  3. Start Co-Parenting Peacefully                              │
│     Communicate safely, stay organized, protect your kids       │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │  Get Started Now     │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  TESTIMONIALS (if enabled)                                      │
│                                                                  │
│  "CommonGround changed everything for me and my kids. The AI    │
│  helped me communicate without the anger, and having everything │
│  documented gave me peace of mind."                             │
│  — Sarah M., [Partner Name] Client                             │
│                                                                  │
│  [More testimonials...]                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FAQ                                                            │
│                                                                  │
│  ▼ What is CommonGround?                                        │
│  ▼ How much does it cost?                                       │
│  ▼ Is my information private?                                   │
│  ▼ What if my co-parent won't use it?                          │
│  ▼ How do I get help?                                           │
│                                                                  │
│  [Custom FAQ items from partner if provided]                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FINAL CTA                                                      │
│                                                                  │
│  Ready to Start Co-Parenting Peacefully?                        │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │  Activate Grant Code │                                       │
│  └──────────────────────┘                                       │
│                                                                  │
│  Questions? Contact [Partner Name]:                             │
│  [Contact info based on partner preference]                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FOOTER                                                         │
│                                                                  │
│  [Partner Logo]    Powered by CommonGround                      │
│                                                                  │
│  Privacy Policy | Terms of Service | Support                    │
│                                                                  │
│  © 2026 [Partner Name] + CommonGround                          │
└─────────────────────────────────────────────────────────────────┘
```

---

### Grant Code Activation Flow

**User Experience:**

1. **User arrives at landing page**
   - URL: `safeharbor.commonground.app`
   - Sees co-branded page with partner's logo and colors

2. **User clicks "Activate Grant Code"**
   - Opens modal or navigates to `/activate` page
   - Form appears with partner branding

3. **User enters grant code**
   - Input: `SAFEHARBOR0042`
   - System validates code in real-time

4. **Code validation**
   ```typescript
   // Validation logic
   async function validateGrantCode(code: string) {
     const grantCode = await supabase
       .from('grant_codes')
       .select('*, partner:partners(*)')
       .eq('code', code)
       .single()
     
     // Check if code exists
     if (!grantCode) return { valid: false, error: 'Code not found' }
     
     // Check if already activated
     if (grantCode.is_activated) {
       return { valid: false, error: 'Code already used' }
     }
     
     // Check if partner is active
     if (grantCode.partner.status !== 'active') {
       return { valid: false, error: 'Partnership inactive' }
     }
     
     return { valid: true, partner: grantCode.partner, code: grantCode }
   }
   ```

5. **User creates account**
   - Standard signup flow
   - Email, password, basic info
   - Links account to grant code

6. **Grant code activated**
   ```typescript
   async function activateGrantCode(codeId: string, userId: string) {
     // Generate anonymous ID for partner dashboard
     const anonymousId = `User-${generateShortId()}`
     
     // Update grant code
     await supabase
       .from('grant_codes')
       .update({
         is_activated: true,
         activated_by: userId,
         activated_at: new Date().toISOString(),
         expires_at: addDays(new Date(), 180).toISOString(),
         anonymous_user_id: anonymousId
       })
       .eq('id', codeId)
     
     // Create family file with partner link
     await supabase
       .from('family_files')
       .insert({
         user_id: userId,
         partner_id: code.partner_id,
         grant_code_id: codeId,
         subscription_tier: 'pro',
         subscription_expires: addDays(new Date(), 180)
       })
     
     // Increment partner's codes_used counter
     await supabase.rpc('increment_partner_codes_used', {
       partner_id: code.partner_id
     })
   }
   ```

7. **User redirected to dashboard**
   - Welcome screen acknowledges partnership
   - "You're accessing CommonGround through [Partner Name]"
   - Begin onboarding flow

---

## Partner Dashboard

### URL Structure

**URL:** `dashboard.commonground.app/partners/[partner_slug]`

**Authentication:** 
- Partner staff must have authenticated account
- Account must be linked to partner organization
- Role-based access (admin, viewer)

---

### Dashboard Layout (Wireframe)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  CommonGround Partner Dashboard - [Partner Name]                │
│                                                                  │
│  [Dashboard] [Reports] [Settings] [Support]    [Logout]         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OVERVIEW - Last 30 Days                        [Date Range ▼]  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    25/25     │  │    18/25     │  │     72%      │         │
│  │    Codes     │  │  Activated   │  │  Activation  │         │
│  │ Distributed  │  │              │  │     Rate     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │     15       │  │    284       │  │     68%      │         │
│  │   Active     │  │   Messages   │  │   Conflict   │         │
│  │    Users     │  │     Sent     │  │  Reduction   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ENGAGEMENT TRENDS                                               │
│                                                                  │
│  Active Users Over Time                    [Week/Month/Quarter]│
│                                                                  │
│  [Line graph showing daily active users]                        │
│   20│          ●                                                │
│     │        ●   ●                                              │
│   15│      ●       ●                                            │
│     │    ●           ●                                          │
│   10│  ●               ●                                        │
│     │                    ●                                      │
│    5│                                                           │
│     └────────────────────────────────────                       │
│      Week 1  Week 2  Week 3  Week 4                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  IMPACT METRICS                                                 │
│                                                                  │
│  Communication Health                                           │
│  ├─ Messages Sent: 284                                         │
│  ├─ ARIA Interventions: 92 (32%)                               │
│  ├─ Suggestions Accepted: 64 (70%)                             │
│  └─ Conflict Reduction: 68% ↓                                  │
│                                                                  │
│  Feature Adoption                                               │
│  ├─ Schedules Created: 12                                      │
│  ├─ Expenses Tracked: $3,247                                   │
│  ├─ Agreements Started: 4                                      │
│  └─ Court Exports Generated: 2                                 │
│                                                                  │
│  Long-Term Outcomes                                             │
│  ├─ Retention (30 days): 83%                                   │
│  ├─ Retention (90 days): N/A (too early)                       │
│  ├─ Client NPS Score: 67 (Promoters)                           │
│  └─ Est. Legal Fees Saved: $12,450                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ACTIVE USERS (Anonymized)                    [View All →]      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ User ID    │ Activated │ Last Active │ Messages │ Status│    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ User-A1B2  │ Jan 15    │ 2h ago      │ 42       │ 🟢    │    │
│  │ User-C3D4  │ Jan 18    │ 5h ago      │ 28       │ 🟢    │    │
│  │ User-E5F6  │ Jan 20    │ 1d ago      │ 15       │ 🟡    │    │
│  │ User-G7H8  │ Jan 12    │ 7d ago      │ 8        │ 🔴    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  🟢 Active (used in last 7 days)                                │
│  🟡 Inactive (7-30 days)                                        │
│  🔴 At Risk (30+ days)                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  GRANT CODES                                                    │
│                                                                  │
│  Allocated: 25 │ Distributed: 25 │ Activated: 18 │ Remaining: 0│
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Code            │ Status    │ Distributed │ Activated  │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ SAFEHARBOR0001  │ Active    │ Jan 10      │ Jan 11     │    │
│  │ SAFEHARBOR0002  │ Active    │ Jan 10      │ Jan 12     │    │
│  │ SAFEHARBOR0003  │ Pending   │ Jan 15      │ -          │    │
│  │ ...             │           │             │            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Request More Codes]  [Download Tracking Sheet]               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  QUICK ACTIONS                                                  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Generate Report  │  │ Download Data    │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Request Support  │  │ View Resources   │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Dashboard Data Flow Architecture

```
USER ACTIONS IN APP
├─ Send message with ARIA
├─ Log custody exchange
├─ Add expense
├─ Create schedule
├─ Generate court export
└─ Login/session activity

         │
         ▼

┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE REALTIME EVENTS                                        │
│  (Triggers on specific table changes)                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼

┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE EDGE FUNCTION: aggregate_partner_metrics              │
│  (Runs nightly + triggered on-demand)                           │
│                                                                  │
│  1. Query all family_files WHERE partner_id = X                 │
│  2. Query messages, schedules, expenses for those families      │
│  3. Calculate aggregated metrics (NO individual data)           │
│  4. Update partner_metrics table                                │
│  5. Cache results for dashboard                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼

┌─────────────────────────────────────────────────────────────────┐
│  PARTNER DASHBOARD API                                           │
│  (Next.js API routes + Supabase RLS)                            │
│                                                                  │
│  GET /api/partners/[slug]/metrics                               │
│  GET /api/partners/[slug]/codes                                 │
│  GET /api/partners/[slug]/users (anonymized)                    │
│  POST /api/partners/[slug]/reports/generate                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼

┌─────────────────────────────────────────────────────────────────┐
│  PARTNER DASHBOARD UI                                            │
│  (React components with real-time updates)                       │
│                                                                  │
│  Shows ONLY:                                                     │
│  ├─ Aggregated metrics (no individual behavior)                 │
│  ├─ Anonymous user IDs (User-A1B2, not real names)             │
│  ├─ Grant code status (not who activated)                       │
│  └─ Impact statistics (estimated outcomes)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Data Privacy & Anonymization Rules

**What Partner CAN See:**
✅ Total number of families served
✅ Aggregate usage statistics
✅ Anonymous user IDs (User-A1B2)
✅ Grant code activation status
✅ Overall conflict reduction percentages
✅ Feature adoption rates
✅ Retention rates
✅ Estimated impact (legal fees saved)

**What Partner CANNOT See:**
❌ Real names of users
❌ Email addresses
❌ Phone numbers
❌ Addresses
❌ Message content
❌ Schedule details
❌ Financial specifics
❌ Court document content
❌ Any personally identifiable information (PII)

---

### Anonymization Implementation

**Edge Function: anonymize_user_data.ts**

```typescript
// When grant code is activated
export async function anonymizeUserForPartner(
  userId: string,
  partnerId: string
): Promise<string> {
  // Generate unique anonymous ID
  const anonymousId = `User-${generateShortId()}` // e.g., User-A1B2
  
  // Store mapping in secure table (NOT accessible to partners)
  await supabase
    .from('user_anonymization_map')
    .insert({
      real_user_id: userId,
      anonymous_user_id: anonymousId,
      partner_id: partnerId,
      created_at: new Date()
    })
  
  // Return only anonymous ID
  return anonymousId
}

// When partner queries user data
export async function getAnonymizedUsers(partnerId: string) {
  const { data } = await supabase
    .from('grant_codes')
    .select(`
      anonymous_user_id,
      activated_at,
      family_files (
        last_login,
        message_count,
        schedule_count,
        expense_count
      )
    `)
    .eq('partner_id', partnerId)
    .eq('is_activated', true)
  
  // Returns only: { anonymous_user_id, stats }
  // NO real names, emails, or PII
  return data
}
```

---

### Metrics Aggregation Logic

**Edge Function: aggregate_partner_metrics.ts**

```typescript
export async function aggregatePartnerMetrics(
  partnerId: string,
  periodStart: Date,
  periodEnd: Date,
  periodType: 'daily' | 'weekly' | 'monthly'
) {
  // 1. Get all grant codes for this partner
  const codes = await supabase
    .from('grant_codes')
    .select('id, activated_by')
    .eq('partner_id', partnerId)
    .eq('is_activated', true)
  
  const userIds = codes.map(c => c.activated_by).filter(Boolean)
  
  // 2. Get aggregated message data
  const messageData = await supabase
    .from('messages')
    .select('aria_intervention, aria_accepted, created_at')
    .in('sender_id', userIds)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
  
  const totalMessages = messageData.length
  const ariaInterventions = messageData.filter(m => m.aria_intervention).length
  const ariaAccepted = messageData.filter(m => m.aria_accepted).length
  
  // 3. Calculate conflict reduction
  // (Compare toxicity scores before/after ARIA suggestions)
  const conflictReduction = calculateConflictReduction(messageData)
  
  // 4. Get feature usage
  const schedules = await supabase
    .from('schedules')
    .select('id')
    .in('family_file_id', familyFileIds)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
  
  const expenses = await supabase
    .from('expenses')
    .select('id, amount')
    .in('family_file_id', familyFileIds)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
  
  // 5. Calculate retention
  const retention30d = await calculateRetention(userIds, 30)
  const retention90d = await calculateRetention(userIds, 90)
  
  // 6. Get NPS score from surveys
  const npsScore = await calculateNPS(userIds, periodStart, periodEnd)
  
  // 7. Estimate legal fees saved
  // Conservative estimate: $300/hour attorney rate
  // Avg prevented conflict = 2 hours of attorney time
  const estimatedLegalFeesSaved = ariaInterventions * 2 * 300
  
  // 8. Store aggregated metrics
  await supabase
    .from('partner_metrics')
    .upsert({
      partner_id: partnerId,
      period_start: periodStart,
      period_end: periodEnd,
      period_type: periodType,
      
      codes_distributed: codes.length,
      codes_activated: codes.filter(c => c.is_activated).length,
      activation_rate: (codes.filter(c => c.is_activated).length / codes.length) * 100,
      
      active_users: calculateActiveUsers(userIds, periodStart, periodEnd),
      total_logins: await getTotalLogins(userIds, periodStart, periodEnd),
      
      messages_sent: totalMessages,
      aria_interventions: ariaInterventions,
      aria_acceptance_rate: (ariaAccepted / ariaInterventions) * 100,
      conflict_reduction_pct: conflictReduction,
      
      schedules_created: schedules.length,
      expenses_tracked: expenses.length,
      
      retention_rate_30d: retention30d,
      retention_rate_90d: retention90d,
      client_nps_score: npsScore,
      
      estimated_legal_fees_saved: estimatedLegalFeesSaved,
      estimated_conflicts_prevented: ariaInterventions,
      
      calculated_at: new Date()
    }, {
      onConflict: 'partner_id,period_start,period_type'
    })
  
  return { success: true }
}
```

---

## Template System Implementation

### Single Template, Multiple Partners

**Key Principle:** ONE codebase generates ALL partner landing pages and dashboards dynamically.

```
/app
  /[partner]
    /page.tsx                  ← Landing page template
    /activate
      /page.tsx                ← Activation flow template
  /dashboard
    /partners
      /[partner_slug]
        /page.tsx              ← Dashboard template
        /reports
          /page.tsx            ← Reports template
        /settings
          /page.tsx            ← Settings template

/components
  /partner
    /LandingPageTemplate.tsx   ← Reusable landing component
    /DashboardTemplate.tsx     ← Reusable dashboard component
    /PartnerBranding.tsx       ← Dynamic branding wrapper
```

---

### Dynamic Branding System

**Component: PartnerBranding.tsx**

```typescript
interface PartnerBrandingProps {
  partner: Partner
  children: React.ReactNode
}

export function PartnerBranding({ partner, children }: PartnerBrandingProps) {
  // Extract branding config
  const {
    logo_url,
    primary_color,
    secondary_color,
    accent_color,
    font_family
  } = partner.branding_config
  
  return (
    <div
      className="partner-branded-container"
      style={{
        '--partner-primary': primary_color || '#2C5F5D',
        '--partner-secondary': secondary_color || '#D4A853',
        '--partner-accent': accent_color || '#4A90A4',
        fontFamily: font_family || 'system-ui'
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
```

**CSS Variables (globals.css)**

```css
.partner-branded-container {
  /* Buttons use partner primary color */
  --button-bg: var(--partner-primary);
  --button-hover: color-mix(in srgb, var(--partner-primary) 85%, black);
  
  /* Links use partner accent color */
  --link-color: var(--partner-accent);
  
  /* Headers use partner secondary color */
  --header-accent: var(--partner-secondary);
}

.btn-primary {
  background-color: var(--button-bg);
  color: white;
}

.btn-primary:hover {
  background-color: var(--button-hover);
}

a {
  color: var(--link-color);
}

.section-header {
  border-left: 4px solid var(--header-accent);
}
```

---

### Form Data to Partner Record Flow

**Step 1: Partner fills out Google Form**

**Step 2: Google Form → Webhook → Next.js API Route**

```typescript
// /app/api/partners/create/route.ts

export async function POST(request: Request) {
  const formData = await request.json()
  
  // Validate data
  const validated = partnerSchema.parse(formData)
  
  // Generate slug from organization name
  const slug = slugify(validated.legal_name)
  
  // Upload logo to Supabase Storage
  const logoUrl = await uploadPartnerLogo(validated.logo_file)
  
  // Create partner record
  const { data: partner } = await supabase
    .from('partners')
    .insert({
      partner_slug: slug,
      legal_name: validated.legal_name,
      display_name: validated.display_name,
      ein: validated.ein,
      mission_statement: validated.mission_statement,
      
      primary_contact_name: validated.contact_name,
      primary_contact_email: validated.contact_email,
      primary_contact_phone: validated.contact_phone,
      
      branding_config: {
        logo_url: logoUrl,
        primary_color: validated.primary_color || '#2C5F5D',
        secondary_color: validated.secondary_color || '#D4A853',
        accent_color: validated.accent_color || '#4A90A4',
        font_family: validated.font_family || 'system-ui',
        hero_image_url: validated.hero_image_url || '',
        tagline: validated.tagline || ''
      },
      
      landing_config: {
        show_mission: validated.show_mission ?? true,
        show_stats: validated.show_stats ?? true,
        show_testimonials: validated.show_testimonials ?? false,
        custom_welcome_message: validated.welcome_message || '',
        faq_items: validated.faq_items || [],
        contact_method: validated.contact_method || 'email'
      },
      
      dashboard_config: {
        metrics_enabled: {
          codes_distributed: true,
          activation_rate: true,
          active_users: true,
          conflict_reduction: true,
          message_volume: true,
          schedules_created: true,
          expenses_tracked: true
        },
        report_frequency: validated.report_frequency || 'weekly',
        report_recipients: [validated.contact_email]
      },
      
      code_prefix: generateCodePrefix(validated.legal_name),
      codes_allocated: 25,
      status: 'pending'
    })
    .select()
    .single()
  
  // Generate initial grant codes
  await generateGrantCodes(partner.id, partner.code_prefix, 25)
  
  // Send welcome email to partner
  await sendPartnerWelcomeEmail(partner)
  
  // Notify CommonGround team
  await notifyTeamNewPartner(partner)
  
  return Response.json({ success: true, partner })
}
```

**Step 3: Landing page is instantly available**

- URL: `{slug}.commonground.app`
- Uses template with partner data from database
- No manual page creation needed

**Step 4: Dashboard is instantly available**

- URL: `dashboard.commonground.app/partners/{slug}`
- Partner staff creates account
- Account linked to partner_id
- Dashboard shows real-time data

---

## Technical Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + CSS Variables for dynamic theming
- **UI Components:** shadcn/ui (customizable)
- **Charts:** Recharts or Chart.js
- **Real-time:** Supabase Realtime subscriptions

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (for partner logos, images)
- **Edge Functions:** Supabase Edge Functions (Deno)
- **Cron Jobs:** Supabase Cron (for nightly metrics aggregation)

### Infrastructure
- **Hosting:** Vercel (Next.js apps)
- **Database:** Supabase Cloud
- **DNS:** Cloudflare (for wildcard subdomain routing)
- **CDN:** Vercel Edge Network

---

## Subdomain Routing Configuration

### Vercel Configuration (vercel.json)

```json
{
  "rewrites": [
    {
      "source": "/:partner",
      "destination": "/partners/:partner",
      "has": [
        {
          "type": "host",
          "value": "(?<partner>.*)\\.commonground\\.app"
        }
      ]
    }
  ]
}
```

### DNS Configuration (Cloudflare)

```
Type: CNAME
Name: *
Content: cname.vercel-dns.com
Proxy: Enabled
```

This allows:
- `safeharbor.commonground.app` → Routes to Next.js with partner="safeharbor"
- `anypartner.commonground.app` → Routes to Next.js with partner="anypartner"
- `dashboard.commonground.app` → Routes to dashboard app

---

## Security Considerations

### Row Level Security (RLS) Policies

**Partners Table:**

```sql
-- Partners can only see their own data
CREATE POLICY "Partners can view own data"
  ON partners
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT partner_id FROM partner_staff
      WHERE user_id = auth.uid()
    )
  );
```

**Grant Codes Table:**

```sql
-- Partners can see their own grant codes
CREATE POLICY "Partners can view own grant codes"
  ON grant_codes
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM partner_staff
      WHERE user_id = auth.uid()
    )
  );

-- Partners cannot see activated_by (user IDs)
CREATE POLICY "Hide user IDs from partners"
  ON grant_codes
  FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN auth.uid() IN (SELECT user_id FROM partner_staff)
      THEN activated_by IS NULL
      ELSE TRUE
    END
  );
```

**Partner Metrics Table:**

```sql
-- Partners can only see their own metrics
CREATE POLICY "Partners can view own metrics"
  ON partner_metrics
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM partner_staff
      WHERE user_id = auth.uid()
    )
  );
```

**User Anonymization Map:**

```sql
-- NO ACCESS for partners - internal only
CREATE POLICY "Block all partner access"
  ON user_anonymization_map
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );
```

---

## Report Generation

### Partner-Requested Reports

**Endpoint:** `POST /api/partners/[slug]/reports/generate`

**Request Body:**

```json
{
  "report_type": "quarterly",
  "period_start": "2026-01-01",
  "period_end": "2026-03-31",
  "format": "pdf",
  "include_sections": [
    "overview",
    "engagement",
    "impact",
    "recommendations"
  ]
}
```

**Report Generation Logic:**

```typescript
export async function generatePartnerReport(
  partnerId: string,
  periodStart: Date,
  periodEnd: Date,
  format: 'pdf' | 'excel' | 'word'
) {
  // 1. Fetch aggregated metrics
  const metrics = await supabase
    .from('partner_metrics')
    .select('*')
    .eq('partner_id', partnerId)
    .gte('period_start', periodStart)
    .lte('period_end', periodEnd)
    .order('period_start', { ascending: true })
  
  // 2. Get partner info
  const partner = await getPartner(partnerId)
  
  // 3. Generate report based on format
  if (format === 'pdf') {
    return await generatePDFReport(partner, metrics)
  } else if (format === 'excel') {
    return await generateExcelReport(partner, metrics)
  } else {
    return await generateWordReport(partner, metrics)
  }
}

async function generatePDFReport(partner: Partner, metrics: Metrics[]) {
  // Use a library like Puppeteer or react-pdf
  const html = renderReportTemplate(partner, metrics)
  const pdf = await htmlToPDF(html)
  
  // Upload to Supabase Storage
  const filePath = `reports/${partner.partner_slug}/${Date.now()}.pdf`
  await supabase.storage
    .from('partner-reports')
    .upload(filePath, pdf)
  
  // Return signed URL (expires in 7 days)
  const { data } = await supabase.storage
    .from('partner-reports')
    .createSignedUrl(filePath, 604800) // 7 days
  
  return data.signedUrl
}
```

**Report Template (PDF):**

```
┌─────────────────────────────────────────────────────────────────┐
│  [Partner Logo]                       CommonGround Partner Report│
│                                                                  │
│  Quarterly Impact Report                                        │
│  Q1 2026 (January 1 - March 31, 2026)                          │
│                                                                  │
│  Prepared for: [Partner Name]                                   │
│  Generated: [Date]                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                                              │
│                                                                  │
│  During Q1 2026, [Partner Name] supported 25 families through   │
│  the CommonGround platform, achieving a 68% reduction in        │
│  reported conflict and saving an estimated $37,500 in legal     │
│  fees for participating families.                               │
│                                                                  │
│  Key Highlights:                                                │
│  • 72% grant code activation rate (above 60% benchmark)        │
│  • 83% retention at 30 days (strong engagement)                │
│  • 284 messages mediated by ARIA AI                            │
│  • Net Promoter Score: 67 (excellent)                          │
└─────────────────────────────────────────────────────────────────┘

[Charts and detailed breakdowns follow...]
```

---

## Automated Reporting

### Email Reports (Scheduled via Cron)

**Supabase Edge Function: send_partner_reports.ts**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Run weekly on Mondays at 9 AM
  const today = new Date()
  const isMonday = today.getDay() === 1
  
  if (!isMonday) return new Response('Not scheduled day')
  
  // Get all active partners
  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .eq('status', 'active')
    .contains('dashboard_config', { report_frequency: 'weekly' })
  
  for (const partner of partners) {
    // Generate report for last 7 days
    const report = await generateWeeklySummary(partner.id)
    
    // Send to all report recipients
    const recipients = partner.dashboard_config.report_recipients
    
    for (const recipient of recipients) {
      await sendEmail({
        to: recipient,
        subject: `${partner.display_name} - Weekly CommonGround Report`,
        html: renderEmailTemplate(partner, report),
        attachments: [
          {
            filename: 'weekly-report.pdf',
            content: await generatePDFReport(partner, report)
          }
        ]
      })
    }
  }
  
  return new Response('Reports sent')
})
```

---

## Implementation Checklist

### Phase 1: Database & API (Week 1-2)
- [ ] Create `partners` table with schema
- [ ] Create `grant_codes` table
- [ ] Create `partner_metrics` table
- [ ] Create `user_anonymization_map` table
- [ ] Set up RLS policies
- [ ] Create API routes for partner CRUD
- [ ] Create metrics aggregation edge function

### Phase 2: Landing Page Template (Week 2-3)
- [ ] Build landing page component
- [ ] Implement dynamic branding system
- [ ] Create grant code activation flow
- [ ] Set up subdomain routing
- [ ] Test with sample partner data
- [ ] Deploy to staging

### Phase 3: Dashboard Template (Week 3-4)
- [ ] Build dashboard layout
- [ ] Implement metrics visualizations
- [ ] Create anonymized user list
- [ ] Add grant code management
- [ ] Build report generation
- [ ] Test with real data

### Phase 4: Automation (Week 4-5)
- [ ] Set up nightly metrics aggregation cron
- [ ] Implement automated email reports
- [ ] Create partner onboarding automation
- [ ] Build admin tools for managing partners

### Phase 5: Testing & Launch (Week 5-6)
- [ ] End-to-end testing with first partner
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation
- [ ] Launch with pilot partners

---

## Example Partner Configurations

### Example 1: Safe Harbor DV Services

```json
{
  "partner_slug": "safeharbor",
  "legal_name": "Safe Harbor Domestic Violence Services Inc.",
  "display_name": "Safe Harbor",
  "branding_config": {
    "logo_url": "https://storage.commonground.app/partners/safeharbor/logo.png",
    "primary_color": "#8B4789",
    "secondary_color": "#E8C547",
    "accent_color": "#4A90A4",
    "tagline": "From Crisis to Stability"
  },
  "landing_config": {
    "show_mission": true,
    "show_stats": true,
    "custom_welcome_message": "Welcome! Through our partnership with CommonGround, you have free access to tools that help you co-parent safely and peacefully."
  },
  "dashboard_config": {
    "report_frequency": "weekly",
    "report_recipients": ["director@safeharbor.org", "programdir@safeharbor.org"]
  }
}
```

**Generated URLs:**
- Landing: `safeharbor.commonground.app`
- Dashboard: `dashboard.commonground.app/partners/safeharbor`

---

### Example 2: LA Family Legal Aid

```json
{
  "partner_slug": "lafamilylaw",
  "legal_name": "Los Angeles Family Legal Aid Foundation",
  "display_name": "LA Family Legal Aid",
  "branding_config": {
    "logo_url": "https://storage.commonground.app/partners/lafamilylaw/logo.png",
    "primary_color": "#003366",
    "secondary_color": "#FFD700",
    "accent_color": "#006BA6"
  },
  "landing_config": {
    "show_mission": true,
    "show_stats": true,
    "custom_welcome_message": "LA Family Legal Aid provides you with free access to CommonGround—professional tools to help you navigate co-parenting challenges."
  }
}
```

**Generated URLs:**
- Landing: `lafamilylaw.commonground.app`
- Dashboard: `dashboard.commonground.app/partners/lafamilylaw`

---

*Last Updated: January 2026*
*Version: 1.0*
*This architecture enables infinite scalability with zero manual page creation*
