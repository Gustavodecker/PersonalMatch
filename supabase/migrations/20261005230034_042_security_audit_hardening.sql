/*
# Security audit hardening

1. Admin checks
- All admin-only functions and policies now use is_admin(), which also rejects blocked accounts.
  Previously a blocked admin could still use admin powers.

2. Appointments
- Clients may only create appointments with status 'requested' for an active trainer.
- After creation, only the status can be changed (no swapping student/trainer/date).
- Students may only cancel; trainers may confirm, reject, cancel or complete.

3. Leads
- Clients may only create leads with status 'pending'.
- Trainers may only change the status of a lead (no swapping student/trainer).

4. Stripe mirror tables
- Remove unused client write privileges (writes happen only server-side).

5. Site visits
- Remove client UPDATE privilege; visits are only inserted.

6. get_effective_plan
- Fixed search_path; callers may only query their own plan unless admin.
*/

-- 1. Admin checks
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_role NOT IN ('student', 'trainer', 'admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'Cannot change your own role'; END IF;
  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(p_user uuid, p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'Cannot block yourself'; END IF;
  UPDATE public.profiles SET is_blocked = COALESCE(p_blocked, false), updated_at = now() WHERE id = p_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_trainer_status(p_trainer uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('pending', 'active', 'inactive', 'rejected', 'blocked') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.trainers
  SET status = p_status,
      approved_at = CASE WHEN p_status = 'active' THEN now() ELSE approved_at END,
      approved_by = CASE WHEN p_status = 'active' THEN auth.uid() ELSE approved_by END,
      updated_at = now()
  WHERE id = p_trainer;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_trainer_verified(p_trainer uuid, p_verified boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.trainers SET is_verified = COALESCE(p_verified, false), updated_at = now() WHERE id = p_trainer;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_trainer_featured(p_trainer uuid, p_featured boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.trainers SET is_featured = COALESCE(p_featured, false), updated_at = now() WHERE id = p_trainer;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'Cannot delete your own account here'; END IF;
  DELETE FROM public.profiles WHERE id = p_user;
END;
$$;

DROP POLICY IF EXISTS "admin_all_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_insert_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_update_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_delete_settings" ON public.app_settings;
CREATE POLICY "admin_insert_settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_settings" ON public.app_settings FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "admin_select_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "admin_insert_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "admin_update_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "admin_delete_vouchers" ON public.vouchers;
CREATE POLICY "admin_select_vouchers" ON public.vouchers FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin_insert_vouchers" ON public.vouchers FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_vouchers" ON public.vouchers FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_vouchers" ON public.vouchers FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_redemptions" ON public.voucher_redemptions;
DROP POLICY IF EXISTS "admin_select_redemptions" ON public.voucher_redemptions;
DROP POLICY IF EXISTS "admin_delete_redemptions" ON public.voucher_redemptions;
CREATE POLICY "admin_select_redemptions" ON public.voucher_redemptions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin_delete_redemptions" ON public.voucher_redemptions FOR DELETE TO authenticated USING (public.is_admin());
REVOKE INSERT, UPDATE ON public.voucher_redemptions FROM anon, authenticated;

DROP POLICY IF EXISTS "reviews_update_admin_safe" ON public.reviews;
CREATE POLICY "reviews_update_admin_safe" ON public.reviews FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin() AND status IN ('pending', 'approved', 'rejected'));

DROP POLICY IF EXISTS "t_upd" ON public.trainers;
DROP POLICY IF EXISTS "trainers_upd_own_admin" ON public.trainers;
DROP POLICY IF EXISTS "trainers_update_own" ON public.trainers;
CREATE POLICY "trainers_update_own" ON public.trainers FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 2. Appointments
REVOKE INSERT, UPDATE ON public.appointments FROM anon, authenticated;
GRANT INSERT (student_id, trainer_id, appointment_date, start_time, end_time, modality, status,
  student_name, student_phone, student_goal, objective, message, class_type_id, class_type_name, availability_id)
  ON public.appointments TO anon, authenticated;
GRANT UPDATE (status, updated_at) ON public.appointments TO authenticated;

DROP POLICY IF EXISTS "appt_ins" ON public.appointments;
CREATE POLICY "appt_ins" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    (student_id = auth.uid() OR student_id IS NULL)
    AND status = 'requested'
    AND trainer_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.trainers t WHERE t.id = trainer_id AND t.status = 'active')
  );

DROP POLICY IF EXISTS "appt_ins_anon" ON public.appointments;
CREATE POLICY "appt_ins_anon" ON public.appointments FOR INSERT TO anon
  WITH CHECK (
    student_id IS NULL
    AND status = 'requested'
    AND EXISTS (SELECT 1 FROM public.trainers t WHERE t.id = trainer_id AND t.status = 'active')
  );

CREATE OR REPLACE FUNCTION public.enforce_appointment_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  IF auth.uid() = OLD.trainer_id AND NEW.status IN ('confirmed', 'rejected', 'cancelled', 'completed') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = OLD.student_id AND NEW.status = 'cancelled' AND OLD.status IN ('requested', 'confirmed') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Status change not allowed';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_appointment_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_appointment_status ON public.appointments;
CREATE TRIGGER trg_enforce_appointment_status BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_status_change();

-- 3. Leads
REVOKE INSERT, UPDATE ON public.leads FROM anon, authenticated;
GRANT INSERT (student_id, trainer_id, message, status, type) ON public.leads TO authenticated;
GRANT UPDATE (status, updated_at) ON public.leads TO authenticated;

DROP POLICY IF EXISTS "l_ins" ON public.leads;
DROP POLICY IF EXISTS "leads_ins" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND trainer_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.trainers t WHERE t.id = trainer_id AND t.status = 'active')
  );

-- 4. Stripe mirror tables
REVOKE INSERT, UPDATE, DELETE ON public.stripe_customers, public.stripe_orders, public.stripe_subscriptions FROM anon, authenticated;

-- 5. Site visits
REVOKE UPDATE ON public.site_visits FROM anon, authenticated;

-- 6. get_effective_plan
CREATE OR REPLACE FUNCTION public.get_effective_plan(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
  trainer_plan text;
BEGIN
  IF auth.uid() IS NULL OR (p_user_id <> auth.uid() AND NOT public.is_admin()) THEN
    RETURN jsonb_build_object('plan', 'free', 'active', false, 'provider', null, 'expires_at', null);
  END IF;

  SELECT jsonb_build_object('plan', s.plan, 'active', true, 'provider', s.provider, 'expires_at', s.current_period_end)
  INTO result
  FROM public.subscriptions s
  WHERE s.trainer_id = p_user_id AND s.status IN ('active', 'trialing')
  ORDER BY CASE s.plan WHEN 'premium' THEN 3 WHEN 'pro' THEN 2 ELSE 1 END DESC
  LIMIT 1;

  IF result IS NOT NULL THEN RETURN result; END IF;

  SELECT t.subscription_plan INTO trainer_plan FROM public.trainers t WHERE t.id = p_user_id;

  IF trainer_plan IN ('pro', 'premium') THEN
    RETURN jsonb_build_object('plan', trainer_plan, 'active', true, 'provider', null, 'expires_at', null);
  END IF;

  RETURN jsonb_build_object('plan', 'free', 'active', false, 'provider', null, 'expires_at', null);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_effective_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_plan(uuid) TO authenticated;