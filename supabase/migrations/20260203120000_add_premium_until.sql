-- Add premium expiry tracking for subscription sync
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ALTER COLUMN is_premium SET DEFAULT false;
