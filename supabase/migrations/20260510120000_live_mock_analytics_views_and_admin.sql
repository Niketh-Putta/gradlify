-- Live mock analytics: admin cohort access, reporting views, and summary RPCs.
-- Ensures post-exam analytics can query aggregates and per-item stats reliably.

-- ---------------------------------------------------------------------------
-- 1) RLS: admins can read all attempts and answers (cohort / item analysis).
--    Existing policies still let users read only their own rows.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can view all live mock attempts" ON public.live_mock_attempts;
CREATE POLICY "Admins can view all live mock attempts"
ON public.live_mock_attempts
FOR SELECT
TO authenticated
USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can view all live mock answers" ON public.live_mock_answers;
CREATE POLICY "Admins can view all live mock answers"
ON public.live_mock_answers
FOR SELECT
TO authenticated
USING (public.is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS live_mock_attempts_paper_status_idx
  ON public.live_mock_attempts (paper_id, status)
  WHERE status = 'submitted';

CREATE INDEX IF NOT EXISTS live_mock_answers_paper_question_id_idx
  ON public.live_mock_answers (paper_id, question_id);

-- ---------------------------------------------------------------------------
-- 2) View: per-attempt score rollups (correct / wrong / blank) for dashboards.
--    RLS applies to underlying tables (own rows + admin sees all).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.live_mock_attempt_scores AS
SELECT
  a.id AS attempt_id,
  a.paper_id,
  p.slug AS paper_slug,
  p.title AS paper_title,
  a.user_id,
  a.user_email,
  a.status,
  a.submitted_at,
  a.duration_seconds,
  a.question_count,
  a.answered_count,
  COUNT(ans.id) AS answer_rows,
  COUNT(ans.id) FILTER (WHERE ans.is_correct IS TRUE) AS correct_count,
  COUNT(ans.id) FILTER (WHERE ans.is_correct IS FALSE) AS wrong_count,
  COUNT(ans.id) FILTER (
    WHERE ans.selected_option IS NULL
      AND (ans.is_correct IS DISTINCT FROM TRUE)
  ) AS unanswered_count
FROM public.live_mock_attempts a
JOIN public.live_mock_papers p ON p.id = a.paper_id
LEFT JOIN public.live_mock_answers ans ON ans.attempt_id = a.id
GROUP BY
  a.id,
  a.paper_id,
  p.slug,
  p.title,
  a.user_id,
  a.user_email,
  a.status,
  a.submitted_at,
  a.duration_seconds,
  a.question_count,
  a.answered_count;

COMMENT ON VIEW public.live_mock_attempt_scores IS
  'Per-attempt score rollup from live_mock_answers; use for user dashboards and admin exports.';

GRANT SELECT ON public.live_mock_attempt_scores TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) RPC: current user''s summary for one paper (student analytics page).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_live_mock_attempt_summary(p_paper_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'attempt_id', a.id,
    'paper_id', a.paper_id,
    'status', a.status,
    'submitted_at', a.submitted_at,
    'duration_seconds', a.duration_seconds,
    'question_count', a.question_count,
    'answered_count', a.answered_count,
    'correct_count',
      (SELECT COUNT(*)::int FROM public.live_mock_answers x
       WHERE x.attempt_id = a.id AND x.is_correct IS TRUE),
    'wrong_count',
      (SELECT COUNT(*)::int FROM public.live_mock_answers x
       WHERE x.attempt_id = a.id AND x.is_correct IS FALSE),
    'unanswered_count',
      (SELECT COUNT(*)::int FROM public.live_mock_answers x
       WHERE x.attempt_id = a.id AND x.selected_option IS NULL),
    'score_percent',
      CASE WHEN COALESCE(a.question_count, 0) <= 0 THEN NULL
      ELSE ROUND(
        100.0 * (
          SELECT COUNT(*)::numeric FROM public.live_mock_answers x
          WHERE x.attempt_id = a.id AND x.is_correct IS TRUE
        ) / NULLIF(a.question_count, 0),
        1
      )
      END
  )
  INTO r
  FROM public.live_mock_attempts a
  WHERE a.paper_id = p_paper_id
    AND a.user_id = v_uid
  LIMIT 1;

  RETURN r;
END;
$$;

COMMENT ON FUNCTION public.get_my_live_mock_attempt_summary(uuid) IS
  'Returns JSON summary for the caller''s live mock attempt on the given paper (RLS-safe via user id match).';

GRANT EXECUTE ON FUNCTION public.get_my_live_mock_attempt_summary(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC: admin cohort + item analysis for a paper.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_live_mock_paper_analytics(p_paper_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN jsonb_build_object(
    'paper_id', p_paper_id,
    'submitted_attempts',
      (SELECT COUNT(*)::int FROM public.live_mock_attempts a
       WHERE a.paper_id = p_paper_id AND a.status = 'submitted'),
    'item_analysis',
      COALESCE(
        (
          SELECT jsonb_agg(row_json ORDER BY qn NULLS LAST)
          FROM (
            SELECT
              MIN(ans.question_number) AS qn,
              jsonb_build_object(
                'question_id', q.id,
                'question_number', MIN(ans.question_number),
                'section_key', MIN(ans.section_key),
                'question_type', MIN(ans.question_type),
                'n_responses', COUNT(*) FILTER (WHERE ans.selected_option IS NOT NULL),
                'n_correct', COUNT(*) FILTER (WHERE ans.is_correct IS TRUE),
                'n_wrong', COUNT(*) FILTER (WHERE ans.is_correct IS FALSE),
                'n_blank', COUNT(*) FILTER (WHERE ans.selected_option IS NULL),
                'pct_correct',
                  ROUND(
                    100.0 * COUNT(*) FILTER (WHERE ans.is_correct IS TRUE)
                    / NULLIF(COUNT(*) FILTER (WHERE ans.selected_option IS NOT NULL), 0),
                    1
                  )
              ) AS row_json
            FROM public.live_mock_answers ans
            JOIN public.live_mock_questions q ON q.id = ans.question_id
            WHERE ans.paper_id = p_paper_id
            GROUP BY q.id
          ) items
        ),
        '[]'::jsonb
      )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_live_mock_paper_analytics(uuid) IS
  'Admin-only: cohort counts and per-question difficulty stats for a live mock paper.';

GRANT EXECUTE ON FUNCTION public.admin_live_mock_paper_analytics(uuid) TO authenticated;
