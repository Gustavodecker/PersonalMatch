/*
  # Block self-assigned admin role at signup

  1. Security
    - handle_new_user(): role from signup metadata is now restricted to 'student' or 'trainer';
      anything else (e.g. 'admin') becomes 'student'.
    - is_admin(): blocked accounts no longer count as admins.
    - profiles INSERT: anon loses all insert rights; authenticated may only insert
      id, full_name, email, role (role still limited to student/trainer by policy p_ins).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_role      text;
v_full_name text;
BEGIN
v_role := NEW.raw_user_meta_data->>'role';
IF v_role IS NULL OR v_role NOT IN ('student', 'trainer') THEN
v_role := 'student';
END IF;

v_full_name := COALESCE(
NEW.raw_user_meta_data->>'full_name',
NEW.raw_user_meta_data->>'name',
split_part(NEW.email, '@', 1)
);

INSERT INTO public.profiles (id, full_name, email, role)
VALUES (NEW.id, v_full_name, NEW.email, v_role)
ON CONFLICT (id) DO NOTHING;

IF v_role = 'trainer' THEN
INSERT INTO public.trainers (
id, status,
subscription_plan, subscription_status,
trial_started_at, trial_ends_at
)
VALUES (
NEW.id, 'active',
'free_trial', 'trialing',
NOW(), NOW() + INTERVAL '15 days'
)
ON CONFLICT (id) DO NOTHING;
ELSE
INSERT INTO public.students (id)
VALUES (NEW.id)
ON CONFLICT (id) DO NOTHING;
END IF;

RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
SELECT 1 FROM public.profiles
WHERE id = auth.uid() AND role = 'admin' AND is_blocked = false
);
$function$;

REVOKE INSERT ON public.profiles FROM anon;
REVOKE INSERT ON public.profiles FROM authenticated;
GRANT INSERT (id, full_name, email, role) ON public.profiles TO authenticated;
