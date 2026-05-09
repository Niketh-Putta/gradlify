-- Aggregate cohort stats for live mock analytics UI (no per-user PII).

CREATE OR REPLACE FUNCTION public.get_live_mock_public_cohort_summary(p_paper_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'submitted_count',
      (SELECT COUNT(*)::int FROM public.live_mock_attempts a
       WHERE a.paper_id = p_paper_id AND a.status = 'submitted'),
    'mean_score_percent',
      (SELECT ROUND(AVG(sub.sc_pct)::numeric, 1)
       FROM (
         SELECT
           CASE WHEN COALESCE(a.question_count, 0) > 0 THEN
             100.0 * (
               SELECT COUNT(*)::numeric FROM public.live_mock_answers x
               WHERE x.attempt_id = a.id AND x.is_correct IS TRUE
             ) / NULLIF(a.question_count, 0)
           END AS sc_pct
         FROM public.live_mock_attempts a
         WHERE a.paper_id = p_paper_id AND a.status = 'submitted'
       ) sub
       WHERE sub.sc_pct IS NOT NULL)
  );
$$;

COMMENT ON FUNCTION public.get_live_mock_public_cohort_summary(uuid) IS
  'Paper-level aggregates only (submission count and mean score %); safe for any authenticated client.';

GRANT EXECUTE ON FUNCTION public.get_live_mock_public_cohort_summary(uuid) TO anon, authenticated;
