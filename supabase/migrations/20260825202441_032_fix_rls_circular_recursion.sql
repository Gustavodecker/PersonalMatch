/*
# Fix circular RLS recursion causing 500 errors

1. Problem
   - `profiles.p_sel_auth` does EXISTS subqueries on `leads`, `appointments`, `reviews`.
   - Those tables' SELECT policies do EXISTS subqueries back on `profiles`.
   - This creates infinite recursion in RLS evaluation, causing HTTP 500 errors
     on every authenticated query touching profiles (including the home page
     trainer listing which joins profiles via trainers_id_fkey).

2. Fix strategy
   - Replace inline `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`
     in leads/appointments/reviews policies with `is_admin()` (already SECURITY DEFINER,
     bypasses RLS, breaks the cycle from their side).
   - Simplify `profiles.p_sel_auth`: keep direct ownership (id = auth.uid()), is_admin(),
     active-trainer check, but remove the leads/appointments/reviews subqueries.
     Instead use a SECURITY DEFINER helper that checks relationship without triggering RLS.
   - Remove duplicate legacy policies on profiles (profiles_sel_anon, profiles_select_anon_active)
     and leads (leads_sel, leads_select) that are redundant.

3. New function
   - `has_relationship_with(p_profile uuid)` SECURITY DEFINER - checks if auth.uid()
     has a lead, appointment or review relationship with p_profile, without RLS recursion.

4. Security
   - No change in actual access semantics; same users can see same data.
   - Cycles are broken by using SECURITY DEFINER functions for cross-table checks.
*/

-- Step 1: Create helper function (SECURITY DEFINER, bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_relationship_with(p_profile uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads
    WHERE (student_id = p_profile AND trainer_id = auth.uid())
       OR (trainer_id = p_profile AND student_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.appointments
    WHERE (student_id = p_profile AND trainer_id = auth.uid())
       OR (trainer_id = p_profile AND student_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.reviews
    WHERE (student_id = p_profile AND trainer_id = auth.uid())
       OR (trainer_id = p_profile AND student_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.has_relationship_with(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_relationship_with(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_relationship_with(uuid) TO authenticated;

-- Step 2: Replace profiles authenticated SELECT policy (break recursion)
DROP POLICY IF EXISTS "p_sel_auth" ON public.profiles;
CREATE POLICY "p_sel_auth" ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR is_admin()
    OR EXISTS (SELECT 1 FROM public.trainers t WHERE t.id = profiles.id AND t.status = 'active')
    OR has_relationship_with(profiles.id)
  );

-- Step 3: Remove duplicate anon policies on profiles (keep only p_sel_anon)
DROP POLICY IF EXISTS "profiles_sel_anon" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_anon_active" ON public.profiles;

-- Step 4: Fix leads policies - replace inline profiles subquery with is_admin()
DROP POLICY IF EXISTS "l_sel" ON public.leads;
DROP POLICY IF EXISTS "leads_sel" ON public.leads;
DROP POLICY IF EXISTS "leads_select" ON public.leads;

CREATE POLICY "l_sel" ON public.leads FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR trainer_id = auth.uid()
    OR is_admin()
  );

-- Step 5: Fix appointments policy
DROP POLICY IF EXISTS "appt_sel" ON public.appointments;

CREATE POLICY "appt_sel" ON public.appointments FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR trainer_id = auth.uid()
    OR is_admin()
  );

-- Step 6: Fix reviews policy
DROP POLICY IF EXISTS "reviews_select_auth_safe" ON public.reviews;

CREATE POLICY "reviews_select_auth_safe" ON public.reviews FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    OR student_id = auth.uid()
    OR is_admin()
  );
