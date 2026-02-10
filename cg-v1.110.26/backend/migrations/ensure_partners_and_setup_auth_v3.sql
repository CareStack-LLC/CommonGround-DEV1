-- ============================================================================
-- Unified Partner & Auth Setup Script (Run in Supabase SQL Editor) - v3
-- Fixes:
-- 1. Explicitly casts partner_id to text for DELETE (Fixes type mismatch)
-- 2. Explicitly sets 'codes_used' = 0 and other fields
-- 3. Handles Partner Existence, Grant Codes, and Auth Users in one go
-- ============================================================================

DO $$
DECLARE
  -- Dynamic Partner IDs (UUID)
  jenesse_id UUID;
  interval_id UUID;
  
  -- Auth User IDs (pre-generated)
  jenesse_user_id UUID := gen_random_uuid();
  interval_user_id UUID := gen_random_uuid();
  
  -- Bcrypt hash for 'Demo2026!'
  password_hash TEXT := '$2b$12$/ZB1djetcv0ogSObxV3H7eMzozwYMxpJJFSMfOCxPxjc//d1biCuu';
  
  now_timestamp TIMESTAMPTZ := NOW();
BEGIN

  -- ========================================================================
  -- PART 1: ENSURE PARTNERS EXIST (Explicitly setting all fields)
  -- ========================================================================
  
  -- Jenesse Center
  INSERT INTO partners (
    id, partner_slug, legal_name, display_name, status, 
    branding_config, landing_config, dashboard_config, 
    codes_allocated, codes_used, code_prefix, primary_contact_email, activation_date,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'jenesse-center',
    'Jenesse Center, Inc.',
    'Jenesse Center',
    'active',
    '{
        "logo_url": "",
        "primary_color": "#6C5CE7",
        "secondary_color": "#FD79A8",
        "accent_color": "#A29BFE",
        "font_family": "system-ui",
        "hero_image_url": "/assets/marketing/jenesse-hero.jpg",
        "tagline": "Hope and safety for families rebuilding their lives."
    }'::jsonb,
    '{
        "show_mission": true,
        "show_stats": true,
        "show_testimonials": false,
        "custom_welcome_message": "Welcome to the Jenesse Center & CommonGround Partnership.",
        "faq_items": [],
        "contact_method": "email",
        "hero_title": "Safety first. <br />Family always.",
        "hero_subtitle": "Jenesse Center is partnering with CommonGround to provide survivors with safe, secure co-parenting tools—free of charge.",
        "benefits_title": "Why Jenesse × CommonGround?",
        "benefits_description": "We know that leaving is just the first step. Co-parenting after domestic violence requires ironclad boundaries and safe communication channels.",
        "call_to_action_url": "https://jenesse.org/"
    }'::jsonb,
    '{
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
    }'::jsonb,
    50,   -- codes_allocated
    0,    -- codes_used (EXPLICITLY SET TO 0)
    'JENESSE', -- code_prefix
    'info@demo.jenesse.org', -- primary_contact_email
    now_timestamp, -- activation_date
    now_timestamp,
    now_timestamp
  ) ON CONFLICT (partner_slug) DO UPDATE SET
    primary_contact_email = 'info@demo.jenesse.org';

  -- Interval House
  INSERT INTO partners (
    id, partner_slug, legal_name, display_name, status, 
    branding_config, landing_config, dashboard_config, 
    codes_allocated, codes_used, code_prefix, primary_contact_email, activation_date,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'interval-house-lb',
    'Interval House',
    'Interval House Long Beach',
    'active',
    '{
        "logo_url": "",
        "primary_color": "#0984E3",
        "secondary_color": "#55EFC4",
        "accent_color": "#74B9FF",
        "font_family": "system-ui",
        "hero_image_url": "/assets/marketing/interval-house-hero.jpg",
        "tagline": "Crisis intervention and support for accurate documentation."
    }'::jsonb,
    '{
        "show_mission": true,
        "show_stats": true,
        "show_testimonials": false,
        "custom_welcome_message": "Welcome to the Interval House & CommonGround Partnership.",
        "faq_items": [],
        "contact_method": "email",
        "hero_title": "Legal advocacy. <br />Digital safety.",
        "hero_subtitle": "Interval House provides this secure platform to help you document everything and keep your location and peace of mind protected.",
        "benefits_title": "Why Interval House × CommonGround?",
        "benefits_description": "High-conflict custody cases need proof, not just allegations. CommonGround gives you Court-Admissible records automatically.",
        "call_to_action_url": "https://intervalhouse.org/"
    }'::jsonb,
    '{
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
    }'::jsonb,
    50,   -- codes_allocated
    0,    -- codes_used (EXPLICITLY SET TO 0)
    'INTERVAL', -- code_prefix
    'admin@demo.intervalhouse.org', -- primary_contact_email
    now_timestamp, -- activation_date
    now_timestamp,
    now_timestamp
  ) ON CONFLICT (partner_slug) DO UPDATE SET
    primary_contact_email = 'admin@demo.intervalhouse.org';

  -- ========================================================================
  -- PART 2: FETCH PARTNER IDs
  -- ========================================================================
  
  SELECT id INTO jenesse_id FROM partners WHERE partner_slug = 'jenesse-center';
  SELECT id INTO interval_id FROM partners WHERE partner_slug = 'interval-house-lb';

  -- ========================================================================
  -- PART 3: ENSURE GRANT CODES EXIST
  -- ========================================================================
  
  -- Jenesse Codes
  INSERT INTO grant_codes (
    id, code, partner_id, granted_plan_code, nonprofit_name, 
    nonprofit_contact_email, grant_duration_days, valid_from, 
    max_redemptions, redemption_count, is_active, created_at, updated_at
  )
  SELECT 
    gen_random_uuid(),
    'JENESSE' || LPAD((gs.n)::TEXT, 4, '0'),
    jenesse_id,
    'complete',
    'Jenesse Center',
    'info@demo.jenesse.org',
    180,
    now_timestamp,
    1,
    0,
    true,
    now_timestamp,
    now_timestamp
  FROM generate_series(1, 50) AS gs(n)
  ON CONFLICT (code) DO NOTHING;

  -- Interval House Codes
  INSERT INTO grant_codes (
    id, code, partner_id, granted_plan_code, nonprofit_name, 
    nonprofit_contact_email, grant_duration_days, valid_from, 
    max_redemptions, redemption_count, is_active, created_at, updated_at
  )
  SELECT 
    gen_random_uuid(),
    'INTERVAL' || LPAD((gs.n)::TEXT, 4, '0'),
    interval_id,
    'complete',
    'Interval House',
    'admin@demo.intervalhouse.org',
    180,
    now_timestamp,
    1,
    0,
    true,
    now_timestamp,
    now_timestamp
  FROM generate_series(1, 50) AS gs(n)
  ON CONFLICT (code) DO NOTHING;

  -- ========================================================================
  -- PART 4: AUTH USER SETUP
  -- ========================================================================

  -- Clean up existing users
  DELETE FROM auth.users WHERE email IN ('info@demo.jenesse.org', 'admin@demo.intervalhouse.org');
  DELETE FROM public.users WHERE email IN ('info@demo.jenesse.org', 'admin@demo.intervalhouse.org');
  
  -- FIX: Explicitly cast partner_id to TEXT for DELETE (operator mismatch fix)
  DELETE FROM public.partner_staff 
  WHERE partner_id::text IN (jenesse_id::text, interval_id::text);

  -- Jenesse Admin
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token
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
    id, supabase_id, email, first_name, last_name, 
    is_active, email_verified, phone_verified, is_deleted, mfa_enabled, 
    created_at, updated_at
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

  INSERT INTO public.partner_staff (
    id, partner_id, user_id, role, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    jenesse_id,
    jenesse_user_id::text,
    'admin',
    now_timestamp,
    now_timestamp
  );

  -- Interval House Admin
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token
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
    id, supabase_id, email, first_name, last_name, 
    is_active, email_verified, phone_verified, is_deleted, mfa_enabled, 
    created_at, updated_at
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

  INSERT INTO public.partner_staff (
    id, partner_id, user_id, role, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    interval_id, 
    interval_user_id::text,
    'admin',
    now_timestamp,
    now_timestamp
  );

END $$;
