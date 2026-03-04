-- ============================================================================
-- Forever Forward Admin User Setup
-- ============================================================================
-- This creates the auth user and links them to partner_staff
-- Run this in Supabase SQL Editor or via API

-- Step 1: Create the auth user via Supabase Dashboard or use this SQL
-- NOTE: You must create the auth user via Supabase Dashboard -> Authentication -> Users -> Add User
-- Email: ff-admin@foreverforward.org
-- Password: PartnerAdmin2026! (change after first login)
-- Auto Confirm User: YES

-- Step 2: After creating auth user, insert into users table
-- Replace 'AUTH_USER_ID' with the actual UUID from Supabase Auth
INSERT INTO users (
  id,
  supabase_id,
  email,
  email_verified,
  first_name,
  last_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'AUTH_USER_ID', -- REPLACE THIS with actual UUID from Supabase Auth
  'ff-admin@foreverforward.org',
  true,
  'Forever Forward',
  'Admin',
  true,
  NOW(),
  NOW()
);

-- Step 3: Create user profile
INSERT INTO user_profiles (
  id,
  user_id,
  is_professional,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  id,
  false,
  NOW(),
  NOW()
FROM users
WHERE email = 'ff-admin@foreverforward.org';

-- Step 4: Link user to Forever Forward partner as admin
INSERT INTO partner_staff (partner_id, user_id, role)
SELECT p.id, u.id, 'admin'
FROM partners p, users u
WHERE p.partner_slug = 'foreverforward'
AND u.email = 'ff-admin@foreverforward.org';

-- Step 5: Verify the setup
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  ps.role,
  p.display_name as partner_name
FROM users u
JOIN partner_staff ps ON ps.user_id = u.id
JOIN partners p ON p.id = ps.partner_id
WHERE u.email = 'ff-admin@foreverforward.org';

-- ============================================================================
-- ALTERNATIVE: Create user programmatically via Supabase Management API
-- ============================================================================
/*
If you want to automate this, use the Supabase Management API:

curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ff-admin@foreverforward.org",
    "password": "PartnerAdmin2026!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Forever Forward",
      "last_name": "Admin"
    }
  }'

Then use the returned user.id in Step 2 above.
*/
