/*
# Payments ledger

1. New Tables
- `payments`: one row per money-in event (new purchase or renewal)
  - `id` (uuid, pk)
  - `trainer_id` (uuid, references profiles, nullable on delete)
  - `provider` (text: stripe | apple | google)
  - `plan` (text: pro | premium)
  - `amount_cents` (integer, amount actually charged)
  - `currency` (text, e.g. BRL)
  - `kind` (text: new | renewal)
  - `external_id` (text, unique per provider; prevents duplicate recording of the same charge)
  - `paid_at` (timestamptz)
  - `created_at` (timestamptz)

2. Security
- RLS enabled. Only admins can read. No client writes: rows are inserted only by
  the payment webhooks running with server privileges.
*/

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('stripe', 'apple', 'google')),
  plan text NOT NULL CHECK (plan IN ('pro', 'premium')),
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  kind text NOT NULL DEFAULT 'new' CHECK (kind IN ('new', 'renewal')),
  external_id text NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON public.payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS payments_trainer_idx ON public.payments (trainer_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;

DROP POLICY IF EXISTS "admin_select_payments" ON public.payments;
CREATE POLICY "admin_select_payments" ON public.payments FOR SELECT
  TO authenticated USING (public.is_admin());