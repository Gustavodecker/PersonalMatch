/*
# Add the missing WITH CHECK to three UPDATE policies

1. Problem
   - An UPDATE policy with a USING clause and no WITH CHECK validates only the row as it
     was, never the row as it becomes. The owning columns could therefore be rewritten:
       - `appointments.appt_upd`: a student could move their booking to a different
         trainer and set its status to confirmed.
       - `leads` (`l_upd`, `leads_upd`, `leads_update`): a trainer could reassign one of
         their leads to a competitor, or rewrite the student it belongs to.
       - `trainer_class_types.ct_upd_own`: a trainer could move one of their class
         offerings onto a competitor's public profile.

2. Changes
   - Each policy is recreated with a WITH CHECK matching its USING clause, and the two
     redundant duplicate lead policies are dropped.

3. Notes
   - Every legitimate update (changing a booking status, a lead status, a class name)
     keeps working; only rewriting the owning columns is now rejected.
*/

DROP POLICY IF EXISTS "appt_upd" ON public.appointments;
CREATE POLICY "appt_upd" ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid() OR trainer_id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    student_id = auth.uid() OR trainer_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "leads_upd" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "l_upd" ON public.leads;
CREATE POLICY "l_upd" ON public.leads FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid() OR public.is_admin())
  WITH CHECK (trainer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "ct_upd_own" ON public.trainer_class_types;
CREATE POLICY "ct_upd_own" ON public.trainer_class_types FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());
