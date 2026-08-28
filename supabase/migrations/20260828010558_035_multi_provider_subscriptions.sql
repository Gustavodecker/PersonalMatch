/*
# Multi-provider subscription support

1. Modified Tables
   - `subscriptions`
     - Add `provider` column (text, default 'stripe') to distinguish Stripe / Apple / Google
     - Add `provider_subscription_id` column (text, nullable) for RevenueCat/Apple/Google IDs
     - Relax CHECK on `status` to include 'expired' value
     - Add unique constraint on (trainer_id, provider) to prevent duplicates per provider

2. New Functions
   - `get_effective_plan(p_user_id uuid)` — returns the highest-priority active plan
     considering all providers. Priority: premium > pro > free.
     Returns JSON: { plan, active, provider, expires_at }

3. Security
   - Function is SECURITY DEFINER to read subscriptions table regardless of RLS
   - Only authenticated users can execute it
   - Existing RLS policies on subscriptions remain unchanged

4. Notes
   - Existing rows get provider='stripe' by default (no data loss)
   - stripe_subscription_id column kept for backwards compatibility
   - provider_subscription_id is the generic equivalent for apple/google
*/

-- Add provider column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN provider text NOT NULL DEFAULT 'stripe';
  END IF;
END $$;

-- Add provider_subscription_id column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'provider_subscription_id'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN provider_subscription_id text;
  END IF;
END $$;

-- Add CHECK constraint on provider
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_provider_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_provider_check
      CHECK (provider IN ('stripe', 'apple', 'google'));
  END IF;
END $$;

-- Drop old status check and recreate with 'expired' included
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'expired'));

-- Add unique constraint per trainer per provider (prevents duplicate subs per platform)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_trainer_provider_unique'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_trainer_provider_unique UNIQUE (trainer_id, provider);
  END IF;
END $$;

-- Create index on provider_subscription_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subs_provider_sub_id ON public.subscriptions (provider_subscription_id);

-- Create the get_effective_plan function
CREATE OR REPLACE FUNCTION public.get_effective_plan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
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

  IF result IS NULL THEN
    result := jsonb_build_object(
      'plan', 'free',
      'active', false,
      'provider', null,
      'expires_at', null
    );
  END IF;

  RETURN result;
END;
$$;

-- Restrict execution to authenticated only
REVOKE ALL ON FUNCTION public.get_effective_plan(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_effective_plan(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_effective_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_plan(uuid) TO service_role;
