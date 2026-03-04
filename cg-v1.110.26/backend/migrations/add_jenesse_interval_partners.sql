-- Add Jenesse Center and Interval House Long Beach to partners table

-- Jenesse Center
INSERT INTO partners (
    id,
    partner_slug,
    legal_name,
    display_name,
    status,
    branding_config,
    landing_config,
    dashboard_config,
    codes_allocated,
    created_at,
    updated_at
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
    50,
    NOW(),
    NOW()
);

-- Interval House Long Beach
INSERT INTO partners (
    id,
    partner_slug,
    legal_name,
    display_name,
    status,
    branding_config,
    landing_config,
    dashboard_config,
    codes_allocated,
    created_at,
    updated_at
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
    50,
    NOW(),
    NOW()
);
