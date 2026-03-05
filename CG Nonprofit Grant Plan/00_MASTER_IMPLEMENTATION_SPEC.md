# CG_NONPROFIT_GRANT_PROGRAM_IMPLEMENTATION_SPEC_v1

## META
- **PURPOSE**: MVP nonprofit grant program w/ Forever Forward pilot
- **SCOPE**: Manual setup → Validate → Automate (phase 2)
- **EXISTING_CODEBASE**: Next.js 14, Supabase, TypeScript - AUDIT AGAINST EXISTING CODE STRUCTURE
- **DOCS_SOURCE**: 13 GTM strategy documents (pricing, messaging, onboarding, architecture)

---

## PRODUCT_TIERS_ACTUAL
```yaml
WEB_STARTER: {price: 0, features: [ARIA_flagging_only, basic_calendar, clearfund_no_fees, web_only]}
PLUS: {price: 17.99, features: [all_starter, auto_schedules, quick_accords, pdf_export, circle_1_contact, mobile_coming]}
COMPLETE: {price: 34.99, features: [all_plus, gps_handoff, custody_analytics, kidscoms, court_packages, priority_support]}
ASYMMETRIC_MODEL: one_parent_free_other_paid_both_interact
```

---

## PARTNER_FOREVER_FORWARD
```yaml
org: {name: Forever_Forward, location: LA_CA, mission: empower_black_brown_communities_career_dev_education}
programs: [
  {name: Empowering_Fathers_Digital_Era, duration: 8wks, cohort: 15-20_fathers, focus: IT_cybersec_leadership},
  {name: Youth_Art_Tech, duration: 8-12wks, cohort: 20-30_youth},
  {name: LULA_Level_Up_Academy, type: family_ecosystem}
]
target_users: fathers_recent_divorce_custody_challenges_tech_comfortable
estimated_need: 20-30%_per_cohort = 3-6_fathers
grant_tier: COMPLETE (34.99/mo × 6mo = 209.94_value)
codes_initial: 25
cultural_notes: black_brown_fathers_leadership_language_no_shame_showing_up_consistency
```

---

## DB_SCHEMA_REQUIRED

### partners
```sql
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_slug TEXT UNIQUE NOT NULL,
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  ein TEXT,
  mission_statement TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  branding_config JSONB DEFAULT '{"logo_url":"","primary_color":"#2C5F5D","secondary_color":"#D4A853","accent_color":"#4A90A4","font_family":"system-ui","hero_image_url":"","tagline":""}'::jsonb,
  landing_config JSONB DEFAULT '{"show_mission":true,"show_stats":true,"show_testimonials":false,"custom_welcome_message":"","faq_items":[],"contact_method":"email"}'::jsonb,
  dashboard_config JSONB DEFAULT '{"metrics_enabled":{"codes_distributed":true,"activation_rate":true,"active_users":true,"conflict_reduction":true,"message_volume":true,"schedules_created":true,"expenses_tracked":true},"report_frequency":"weekly","report_recipients":[]}'::jsonb,
  code_prefix TEXT,
  codes_allocated INT DEFAULT 25,
  codes_used INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  activation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(partner_slug);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
```

### grant_codes
```sql
CREATE TABLE IF NOT EXISTS grant_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'complete',
  duration_days INT DEFAULT 180,
  is_activated BOOLEAN DEFAULT FALSE,
  activated_by UUID REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  anonymous_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grant_codes_partner ON grant_codes(partner_id);
CREATE INDEX IF NOT EXISTS idx_grant_codes_code ON grant_codes(code);
CREATE INDEX IF NOT EXISTS idx_grant_codes_activated ON grant_codes(is_activated);
```

### partner_metrics (aggregated cache)
```sql
CREATE TABLE IF NOT EXISTS partner_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL,
  codes_distributed INT DEFAULT 0,
  codes_activated INT DEFAULT 0,
  activation_rate DECIMAL(5,2),
  active_users INT DEFAULT 0,
  total_logins INT DEFAULT 0,
  avg_logins_per_user DECIMAL(5,2),
  messages_sent INT DEFAULT 0,
  aria_interventions INT DEFAULT 0,
  aria_acceptance_rate DECIMAL(5,2),
  conflict_score_avg DECIMAL(5,2),
  conflict_reduction_pct DECIMAL(5,2),
  schedules_created INT DEFAULT 0,
  exchanges_logged INT DEFAULT 0,
  expenses_tracked INT DEFAULT 0,
  agreements_started INT DEFAULT 0,
  avg_session_duration_minutes DECIMAL(10,2),
  retention_rate_30d DECIMAL(5,2),
  retention_rate_90d DECIMAL(5,2),
  client_nps_score DECIMAL(5,2),
  estimated_legal_fees_saved DECIMAL(10,2),
  estimated_conflicts_prevented INT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, period_start, period_type)
);
CREATE INDEX IF NOT EXISTS idx_partner_metrics_partner ON partner_metrics(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_metrics_period ON partner_metrics(period_start, period_type);
```

### partner_staff
```sql
CREATE TABLE IF NOT EXISTS partner_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, user_id)
);
```

### user_anonymization_map (NO partner access)
```sql
CREATE TABLE IF NOT EXISTS user_anonymization_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id UUID REFERENCES auth.users(id) NOT NULL,
  anonymous_user_id TEXT UNIQUE NOT NULL,
  partner_id UUID REFERENCES partners(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: ONLY admin access, NEVER partners
```

---

## RLS_POLICIES_CRITICAL
```sql
-- Partners see own data only
CREATE POLICY partners_view_own ON partners FOR SELECT TO authenticated USING (id IN (SELECT partner_id FROM partner_staff WHERE user_id = auth.uid()));

-- Partners see own codes, NOT activated_by (user IDs)
CREATE POLICY codes_view_own ON grant_codes FOR SELECT TO authenticated USING (partner_id IN (SELECT partner_id FROM partner_staff WHERE user_id = auth.uid()));

-- Partners see own metrics only
CREATE POLICY metrics_view_own ON partner_metrics FOR SELECT TO authenticated USING (partner_id IN (SELECT partner_id FROM partner_staff WHERE user_id = auth.uid()));

-- Block ALL partner access to anonymization map
CREATE POLICY anon_map_admin_only ON user_anonymization_map FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM admin_users));
```

---

## LANDING_PAGE_ARCHITECTURE

### URL_PATTERN
`{partner_slug}.commonground.app` → Next.js dynamic route

### TEMPLATE_FILE_STRUCTURE
```
/app/[partner]/page.tsx → SSR fetch partner by slug → render <PartnerLandingTemplate>
/components/partner/LandingTemplate.tsx → single reusable component
/components/partner/PartnerBranding.tsx → CSS vars for dynamic theming
```

### CSS_BRANDING_VARS
```css
.partner-branded-container {
  --partner-primary: var(--from-db);
  --partner-secondary: var(--from-db);
  --partner-accent: var(--from-db);
}
.btn-primary { background-color: var(--partner-primary); }
```

### LANDING_PAGE_SECTIONS
```yaml
header: [partner_logo, cg_logo, cta_activate]
hero: {headline: custom_or_default, subheadline: partnership_message, cta: activate_code}
impact_stats: {families_served, conflict_reduction, fees_saved} # if show_stats: true
mission: partner_mission_statement # if show_mission: true
features: [aria_ai, organization, court_docs, child_protection, free_value]
how_it_works: [get_code_from_org, activate_10min, start_coparenting]
testimonials: anonymous_quotes # if show_testimonials: true
faq: standard + partner_custom
final_cta: activate_code
footer: [logos, privacy_terms_support]
```

### FOREVER_FORWARD_LANDING_CONTENT
```yaml
headline: "Building Stronger Fathers, Building Stronger Families"
subheadline: "Forever Forward + CommonGround partnership provides free Complete tier (6mo, $209.94 value)"
hero_message: "Leadership in career (FF teaches) → Leadership in family (CG enables)"
why_matters_fathers: {consistency: prove_show_up, communication: professional_under_pressure, documentation: court_ready, leadership: organized_in_control}
cultural_tone: empowering_not_patronizing, brother_to_brother, no_shame, action_oriented
imagery: black_brown_fathers_with_children, tech_comfortable, community_focused
colors: {primary: "#1A1A1A", secondary: "#FFD700", accent: "#4A90A4"}
```

---

## DASHBOARD_ARCHITECTURE

### URL
`dashboard.commonground.app/partners/{partner_slug}`

### AUTH
- partner_staff table links user_id → partner_id
- RLS enforces data isolation
- Role: admin (full access) or viewer (read-only)

### DASHBOARD_SECTIONS
```yaml
overview: {
  metrics_cards: [codes_distributed, codes_activated, activation_rate, active_users, messages_sent, conflict_reduction],
  date_range_selector: [7d, 30d, 90d, custom]
}
engagement_trends: {
  chart: active_users_over_time,
  frequency: daily_weekly_monthly
}
impact_metrics: {
  communication_health: [messages, aria_interventions, acceptance_rate, conflict_reduction_pct],
  feature_adoption: [schedules, expenses, agreements, court_exports],
  long_term: [retention_30d, retention_90d, nps, est_legal_fees_saved, est_conflicts_prevented]
}
active_users_list: {
  columns: [anonymous_user_id, activated_date, last_active, message_count, status_indicator],
  privacy: NO real names/emails/PII, only User-A1B2 format
}
grant_codes_mgmt: {
  status_table: [code, status, distributed_date, activated_date, active],
  actions: [download_tracking_sheet, request_more_codes]
}
quick_actions: [generate_report, download_data, request_support, view_resources]
```

### FOREVER_FORWARD_DASHBOARD
```yaml
custom_metrics: focus_fathers_retention_leadership_outcomes
report_frequency: monthly
recipients: [ff_primary_contact]
anonymization: User-FF1A2, User-FF3B4 format
cultural_context_notes: track_father_engagement_peer_accountability_community_impact
```

---

## GRANT_CODE_SYSTEM

### GENERATION
```sql
-- Manual MVP version
INSERT INTO grant_codes (code, partner_id, tier, duration_days)
SELECT 
  'FOREVERFORWARD' || LPAD((ROW_NUMBER() OVER())::TEXT, 4, '0'),
  (SELECT id FROM partners WHERE partner_slug = 'foreverforward'),
  'complete',
  180
FROM generate_series(1, 25);
```

### ACTIVATION_FLOW
```yaml
user_visits: foreverforward.commonground.app
enters_code: FOREVERFORWARD0001
validation: {exists: true, not_activated: true, partner_active: true}
account_creation: {email, password, basic_info}
activation_logic: {
  update_grant_code: {is_activated: true, activated_by: user_id, activated_at: now, expires_at: now+180d, anonymous_user_id: generate_User-XY12},
  create_family_file: {user_id, partner_id, grant_code_id, subscription_tier: complete, subscription_expires: now+180d},
  increment_partner_codes_used: rpc_call
}
redirect: app_dashboard with partnership_acknowledgment
```

### ANONYMIZATION
```typescript
generateAnonymousId = () => `User-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
// Maps real_user_id → anonymous_user_id in secure table
// Partners see ONLY anonymous IDs, never real identities
```

---

## MVP_MANUAL_SETUP_TASKS

### WEEK_1_FOUNDATION
```yaml
day1: {
  info_gather: [ff_primary_contact, logo_svg_png, brand_colors, cohort_schedule, participant_count_estimate],
  db_insert_partner: execute_sql_partners_table,
  generate_codes: execute_sql_25_codes_FOREVERFORWARD0001-0025,
  create_tracking_sheet: xlsx_with_code_distributed_activated_columns
}
day2-3: {
  build_landing: /app/foreverforward/page.tsx using_template,
  custom_content: ff_specific_copy_cultural_relevance,
  test_deploy: vercel_staging_then_production
}
day4: {
  build_dashboard: /app/dashboard/partners/foreverforward/page.tsx,
  create_staff_account: ff_contact_as_partner_admin,
  link_partner_staff_table: user_id_partner_id_role_admin
}
day5: {
  materials: [grant_code_cards_pdf, faq_fathers_pdf, orientation_script_5min_pdf, tracking_spreadsheet],
  qa_testing: full_activation_flow_landing_to_dashboard
}
```

### WEEK_2_MATERIALS
```yaml
grant_code_card_design: {
  content: [ff_logo, cg_logo, "FREE CO-PARENTING TOOLS", code_field, benefits_list, value_209.94, activation_url, support_contacts],
  format: printable_pdf_4x6_digital_png,
  tone: empowering_fathers_leadership_family_stability
}
faq_fathers: {
  questions: [why_partnership, cost, coparent_wont_use, not_bad_dads, phone_compatibility, kids_video_grandparents, help_questions],
  tone: brother_to_brother_no_judgment_practical_answers,
  cultural_relevance: black_brown_fathers_tech_comfortable_stability_focus
}
orientation_script_5min: {
  structure: [intro_30s, what_it_is_1min, why_matters_fathers_1min, how_to_get_1min, questions_1.5min, close_30s],
  key_messages: [consistency_prove_show_up, communication_professional, documentation_court, leadership_organized],
  closing: "your_family_worth_10min_setup_lets_move_forward_together"
}
```

### WEEK_3_TRAINING
```yaml
staff_training_1hr: {
  agenda: [partnership_overview_10min, platform_walkthrough_20min, code_distribution_15min, dashboard_access_10min, qa_5min],
  deliverables: [tracking_sheet, code_cards_25, faq_handout, script, dashboard_login],
  practice: orientation_script_roleplay
}
test_full_flow: landing_activation_usage_dashboard_metrics
```

### WEEK_4_LAUNCH
```yaml
soft_launch: {
  timing: week_6_or_7_of_ff_cohort,
  method: 5min_orientation_during_session,
  distribution: physical_code_cards_25,
  support: encourage_activation_before_graduation
}
week8_graduation: {
  check_activation_rate: target_30pct_7-8_users,
  offer_support: non_activators_1on1_help,
  collect_feedback: what_worked_what_didnt
}
weeks9-12_monitor: {
  weekly_dashboard_checks: active_users_feature_adoption,
  proactive_outreach: inactive_users_via_ff_coordinator,
  success_stories: testimonials_quotes_data
}
```

---

## MANUAL_DATA_AGGREGATION

### WEEKLY_METRICS_QUERY
```sql
WITH ff_users AS (
  SELECT gc.anonymous_user_id, gc.activated_at, ff.id as family_file_id
  FROM grant_codes gc
  JOIN family_files ff ON gc.activated_by = ff.user_id
  WHERE gc.partner_id = (SELECT id FROM partners WHERE partner_slug = 'foreverforward')
    AND gc.is_activated = true
)
SELECT 
  COUNT(DISTINCT fu.anonymous_user_id) as total_activated,
  COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '7 days' THEN fu.anonymous_user_id END) as active_7d,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.aria_flagged THEN 1 END) as aria_interventions,
  AVG(CASE WHEN m.aria_flagged THEN m.toxicity_score END) as avg_conflict_before,
  COUNT(DISTINCT s.id) as schedules_created,
  SUM(e.amount) as expenses_tracked,
  COUNT(DISTINCT ce.id) as court_exports
FROM ff_users fu
LEFT JOIN messages m ON m.sender_id = (SELECT user_id FROM grant_codes WHERE anonymous_user_id = fu.anonymous_user_id)
LEFT JOIN schedules s ON s.family_file_id = fu.family_file_id
LEFT JOIN expenses e ON e.family_file_id = fu.family_file_id
LEFT JOIN court_exports ce ON ce.family_file_id = fu.family_file_id;
-- Run Monday AM, update dashboard manually
```

### MONTHLY_REPORT_EMAIL
```yaml
subject: "Forever Forward + CommonGround - Monthly Impact Report"
sections: {
  usage_metrics: [codes_activated, active_users, messages, schedules, exports],
  impact: [conflict_reduction_pct, est_legal_fees_saved, families_supported],
  highlights: [success_story, participant_quote],
  next_steps: [action_items_ff, action_items_cg]
}
frequency: first_monday_each_month
```

---

## SUCCESS_METRICS

### ACTIVATION_TARGETS
```yaml
week1_post_distribution: {target: 30pct, threshold_investigate: 20pct}
week4_post_distribution: {target: 50pct, threshold_adjust: 40pct}
week8_post_distribution: {target: 60pct, threshold_major_changes: 50pct}
```

### ENGAGEMENT_TARGETS
```yaml
week4: {active_last_7d: 70pct, avg_messages_per_user: 10+, schedules_created: 3+}
week8: {active_last_7d: 60pct, avg_messages_per_user: 20+, schedules_created: 5+, court_exports: 1+}
```

### IMPACT_TARGETS_3MO
```yaml
conflict_reduction: 50pct+
legal_fees_saved: 5000+
nps_score: 40+
ff_staff_satisfaction: 4_of_5+
```

---

## TRANSITION_TO_AUTOMATION

### AFTER_3MO_PILOT_SUCCESS
```yaml
if: {activation: 50pct+, feedback: positive, ff_staff_satisfied: true}
then_automate: {
  partner_onboarding_form: google_form_typeform_webhook,
  landing_page_generation: db_insert_triggers_vercel_build,
  grant_code_generation: automatic_on_partner_create,
  dashboard_data_pipeline: supabase_edge_function_nightly_cron,
  monthly_reports: automated_email_sendgrid_resend,
  self_service_portal: partner_admin_ui_request_codes_download_reports
}
build_time: 4-6_weeks
time_saved_per_partner: 15-20_hours
next_partners: [la_dv_services_nonprofit, la_legal_aid_nonprofit]
```

---

## RISKS_MITIGATION

### LOW_ACTIVATION
```yaml
mitigations: [incentivize_early_activation_raffle, compelling_orientation, 1on1_setup_assistance, simplify_activation_ux]
```

### STAFF_BURDEN
```yaml
mitigations: [5min_max_orientation_not_15, done_for_you_scripts, minimal_tracking_overhead, quick_escalation_path]
```

### PARTICIPANTS_DROP_OFF
```yaml
mitigations: [proactive_checkins_week1_week4, peer_accountability_ff_community, show_roi_early_conflicts_prevented, success_stories_from_other_fathers]
```

### TECHNICAL_ISSUES
```yaml
mitigations: [thorough_testing_pre_launch, backup_contact_urgent, office_hours_activation_support, fallback_manual_assistance]
```

---

## EXISTING_CODEBASE_AUDIT_CHECKLIST

### VERIFY_EXISTS
```yaml
- [ ] Next.js 14+ app router structure
- [ ] Supabase client configured
- [ ] Auth system (supabase auth or similar)
- [ ] family_files table structure
- [ ] messages table with aria fields
- [ ] schedules table
- [ ] expenses table
- [ ] court_exports table (or similar)
- [ ] User dashboard routes
- [ ] Subscription/tier management logic
```

### CHECK_COMPATIBILITY
```yaml
- [ ] Can add partners table without breaking existing schema
- [ ] Can add grant_codes table with FK to auth.users
- [ ] Can link family_files to partner_id (nullable FK)
- [ ] Can extend user model with partner_staff relationship
- [ ] Can implement subdomain routing for {slug}.commonground.app
- [ ] Can add RLS policies without conflicts
- [ ] Can query cross-table for metrics aggregation
- [ ] Can generate anonymous IDs securely
```

### GAPS_TO_BUILD
```yaml
- [ ] partners table (new)
- [ ] grant_codes table (new)
- [ ] partner_metrics table (new)
- [ ] partner_staff table (new)
- [ ] user_anonymization_map table (new)
- [ ] /app/[partner]/page.tsx dynamic route (new)
- [ ] /app/dashboard/partners/[slug]/page.tsx route (new)
- [ ] <PartnerLandingTemplate> component (new)
- [ ] <PartnerDashboard> component (new)
- [ ] Grant code activation flow in signup (modify existing)
- [ ] Metrics aggregation edge function (new)
- [ ] RLS policies for partner data isolation (new)
- [ ] Subdomain DNS/routing config (infrastructure)
```

---

## IMPLEMENTATION_ORDER

### PHASE_1_DB_FOUNDATION
```yaml
1. Create all 5 new tables (partners, grant_codes, partner_metrics, partner_staff, user_anonymization_map)
2. Add RLS policies
3. Test FK relationships with existing tables (users, family_files)
4. Create manual SQL scripts for FF partner insert + code generation
```

### PHASE_2_LANDING_PAGE
```yaml
1. Set up subdomain routing (Vercel config + DNS)
2. Build /app/[partner]/page.tsx dynamic route
3. Create <PartnerLandingTemplate> component
4. Implement CSS vars dynamic branding
5. Build FF-specific content and test at foreverforward.commonground.app
6. Test grant code activation flow integration
```

### PHASE_3_DASHBOARD
```yaml
1. Build /app/dashboard/partners/[slug]/page.tsx route
2. Create <PartnerDashboard> component with all sections
3. Implement partner staff auth and RLS checks
4. Build manual metrics query and display
5. Create staff account for FF contact and test access
```

### PHASE_4_MATERIALS_LAUNCH
```yaml
1. Design and export all PDF materials (cards, FAQ, script)
2. Create tracking spreadsheet
3. Conduct FF staff training
4. Distribute codes to cohort week 6-7
5. Monitor activations and collect feedback
```

### PHASE_5_ITERATION
```yaml
1. Weekly dashboard updates with manual queries
2. Monthly reports via email
3. Collect success stories and testimonials
4. Document lessons learned for automation
5. After 3mo: Build automation or onboard next partner
```

---

## MESSAGING_VALUE_PROPS_CONDENSED

### PARENTS (DV/HIGH-CONFLICT)
```yaml
primary: "Start free. Upgrade when ready. One parent can pay while other stays free."
pain_points: [every_text_fight, fear_coparent_reactions, bleeding_legal_fees, kids_caught_middle, unorganized_chaos, no_legal_protection]
benefits: [aria_prevents_conflict, court_ready_records, money_savings_8400yr, child_protection, organization_one_place]
objections: {
  too_expensive: "Web Starter free forever, Plus $17.99 = 4min attorney time",
  ex_wont_use: "Asymmetric model - you benefit even if they stay free",
  dont_trust_ai: "ARIA suggests you decide, trained by experts",
  seems_complicated: "Simpler than juggling texts emails calendar venmo"
}
```

### ATTORNEYS
```yaml
primary: "Reduce client drama 73%. Reclaim 15hrs/week. Make high-conflict cases profitable."
pain_points: [highconflict_monopolize_time, billable_hour_trap, hesaid_shesaid, clients_dont_document, endless_modifications]
benefits: [clients_resolve_80pct_inapp, preorganized_evidence, case_velocity_3x_faster, client_satisfaction_referrals, competitive_differentiation]
roi: {time_saved: 15-20hrs_wk, new_capacity: 10_more_cases_yr, staff_savings: 3200_mo, value: 158400_yr, cost: 3588_yr, roi: 4316pct}
objections: {
  clients_wont_pay: "Build into retainer or case vouchers",
  no_time_learn: "15min demo saves 15hrs/wk forever",
  what_if_down: "99.9pct uptime, offline exports, zero missed deadlines"
}
```

### NONPROFITS
```yaml
primary: "Extend your impact beyond your walls. Automated outcomes for grant reports. Zero cost."
pain_points: [clients_leave_conflict_continues, hard_prove_impact, grant_reporting_timeconsuming, cant_monitor_post_program, limited_capacity, recidivism]
benefits: [ongoing_support_24_7, automated_outcome_tracking, grant_ready_reports_oneclick, cobranded_impact, scalable_serve_10x, attorney_network_connection]
partnership_model: {
  nonprofit_provides: [distribute_codes, 15min_orientation],
  cg_provides: [free_complete_180d, cobranded_page, outcomes_dashboard, grant_reports, marketing_support, priority_support],
  grant_value: [complete_34.99_mo_x_6mo = 209.94_per_family, 25_codes = 5248.50_value_provided]
}
```

---

## KEY_DOCUMENTATION_REFS

### PRICING_CORRECT
```yaml
consumer: {web_starter: 0, plus: 17.99, complete: 34.99}
professional: {solo: 99, small: 299, midsize: 799}
trial: 14d_paid_plans
asymmetric: one_free_one_paid_model_unique_value_prop
```

### VALUE_PROPS_BY_AUDIENCE
- Doc 02: Value_Proposition_Framework.md
- Messaging by tier, objection handling, ROI calculations

### MESSAGING_GUIDELINES
- Doc 03: Messaging_Guide.md
- Brand voice, word choice, competitive positioning, crisis comms

### DISCOVERY_SCRIPTS
- Doc 04: Attorney_Discovery_Script.md
- Doc 05: Nonprofit_Discovery_Script.md
- Call scripts, qualification scorecards, objection handling

### EMAIL_SEQUENCES
- Doc 07: Attorney_Email_Sequences.md (15+ templates)
- Doc 08: Nonprofit_Email_Sequences.md (12+ templates)
- Cold outreach, follow-up, referral-based

### ONBOARDING_PROCESS
- Doc 09: Nonprofit_Onboarding_Complete.md
- Full process from "yes" to active partnership, 21 resources

### TECHNICAL_ARCHITECTURE
- Doc 10: Landing_Dashboard_Architecture.md
- DB schema, data flow, template system, subdomain routing

### AI_AGENTS
- Doc 11: AI_Agent_Ecosystem.md
- Sales/marketing/support/bugfix agents, HubSpot integration, MCP server

### PRICING_CORRECTION
- Doc 12: Pricing_Correction_Update.md
- Master reference for corrected pricing across all docs

### FF_PILOT_DETAILED
- Doc 13: Forever_Forward_Pilot_Setup.md
- 80pg manual setup guide, week-by-week tasks, materials

---

## PROMPT_FOR_ANTIGRAVITY_MODEL

```
You are implementing the CommonGround nonprofit grant program MVP with Forever Forward as the first pilot partner. This document contains the complete specification in condensed machine-readable format.

CRITICAL INSTRUCTIONS:
1. AUDIT EXISTING CODEBASE FIRST - Check /app, /components, database schema against this spec
2. IDENTIFY GAPS - List what exists vs what needs building
3. VERIFY COMPATIBILITY - Ensure new tables/routes don't break existing functionality
4. IMPLEMENT IN ORDER - Follow PHASE_1 through PHASE_5 sequence
5. PRESERVE PRIVACY - Implement all RLS policies and anonymization correctly
6. TEST THOROUGHLY - Full activation flow from landing page → dashboard before launch
7. CULTURAL SENSITIVITY - Forever Forward serves Black/Brown fathers, messaging must be empowering not patronizing

DATABASE: Check if partners/grant_codes/partner_metrics/partner_staff/user_anonymization_map tables exist. If not, create with exact schema provided.

LANDING PAGE: Build {partner_slug}.commonground.app dynamic route using single template. Forever Forward content must emphasize leadership, consistency, stability for fathers.

DASHBOARD: Build dashboard.commonground.app/partners/{slug} with RLS ensuring partners see ONLY their anonymized data.

MANUAL MVP: Initial setup is manual (SQL inserts, weekly metric queries). Document automation path for phase 2.

SUCCESS CRITERIA: 
- 25 grant codes generated for FF
- Landing page live at foreverforward.commonground.app
- Dashboard accessible to FF staff with real metrics
- Grant code activation flow works end-to-end
- All privacy/anonymization enforced
- Launch with FF cohort in 3-4 weeks

REFERENCE DOCUMENTS: 13 GTM strategy docs available for detailed context on messaging, process, architecture. This spec synthesizes all 13 into executable format.

OUTPUT: 
1. Gap analysis (what exists vs what's needed)
2. Implementation plan with file paths and code
3. Testing checklist
4. Launch readiness assessment

Begin by auditing the existing codebase structure.
```

---

## END_SPEC_CG_NONPROFIT_GRANT_v1
Total implementation: 3-4 weeks manual MVP, 4-6 weeks automation phase 2
Success enables replication with 2-3 more LA nonprofits before full automation
All 13 GTM docs condensed into this single machine-readable specification
