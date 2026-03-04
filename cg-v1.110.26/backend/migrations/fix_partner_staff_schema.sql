-- Recreate partner_staff table with correct types and add staff users

-- 1. Create partner_staff table if it doesn't exist (Fix user_id type)
CREATE TABLE IF NOT EXISTS partner_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- Matched to users.id type
  role TEXT DEFAULT 'viewer' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(partner_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_staff_partner ON partner_staff(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_staff_user ON partner_staff(user_id);

-- Enable RLS on partner_staff
ALTER TABLE partner_staff ENABLE ROW LEVEL SECURITY;

-- 2. Create users for Jenesse and Interval House (Placeholders)
-- Note: These users still need to sign up via Supabase Auth with these emails to be fully functional.
INSERT INTO users (
  id,
  supabase_id,
  email,
  email_verified,
  first_name,
  last_name,
  is_active,
  is_deleted,
  mfa_enabled,
  phone_verified,
  created_at,
  updated_at
) VALUES 
-- Jenesse Staff
(
  gen_random_uuid()::text,
  gen_random_uuid()::text, -- Placeholder Supabase ID
  'info@jenesse.org',
  true,
  'Jenesse',
  'Admin',
  true,
  false,
  false,
  false,
  NOW(),
  NOW()
),
-- Interval House Staff
(
  gen_random_uuid()::text,
  gen_random_uuid()::text, -- Placeholder Supabase ID
  'admin@intervalhouse.org',
  true,
  'Interval',
  'House Admin',
  true,
  false,
  false,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 3. Link users to partners in partner_staff table
-- Jenesse Link
INSERT INTO partner_staff (
  partner_id,
  user_id,
  role
)
SELECT 
  p.id,
  u.id,
  'admin'
FROM partners p, users u
WHERE p.partner_slug = 'jenesse-center' AND u.email = 'info@jenesse.org'
ON CONFLICT (partner_id, user_id) DO NOTHING;

-- Interval House Link
INSERT INTO partner_staff (
  partner_id,
  user_id,
  role
)
SELECT 
  p.id,
  u.id,
  'admin'
FROM partners p, users u
WHERE p.partner_slug = 'interval-house-lb' AND u.email = 'admin@intervalhouse.org'
ON CONFLICT (partner_id, user_id) DO NOTHING;
