/*
# Lock the privileged and paid-tier columns on trainers

1. Problem
   - The UPDATE policies on `trainers` scope by row owner, but the table-level UPDATE
     grant covered every column. A trainer could therefore write, on their own row:
       - `subscription_plan`, `subscription_status`, `is_featured`, `photo_limit`,
         `trial_started_at`, `trial_ends_at`, `current_period_end` (paid entitlements)
       - `is_verified` (platform trust badge)
       - `status` (undo a rejection or a block and reappear in public search)
       - `rating`, `review_count` (forge search ranking)

2. Changes
   - Table-wide UPDATE on `trainers` is revoked from `anon` and `authenticated`.
   - UPDATE is re-granted only on the trainer's own profile-content columns.
   - Onboarding self-activation moves to `trainer_activate_own_profile()`, which
     refuses to lift a 'rejected' or 'blocked' status.
   - Administrator moderation moves to three SECURITY DEFINER functions that
     authorize the caller through `auth.uid()`.

3. New functions
   - `trainer_activate_own_profile()` - the owning trainer only; pending/inactive -> active.
   - `admin_set_trainer_status(uuid, text)` - administrators only.
   - `admin_set_trainer_verified(uuid, boolean)` - administrators only.
   - `admin_set_trainer_featured(uuid, boolean)` - administrators only.

4. Notes
   - Editing rates, modalities, contact details, cover photo, public link and the
     auto-reply message all continue to work unchanged.
   - Subscription state is written only by the Stripe webhook (service role).
*/

REVOKE UPDATE ON public.trainers FROM authenticated;
REVOKE UPDATE ON public.trainers FROM anon;

GRANT UPDATE (
  cref, experience_years, hourly_rate, whatsapp, instagram,
  latitude, longitude, accepts_online, accepts_in_person, accepts_home, accepts_gym,
  neighborhood, location_type, target_audience, objectives, monthly_rate,
  cover_photo_url, in_person_hourly_rate, online_hourly_rate, home_hourly_rate,
  gym_hourly_rate, service_region, service_radius_km, profile_slug,
  auto_reply_message, updated_at
) ON public.trainers TO authenticated;

CREATE OR REPLACE FUNCTION public.trainer_activate_own_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.trainers WHERE id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Trainer profile not found';
  END IF;

  IF v_status IN ('rejected', 'blocked') THEN
    RAISE EXCEPTION 'This profile cannot be reactivated';
  END IF;

  UPDATE public.trainers
     SET status = 'active', updated_at = now()
   WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.trainer_activate_own_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trainer_activate_own_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.trainer_activate_own_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_trainer_status(p_trainer uuid, p_status text)
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

  IF p_status NOT IN ('pending', 'active', 'inactive', 'rejected', 'blocked') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.trainers
     SET status = p_status,
         approved_at = CASE WHEN p_status = 'active' THEN now() ELSE approved_at END,
         approved_by = CASE WHEN p_status = 'active' THEN auth.uid() ELSE approved_by END,
         updated_at = now()
   WHERE id = p_trainer;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_trainer_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_trainer_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_trainer_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_trainer_verified(p_trainer uuid, p_verified boolean)
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

  UPDATE public.trainers
     SET is_verified = COALESCE(p_verified, false), updated_at = now()
   WHERE id = p_trainer;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_trainer_verified(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_trainer_verified(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_trainer_verified(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_trainer_featured(p_trainer uuid, p_featured boolean)
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

  UPDATE public.trainers
     SET is_featured = COALESCE(p_featured, false), updated_at = now()
   WHERE id = p_trainer;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_trainer_featured(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_trainer_featured(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_trainer_featured(uuid, boolean) TO authenticated;
