/*
# Site Visits Analytics Table

1. New Tables
  - `site_visits` — tracks every page visit with geolocation and device data
    - `id` (uuid, primary key)
    - `visitor_id` (uuid, nullable FK to profiles — null for anonymous visitors)
    - `ip_address` (text) — visitor IP
    - `country` (text, nullable) — country from geo lookup
    - `country_code` (text, nullable) — ISO country code
    - `region` (text, nullable) — state/region
    - `city` (text, nullable) — city
    - `latitude` (double, nullable)
    - `longitude` (double, nullable)
    - `timezone` (text, nullable)
    - `isp` (text, nullable) — internet service provider
    - `page_path` (text) — which page was visited
    - `referrer` (text, nullable) — HTTP referrer
    - `user_agent` (text, nullable) — browser/device info
    - `device_type` (text, nullable) — mobile/desktop/tablet
    - `browser` (text, nullable) — browser name
    - `os` (text, nullable) — operating system
    - `session_id` (text, nullable) — to group visits in a session
    - `visited_at` (timestamptz) — when the visit occurred

2. Security
  - RLS enabled
  - Only admins can read site_visits (via is_admin helper)
  - Insert allowed for anon + authenticated (edge function inserts via service role anyway)

3. Indexes
  - visited_at for time-range queries
  - country for geographic filtering
  - page_path for page-level analytics
*/

CREATE TABLE IF NOT EXISTS site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address text NOT NULL DEFAULT '',
  country text,
  country_code text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  timezone text,
  isp text,
  page_path text NOT NULL DEFAULT '/',
  referrer text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  session_id text,
  visited_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

-- Only admins can read
DROP POLICY IF EXISTS "admin_select_site_visits" ON site_visits;
CREATE POLICY "admin_select_site_visits" ON site_visits FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Insert via edge function (service role), but allow anon too for direct tracking
DROP POLICY IF EXISTS "insert_site_visits" ON site_visits;
CREATE POLICY "insert_site_visits" ON site_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No update/delete by clients
DROP POLICY IF EXISTS "admin_delete_site_visits" ON site_visits;
CREATE POLICY "admin_delete_site_visits" ON site_visits FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON site_visits (visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_country ON site_visits (country);
CREATE INDEX IF NOT EXISTS idx_site_visits_page_path ON site_visits (page_path);
CREATE INDEX IF NOT EXISTS idx_site_visits_ip ON site_visits (ip_address);
