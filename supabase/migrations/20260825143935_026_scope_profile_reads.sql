/*
# Scope profile reads to related people instead of everyone

1. Problem
   - Three duplicated SELECT policies on `profiles` were `USING (true)` for every
     authenticated user, so anyone who signed up could read the whole user directory:
     names, email addresses, phone numbers, roles and block state.

2. Changes
   - New helper `is_admin()` (SECURITY DEFINER) so a policy on `profiles` can test the
     caller's role without recursing into `profiles` policies.
   - The two duplicate SELECT policies are dropped; the remaining one now allows:
       - the caller's own row
       - profiles of active trainers (the public marketplace listing)
       - the other party of a shared lead, appointment or review
       - administrators
   - Anonymous access is unchanged (active trainers only).

3. Notes
   - Trainers still see the students who contacted them, students still see the
     trainers they contacted, and the admin panel still lists all users.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

DROP POLICY IF EXISTS "profiles_sel_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
DROP POLICY IF EXISTS "p_sel_auth" ON public.profiles;

CREATE POLICY "p_sel_auth" ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.trainers t
       WHERE t.id = profiles.id AND t.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.leads l
       WHERE (l.student_id = profiles.id AND l.trainer_id = auth.uid())
          OR (l.trainer_id = profiles.id AND l.student_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.appointments a
       WHERE (a.student_id = profiles.id AND a.trainer_id = auth.uid())
          OR (a.trainer_id = profiles.id AND a.student_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.reviews r
       WHERE (r.student_id = profiles.id AND r.trainer_id = auth.uid())
          OR (r.trainer_id = profiles.id AND r.student_id = auth.uid())
    )
  );
