-- Real users always outrank seeded bot/test accounts regardless of score.
-- Bots are the seeded accounts with user_id like '00000000-0000-4000-8000-%'.
-- We add a bot flag as the FIRST sort key so every real user ranks above
-- every bot, then score DESC, then attempt_id for a stable tiebreak.

CREATE OR REPLACE FUNCTION public.get_my_live_mock_score_rank(p_paper_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH scored AS (
  SELECT
    a.id AS attempt_id,
    a.user_id,
    (a.user_id::text LIKE '00000000-0000-4000-8000-%') AS is_bot,
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
      ORDER BY is_bot ASC,
               score_percent DESC NULLS LAST,
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
$function$;

CREATE OR REPLACE FUNCTION public.get_my_live_mock_attempt_summary(p_paper_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  r jsonb;
  v_cohort_submitted int;
  v_cohort_mean numeric;
  v_rank int;
  v_rank_total int;
  v_has_rank boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::int
  INTO v_cohort_submitted
  FROM public.live_mock_attempts a
  WHERE a.paper_id = p_paper_id AND a.status = 'submitted';

  SELECT ROUND(AVG(sub.sc_pct)::numeric, 1)
  INTO v_cohort_mean
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
  WHERE sub.sc_pct IS NOT NULL
    AND sub.sc_pct > 0;

  SELECT EXISTS (
    SELECT 1 FROM public.live_mock_attempts a
    WHERE a.paper_id = p_paper_id AND a.user_id = v_uid AND a.status = 'submitted'
  )
  INTO v_has_rank;

  SELECT rnk.rk
  INTO v_rank
  FROM (
    SELECT
      s.user_id,
      RANK() OVER (
        ORDER BY s.is_bot ASC, s.score_percent DESC NULLS LAST, s.attempt_id ASC
      ) AS rk
    FROM (
      SELECT
        a.id AS attempt_id,
        a.user_id,
        (a.user_id::text LIKE '00000000-0000-4000-8000-%') AS is_bot,
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
    ) s
  ) rnk
  WHERE rnk.user_id = v_uid
  LIMIT 1;

  v_rank_total := COALESCE(v_cohort_submitted, 0);

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
      END,
    'cohort_submitted_count', v_cohort_submitted,
    'cohort_mean_score_percent', v_cohort_mean,
    'cohort_rank', v_rank,
    'cohort_rank_total', v_rank_total,
    'has_submitted_rank', v_has_rank
  )
  INTO r
  FROM public.live_mock_attempts a
  WHERE a.paper_id = p_paper_id
    AND a.user_id = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN r;
END;
$function$;
