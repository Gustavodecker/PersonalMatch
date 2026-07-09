-- Add is_blocked to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- Update trainers status check to include 'blocked'
ALTER TABLE trainers DROP CONSTRAINT IF EXISTS trainers_status_check;
ALTER TABLE trainers ADD CONSTRAINT trainers_status_check
  CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'blocked'));

-- Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz,
  max_uses integer,
  max_uses_per_user integer NOT NULL DEFAULT 1,
  use_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  applicable_for text NOT NULL DEFAULT 'both' CHECK (applicable_for IN ('trainer', 'student', 'both')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_vouchers" ON vouchers;
CREATE POLICY "admin_all_vouchers" ON vouchers FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "public_read_active_vouchers" ON vouchers;
CREATE POLICY "public_read_active_vouchers" ON vouchers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Voucher redemptions
CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id uuid NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(voucher_id, user_id)
);

ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_redemptions" ON voucher_redemptions;
CREATE POLICY "admin_all_redemptions" ON voucher_redemptions FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "own_redemptions" ON voucher_redemptions;
CREATE POLICY "own_redemptions" ON voucher_redemptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- App settings (singleton)
CREATE TABLE IF NOT EXISTS app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  marketplace_name text NOT NULL DEFAULT 'SuperShape',
  primary_color text NOT NULL DEFAULT '#2D4EDE',
  support_whatsapp text,
  support_email text,
  institutional_text text,
  terms_text text,
  privacy_text text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_settings" ON app_settings;
CREATE POLICY "admin_all_settings" ON app_settings FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "public_read_settings" ON app_settings;
CREATE POLICY "public_read_settings" ON app_settings FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "auth_read_settings" ON app_settings;
CREATE POLICY "auth_read_settings" ON app_settings FOR SELECT
  TO authenticated USING (true);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
