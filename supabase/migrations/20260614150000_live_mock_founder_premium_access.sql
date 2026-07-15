-- Align both-subjects live mock registration RLS with the app's premium definition.
-- Previously the policy only admitted users with is_premium=true AND an active/trialing
-- Stripe status. That rejected founders (founder_track='founder'), premium-tier users,
-- and paid-plan users whose is_premium flag was not set - even though the UI (getPremiumStatus)
-- treats all of them as premium. This caused "new row violates row-level security policy".
--
-- This helper mirrors src/lib/premiumStatus.ts -> isPremium so the DB and UI agree.

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
        -- Founder access (founder_track = 'founder')
        p.founder_track = 'founder'
        -- Premium tier
        OR p.tier = 'premium'
        -- Active or trialing subscription (Stripe or legacy column)
        OR COALESCE(p.stripe_subscription_status, p.subscription_status) IN ('active', 'trialing')
        -- Paid plan with a still-active billing period
        OR (
          p.plan IS NOT NULL AND p.plan <> 'free'
          AND COALESCE(p.premium_until, p.current_period_end) IS NOT NULL
          AND COALESCE(p.premium_until, p.current_period_end) > now()
        )
        -- Explicit premium flag, not expired
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

DROP POLICY IF EXISTS "Users can create their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can create their own live mock signups"
ON public.live_mock_exam_signups
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = user_id
  AND (
    mock_slug <> 'both_subjects_live_mock'
    OR public.has_live_mock_premium_access((select auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can update their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can update their own live mock signups"
ON public.live_mock_exam_signups
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK (
  (select auth.uid()) = user_id
  AND (
    mock_slug <> 'both_subjects_live_mock'
    OR public.has_live_mock_premium_access((select auth.uid()))
  )
);
