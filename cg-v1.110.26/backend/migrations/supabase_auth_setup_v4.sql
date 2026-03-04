-- ============================================================================
-- Supabase User Setup for Partner Admins (Run in SQL Editor) - v4
-- Creates auth users with password 'Demo2026!' and links them to partners
-- Fixes:
-- 1. Explicit ID and timestamps for partner_staff to prevent NULL errors
-- 2. Removes 'role' from public.users table
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
  DELETE FROM auth.users WHERE email IN ('info@demo.jenesse.org', 'admin@demo.intervalhouse.org');
  DELETE FROM public.users WHERE email IN ('info@demo.jenesse.org', 'admin@demo.intervalhouse.org');
  
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
    is_active,
    email_verified,
    phone_verified,
    is_deleted,
    mfa_enabled,
    created_at,
    updated_at
  ) VALUES (
    jenesse_user_id::text,
    jenesse_user_id::text,
    'info@demo.jenesse.org',
    'Jenesse',
    'Admin',
    true,
    true,
    false,
    false,
    false,
    now_timestamp,
    now_timestamp
  );

  -- FIXED: Explicitly provide ID, created_at, updated_at
  INSERT INTO public.partner_staff (
    id,
    partner_id,
    user_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(), -- Explicitly generate ID
    jenesse_partner_id::uuid,
    jenesse_user_id::text,
    'admin',
    now_timestamp,
    now_timestamp
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
    is_active,
    email_verified,
    phone_verified,
    is_deleted,
    mfa_enabled,
    created_at,
    updated_at
  ) VALUES (
    interval_user_id::text,
    interval_user_id::text,
    'admin@demo.intervalhouse.org',
    'Interval',
    'House',
    true,
    true,
    false,
    false,
    false,
    now_timestamp,
    now_timestamp
  );

  -- FIXED: Explicitly provide ID, created_at, updated_at
  INSERT INTO public.partner_staff (
    id,
    partner_id,
    user_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(), -- Explicitly generate ID
    interval_partner_id::uuid,
    interval_user_id::text,
    'admin',
    now_timestamp,
    now_timestamp
  );

END $$;
