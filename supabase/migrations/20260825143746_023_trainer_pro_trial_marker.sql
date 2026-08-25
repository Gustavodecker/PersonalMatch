/*
# Track whether the promotional Pro trial has already been used

1. Problem
   - The `start_trial` action of the checkout function granted the Pro plan, featured
     placement and a raised photo limit with no record of having done so, so it could
     be replayed indefinitely.

2. Changes
   - New nullable column `trainers.pro_trial_started_at`, set by the server the first
     time the Pro trial is granted.
   - The column is NOT included in the client UPDATE grant, so only the server-side
     checkout function (service role) can set it.

3. Notes
   - This is separate from `trial_started_at`, which records the ordinary signup trial.
*/

ALTER TABLE public.trainers ADD COLUMN IF NOT EXISTS pro_trial_started_at timestamptz;
