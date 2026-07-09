-- MIGRATION 010: Security Audit Fixes (idempotent)

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_trainer_rating()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE trainers SET
    rating       = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE trainer_id = NEW.trainer_id AND status = 'approved'), 0),
    review_count = (SELECT COUNT(*) FROM reviews WHERE trainer_id = NEW.trainer_id AND status = 'approved')
  WHERE id = NEW.trainer_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_trainer_rating() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_trainer_rating() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_trainer_rating() FROM PUBLIC;

-- Fix profile_views INSERT policy
DROP POLICY IF EXISTS profile_views_insert ON public.profile_views;
DROP POLICY IF EXISTS pv_ins              ON public.profile_views;
DROP POLICY IF EXISTS pv_sel              ON public.profile_views;
DROP POLICY IF EXISTS pv_insert_safe      ON public.profile_views;

CREATE POLICY "pv_insert_safe" ON public.profile_views
  FOR INSERT WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());

-- Fix reviews policies
DROP POLICY IF EXISTS r_upd_admin              ON public.reviews;
DROP POLICY IF EXISTS reviews_upd_admin        ON public.reviews;
DROP POLICY IF EXISTS reviews_update_admin     ON public.reviews;
DROP POLICY IF EXISTS reviews_update_admin_safe ON public.reviews;
DROP POLICY IF EXISTS reviews_ins              ON public.reviews;
DROP POLICY IF EXISTS reviews_insert           ON public.reviews;
DROP POLICY IF EXISTS reviews_insert_safe      ON public.reviews;
DROP POLICY IF EXISTS reviews_sel_anon         ON public.reviews;
DROP POLICY IF EXISTS reviews_sel_auth         ON public.reviews;
DROP POLICY IF EXISTS reviews_select_anon      ON public.reviews;
DROP POLICY IF EXISTS reviews_select_auth      ON public.reviews;
DROP POLICY IF EXISTS reviews_select_anon_safe ON public.reviews;
DROP POLICY IF EXISTS reviews_select_auth_safe ON public.reviews;
DROP POLICY IF EXISTS r_sel_anon               ON public.reviews;
DROP POLICY IF EXISTS r_sel_auth               ON public.reviews;
DROP POLICY IF EXISTS r_ins                    ON public.reviews;

CREATE POLICY "reviews_update_admin_safe" ON public.reviews
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    AND status IN ('pending', 'approved', 'rejected')
  );

CREATE POLICY "reviews_select_anon_safe" ON public.reviews
  FOR SELECT TO anon USING (status = 'approved');

CREATE POLICY "reviews_select_auth_safe" ON public.reviews
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "reviews_insert_safe" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- Fix Storage bucket policy
DROP POLICY IF EXISTS "trainer_photos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "trainer_photos_read_objects" ON storage.objects;

CREATE POLICY "trainer_photos_read_objects" ON storage.objects
  FOR SELECT USING (bucket_id = 'trainer-photos' AND name <> '' AND octet_length(name) > 0);
