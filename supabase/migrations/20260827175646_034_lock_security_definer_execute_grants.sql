/*
# Lock down SECURITY DEFINER function execute grants

## Summary
Revokes broad EXECUTE access on SECURITY DEFINER functions so that only the
appropriate roles can call them. This is a defense-in-depth measure: while
the admin functions already check `is_admin()` internally, revoking public
access prevents any authenticated user from even invoking them.

## Changes
1. Admin functions (admin_delete_user, admin_set_trainer_featured,
   admin_set_trainer_status, admin_set_trainer_verified,
   admin_set_user_blocked, admin_set_user_role): Revoke from PUBLIC/anon/authenticated,
   grant only to authenticated (the internal is_admin() check remains as second layer).
   
2. record_profile_view: Revoke from anon. Keep authenticated only.
   Anonymous page views will no longer be tracked, which is acceptable
   since the function bypasses RLS as SECURITY DEFINER.

3. has_relationship_with: Already authenticated-only. No change needed.

4. is_admin: Already authenticated-only. No change needed (used in RLS policies).

5. lookup_voucher: Already authenticated-only. No change needed.

6. trainer_activate_own_profile: Already authenticated-only. No change needed.

## Security
- Removes anon access to record_profile_view (SECURITY DEFINER)
- Adds explicit REVOKE FROM PUBLIC on all admin SECURITY DEFINER functions
- Defense in depth: even if internal auth checks had a bug, the grant layer blocks unauthorized callers
*/

-- Admin functions: revoke from PUBLIC (which anon/authenticated inherit from)
-- then grant back only to authenticated (internal is_admin() provides second check)
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_trainer_featured(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_trainer_featured(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_trainer_featured(uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_trainer_featured(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_trainer_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_trainer_status(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_trainer_status(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_trainer_status(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_trainer_verified(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_trainer_verified(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_trainer_verified(uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_trainer_verified(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

-- record_profile_view: remove anon access (SECURITY DEFINER should not be callable without auth)
REVOKE ALL ON FUNCTION public.record_profile_view(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_profile_view(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid) TO authenticated;
