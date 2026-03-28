-- Align profile subscription fields for Stripe-based premium access
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_interval TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN cancel_at_period_end SET DEFAULT false;

UPDATE public.profiles
SET plan = CASE
  WHEN plan IS NULL THEN 'free'
  WHEN plan = 'monthly' THEN 'premium_monthly'
  WHEN plan = 'annual' THEN 'premium_annual'
  WHEN plan = 'yearly' THEN 'premium_annual'
  ELSE plan
END;
