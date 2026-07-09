-- ─── Trial / subscription columns on trainers ─────────────────────────────────

-- Drop old check constraint that didn't include 'free_trial'
ALTER TABLE trainers DROP CONSTRAINT IF EXISTS trainers_subscription_plan_check;

-- Add subscription_plan with broader set of allowed values
ALTER TABLE trainers
  ALTER COLUMN subscription_plan SET DEFAULT 'free_trial';
ALTER TABLE trainers
  ADD CONSTRAINT trainers_subscription_plan_check
    CHECK (subscription_plan IN ('free_trial','free','pro','premium'));

-- Add missing trial/subscription columns
ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing','active','expired','blocked','canceled')),
  ADD COLUMN IF NOT EXISTS trial_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at     TIMESTAMPTZ;

-- ─── per-modality pricing ──────────────────────────────────────────────────────
ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS in_person_hourly_rate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS online_hourly_rate    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS home_hourly_rate      DECIMAL(10,2);

-- ─── profiles: is_blocked column ──────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- ─── trainer_class_types ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainer_class_types (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id       UUID        NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  description      TEXT,
  duration_minutes INTEGER     NOT NULL DEFAULT 60,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_types_trainer ON trainer_class_types(trainer_id);
ALTER TABLE trainer_class_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct_sel_all" ON trainer_class_types;
CREATE POLICY "ct_sel_all" ON trainer_class_types FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ct_ins_own" ON trainer_class_types;
CREATE POLICY "ct_ins_own" ON trainer_class_types FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
DROP POLICY IF EXISTS "ct_upd_own" ON trainer_class_types;
CREATE POLICY "ct_upd_own" ON trainer_class_types FOR UPDATE TO authenticated USING (trainer_id = auth.uid());
DROP POLICY IF EXISTS "ct_del_own" ON trainer_class_types;
CREATE POLICY "ct_del_own" ON trainer_class_types FOR DELETE TO authenticated USING (trainer_id = auth.uid());

-- ─── appointments: class type + guest-booking RLS fix ─────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS class_type_id   UUID REFERENCES trainer_class_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_type_name TEXT;

-- Allow guest bookings (student_id = null) from authenticated users
DROP POLICY IF EXISTS "appt_ins" ON appointments;
CREATE POLICY "appt_ins" ON appointments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR student_id IS NULL);

-- Also allow fully anonymous guest bookings
DROP POLICY IF EXISTS "appt_ins_anon" ON appointments;
CREATE POLICY "appt_ins_anon" ON appointments FOR INSERT TO anon
  WITH CHECK (student_id IS NULL);

-- ─── Backfill trial columns for existing trainers without them ────────────────
UPDATE trainers
SET
  trial_started_at = created_at,
  trial_ends_at    = created_at + INTERVAL '15 days'
WHERE trial_started_at IS NULL;
