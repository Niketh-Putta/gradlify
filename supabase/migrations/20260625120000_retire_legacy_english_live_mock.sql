-- Retire the May 2026 English-only live mock. Mock 1 and mock 2 remain the only
-- customer-facing live mocks. Existing signup rows are kept for records.

UPDATE public.live_mock_papers
SET status = 'closed',
    updated_at = now()
WHERE slug = 'live-11plus-english-mock-2026-05-09-1700';

-- Only paying Premium may self-insert mock 1/2 signups. Stripe webhook (service
-- role) writes paid rows. No other mock_slug values are accepted from clients.
DROP POLICY IF EXISTS "Users can create their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can create their own live mock signups"
  ON public.live_mock_exam_signups
  FOR INSERT
  TO public
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND mock_slug IN ('both_subjects_live_mock', 'both_subjects_live_mock_2')
    AND has_live_mock_premium_access((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can update their own live mock signups"
  ON public.live_mock_exam_signups
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND mock_slug IN ('both_subjects_live_mock', 'both_subjects_live_mock_2')
    AND has_live_mock_premium_access((SELECT auth.uid()))
  );
