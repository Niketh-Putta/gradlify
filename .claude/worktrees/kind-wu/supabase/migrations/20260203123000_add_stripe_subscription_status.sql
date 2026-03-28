ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
