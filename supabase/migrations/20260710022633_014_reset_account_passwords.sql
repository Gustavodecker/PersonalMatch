
-- Reset passwords for existing accounts to known values
-- Uses pgcrypto bcrypt to generate proper Supabase-compatible password hashes

UPDATE auth.users
SET
  encrypted_password = crypt('joao123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'joao@msn.com';

UPDATE auth.users
SET
  encrypted_password = crypt('gustavo123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'gustavo.miguel@msn.com';

UPDATE auth.users
SET
  encrypted_password = crypt('admin123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'admin@personalmatch.com';

UPDATE auth.users
SET
  encrypted_password = crypt('test123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'test@email.com';

-- Make sure all emails are confirmed
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email IN (
  'joao@msn.com',
  'gustavo.miguel@msn.com',
  'admin@personalmatch.com',
  'test@email.com'
);
