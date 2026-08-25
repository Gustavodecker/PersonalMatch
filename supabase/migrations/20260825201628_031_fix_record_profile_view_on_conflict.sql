/*
# Fix record_profile_view ON CONFLICT clause

1. Problem
   - The function uses ON CONFLICT (trainer_id, viewer_key, view_day) but the unique index
     is partial: WHERE viewer_key IS NOT NULL AND view_day IS NOT NULL.
   - PostgreSQL cannot match an ON CONFLICT clause to a partial unique index unless
     the ON CONFLICT clause includes the same WHERE predicate, causing a 500 error.

2. Fix
   - Recreate the function with the correct ON CONFLICT ... WHERE clause that matches
     the partial unique index exactly.

3. Security
   - Function remains SECURITY DEFINER with restricted EXECUTE grant.
*/

CREATE OR REPLACE FUNCTION public.record_profile_view(p_trainer uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  ON CONFLICT (trainer_id, viewer_key, view_day)
  WHERE viewer_key IS NOT NULL AND view_day IS NOT NULL
  DO NOTHING;
END;
$$;
