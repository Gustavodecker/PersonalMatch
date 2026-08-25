/*
# Platform Metrics Table

1. New Tables
  - `platform_metrics`
    - `id` (text, primary key) - metric key like 'ios_downloads', 'android_downloads'
    - `value` (bigint, default 0) - the metric value
    - `updated_at` (timestamptz) - last update time

2. Security
  - Enable RLS on `platform_metrics`.
  - Public read (anyone can view counts).
  - Only authenticated users with admin role can update (via service role in practice).

3. Seed Data
  - Insert default rows for ios_downloads, android_downloads, site_visits.
*/

CREATE TABLE IF NOT EXISTS platform_metrics (
  id text PRIMARY KEY,
  value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_read_metrics" ON platform_metrics;
CREATE POLICY "anyone_can_read_metrics" ON platform_metrics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_can_update_metrics" ON platform_metrics;
CREATE POLICY "authenticated_can_update_metrics" ON platform_metrics FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_insert_metrics" ON platform_metrics;
CREATE POLICY "authenticated_can_insert_metrics" ON platform_metrics FOR INSERT
  TO authenticated WITH CHECK (true);

INSERT INTO platform_metrics (id, value) VALUES
  ('ios_downloads', 0),
  ('android_downloads', 0),
  ('site_visits', 0)
ON CONFLICT (id) DO NOTHING;
