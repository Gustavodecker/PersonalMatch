
-- Trigger function: auto-creates profile + role record when a new auth user is created.
-- Runs as SECURITY DEFINER (superuser) so it always bypasses RLS, even before email confirmation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role      text;
  v_full_name text;
BEGIN
  v_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create profile row (ignore if already exists due to race/retry)
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, v_full_name, NEW.email, v_role)
  ON CONFLICT (id) DO NOTHING;

  -- Create role-specific row
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
