-- Add premium entitlement columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS premium_current_period_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS premium_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
