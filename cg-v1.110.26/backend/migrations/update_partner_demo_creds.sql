-- Update partner staff to use demo emails and reset password
-- Password: Demo2026!
-- Hash: $2b$12$/ZB1djetcv0ogSObxV3H7eMzozwYMxpJJFSMfOCxPxjc//d1biCuu

BEGIN;

-- 1. Update users (email and password)
UPDATE users 
SET 
  email = 'info@demo.jenesse.org',
  hashed_password = '$2b$12$/ZB1djetcv0ogSObxV3H7eMzozwYMxpJJFSMfOCxPxjc//d1biCuu'
WHERE email = 'info@jenesse.org';

UPDATE users 
SET 
  email = 'admin@demo.intervalhouse.org',
  hashed_password = '$2b$12$/ZB1djetcv0ogSObxV3H7eMzozwYMxpJJFSMfOCxPxjc//d1biCuu'
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
WHERE nonprofit_name ILIKE '%Jenesse%';

UPDATE grant_codes 
SET nonprofit_contact_email = 'admin@demo.intervalhouse.org'
WHERE nonprofit_name ILIKE '%Interval House%';

COMMIT;
