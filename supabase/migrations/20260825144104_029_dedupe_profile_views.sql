/*
# Count one profile view per visitor per day instead of one per request

1. Problem
   - `pv_insert_safe` granted INSERT on `profile_views` to `public`, and its check only
     constrained who the viewer claimed to be. An unauthenticated script could loop the
     insert and inflate any trainer's view count and the administrator's site-visit
     figure without limit.

2. Changes
   - New columns `viewer_key` (a signed-in user's id, or the request's forwarded IP for a
     visitor who is not signed in) and `view_day`.
   - Unique index on (trainer_id, viewer_key, view_day), so repeated views by the same
     visitor on the same day collapse into a single row.
   - Direct INSERT is revoked from anon, authenticated and public; the client now calls
     `record_profile_view(uuid)`, which derives the viewer key server-side and swallows
     duplicates.

3. Notes
   - Anonymous visitors are still counted, exactly once per trainer per day.
   - Historical rows are untouched and keep counting as before.
*/

ALTER TABLE public.profile_views ADD COLUMN IF NOT EXISTS viewer_key text;
ALTER TABLE public.profile_views ADD COLUMN IF NOT EXISTS view_day date;

CREATE UNIQUE INDEX IF NOT EXISTS profile_views_unique_per_day
  ON public.profile_views (trainer_id, viewer_key, view_day)
  WHERE viewer_key IS NOT NULL AND view_day IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_profile_view(p_trainer uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_headers json;
BEGIN
  IF p_trainer IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.trainers WHERE id = p_trainer) THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    v_key := auth.uid()::text;
  ELSE
    BEGIN
      v_headers := current_setting('request.headers', true)::json;
    EXCEPTION WHEN others THEN
      v_headers := NULL;
    END;
    v_key := COALESCE(
      split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1),
      ''
    );
    IF btrim(v_key) = '' THEN
      v_key := 'anonymous';
    END IF;
    v_key := 'ip:' || btrim(v_key);
  END IF;

  INSERT INTO public.profile_views (trainer_id, viewer_id, viewer_key, view_day)
  VALUES (
    p_trainer,
    auth.uid(),
    v_key,
    (now() AT TIME ZONE 'UTC')::date
  )
  ON CONFLICT (trainer_id, viewer_key, view_day) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_profile_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "pv_insert_safe" ON public.profile_views;
REVOKE INSERT ON public.profile_views FROM anon;
REVOKE INSERT ON public.profile_views FROM authenticated;
REVOKE INSERT ON public.profile_views FROM PUBLIC;
