/*
# Extend free trial from 15 days to 30 days

1. Changes
   - `trainers.trial_ends_at` default changed from 15 days to 30 days after signup.
   - New trainers who register from now on will automatically get a 30-day free trial.
   - Existing trainers are NOT affected (their trial_ends_at is already set).

2. Important Notes
   - This only changes the DEFAULT for new rows. Trainers who already signed up keep their original trial period.
*/

ALTER TABLE public.trainers ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days');
