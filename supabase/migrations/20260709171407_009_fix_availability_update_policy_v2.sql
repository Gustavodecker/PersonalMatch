-- Fix UPDATE policy on trainer_availability to include WITH CHECK
DROP POLICY IF EXISTS "av_upd_own" ON trainer_availability;
CREATE POLICY "av_upd_own" ON trainer_availability FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Ensure trainer_schedule_blocks has proper per-verb policies
DROP POLICY IF EXISTS "trainers_manage_own_blocks" ON trainer_schedule_blocks;
DROP POLICY IF EXISTS "blocks_sel_own" ON trainer_schedule_blocks;
DROP POLICY IF EXISTS "blocks_ins_own" ON trainer_schedule_blocks;
DROP POLICY IF EXISTS "blocks_upd_own" ON trainer_schedule_blocks;
DROP POLICY IF EXISTS "blocks_del_own" ON trainer_schedule_blocks;

CREATE POLICY "blocks_sel_own" ON trainer_schedule_blocks FOR SELECT
  TO authenticated USING (auth.uid() = trainer_id);

CREATE POLICY "blocks_ins_own" ON trainer_schedule_blocks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "blocks_upd_own" ON trainer_schedule_blocks FOR UPDATE
  TO authenticated USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "blocks_del_own" ON trainer_schedule_blocks FOR DELETE
  TO authenticated USING (auth.uid() = trainer_id);
