-- Sprint eligibility stats for prize verification
CREATE TABLE IF NOT EXISTS public.sprint_stats (
  sprint_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sprint_start_at timestamptz NOT NULL,
  sprint_end_at timestamptz NOT NULL,
  active_days integer NOT NULL DEFAULT 0,
  questions_attempted integer NOT NULL DEFAULT 0,
  questions_correct integer NOT NULL DEFAULT 0,
  accuracy_pct numeric(5,1) NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sprint_id, user_id)
);

ALTER TABLE public.sprint_stats ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.sprint_stats IS 'Aggregated sprint eligibility metrics for manual prize verification.';
COMMENT ON COLUMN public.sprint_stats.active_days IS 'Distinct days with at least 1 sprint-eligible question.';
COMMENT ON COLUMN public.sprint_stats.questions_attempted IS 'Total sprint-eligible questions attempted.';
COMMENT ON COLUMN public.sprint_stats.questions_correct IS 'Total sprint-eligible questions fully correct.';
COMMENT ON COLUMN public.sprint_stats.accuracy_pct IS 'Percent correct rounded to 1 decimal place.';

CREATE INDEX IF NOT EXISTS idx_sprint_stats_user ON public.sprint_stats(user_id);

-- Refresh sprint stats for a given window (mock + challenge, excluding practice).
CREATE OR REPLACE FUNCTION public.refresh_sprint_stats(
  p_sprint_id text,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_sprint_id IS NULL OR p_sprint_id = '' THEN
    RAISE EXCEPTION 'Sprint id is required';
  END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_start >= p_end THEN
    RAISE EXCEPTION 'Invalid sprint window';
  END IF;

  WITH question_rows AS (
    SELECT
      ma.user_id,
      (ma.created_at AT TIME ZONE 'UTC')::date AS activity_day,
      mq.marks,
      mq.awarded_marks
    FROM mock_attempts ma
    JOIN mock_questions mq ON mq.attempt_id = ma.id
    WHERE ma.created_at >= p_start
      AND ma.created_at < p_end
      AND ma.mode IS DISTINCT FROM 'practice'
      AND ma.status IS DISTINCT FROM 'in_progress'
  ),
  aggregates AS (
    SELECT
      user_id,
      COUNT(DISTINCT activity_day) AS active_days,
      COUNT(*) AS questions_attempted,
      SUM(
        CASE
          WHEN marks > 0 AND awarded_marks >= marks THEN 1
          ELSE 0
        END
      ) AS questions_correct
    FROM question_rows
    GROUP BY user_id
  )
  INSERT INTO public.sprint_stats (
    sprint_id,
    user_id,
    sprint_start_at,
    sprint_end_at,
    active_days,
    questions_attempted,
    questions_correct,
    accuracy_pct,
    computed_at
  )
  SELECT
    p_sprint_id,
    user_id,
    p_start,
    p_end,
    active_days,
    questions_attempted,
    questions_correct,
    CASE
      WHEN questions_attempted > 0
        THEN ROUND((questions_correct::numeric / questions_attempted::numeric) * 100, 1)
      ELSE 0
    END AS accuracy_pct,
    now()
  FROM aggregates
  ON CONFLICT (sprint_id, user_id) DO UPDATE
  SET sprint_start_at = EXCLUDED.sprint_start_at,
      sprint_end_at = EXCLUDED.sprint_end_at,
      active_days = EXCLUDED.active_days,
      questions_attempted = EXCLUDED.questions_attempted,
      questions_correct = EXCLUDED.questions_correct,
      accuracy_pct = EXCLUDED.accuracy_pct,
      computed_at = EXCLUDED.computed_at;
END;
$$;
