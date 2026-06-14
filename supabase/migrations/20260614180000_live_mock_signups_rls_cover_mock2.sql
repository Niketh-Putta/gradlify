-- Extend the paid live-mock RLS gate to cover the second combined mock
-- (both_subjects_live_mock_2) so non-premium users cannot self-insert a FREE
-- signup row and bypass the £14.99 payment. Premium users
-- (has_live_mock_premium_access) may still insert directly; everyone else has
-- their row written by the Stripe webhook running with the service role, which
-- bypasses RLS. Mock 1 behaviour is unchanged.

DROP POLICY IF EXISTS "Users can create their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can create their own live mock signups"
  ON public.live_mock_exam_signups
  FOR INSERT
  TO public
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND (
      (mock_slug NOT IN ('both_subjects_live_mock', 'both_subjects_live_mock_2'))
      OR has_live_mock_premium_access((SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can update their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can update their own live mock signups"
  ON public.live_mock_exam_signups
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND (
      (mock_slug NOT IN ('both_subjects_live_mock', 'both_subjects_live_mock_2'))
      OR has_live_mock_premium_access((SELECT auth.uid()))
    )
  );
