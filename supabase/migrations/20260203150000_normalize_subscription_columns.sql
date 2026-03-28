-- Normalize subscription columns (mode-specific IDs, status, premium flags)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id_test TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id_live TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id_test TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id_live TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.profiles
  ALTER COLUMN is_premium SET DEFAULT false,
  ALTER COLUMN plan SET DEFAULT 'free';

-- Remove legacy columns that duplicate mode-specific IDs
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS premium_status,
  DROP COLUMN IF EXISTS premium_current_period_end;
