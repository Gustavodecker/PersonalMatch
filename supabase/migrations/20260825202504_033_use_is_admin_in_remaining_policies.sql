/*
# Replace inline profiles subqueries in profile_views and subscriptions

1. Problem
   - profile_views and subscriptions SELECT policies use inline
     EXISTS (SELECT 1 FROM profiles WHERE ...) for admin checks.
   - While these don't currently cause recursion (profiles doesn't reference them),
     they should use is_admin() for consistency and to prevent future cycles.

2. Changes
   - Replace both policies to use is_admin() instead of inline profiles subquery.
*/

DROP POLICY IF EXISTS "profile_views_select" ON public.profile_views;
CREATE POLICY "profile_views_select" ON public.profile_views FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "sub_sel_own" ON public.subscriptions;
CREATE POLICY "sub_sel_own" ON public.subscriptions FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid() OR is_admin());
