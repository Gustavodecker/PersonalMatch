/*
# Premium Features: Promotions, Custom Slugs, Auto-Reply, Conversion Analytics

1. New Tables
  - `trainer_promotions`
    - `id` (uuid, primary key)
    - `trainer_id` (uuid, FK to trainers.id)
    - `title` (text, not null) — e.g. "Pacote 10 aulas"
    - `description` (text) — details of the offer
    - `discount_label` (text) — e.g. "15% OFF", "1a aula grátis"
    - `is_active` (boolean, default true)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

2. Modified Tables
  - `trainers`
    - ADD `profile_slug` (text, unique, nullable) — vanity URL slug
    - ADD `auto_reply_message` (text, nullable) — message sent automatically to new leads

3. Security
  - RLS on `trainer_promotions` — trainers can manage their own; everyone can read active ones.
  - No change to trainers RLS (existing policies already allow trainer to update own row).

4. Notes
  - Conversion analytics are derived from existing `profile_views` and `leads` tables — no new tables needed.
  - `profile_slug` has a unique constraint so two trainers can't claim the same slug.
  - Only Premium trainers should use these features; enforcement is in the frontend.
*/

-- Add columns to trainers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='profile_slug') THEN
    ALTER TABLE trainers ADD COLUMN profile_slug text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='auto_reply_message') THEN
    ALTER TABLE trainers ADD COLUMN auto_reply_message text;
  END IF;
END $$;

-- Create trainer_promotions table
CREATE TABLE IF NOT EXISTS trainer_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  discount_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trainer_promotions ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read active promotions (public visibility)
DROP POLICY IF EXISTS "anyone_read_active_promotions" ON trainer_promotions;
CREATE POLICY "anyone_read_active_promotions" ON trainer_promotions FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- RLS: Trainers can read all their own promotions (including inactive)
DROP POLICY IF EXISTS "trainer_read_own_promotions" ON trainer_promotions;
CREATE POLICY "trainer_read_own_promotions" ON trainer_promotions FOR SELECT
  TO authenticated USING (auth.uid() = trainer_id);

-- RLS: Trainers can insert their own promotions
DROP POLICY IF EXISTS "trainer_insert_own_promotions" ON trainer_promotions;
CREATE POLICY "trainer_insert_own_promotions" ON trainer_promotions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = trainer_id);

-- RLS: Trainers can update their own promotions
DROP POLICY IF EXISTS "trainer_update_own_promotions" ON trainer_promotions;
CREATE POLICY "trainer_update_own_promotions" ON trainer_promotions FOR UPDATE
  TO authenticated USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);

-- RLS: Trainers can delete their own promotions
DROP POLICY IF EXISTS "trainer_delete_own_promotions" ON trainer_promotions;
CREATE POLICY "trainer_delete_own_promotions" ON trainer_promotions FOR DELETE
  TO authenticated USING (auth.uid() = trainer_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_trainer_promotions_trainer_id ON trainer_promotions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainers_profile_slug ON trainers(profile_slug) WHERE profile_slug IS NOT NULL;
