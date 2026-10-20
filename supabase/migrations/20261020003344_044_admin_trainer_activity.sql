/*
# Admin: trainer activity overview

1. New function
   - `public.admin_trainer_activity()` returns one row per trainer with:
     - identity: id, full_name, email, signup date, whether the email was confirmed, blocked flag
     - access: `last_seen_at` = latest of last sign-in and last session refresh (refreshes happen
       roughly hourly while the trainer has the app open), `active_sessions`
     - account: trainer status, subscription plan and status, trial end
     - profile completeness: avatar, bio, CREF, WhatsApp, price, availability (0-6 checks)
     - engagement: profile views (7d / 30d / total), leads (30d / total),
       appointments (30d / total), last profile update

2. Security
   - SECURITY DEFINER because it reads `auth.users` / `auth.sessions`.
   - Raises an error unless `public.is_admin()` is true (admin and not blocked).
   - EXECUTE revoked from PUBLIC and anon; granted only to authenticated
     (the admin check inside the function still applies).
   - search_path pinned to empty; every object is schema-qualified.
*/

CREATE OR REPLACE FUNCTION public.admin_trainer_activity()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  email_confirmed boolean,
  is_blocked boolean,
  last_seen_at timestamptz,
  active_sessions integer,
  status text,
  subscription_plan text,
  subscription_status text,
  trial_ends_at timestamptz,
  has_avatar boolean,
  has_bio boolean,
  has_cref boolean,
  has_whatsapp boolean,
  has_price boolean,
  has_availability boolean,
  views_7d integer,
  views_30d integer,
  views_total integer,
  leads_30d integer,
  leads_total integer,
  appointments_30d integer,
  appointments_total integer,
  profile_updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    p.full_name,
    p.email,
    p.created_at,
    (u.email_confirmed_at IS NOT NULL),
    COALESCE(p.is_blocked, false),
    GREATEST(u.last_sign_in_at, s.last_refresh),
    COALESCE(s.active_count, 0)::integer,
    t.status,
    t.subscription_plan,
    t.subscription_status,
    t.trial_ends_at,
    (NULLIF(trim(p.avatar_url), '') IS NOT NULL),
    (NULLIF(trim(p.bio), '') IS NOT NULL),
    (NULLIF(trim(t.cref), '') IS NOT NULL),
    (NULLIF(trim(t.whatsapp), '') IS NOT NULL),
    (COALESCE(t.hourly_rate, t.in_person_hourly_rate, t.online_hourly_rate, t.home_hourly_rate, t.gym_hourly_rate, t.monthly_rate) IS NOT NULL),
    EXISTS (SELECT 1 FROM public.trainer_availability a WHERE a.trainer_id = t.id),
    COALESCE(v.v7, 0)::integer,
    COALESCE(v.v30, 0)::integer,
    COALESCE(v.vt, 0)::integer,
    COALESCE(l.l30, 0)::integer,
    COALESCE(l.lt, 0)::integer,
    COALESCE(ap.a30, 0)::integer,
    COALESCE(ap.at, 0)::integer,
    t.updated_at
  FROM public.trainers t
  JOIN public.profiles p ON p.id = t.id
  LEFT JOIN auth.users u ON u.id = t.id
  LEFT JOIN LATERAL (
    SELECT max(GREATEST(se.refreshed_at, se.updated_at)) AS last_refresh,
           count(*) FILTER (WHERE se.not_after IS NULL OR se.not_after > now()) AS active_count
    FROM auth.sessions se WHERE se.user_id = t.id
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE pv.viewed_at > now() - interval '7 days') AS v7,
           count(*) FILTER (WHERE pv.viewed_at > now() - interval '30 days') AS v30,
           count(*) AS vt
    FROM public.profile_views pv WHERE pv.trainer_id = t.id
  ) v ON true
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE le.created_at > now() - interval '30 days') AS l30,
           count(*) AS lt
    FROM public.leads le WHERE le.trainer_id = t.id
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE a.created_at > now() - interval '30 days') AS a30,
           count(*) AS at
    FROM public.appointments a WHERE a.trainer_id = t.id
  ) ap ON true
  ORDER BY GREATEST(u.last_sign_in_at, s.last_refresh) DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_trainer_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_trainer_activity() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_trainer_activity() TO authenticated;
