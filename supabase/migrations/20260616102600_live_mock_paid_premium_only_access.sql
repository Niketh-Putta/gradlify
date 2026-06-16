-- Enforce paid-only free access for combined live mock signups.
-- Trialing users (3-day free trial) must pay and therefore cannot self-insert
-- FREE signup rows for protected combined mock slugs.
--
-- This function is referenced by live_mock_exam_signups RLS policies.
-- We keep the function name stable and tighten its logic:
--   - ALLOW: active paid premium subscriptions
--   - DENY: trialing/free/cancelled/incomplete accounts

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
      AND (
        (
          COALESCE(p.stripe_subscription_status, p.subscription_status) = 'active'
          AND (
            COALESCE(p.premium_until, p.current_period_end) IS NULL
            OR COALESCE(p.premium_until, p.current_period_end) > now()
          )
          AND (
            p.plan IS NOT NULL
            AND p.plan <> 'free'
            OR p.tier = 'premium'
            OR COALESCE(p.is_premium, false) = true
          )
        )
        OR (
          COALESCE(p.stripe_subscription_status, p.subscription_status) IS NULL
          AND COALESCE(p.premium_until, p.current_period_end) IS NOT NULL
          AND COALESCE(p.premium_until, p.current_period_end) > now()
          AND (
            p.plan IS NOT NULL
            AND p.plan <> 'free'
            OR p.tier = 'premium'
            OR COALESCE(p.is_premium, false) = true
          )
        )
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.has_live_mock_premium_access(uuid) TO authenticated;
