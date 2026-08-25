/*
# Atomic voucher claim with a per-person limit

1. Problem
   - The checkout function read a voucher, checked `use_count >= max_uses` in
     application memory, then wrote `use_count + 1` in a separate statement. Two
     concurrent redemptions both passed the check, so the usage cap could be exceeded
     and the increment could be lost.
   - `vouchers.max_uses_per_user` was never read by any code, so one person could
     redeem the same voucher repeatedly.

2. New function
   - `claim_voucher(p_code text, p_user uuid)` returns the voucher's type and discount
     value when the claim succeeds, and NULL when the code is unknown, inactive,
     expired, exhausted, or already redeemed by that person.
   - The cap check and the increment happen in a single UPDATE statement, so concurrent
     callers cannot both succeed.
   - A row is recorded in `voucher_redemptions`, whose unique (voucher_id, user_id)
     constraint enforces the per-person limit.

3. Security
   - SECURITY DEFINER with a pinned search_path.
   - EXECUTE is revoked from anon and authenticated: only the server-side checkout
     function (service role), which has already verified the caller's session, may
     call it.
*/

CREATE OR REPLACE FUNCTION public.claim_voucher(p_code text, p_user uuid)
RETURNS TABLE (voucher_id uuid, voucher_type text, discount_value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_type text;
  v_value numeric;
BEGIN
  IF p_code IS NULL OR p_user IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_id
    FROM public.vouchers
   WHERE code = upper(btrim(p_code))
     AND is_active = true
     AND applicable_for IN ('trainer', 'both')
     AND (start_date IS NULL OR start_date <= now())
     AND (expiry_date IS NULL OR expiry_date >= now());

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  -- per-person limit
  IF EXISTS (
    SELECT 1 FROM public.voucher_redemptions
     WHERE voucher_redemptions.voucher_id = v_id
       AND voucher_redemptions.user_id = p_user
  ) THEN
    RETURN;
  END IF;

  -- the cap check and the increment are the same statement
  UPDATE public.vouchers
     SET use_count = use_count + 1, updated_at = now()
   WHERE id = v_id
     AND (max_uses IS NULL OR use_count < max_uses)
  RETURNING type, vouchers.discount_value INTO v_type, v_value;

  IF v_type IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.voucher_redemptions (voucher_id, user_id)
  VALUES (v_id, p_user)
  ON CONFLICT (voucher_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_id, v_type, v_value;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_voucher(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_voucher(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_voucher(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_voucher(text, uuid) TO service_role;
