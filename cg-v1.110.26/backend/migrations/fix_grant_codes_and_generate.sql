-- Fix grant_codes table and generate codes for new partners

-- 1. Ensure partner_id column exists
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

-- 2. Generate 50 codes for Jenesse Center
WITH partner_info AS (
  SELECT id, legal_name, primary_contact_email FROM partners WHERE partner_slug = 'jenesse-center'
)
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
  'JENESSE' || LPAD((gs.n)::TEXT, 4, '0'), -- JENESSE0001 to JENESSE0050
  p.id,
  'complete',
  p.legal_name,
  COALESCE(p.primary_contact_email, 'info@jenesse.org'),
  180, -- 6 months
  NOW(),
  1,
  true,
  NOW(),
  NOW()
FROM partner_info p
CROSS JOIN generate_series(1, 50) AS gs(n)
ON CONFLICT (code) DO NOTHING;

-- 3. Generate 50 codes for Interval House Long Beach
WITH partner_info AS (
  SELECT id, legal_name, primary_contact_email FROM partners WHERE partner_slug = 'interval-house-lb'
)
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
  'INTERVAL' || LPAD((gs.n)::TEXT, 4, '0'), -- INTERVAL0001 to INTERVAL0050
  p.id,
  'complete',
  p.legal_name,
  COALESCE(p.primary_contact_email, 'admin@intervalhouse.org'),
  180, -- 6 months
  NOW(),
  1,
  true,
  NOW(),
  NOW()
FROM partner_info p
CROSS JOIN generate_series(1, 50) AS gs(n)
ON CONFLICT (code) DO NOTHING;
