-- ============================================================================
-- Add Left Right 4 U Foundation Partner
-- ============================================================================

DO $$
DECLARE
  -- Dynamic Partner IDs (UUID)
  lr4u_id UUID := gen_random_uuid();
  
  -- Auth User IDs (pre-generated)
  lr4u_user_id UUID := gen_random_uuid();
  
  -- Bcrypt hash for 'Power123!'
  password_hash TEXT := '$2b$12$qWjpjJSEc1IMa/Elrhy7gOF0r0EHwHABsbDcLZCKs1sKjJbd5zAtK';
  
  now_timestamp TIMESTAMPTZ := NOW();
BEGIN

  -- ========================================================================
  -- PART 1: ENSURE PARTNERS EXIST
  -- ========================================================================
  
  -- Left Right 4 U Foundation
  INSERT INTO partners (
    id, partner_slug, legal_name, display_name, status, 
    branding_config, landing_config, dashboard_config, 
    codes_allocated, codes_used, code_prefix, primary_contact_email, activation_date,
    created_at, updated_at
  ) VALUES (
    lr4u_id,
    'leftright4u',
    'Left Right 4 U Foundation',
    'Left Right 4 U Foundation',
    'active',
    '{
        "logo_url": "/assets/marketing/demo-partner-logo.png",
        "primary_color": "#FF6B6B",
        "secondary_color": "#4ECDC4",
        "accent_color": "#FFE66D",
        "font_family": "system-ui",
        "hero_image_url": "/assets/marketing/demo-hero.jpg",
        "tagline": "Assisting children of low-income single Mother''s who are fighting Breast Cancer and/or Domestic Violence."
    }'::jsonb,
    '{
        "show_mission": true,
        "show_stats": true,
        "show_testimonials": false,
        "custom_welcome_message": "Welcome to the Left Right 4 U Foundation & CommonGround Partnership.",
        "faq_items": [],
        "contact_method": "email",
        "hero_title": "Support and Healing. <br />Safe communication.",
        "hero_subtitle": "Left Right 4 U Foundation is partnering with CommonGround to provide families with safe, secure co-parenting tools.",
        "benefits_title": "Why Left Right 4 U × CommonGround?",
        "benefits_description": "Navigating difficult times requires safe and secure communication channels.",
        "call_to_action_url": "https://www.leftright4u.org/"
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
    0,    -- codes_used
    'LR4U', -- code_prefix
    'info@leftright4u.org', -- primary_contact_email
    now_timestamp, -- activation_date
    now_timestamp,
    now_timestamp
  ) ON CONFLICT (partner_slug) DO UPDATE SET
    primary_contact_email = 'info@leftright4u.org';

  -- Fetch ID in case it already existed
  SELECT id INTO lr4u_id FROM partners WHERE partner_slug = 'leftright4u';

  -- ========================================================================
  -- PART 3: ENSURE GRANT CODES EXIST
  -- ========================================================================
  
  -- Left Right 4 U Codes
  INSERT INTO grant_codes (
    id, code, partner_id, granted_plan_code, nonprofit_name, 
    nonprofit_contact_email, grant_duration_days, valid_from, 
    max_redemptions, redemption_count, is_active, created_at, updated_at
  )
  SELECT 
    gen_random_uuid(),
    'LR4U' || LPAD((gs.n)::TEXT, 4, '0'),
    lr4u_id,
    'complete',
    'Left Right 4 U Foundation',
    'info@leftright4u.org',
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
  DELETE FROM auth.users WHERE email = 'info@leftright4u.org';
  DELETE FROM public.users WHERE email = 'info@leftright4u.org';
  
  DELETE FROM public.partner_staff 
  WHERE partner_id::text = lr4u_id::text;

  -- LR4U Admin
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    lr4u_user_id,
    'authenticated',
    'authenticated',
    'info@leftright4u.org',
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
    lr4u_user_id::text,
    lr4u_user_id::text,
    'info@leftright4u.org',
    'Left Right',
    '4 U',
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
    lr4u_id,
    lr4u_user_id::text,
    'admin',
    now_timestamp,
    now_timestamp
  );

END $$;
