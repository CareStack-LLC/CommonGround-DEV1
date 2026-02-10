-- ============================================================================
-- Supabase User Setup for Partner Admins (Run in SQL Editor)
-- Creates auth users with password 'Demo2026!' and links them to partners
-- Updated to handle potential UUID vs Text type mismatches
-- ============================================================================

DO $$
DECLARE
  -- Defined as TEXT to handle potential VARCHAR columns
  jenesse_partner_id TEXT := '9982b74c-49e2-4cf5-9cc0-654872157d1b';
  interval_partner_id TEXT := 'd6615875-9494-46e5-b793-55b57d39e2cc';
  
  -- Pre-generated UUIDs for the users
  jenesse_user_id UUID := gen_random_uuid();
  interval_user_id UUID := gen_random_uuid();
  
  -- Bcrypt hash for 'Demo2026!'
  password_hash TEXT := '$2b$12$/ZB1djetcv0ogSObxV3H7eMzozwYMxpJJFSMfOCxPxjc//d1biCuu';
  
  now_timestamp TIMESTAMPTZ := NOW();
BEGIN

  -- 1. Cleanup existing records (to avoid conflicts if re-running)
  -- Use explicit type casting to handle both UUID and VARCHAR columns
  DELETE FROM auth.users WHERE email IN ('info@demo.jenesse.org', 'admin@demo.intervalhouse.org');
  DELETE FROM public.users WHERE email IN ('info@demo.jenesse.org', 'admin@demo.intervalhouse.org');
  
  -- Fix for "operator does not exist: character varying = uuid"
  -- We cast partner_id to text for safe comparison
  DELETE FROM public.partner_staff 
  WHERE partner_id::text IN (jenesse_partner_id, interval_partner_id);

  -- 2. Insert Jenesse Admin
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    jenesse_user_id,
    'authenticated',
    'authenticated',
    'info@demo.jenesse.org',
    password_hash,
    now_timestamp,
    now_timestamp,
    now_timestamp,
    '',
    ''
  );

  INSERT INTO public.users (
    id,
    supabase_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    email_verified,
    phone_verified,
    is_deleted,
    mfa_enabled,
    created_at,
    updated_at
  ) VALUES (
    jenesse_user_id::text, -- Ensure ID matches auth.user.id
    jenesse_user_id::text,
    'info@demo.jenesse.org',
    'Jenesse',
    'Admin',
    'partner_admin',
    true,
    true, -- Email confirmed
    false,
    false,
    false,
    now_timestamp,
    now_timestamp
  );

  INSERT INTO public.partner_staff (
    partner_id,
    user_id,
    role
  ) VALUES (
    jenesse_partner_id::uuid, -- Try explicit cast to UUID if column allows, or keep as string if varchar
    jenesse_user_id::text, -- Based on error, user_id is likely varchar(36)
    'admin'
  );

  -- 3. Insert Interval House Admin
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    interval_user_id,
    'authenticated',
    'authenticated',
    'admin@demo.intervalhouse.org',
    password_hash,
    now_timestamp,
    now_timestamp,
    now_timestamp,
    '',
    ''
  );

  INSERT INTO public.users (
    id,
    supabase_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    email_verified,
    phone_verified,
    is_deleted,
    mfa_enabled,
    created_at,
    updated_at
  ) VALUES (
    interval_user_id::text, -- Ensure ID matches auth.user.id
    interval_user_id::text,
    'admin@demo.intervalhouse.org',
    'Interval',
    'House',
    'partner_admin',
    true,
    true, -- Email confirmed
    false,
    false,
    false,
    now_timestamp,
    now_timestamp
  );

  INSERT INTO public.partner_staff (
    partner_id,
    user_id,
    role
  ) VALUES (
    interval_partner_id::uuid, -- Explicit cast to UUID
    interval_user_id::text,
    'admin'
  );

END $$;
