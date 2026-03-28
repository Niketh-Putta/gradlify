-- Add per-environment Stripe customer IDs for billing portal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id_test TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id_live TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id_test TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id_live TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_interval TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.profiles
  ALTER COLUMN cancel_at_period_end SET DEFAULT false,
  ALTER COLUMN plan SET DEFAULT 'free';

-- Best-effort backfill for production IDs
UPDATE public.profiles
SET stripe_customer_id_live = stripe_customer_id
WHERE stripe_customer_id IS NOT NULL
  AND stripe_customer_id_live IS NULL;
