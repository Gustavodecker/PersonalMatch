/*
# Restrict the role a new account can assign itself

1. Problem
   - The three (duplicated) INSERT policies on `profiles` only checked
     `auth.uid() = id`. Because the signup screen sends the role from the client,
     anyone could create their own profile row with `role = 'admin'` and be an
     administrator on their first request.

2. Changes
   - The two redundant duplicate INSERT policies are dropped.
   - A single INSERT policy remains, which additionally requires the role to be one
     of the two self-service roles: 'student' or 'trainer'.

3. Notes
   - Administrator accounts are now created only by an existing administrator through
     `admin_set_user_role`.
   - Normal signup for students and trainers is unaffected.
*/

DROP POLICY IF EXISTS "profiles_ins_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "p_ins" ON public.profiles;

CREATE POLICY "p_ins" ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role IN ('student', 'trainer'));
