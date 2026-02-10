-- Update partner staff to use demo emails (public.users only) https://demo.jenesse.org

BEGIN;

-- 1. Update users (email only, as hashed_password is not in public.users)
UPDATE users 
SET email = 'info@demo.jenesse.org'
WHERE email = 'info@jenesse.org';

UPDATE users 
SET email = 'admin@demo.intervalhouse.org'
WHERE email = 'admin@intervalhouse.org';

-- 2. Update partners contact info
UPDATE partners 
SET primary_contact_email = 'info@demo.jenesse.org'
WHERE partner_slug = 'jenesse-center';

UPDATE partners 
SET primary_contact_email = 'admin@demo.intervalhouse.org'
WHERE partner_slug = 'interval-house-lb';

-- 3. Update grant codes contact info
UPDATE grant_codes 
SET nonprofit_contact_email = 'info@demo.jenesse.org'
WHERE nonprofit_contact_email = 'info@jenesse.org';

UPDATE grant_codes 
SET nonprofit_contact_email = 'admin@demo.intervalhouse.org'
WHERE nonprofit_contact_email = 'admin@intervalhouse.org';

COMMIT;
