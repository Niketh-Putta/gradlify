-- Keep profile.tier aligned with premium/trial status to prevent drift.

CREATE OR REPLACE FUNCTION public.compute_is_premium(p public.profiles)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN
    COALESCE(p.is_premium, false)
    OR (p.premium_until IS NOT NULL AND p.premium_until > now())
    OR (
      p.plan IS NOT NULL
      AND p.plan <> 'free'
      AND p.current_period_end IS NOT NULL
      AND p.current_period_end > now()
    )
    OR p.stripe_subscription_status = 'trialing';
END;supabase functions deploy stripe-webhook
$$;

CREATE OR REPLACE FUNCTION public.sync_tier_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.compute_is_premium(NEW) THEN
    NEW.tier := 'premium';
  ELSE
    NEW.tier := 'free';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tier_from_subscription ON public.profiles;

CREATE TRIGGER trg_sync_tier_from_subscription
BEFORE INSERT OR UPDATE OF
  is_premium,
  premium_until,
  plan,
  current_period_end,
  stripe_subscription_status,
  tier
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_tier_from_subscription();

-- Optional one-time sync for existing rows.
UPDATE public.profiles p
SET tier = CASE WHEN public.compute_is_premium(p) THEN 'premium' ELSE 'free' END;
