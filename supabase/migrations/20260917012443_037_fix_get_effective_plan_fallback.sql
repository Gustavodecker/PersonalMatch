/*
# Fix get_effective_plan to use trainers.subscription_plan as fallback

## Problem
The get_effective_plan function only reads from the subscriptions table.
When a subscription is recorded via RevenueCat webhook or the trainers table
is updated directly (e.g. during purchase), but no row exists in subscriptions,
the function returns 'free' even though the trainer has an active paid plan.

## Changes
- Replaces get_effective_plan to first check the subscriptions table (active/trialing rows).
- If no active subscription row is found, falls back to trainers.subscription_plan.
- Only returns 'free' if both sources indicate no paid plan.

## Important Notes
1. This is a backward-compatible change — existing subscriptions rows are still checked first.
2. The trainers.subscription_plan column serves as the source of truth when
   subscriptions rows haven't been created yet (e.g. RevenueCat webhook not configured).
*/

CREATE OR REPLACE FUNCTION public.get_effective_plan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  trainer_plan text;
BEGIN
  -- First try: active subscription row
  SELECT jsonb_build_object(
    'plan', s.plan,
    'active', true,
    'provider', s.provider,
    'expires_at', s.current_period_end
  )
  INTO result
  FROM public.subscriptions s
  WHERE s.trainer_id = p_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY
    CASE s.plan
      WHEN 'premium' THEN 3
      WHEN 'pro' THEN 2
      ELSE 1
    END DESC
  LIMIT 1;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  -- Fallback: check trainers.subscription_plan
  SELECT t.subscription_plan
  INTO trainer_plan
  FROM public.trainers t
  WHERE t.id = p_user_id;

  IF trainer_plan IS NOT NULL AND trainer_plan IN ('pro', 'premium') THEN
    RETURN jsonb_build_object(
      'plan', trainer_plan,
      'active', true,
      'provider', null,
      'expires_at', null
    );
  END IF;

  -- No active plan
  RETURN jsonb_build_object(
    'plan', 'free',
    'active', false,
    'provider', null,
    'expires_at', null
  );
END;
$$;
