/*
# Look up a single voucher by its exact code

1. Purpose
   - The subscription screen needs to preview a discount before checkout. Now that the
     voucher table is no longer readable by every signed-in user, that preview goes
     through this function, which only ever answers for the exact code supplied and
     never lets a caller enumerate or list codes.

2. New function
   - `lookup_voucher(p_code text)` returns the type, discount value and description of a
     matching active, in-date, not-exhausted trainer voucher the caller has not already
     redeemed, and nothing at all otherwise. It does not consume the voucher.

3. Security
   - SECURITY DEFINER with a pinned search_path.
   - EXECUTE granted to authenticated only; `anon` cannot call it.
   - The code itself is never returned, so nothing is disclosed that the caller did not
     already know.
*/

CREATE OR REPLACE FUNCTION public.lookup_voucher(p_code text)
RETURNS TABLE (voucher_type text, discount_value numeric, description text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_code IS NULL OR length(btrim(p_code)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.type, v.discount_value, v.description
    FROM public.vouchers v
   WHERE v.code = upper(btrim(p_code))
     AND v.is_active = true
     AND v.applicable_for IN ('trainer', 'both')
     AND (v.start_date IS NULL OR v.start_date <= now())
     AND (v.expiry_date IS NULL OR v.expiry_date >= now())
     AND (v.max_uses IS NULL OR v.use_count < v.max_uses)
     AND NOT EXISTS (
       SELECT 1 FROM public.voucher_redemptions r
        WHERE r.voucher_id = v.id AND r.user_id = auth.uid()
     )
   LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_voucher(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_voucher(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lookup_voucher(text) TO authenticated;
