-- Regenerate grant codes with correct columns

-- 1. Generate 25 codes for Forever Forward
WITH partner_info AS (
  SELECT id, legal_name, primary_contact_email FROM partners WHERE partner_slug = 'foreverforward'
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
  redemption_count,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'FOREVERFORWARD' || LPAD((gs.n)::TEXT, 4, '0'),
  p.id,
  'complete',
  p.legal_name,
  COALESCE(p.primary_contact_email, 'contact@foreverforward.org'),
  180,
  NOW(),
  1,
  0, -- Explicitly set to 0
  true,
  NOW(),
  NOW()
FROM partner_info p
CROSS JOIN generate_series(1, 25) AS gs(n)
ON CONFLICT (code) DO NOTHING;

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
  redemption_count,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'JENESSE' || LPAD((gs.n)::TEXT, 4, '0'),
  p.id,
  'complete',
  p.legal_name,
  COALESCE(p.primary_contact_email, 'info@jenesse.org'),
  180,
  NOW(),
  1,
  0, -- Explicitly set to 0
  true,
  NOW(),
  NOW()
FROM partner_info p
CROSS JOIN generate_series(1, 50) AS gs(n)
ON CONFLICT (code) DO NOTHING;

-- 3. Generate 50 codes for Interval House
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
  redemption_count,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'INTERVAL' || LPAD((gs.n)::TEXT, 4, '0'),
  p.id,
  'complete',
  p.legal_name,
  COALESCE(p.primary_contact_email, 'admin@intervalhouse.org'),
  180,
  NOW(),
  1,
  0, -- Explicitly set to 0
  true,
  NOW(),
  NOW()
FROM partner_info p
CROSS JOIN generate_series(1, 50) AS gs(n)
ON CONFLICT (code) DO NOTHING;
