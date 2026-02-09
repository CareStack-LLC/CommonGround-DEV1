-- ============================================================================
-- CommonGround Nonprofit Partner Program
-- SQL Migration: Add partner tables and extend grant_codes
-- ============================================================================

-- 1. Create partners table
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
  branding_config JSONB DEFAULT '{
    "logo_url": "",
    "primary_color": "#2C5F5D",
    "secondary_color": "#D4A853",
    "accent_color": "#4A90A4",
    "font_family": "system-ui",
    "hero_image_url": "",
    "tagline": ""
  }'::jsonb NOT NULL,
  landing_config JSONB DEFAULT '{
    "show_mission": true,
    "show_stats": true,
    "show_testimonials": false,
    "custom_welcome_message": "",
    "faq_items": [],
    "contact_method": "email"
  }'::jsonb NOT NULL,
  dashboard_config JSONB DEFAULT '{
    "metrics_enabled": {
      "codes_distributed": true,
      "activation_rate": true,
      "active_users": true,
      "conflict_reduction": true,
      "message_volume": true,
      "schedules_created": true
    },
    "report_frequency": "weekly",
    "report_recipients": []
  }'::jsonb NOT NULL,
  code_prefix TEXT,
  codes_allocated INT DEFAULT 25 NOT NULL,
  codes_used INT DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  activation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(partner_slug);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);

-- 2. Create partner_staff table
CREATE TABLE IF NOT EXISTS partner_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(partner_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_staff_partner ON partner_staff(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_staff_user ON partner_staff(user_id);

-- 3. Create partner_metrics table
CREATE TABLE IF NOT EXISTS partner_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
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
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(partner_id, period_start, period_type)
);

CREATE INDEX IF NOT EXISTS idx_partner_metrics_partner ON partner_metrics(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_metrics_period ON partner_metrics(period_start, period_type);

-- 4. Create user_anonymization_map table
-- CRITICAL: This table must NEVER be accessible to partner staff via RLS
CREATE TABLE IF NOT EXISTS user_anonymization_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  anonymous_user_id TEXT UNIQUE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anon_map_user ON user_anonymization_map(real_user_id);
CREATE INDEX IF NOT EXISTS idx_anon_map_partner ON user_anonymization_map(partner_id);
CREATE INDEX IF NOT EXISTS idx_anon_map_anon_id ON user_anonymization_map(anonymous_user_id);

-- 5. Add partner_id to grant_codes (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'grant_codes' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE grant_codes 
    ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_grant_codes_partner ON grant_codes(partner_id);
  END IF;
END $$;

-- ============================================================================
-- RLS Policies for Partner Program
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_anonymization_map ENABLE ROW LEVEL SECURITY;

-- Partners: Public can read active partners (for landing pages)
CREATE POLICY partners_select_public ON partners
  FOR SELECT
  USING (status = 'active');

-- Partner Staff: Can only see their own partner assignments
CREATE POLICY partner_staff_select_own ON partner_staff
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Partner Metrics: Staff can see metrics for their partner only
CREATE POLICY partner_metrics_select_staff ON partner_metrics
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM partner_staff WHERE user_id = auth.uid()::text
    )
  );

-- User Anonymization Map: NEVER accessible via RLS (backend API only)
-- No policies = no access from client
CREATE POLICY anon_map_deny_all ON user_anonymization_map
  FOR ALL
  USING (false);

-- Grant codes: Public can validate (read) codes
CREATE POLICY grant_codes_select_public ON grant_codes
  FOR SELECT
  USING (true);

-- ============================================================================
-- Forever Forward Partner Setup (Initial Data)
-- ============================================================================

-- Insert Forever Forward as first partner
INSERT INTO partners (
  partner_slug,
  legal_name,
  display_name,
  mission_statement,
  primary_contact_email,
  branding_config,
  landing_config,
  code_prefix,
  codes_allocated,
  status,
  activation_date
) VALUES (
  'foreverforward',
  'Forever Forward',
  'Forever Forward',
  'Empowering Black and Brown communities through career development, education, and family leadership. We believe in building stronger fathers who build stronger families.',
  'contact@foreverforward.org',
  '{
    "logo_url": "",
    "primary_color": "#1A1A1A",
    "secondary_color": "#FFD700",
    "accent_color": "#4A90A4",
    "font_family": "system-ui",
    "hero_image_url": "",
    "tagline": "Building Stronger Fathers, Building Stronger Families"
  }'::jsonb,
  '{
    "show_mission": true,
    "show_stats": true,
    "show_testimonials": false,
    "custom_welcome_message": "You are investing in your future. Now invest in your family.",
    "faq_items": [
      {"question": "How long does setup take?", "answer": "About 10 minutes to create your account and invite your co-parent."},
      {"question": "Is my information private?", "answer": "Yes. Forever Forward only sees anonymous statistics. Your personal data is never shared."},
      {"question": "What if my co-parent refuses to join?", "answer": "You can still use CommonGround for scheduling, documentation, and tracking. Full features require both parents."}
    ],
    "contact_method": "email"
  }'::jsonb,
  'FOREVERFORWARD',
  25,
  'active',
  NOW()
) ON CONFLICT (partner_slug) DO NOTHING;

-- Generate 25 grant codes for Forever Forward
INSERT INTO grant_codes (
  id,
  code,
  partner_id,
  granted_plan_code,
  nonprofit_name,
  nonprofit_contact_email,
  grant_duration_days,
  valid_from,
  max_redemptions,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'FOREVERFORWARD' || LPAD((gs.n)::TEXT, 4, '0'),
  (SELECT id FROM partners WHERE partner_slug = 'foreverforward'),
  'complete',
  'Forever Forward',
  'contact@foreverforward.org',
  180,
  NOW(),
  1,
  true,
  NOW(),
  NOW()
FROM generate_series(1, 25) AS gs(n)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Helper function: Generate anonymous user ID
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_anonymous_user_id(prefix TEXT DEFAULT '')
RETURNS TEXT AS $$
DECLARE
  hex_suffix TEXT;
  result TEXT;
BEGIN
  hex_suffix := upper(encode(gen_random_bytes(2), 'hex'));
  IF prefix IS NOT NULL AND prefix != '' THEN
    result := 'User-' || upper(left(prefix, 2)) || hex_suffix;
  ELSE
    result := 'User-' || hex_suffix;
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
