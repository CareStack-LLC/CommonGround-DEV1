-- Update partner staff to use demo emails and reset password
-- Password: Demo2026!
-- Hash will be replaced in next step using captured output

DO $$
DECLARE
    new_hash TEXT := '$2b$12$PLACEHOLDER'; -- Will be replaced dynamically before execution if possible, or I will read tool output and write file again.
BEGIN
    -- Update users
    UPDATE users SET email = 'info@demo.jenesse.org', hashed_password = new_hash WHERE email = 'info@jenesse.org';
    UPDATE users SET email = 'admin@demo.intervalhouse.org', hashed_password = new_hash WHERE email = 'admin@intervalhouse.org';

    -- Update partners contact
    UPDATE partners SET primary_contact_email = 'info@demo.jenesse.org' WHERE partner_slug = 'jenesse-center';
    UPDATE partners SET primary_contact_email = 'admin@demo.intervalhouse.org' WHERE partner_slug = 'interval-house-lb';

    -- Update grant codes contact
    UPDATE grant_codes SET nonprofit_contact_email = 'info@demo.jenesse.org' WHERE nonprofit_contact_email = 'info@jenesse.org';
    UPDATE grant_codes SET nonprofit_contact_email = 'admin@demo.intervalhouse.org' WHERE nonprofit_contact_email = 'admin@intervalhouse.org';
END $$;
