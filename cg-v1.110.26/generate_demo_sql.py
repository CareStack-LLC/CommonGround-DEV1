
import json
import uuid

# Configuration
accounts = [
    {
        "id_prefix": "a1ca1de",
        "email": "info@alcaldedrakelaw.com",
        "password": "Demo2026!",
        "user_first": "Adriana",
        "user_last": "Alcalde Drake",
        "firm_name": "Law Office of Adriana Alcalde Drake",
        "firm_slug": "alcalde-drake-law",
        "firm_type": "law_firm",
        "phone": "(310) 527-3274",
        "website": "https://www.alcaldedrakelaw.com/",
        "address": "600 Civic Center Drive West, Suite 400",
        "city": "Santa Ana",
        "state": "CA",
        "zip_code": "92701",
        "firm_desc": "Adriana Alcalde Drake is a dedicated family law attorney serving diverse communities throughout Southern California. With full bilingual capabilities and deep community roots, she provides accessible, compassionate legal representation in custody, divorce, and domestic violence matters.",
        "firm_headline": "Accessible, Bilingual Family Law for Real Families",
        "prof_headline": "Bilingual Family Law • Custody • Compassionate Advocacy",
        "prof_bio": "Attorney Adriana Alcalde Drake founded her practice with a mission: to provide high-quality family law representation to communities that are often underserved by the legal system. As a fully bilingual attorney, she bridges language barriers that can prevent parents from effectively advocating for their children's best interests.\n\nAdriana's practice focuses on the full spectrum of family law, with particular emphasis on child custody, divorce, domestic violence protective orders, and child support matters. She represents clients throughout Los Angeles, Orange, San Bernardino, and Riverside Counties, with a strong presence in South Los Angeles, Compton, and surrounding communities.\n\nWhat sets Adriana apart is her genuine commitment to accessibility. She offers flexible payment plans, accepts limited-scope representations when appropriate, and provides virtual consultations for clients who face transportation or childcare challenges. She understands that many of her clients are working parents juggling multiple jobs, and she structures her practice to accommodate their schedules.\n\nAdriana is passionate about helping parents navigate the family court system, which can feel overwhelming and intimidating—especially for those facing language barriers or unfamiliarity with legal processes. She takes time to explain every step, answer questions in plain language (English or Spanish), and empower her clients to make informed decisions about their cases.\n\nHer approach combines strong legal advocacy with cultural sensitivity and practical problem-solving. She knows that family law cases aren't just about legal outcomes—they're about preserving parent-child relationships, ensuring children's safety and stability, and helping families move forward with dignity.",
        "video_url": "https://storage.commonground.app/demo/alcalde-drake-intro.mp4",
        "safety_vetted": True,
        "languages": ["English", "Spanish (Fluent - Native Speaker)"],
        "hourly_rate": "$250-$350/hour",
        "years_exp": 12,
        "practice_areas": ["Custody/Visitation", "Divorce", "Child Support", "DV/Restraining Orders", "Modifications/Enforcement", "Mediation/Settlement", "Parenting Plans", "Bilingual Services"],
        "education": [
            {"degree": "Juris Doctor", "institution": "Western State College of Law", "year": 2012},
            {"degree": "Bachelor of Arts in Political Science", "institution": "University of California, Irvine", "year": 2008}
        ],
        "awards": [
            {"title": "Rising Star - Family Law", "year": "2019-2023", "organization": "Super Lawyers"},
            {"title": "Top 40 Under 40", "year": "2020", "organization": "National Trial Lawyers"},
            {"title": "Community Service Award", "year": "2021", "organization": "Hispanic Bar Association of Orange County"}
        ],
        "social_links": {
            "website": "https://www.alcaldedrakelaw.com/",
            "facebook": "https://www.facebook.com/alcaldedrakelaw",
            "instagram": "https://www.instagram.com/alcaldedrakelaw",
            "google_business": "https://g.page/alcalde-drake-law"
        },
        "pricing_structure": {
            "consultation": {
                "type": "free",
                "duration": "15 minutes",
                "format": "phone",
                "languages": ["English", "Spanish"]
            },
            "hourly_rates": {
                "attorney": 300,
                "min_rate": 250,
                "max_rate": 350,
                "currency": "USD"
            },
            "flat_fee_services": {
                "uncontested_divorce": {
                    "starting_at": 1500,
                    "includes": "All paperwork, filing, default process"
                },
                "dvro_representation": {
                    "starting_at": 1000,
                    "includes": "Emergency filing, hearing representation"
                },
                "custody_modification": {
                    "starting_at": 2000,
                    "includes": "Petition, response to OSC, one hearing"
                }
            },
            "payment_plans": True,
            "sliding_scale": True,
            "limited_scope_available": True,
            "accepted_methods": ["Credit Card", "Cash", "Check", "Zelle", "Venmo"]
        },
        "accepted_payment_methods": ["Credit Card", "Debit Card", "Cash", "Check", "Zelle", "Venmo", "Payment Plans", "Sliding Scale"]
    },
    {
        "id_prefix": "b1a55e4",
        "email": "info@blasserlaw.com",
        "password": "Demo2026!",
        "user_first": "David",
        "user_last": "Blasser",
        "firm_name": "Blasser Law, A Professional Corporation",
        "firm_slug": "blasser-law",
        "firm_type": "law_firm",
        "phone": "(951) 680-5111",
        "website": "https://www.blasserlaw.com/",
        "address": "3750 University Avenue, Suite 610",
        "city": "Riverside",
        "state": "CA",
        "zip_code": "92501",
        "firm_desc": "Blasser Law is a Riverside-based family law firm known for strategic advocacy and deep knowledge of local courts. Led by attorney David Blasser, the firm represents parents—especially fathers—in custody disputes, divorce, and high-conflict cases. With decades of combined experience in Riverside County courts, we provide sophisticated legal representation with a personalized approach.",
        "firm_headline": "Personalized, Strategic Family Law Advocacy in Riverside County",
        "prof_headline": "Strategic Family Law • Custody • Father's Rights Advocate",
        "prof_bio": "David Blasser founded Blasser Law with a clear vision: to provide exceptional family law representation to individuals navigating California's complex family court system. With over 20 years of experience practicing exclusively in family law, David has developed a reputation as a strategic thinker, skilled negotiator, and formidable trial attorney.\n\nBlasser Law serves clients throughout Riverside and San Bernardino Counties, with particular expertise in Riverside County's family courts. We know the judges, the court procedures, the local custody evaluators, and the opposing attorneys—knowledge that gives our clients a significant advantage in both settlement negotiations and courtroom litigation.\n\nOur practice focuses on child custody and visitation, divorce (both contested and uncontested), child and spousal support, modifications and enforcement, domestic violence matters, and high-conflict cases. We've built a strong reputation for representing fathers who face bias in the family court system, though we proudly represent all parents who need experienced advocacy.",
        "video_url": "https://storage.commonground.app/demo/blasser-law-intro.mp4",
        "safety_vetted": True,
        "languages": ["English"],
        "hourly_rate": "$400/hour",
        "years_exp": 20,
        "practice_areas": ["Custody/Visitation", "Father's Rights", "High-Conflict Cases", "Divorce", "Modifications/Enforcement", "Child Support", "Mediation/Settlement", "Trial/Litigation"],
        "education": [
            {"degree": "Juris Doctor", "institution": "University of California, Hastings College of the Law", "year": 2003},
            {"degree": "Bachelor of Arts", "institution": "University of California, Los Angeles", "year": 1999}
        ],
        "awards": [
            {"title": "Top Rated Family Law Attorney", "year": "2015-2024", "organization": "Avvo - 10.0 Superb Rating"},
            {"title": "Client's Choice Award", "year": "2018, 2020, 2022", "organization": "Avvo"},
            {"title": "Martindale-Hubbell AV Preeminent", "year": "2017-2024", "organization": "Martindale-Hubbell"}
        ],
        "social_links": {
            "website": "https://www.blasserlaw.com/",
            "linkedin": "https://www.linkedin.com/company/blasser-law",
            "avvo": "https://www.avvo.com/attorneys/92501-ca-david-blasser-1680984.html",
            "google_business": "https://g.page/blasser-law-riverside"
        },
        "pricing_structure": {
            "consultation": {
                "type": "free",
                "duration": "30 minutes",
                "format": "in-person or virtual",
                "included": "Case assessment, strategy discussion, fee explanation"
            },
            "retainer": {
                "min": 5000,
                "max": 10000,
                "currency": "USD",
                "note": "Based on case complexity"
            },
            "hourly_rates": {
                "attorney": 400,
                "paralegal": 150,
                "currency": "USD"
            },
            "flat_fee_services": {
                "uncontested_divorce": {
                    "min": 2500,
                    "max": 3500
                },
                "custody_modification": {
                    "min": 3500,
                    "max": 5000
                },
                "rfo_response": {
                    "min": 2000,
                    "max": 3000
                }
            },
            "limited_scope_available": True,
            "payment_plans": "case-by-case basis",
            "accepted_methods": ["Credit Card", "Check"]
        },
        "accepted_payment_methods": ["Credit Card", "Visa", "Mastercard", "American Express", "Discover", "Check", "Payment Plans (case-by-case)"]
    },
    {
        "id_prefix": "c015740",
        "email": "info@hbplaw.com",
        "password": "Demo2026!",
        "user_first": "Holstrom",
        "user_last": "Block & Parke",
        "firm_name": "Holstrom, Block & Parke, APLC",
        "firm_slug": "holstrom-block-parke",
        "firm_type": "law_firm",
        "phone": "(909) 885-0191",
        "website": "https://www.hbplaw.com/",
        "address": "473 E. Carnegie Drive, Suite 200",
        "city": "San Bernardino",
        "state": "CA",
        "zip_code": "92408",
        "firm_desc": "Holstrom, Block & Parke is a well-established San Bernardino family law firm with over 50 years of combined experience. Our team of skilled attorneys handles everything from amicable collaborative divorces to complex custody litigation. We offer flexible approaches tailored to each family's unique needs—from mediation to aggressive courtroom advocacy.",
        "firm_headline": "Experienced, Versatile Family Law Team Serving San Bernardino County for Decades",
        "prof_headline": "Full-Service Family Law • Collaborative & Litigation",
        "prof_bio": "Founded on principles of excellence, integrity, and personalized service, Holstrom, Block & Parke has served families throughout San Bernardino and Riverside Counties for decades. Our firm brings together multiple experienced family law attorneys, each with unique strengths and perspectives, allowing us to match clients with the right attorney for their specific situation.\n\nOur practice encompasses the full spectrum of family law: divorce (contested and uncontested), child custody and visitation, child and spousal support, property division, domestic violence matters, paternity, modifications, enforcement, and prenuptial agreements. We're equally comfortable in collaborative law processes, mediation settings, and adversarial courtroom litigation.",
        "video_url": "https://storage.commonground.app/demo/holstrom-block-parke-intro.mp4",
        "safety_vetted": True,
        "languages": ["English"],
        "hourly_rate": "$300-$450/hour (depending on attorney)",
        "years_exp": 50,
        "practice_areas": ["Custody/Visitation", "Divorce", "Mediation/Settlement", "Collaborative Law", "High-Conflict Cases", "Child Support", "Modifications/Enforcement", "LGBTQ+ Family Law"],
        "education": [
            {"institution": "UCLA School of Law", "note": "Various senior attorneys"},
            {"institution": "USC Gould School of Law", "note": "Various senior attorneys"},
            {"institution": "Loyola Law School", "note": "Various senior attorneys"},
            {"institution": "Pepperdine Caruso School of Law", "note": "Various senior attorneys"}
        ],
        "awards": [
            {"title": "AV Preeminent Rating", "organization": "Martindale-Hubbell", "note": "Multiple attorneys"},
            {"title": "Super Lawyers", "year": "2015-2024", "organization": "Super Lawyers", "note": "Multiple attorneys recognized"},
            {"title": "Top Family Law Firm - San Bernardino County", "year": "2020-2024", "organization": "Legal Network"}
        ],
        "social_links": {
            "website": "https://www.hbplaw.com/",
            "linkedin": "https://www.linkedin.com/company/holstrom-block-parke",
            "facebook": "https://www.facebook.com/hbplawfirm",
            "google_business": "https://g.page/holstrom-block-parke"
        },
        "pricing_structure": {
            "consultation": {
                "type": "free",
                "format": "phone",
                "duration": "Initial consultation",
                "included": "Case overview, service explanation, fee discussion"
            },
            "retainer": {
                "min": 3500,
                "max": 10000,
                "currency": "USD",
                "note": "Based on complexity and attorney"
            },
            "hourly_rates": {
                "senior_partner": 450,
                "mid_level": 375,
                "junior_attorney": 300,
                "paralegal": 125,
                "currency": "USD"
            },
            "collaborative_law": {
                "retainer": "5000-7500",
                "note": "Typically less expensive than litigation"
            },
            "flat_fee_services": {
                "uncontested_divorce_simple": {
                    "min": 2500,
                    "max": 4000
                },
                "prenuptial_agreement": {
                    "min": 1500,
                    "max": 3500
                },
                "simple_modification": {
                    "min": 2500,
                    "max": 4000
                }
            },
            "mediation": {
                "rate": 400,
                "unit": "per hour",
                "note": "Split between parties"
            },
            "limited_scope_available": True,
            "payment_plans": "available for qualified clients",
            "accepted_methods": ["Credit Card", "Check"]
        },
        "accepted_payment_methods": ["Credit Card", "Visa", "Mastercard", "American Express", "Discover", "Check", "Payment Plans (qualified clients)"]
    }
]

print("-- SQL Script to Create Demo Accounts")
print("-- Generated by CommonGround Agent")
print("-- RUN THIS IN SUPABASE SQL EDITOR\n")

print("BEGIN;")

for idx, acc in enumerate(accounts):
    user_id = str(uuid.UUID(f"{acc['id_prefix'].ljust(8, '0')}-0000-4000-a000-000000000000"))
    firm_id = str(uuid.UUID(f"ca5e{str(idx).zfill(4)}-0000-4000-a000-000000000000"))
    prof_id = str(uuid.UUID(f"b0b0{str(idx).zfill(4)}-0000-4000-a000-000000000000"))
    
    # JSON Fields
    c_practice_areas = json.dumps(acc["practice_areas"]).replace("'", "''")
    c_social_links = json.dumps(acc["social_links"]).replace("'", "''")
    c_pricing = json.dumps(acc["pricing_structure"]).replace("'", "''")
    c_languages = json.dumps(acc["languages"]).replace("'", "''")
    c_education = json.dumps(acc["education"]).replace("'", "''")
    c_awards = json.dumps(acc["awards"]).replace("'", "''")
    c_payment_methods = json.dumps(acc["accepted_payment_methods"]).replace("'", "''")

    print(f"\n-- Account {idx+1}: {acc['firm_name']}")
    
    # 1. Create Auth User
    print(f"""
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
    )
    VALUES (
        '{user_id}', 
        '00000000-0000-0000-0000-000000000000', 
        'authenticated', 
        'authenticated', 
        '{acc['email']}', 
        crypt('{acc['password']}', gen_salt('bf')), 
        now(), 
        '{{"provider": "email", "providers": ["email"]}}', 
        '{{"first_name": "{acc['user_first']}", "last_name": "{acc['user_last']}"}}', 
        now(), 
        now()
    ) ON CONFLICT (id) DO NOTHING;
    """)

    # 2. Create Public User (if not created by trigger - we use ON CONFLICT to be safe)
    # Note: If Supabase has a trigger, this might fail or be redundant. 
    # Standard CommonGround User model implies a public users table.
    print(f"""
    INSERT INTO public.users (
        id, supabase_id, email, first_name, last_name, 
        is_active, is_deleted, created_at, updated_at,
        email_verified, phone_verified, mfa_enabled
    )
    VALUES (
        '{user_id}', 
        '{user_id}', 
        '{acc['email']}', 
        '{acc['user_first']}', 
        '{acc['user_last']}', 
        true, 
        false, 
        now(), 
        now(),
        true,
        true,
        false
    ) ON CONFLICT (id) DO NOTHING;
    """)

    # 3. Create User Profile
    print(f"""
    INSERT INTO public.user_profiles (
        id, user_id, first_name, last_name, 
        locale, timezone, created_at, updated_at,
        subscription_tier, subscription_status, country,
        notification_email, notification_sms, notification_push,
        privacy_read_receipts, privacy_typing_indicator, privacy_last_seen,
        privacy_analytics, privacy_crash_reporting
    )
    VALUES (
        '{user_id}', 
        '{user_id}', 
        '{acc['user_first']}', 
        '{acc['user_last']}', 
        'en-US', 
        'America/Los_Angeles', 
        now(), 
        now(),
        'essential',
        'active',
        'US',
        true,
        false,
        true,
        true,
        true,
        true,
        true,
        true
    ) ON CONFLICT (id) DO NOTHING;
    """)

    # 4. Create Professional Profile
    print(f"""
    INSERT INTO public.professional_profiles (
        id, user_id, professional_type, 
        professional_email, professional_phone,
        headline, bio, video_url, languages, 
        hourly_rate, years_experience, 
        education, awards, consultation_fee, 
        accepted_payment_methods, practice_areas,
        is_active, onboarded_at, created_at, updated_at
    )
    VALUES (
        '{prof_id}', 
        '{user_id}', 
        'attorney',
        '{acc['email']}', 
        '{acc['phone']}',
        '{acc['prof_headline'].replace("'", "''")}', 
        '{acc['prof_bio'].replace("'", "''")}', 
        '{acc['video_url']}', 
        '{c_languages}', 
        '{acc['hourly_rate']}', 
        {acc['years_exp']}, 
        '{c_education}', 
        '{c_awards}', 
        '{acc['pricing_structure']['consultation']['type']} ({acc['pricing_structure']['consultation']['duration']})', 
        '{c_payment_methods}', 
        '{c_practice_areas}',
        true, 
        now(), 
        now(), 
        now()
    ) ON CONFLICT (id) DO NOTHING;
    """)

    # 5. Create Firm
    print(f"""
    INSERT INTO public.firms (
        id, created_by, name, slug, firm_type,
        email, phone, website,
        address_line1, city, state, zip_code,
        description, practice_areas,
        headline, video_url, social_links, pricing_structure,
        safety_vetted, is_public, is_active,
        created_at, updated_at
    )
    VALUES (
        '{firm_id}', 
        '{user_id}', 
        '{acc['firm_name'].replace("'", "''")}', 
        '{acc['firm_slug']}', 
        '{acc['firm_type']}',
        '{acc['email']}', 
        '{acc['phone']}', 
        '{acc['website']}',
        '{acc['address']}', 
        '{acc['city']}', 
        '{acc['state']}', 
        '{acc['zip_code']}',
        '{acc['firm_desc'].replace("'", "''")}', 
        '{c_practice_areas}',
        '{acc['firm_headline'].replace("'", "''")}', 
        '{acc['video_url']}', 
        '{c_social_links}', 
        '{c_pricing}',
        {'true' if acc['safety_vetted'] else 'false'}, 
        true, 
        true,
        now(), 
        now()
    ) ON CONFLICT (slug) DO NOTHING;
    """)

    # 6. Create Firm Membership
    print(f"""
    INSERT INTO public.firm_memberships (
        id, professional_id, firm_id, 
        role, status, 
        joined_at, created_at, updated_at
    )
    VALUES (
        gen_random_uuid(), 
        '{prof_id}', 
        '{firm_id}', 
        'owner', 
        'active', 
        now(), 
        now(), 
        now()
    ) ON CONFLICT (professional_id, firm_id) DO NOTHING;
    """)

print("COMMIT;")
