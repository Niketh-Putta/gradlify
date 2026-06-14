-- Allow Premium trial subscribers to register for both-subjects live mock without payment.

DROP POLICY IF EXISTS "Users can create their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can create their own live mock signups"
ON public.live_mock_exam_signups
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = user_id
  AND (
    mock_slug <> 'both_subjects_live_mock'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = (select auth.uid())
        AND COALESCE(p.is_premium, false) = true
        AND COALESCE(p.stripe_subscription_status, p.subscription_status) IN ('active', 'trialing')
        AND (
          COALESCE(p.premium_until, p.current_period_end) IS NULL
          OR COALESCE(p.premium_until, p.current_period_end) > now()
        )
    )
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
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = (select auth.uid())
        AND COALESCE(p.is_premium, false) = true
        AND COALESCE(p.stripe_subscription_status, p.subscription_status) IN ('active', 'trialing')
        AND (
          COALESCE(p.premium_until, p.current_period_end) IS NULL
          OR COALESCE(p.premium_until, p.current_period_end) > now()
        )
    )
  )
);
