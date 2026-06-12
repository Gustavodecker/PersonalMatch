-- ─── Subscriptions & Stripe columns ──────────────────────────────────────────

-- Add Stripe customer ID to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add subscription fields to trainers
ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free','pro','premium')),
  ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_limit       INTEGER NOT NULL DEFAULT 3;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id             UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT        UNIQUE,
  stripe_customer_id     TEXT,
  plan                   TEXT        NOT NULL DEFAULT 'free'
                                     CHECK (plan IN ('free','pro','premium')),
  status                 TEXT        NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active','canceled','past_due','trialing','incomplete','incomplete_expired')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN     NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subs_trainer ON subscriptions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe  ON subscriptions(stripe_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_sel_own" ON subscriptions FOR SELECT
  TO authenticated USING (trainer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "sub_ins_own" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "sub_upd_own" ON subscriptions FOR UPDATE
  TO authenticated
  USING  (trainer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (trainer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS tg_upd_subscriptions ON subscriptions;
CREATE TRIGGER tg_upd_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
