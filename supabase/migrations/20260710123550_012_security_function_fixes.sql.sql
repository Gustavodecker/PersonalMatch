/*
# Security Fixes: Function Search Path, EXECUTE Permissions

## Summary
Fixes multiple security audit findings:
1. Functions `normalize_text`, `auto_normalize_trainer`, and `sync_trainer_normalized_city`
   had mutable search_path, making them vulnerable to search_path hijacking.
2. Function `handle_new_user()` (a SECURITY DEFINER trigger function) was executable
   by `anon` and `authenticated` roles via the REST API, which could allow unauthorized
   invocation outside of the intended auth-trigger context.

## Changes

### 1. Function Search Path Hardening
- `ALTER FUNCTION ... SET search_path = ''` on:
  - `public.normalize_text(text)`
  - `public.auto_normalize_trainer()`
  - `public.sync_trainer_normalized_city()`
  - `public.handle_new_user()` (also hardened, since it is SECURITY DEFINER)
- Setting `search_path = ''` forces these functions to resolve names only via
  schema-qualified references, preventing hijacking via a malicious `search_path`.

### 2. Revoke EXECUTE on handle_new_user
- `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;`
- This function is a trigger on `auth.users` and should only be invoked by the
  database trigger, not via REST RPC. Keeping `service_role` and `postgres` EXECUTE
  is safe and necessary for internal operations.

## Security Impact
- Eliminates search_path hijacking risk on all public functions.
- Prevents anonymous and authenticated users from calling `handle_new_user()`
  directly via `/rest/v1/rpc/handle_new_user`, which could otherwise be abused
  to create profile/trainer/student rows with attacker-controlled data.
*/

-- 1. Harden search_path on all flagged functions (and the SECURITY DEFINER trigger)
ALTER FUNCTION public.normalize_text(text) SET search_path = '';
ALTER FUNCTION public.auto_normalize_trainer() SET search_path = '';
ALTER FUNCTION public.sync_trainer_normalized_city() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 2. Revoke EXECUTE on handle_new_user from anon and authenticated (and PUBLIC)
--    The function is a trigger on auth.users and must not be callable via REST RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
