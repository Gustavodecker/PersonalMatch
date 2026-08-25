/*
# Lock privileged columns on profiles (role, is_blocked)

1. Problem
   - Row level policies on `profiles` scope by row owner (`auth.uid() = id`) but the
     table-level UPDATE grant covered EVERY column. Any signed-in user could therefore
     set `role = 'admin'` on their own row and gain every administrator capability, or
     set `is_blocked = false` to undo a moderation action.

2. Changes
   - Table-wide UPDATE on `profiles` is revoked from `anon` and `authenticated`.
   - UPDATE is re-granted only on the self-editable content columns:
     full_name, email, phone, avatar_url, bio, city, state, updated_at.
   - `role`, `is_blocked`, `stripe_customer_id`, `id` and `created_at` are no longer
     client-writable.

3. New functions (SECURITY DEFINER, search_path pinned, admin-authorized via auth.uid())
   - `admin_set_user_role(p_user uuid, p_role text)` - administrators only.
   - `admin_set_user_blocked(p_user uuid, p_blocked boolean)` - administrators only.
   - `admin_delete_user(p_user uuid)` - administrators only; removes the profile row.

4. Notes
   - Existing self-service profile editing continues to work unchanged.
   - Administrator role/block changes must now go through the functions above.
*/

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

GRANT UPDATE (full_name, email, phone, avatar_url, bio, city, state, updated_at)
  ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_role NOT IN ('student', 'trainer', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(p_user uuid, p_blocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
     SET is_blocked = COALESCE(p_blocked, false), updated_at = now()
   WHERE id = p_user;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account here';
  END IF;

  DELETE FROM public.profiles WHERE id = p_user;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
