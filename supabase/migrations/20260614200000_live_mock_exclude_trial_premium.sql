-- Live mocks are free for paying Premium members only - not free trials.
-- Mirrors src/lib/premiumStatus.ts -> hasPaidPremiumLiveMockAccess().

CREATE OR REPLACE FUNCTION public.has_live_mock_premium_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = p_user_id
      AND COALESCE(p.stripe_subscription_status, p.subscription_status) IS DISTINCT FROM 'trialing'
      AND (
        p.founder_track = 'founder'
        OR (
          COALESCE(p.stripe_subscription_status, p.subscription_status) = 'active'
          AND (
            p.tier = 'premium'
            OR COALESCE(p.is_premium, false) = true
            OR (p.plan IS NOT NULL AND p.plan <> 'free')
          )
        )
        OR (
          p.plan IS NOT NULL
          AND p.plan <> 'free'
          AND COALESCE(p.premium_until, p.current_period_end) IS NOT NULL
          AND COALESCE(p.premium_until, p.current_period_end) > now()
        )
        OR (
          COALESCE(p.is_premium, false) = true
          AND (
            COALESCE(p.premium_until, p.current_period_end) IS NULL
            OR COALESCE(p.premium_until, p.current_period_end) > now()
          )
        )
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.has_live_mock_premium_access(uuid) TO authenticated;

COMMENT ON FUNCTION public.has_live_mock_premium_access(uuid) IS
  'True for founders and paying Premium (active subscription). False for free trials - they must pay the one-off mock fee.';
