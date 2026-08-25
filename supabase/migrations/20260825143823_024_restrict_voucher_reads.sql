/*
# Stop discount codes being readable by every signed-in user

1. Problem
   - `public_read_active_vouchers` allowed every authenticated user to SELECT any
     active voucher, exposing the `code` and `discount_value` of every live campaign.
     A voucher code held in a row anyone can read is a published secret.

2. Changes
   - The policy is dropped.

3. Notes
   - Administrators keep full access through `admin_all_vouchers`.
   - Voucher validation and redemption happen inside the checkout edge function, which
     uses the service role and is unaffected.
*/

DROP POLICY IF EXISTS "public_read_active_vouchers" ON public.vouchers;
