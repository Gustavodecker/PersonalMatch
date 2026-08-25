/*
# Restrict which trainer columns a new account can set on insert

1. Problem
   - Signup inserted the trainer row from the client with `status`, `subscription_plan`,
     `subscription_status` and the trial window supplied by the browser. A crafted
     request could therefore create a trainer row that is already active, already
     featured, already verified or already on the premium plan.

2. Changes
   - Table-wide INSERT on `trainers` is revoked from `anon` and `authenticated`.
   - INSERT is re-granted only on `id` plus the profile-content columns.
   - `trial_started_at` and `trial_ends_at` now carry database defaults, so the 7-day
     trial is granted by the server rather than by the client.

3. Notes
   - Status falls back to its 'pending' default at signup and becomes 'active' when the
     trainer finishes onboarding, through `trainer_activate_own_profile()`.
   - Plan, photo limit, featured and verified all fall back to their safe defaults.
*/

ALTER TABLE public.trainers ALTER COLUMN trial_started_at SET DEFAULT now();
ALTER TABLE public.trainers ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');

REVOKE INSERT ON public.trainers FROM authenticated;
REVOKE INSERT ON public.trainers FROM anon;

GRANT INSERT (
  id, cref, experience_years, hourly_rate, whatsapp, instagram,
  latitude, longitude, accepts_online, accepts_in_person, accepts_home, accepts_gym,
  neighborhood, location_type, target_audience, objectives, monthly_rate,
  cover_photo_url, in_person_hourly_rate, online_hourly_rate, home_hourly_rate,
  gym_hourly_rate, service_region, service_radius_km, profile_slug,
  auto_reply_message
) ON public.trainers TO authenticated;
