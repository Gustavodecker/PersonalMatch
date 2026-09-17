/*
# Fix subscription_status for trainers with paid plans

## Problem
Trainers who purchased a paid plan (pro/premium) still had subscription_status
set to 'trialing', causing the app to show the "trial expired" block screen
even though they have an active paid subscription.

## Changes
- Updates subscription_status to 'active' for any trainer whose subscription_plan
  is 'pro' or 'premium' but whose subscription_status is not already 'active'.
- This is a data-fix migration for existing records.

## Important Notes
1. Only affects trainers with paid plans whose status was incorrectly left as 'trialing'.
2. The sync-subscription edge function will also be updated to set this field correctly going forward.
*/

UPDATE public.trainers
SET subscription_status = 'active',
    updated_at = now()
WHERE subscription_plan IN ('pro', 'premium')
  AND (subscription_status IS NULL OR subscription_status != 'active');
