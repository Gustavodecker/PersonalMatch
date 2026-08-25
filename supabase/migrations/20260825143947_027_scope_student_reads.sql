/*
# Scope student profile reads

1. Problem
   - Three duplicated SELECT policies on `students` were `USING (true)` for every
     authenticated user, so any account could read every student's goals, fitness level
     and preferred modality.

2. Changes
   - The duplicates are dropped and the remaining SELECT policy allows the student's own
     row, administrators, and trainers who share a lead or an appointment with them.

3. Notes
   - Trainers still see the details of students who contacted or booked them.
*/

DROP POLICY IF EXISTS "students_sel_auth" ON public.students;
DROP POLICY IF EXISTS "students_select_auth" ON public.students;
DROP POLICY IF EXISTS "st_sel" ON public.students;

CREATE POLICY "st_sel" ON public.students FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.leads l
       WHERE l.student_id = students.id AND l.trainer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.appointments a
       WHERE a.student_id = students.id AND a.trainer_id = auth.uid()
    )
  );
