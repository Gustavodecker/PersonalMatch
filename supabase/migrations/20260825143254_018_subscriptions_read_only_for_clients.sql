/*
# Make the subscriptions table read-only for the app's clients

1. Problem
   - `sub_ins_own` / `sub_upd_own` let a trainer insert or update their own
     subscription row. A trainer could therefore set `plan = 'premium'` and
     `status = 'active'` through the data API and receive paid entitlements for free.

2. Changes
   - Both client write policies are dropped.
   - INSERT, UPDATE and DELETE on `subscriptions` are revoked from `anon` and
     `authenticated`.
   - SELECT is untouched: trainers and administrators still read the row.

3. Notes
   - The only legitimate writer is the Stripe webhook, which uses the service role
     key and is not subject to these grants or policies.
*/

DROP POLICY IF EXISTS "sub_ins_own" ON public.subscriptions;
DROP POLICY IF EXISTS "sub_upd_own" ON public.subscriptions;

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon;
