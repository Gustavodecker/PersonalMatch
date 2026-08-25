/*
# Align the server-side trial window with the app's 15-day trial

1. Change
   - `trainers.trial_ends_at` now defaults to 15 days after signup, matching the trial
     length the signup flow previously sent from the browser.
*/

ALTER TABLE public.trainers ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '15 days');
