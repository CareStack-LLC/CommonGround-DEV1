-- Recreate partner_staff table and add staff users

-- 1. Create partner_staff table if it doesn't exist
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

-- Enable RLS on partner_staff
ALTER TABLE partner_staff ENABLE ROW LEVEL SECURITY;

-- 2. Create users for Jenesse and Interval House (Password: Password123!)
INSERT INTO users (
  id,
  email,
  hashed_password,
  first_name,
  last_name,
  role,
  is_active,
  is_verified,
  created_at,
  updated_at
) VALUES 
-- Jenesse Staff
(
  gen_random_uuid(),
  'info@jenesse.org',
  '$2b$12$yJK1HdsEhyU7dFNw29csd.vzakhOGgw.GPHTfXsZAp/qqSL1oUe9.',
  'Jenesse',
  'Admin',
  'partner_admin',
  true,
  true,
  NOW(),
  NOW()
),
-- Interval House Staff
(
  gen_random_uuid(),
  'admin@intervalhouse.org',
  '$2b$12$yJK1HdsEhyU7dFNw29csd.vzakhOGgw.GPHTfXsZAp/qqSL1oUe9.',
  'Interval',
  'House Admin',
  'partner_admin',
  true,
  true,
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
