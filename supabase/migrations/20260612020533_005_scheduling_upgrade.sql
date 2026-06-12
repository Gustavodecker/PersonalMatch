-- Add buffer_minutes and updated_at to trainer_availability
ALTER TABLE trainer_availability
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add unique constraint to enforce one slot per trainer per day (upsert support)
ALTER TABLE trainer_availability
  DROP CONSTRAINT IF EXISTS trainer_availability_trainer_day_unique;
ALTER TABLE trainer_availability
  ADD CONSTRAINT trainer_availability_trainer_day_unique UNIQUE (trainer_id, day_of_week);

-- Add guest-booking fields to appointments (student may not be logged in)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_phone TEXT,
  ADD COLUMN IF NOT EXISTS student_goal TEXT;

-- Make student_id nullable (guest bookings have no user account)
ALTER TABLE appointments
  ALTER COLUMN student_id DROP NOT NULL;

-- trainer_schedule_blocks: per-date manual blocks
CREATE TABLE IF NOT EXISTS trainer_schedule_blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  block_date  DATE        NOT NULL,
  start_time  TIME,
  end_time    TIME,
  is_full_day BOOLEAN     NOT NULL DEFAULT false,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_trainer_date ON trainer_schedule_blocks (trainer_id, block_date);

ALTER TABLE trainer_schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainers_manage_own_blocks" ON trainer_schedule_blocks
  FOR ALL TO authenticated USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);

-- RLS for trainer_availability already exists; expose buffer_minutes to reads
-- (no new policy needed, existing SELECT policies cover new columns)
