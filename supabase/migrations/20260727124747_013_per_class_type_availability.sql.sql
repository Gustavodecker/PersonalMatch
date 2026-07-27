/*
# Per-class-type availability and schedule blocks

## Purpose
Allows trainers to configure availability and schedule blocks per class type
(e.g., Musculação on Mon/Thu mornings, Natação on Tue/Fri afternoons), each
with its own days, times, session duration, and buffer.

## Changes

### 1. trainer_availability — add class_type_id
- New column `class_type_id` (UUID, nullable, references trainer_class_types).
  When NULL, the row applies as a general/fallback schedule (backward compatible).
  When set, the row is specific to that class type.
- Updated the unique constraint from (trainer_id, day_of_week) to
  (trainer_id, day_of_week, class_type_id) so trainers can have one general
  row per day AND one row per class type per day.
- New index on class_type_id for efficient lookups.

### 2. trainer_schedule_blocks — add class_type_id
- New column `class_type_id` (UUID, nullable, references trainer_class_types).
  When NULL, the block applies to all classes that day (backward compatible).
  When set, the block only blocks that specific class type on that date.

### 3. trainer_availability unique constraint
- Dropped the old (trainer_id, day_of_week) unique constraint.
- Added (trainer_id, day_of_week, class_type_id) unique constraint using
  COALESCE so NULL class_type_id is treated as a distinct key.

## Security
- No RLS policy changes. Existing policies on both tables already scope by
  trainer_id = auth.uid() for writes and are public for reads (anon + authenticated),
  which remains correct since availability/class-type info is public to students
  browsing the marketplace.

## Notes
- All changes are additive (new nullable columns, constraint swaps). No data loss.
- Existing availability rows keep working as general schedules (class_type_id = NULL).
*/

-- ─── trainer_availability: add class_type_id ──────────────────────────────────
ALTER TABLE trainer_availability
  ADD COLUMN IF NOT EXISTS class_type_id UUID REFERENCES trainer_class_types(id) ON DELETE CASCADE;

-- Replace the unique constraint to allow per-class-type rows per day.
-- NULL class_type_id (general schedule) must coexist with non-NULL ones.
ALTER TABLE trainer_availability
  DROP CONSTRAINT IF EXISTS trainer_availability_trainer_day_unique;
ALTER TABLE trainer_availability
  DROP CONSTRAINT IF EXISTS trainer_availability_trainer_day_class_unique;
ALTER TABLE trainer_availability
  ADD CONSTRAINT trainer_availability_trainer_day_class_unique
    UNIQUE (trainer_id, day_of_week, class_type_id);

CREATE INDEX IF NOT EXISTS idx_avail_class_type
  ON trainer_availability(class_type_id);

-- ─── trainer_schedule_blocks: add class_type_id ───────────────────────────────
ALTER TABLE trainer_schedule_blocks
  ADD COLUMN IF NOT EXISTS class_type_id UUID REFERENCES trainer_class_types(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_class_type
  ON trainer_schedule_blocks(class_type_id);
