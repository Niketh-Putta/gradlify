-- Leaderboard placement among submitted attempts for the live mock paper (updates as submissions arrive).

CREATE OR REPLACE FUNCTION public.get_my_live_mock_score_rank(p_paper_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH scored AS (
  SELECT
    a.id AS attempt_id,
    a.user_id,
    CASE
      WHEN COALESCE(a.question_count, 0) <= 0 THEN NULL
      ELSE ROUND(
        100.0 * (
          SELECT COUNT(*)::numeric
          FROM public.live_mock_answers x
          WHERE x.attempt_id = a.id AND x.is_correct IS TRUE
        ) / NULLIF(a.question_count, 0),
        1
      )
    END AS score_percent
  FROM public.live_mock_attempts a
  WHERE a.paper_id = p_paper_id
    AND a.status = 'submitted'
),
ranked AS (
  SELECT
    attempt_id,
    user_id,
    score_percent,
    RANK() OVER (
      ORDER BY score_percent DESC NULLS LAST,
               attempt_id ASC
    ) AS rk
  FROM scored
),
tot AS (
  SELECT COUNT(*)::int AS c FROM scored
),
uid AS (
  SELECT auth.uid() AS id
)
SELECT
  CASE
    WHEN (SELECT id FROM uid) IS NULL THEN NULL::jsonb
    ELSE jsonb_build_object(
      'rank',
        (SELECT r.rk FROM ranked r WHERE r.user_id = (SELECT id FROM uid) LIMIT 1),
      'total',
        COALESCE((SELECT tot.c FROM tot), 0),
      'has_submitted_rank',
        EXISTS (
          SELECT 1
          FROM public.live_mock_attempts a
          WHERE a.paper_id = p_paper_id
            AND a.user_id = (SELECT id FROM uid)
            AND a.status = 'submitted'
        )
    )
  END;
$$;

COMMENT ON FUNCTION public.get_my_live_mock_score_rank(uuid) IS
  'Caller''s placement by score % among submitted attempts (rank 1 = highest). Total = submitted count.';

GRANT EXECUTE ON FUNCTION public.get_my_live_mock_score_rank(uuid) TO authenticated;
