-- Enforce sprint-aware leaderboard scoring

-- Track sprint windows so SQL can detect when non-practice attempts should be used.
CREATE TABLE IF NOT EXISTS public.sprint_windows (
  id text PRIMARY KEY,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sprint_window_dates CHECK (start_at < end_at)
);

ALTER TABLE public.sprint_windows ALTER COLUMN updated_at SET DEFAULT now();

GRANT SELECT ON public.sprint_windows TO authenticated, anon;
INSERT INTO public.sprint_windows (id, start_at, end_at, is_active, description, updated_at)
VALUES
  ('founders-202601', '2026-01-07T00:00:00Z', '2026-01-16T23:59:59Z', true, 'Founders Sprint — Jan 2026', now()),
  ('founders-202602', '2026-02-01T00:00:00Z', '2026-02-10T23:59:59Z', false, 'Founders Sprint — Feb 2026', now())
ON CONFLICT (id) DO UPDATE
SET
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description,
  updated_at = now();

-- Helper to know if a sprint window is currently active.
CREATE OR REPLACE FUNCTION public.is_sprint_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sprint_windows
    WHERE is_active
      AND now() >= start_at
      AND now() <= end_at
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_sprint_active() TO authenticated, anon;

-- Extend the leaderboard view with a source tag and include challenge answers.
CREATE OR REPLACE VIEW public.correct_answers_all AS
SELECT
  user_id,
  correct AS correct_count,
  created_at,
  'practice'::text AS source
FROM practice_results
WHERE correct > 0
UNION ALL
SELECT
  ma.user_id,
  COUNT(*)::integer AS correct_count,
  ma.created_at,
  'mock'::text AS source
FROM mock_attempts ma
JOIN mock_questions mq ON mq.attempt_id = ma.id
WHERE ma.status = 'completed'
  AND mq.awarded_marks = mq.marks
GROUP BY ma.user_id, ma.created_at
UNION ALL
SELECT
  er.user_id,
  er.correct::integer AS correct_count,
  er.created_at,
  'challenge'::text AS source
FROM extreme_results er
WHERE er.correct > 0;

GRANT SELECT ON public.correct_answers_all TO authenticated;
COMMENT ON VIEW public.correct_answers_all IS 'Aggregates correct answers from practice, mocks, and challenge attempts with source tags.';

-- Only count mock + challenge answers while a sprint window is active.
CREATE OR REPLACE FUNCTION public.get_leaderboard_correct_global(p_period text)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  name text,
  avatar_url text,
  correct_count bigint,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date timestamptz;
  v_user_id uuid;
  sprint_active boolean;
BEGIN
  v_user_id := auth.uid();
  sprint_active := public.is_sprint_active();

  CASE lower(p_period)
    WHEN 'day' THEN start_date := date_trunc('day', now() AT TIME ZONE 'UTC');
    WHEN 'week' THEN start_date := date_trunc('week', now() AT TIME ZONE 'UTC');
    WHEN 'month' THEN start_date := date_trunc('month', now() AT TIME ZONE 'UTC');
    ELSE start_date := date_trunc('day', now() AT TIME ZONE 'UTC');
  END CASE;

  RETURN QUERY
  WITH correct_totals AS (
    SELECT
      ca.user_id,
      SUM(ca.correct_count) as total_correct
    FROM correct_answers_all ca
    WHERE ca.created_at >= start_date
      AND (
        NOT sprint_active
        OR ca.source IN ('mock', 'challenge')
      )
      AND EXISTS (
        SELECT 1 FROM user_settings us
        WHERE us.user_id = ca.user_id
          AND us.show_on_global_leaderboard = true
      )
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  ),
  ranked_correct AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY ct.total_correct DESC, ct.user_id) as rank,
      ct.user_id,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') as name,
      p.avatar_url,
      ct.total_correct,
      (ct.user_id = v_user_id) as is_self
    FROM correct_totals ct
    LEFT JOIN auth.users u ON u.id = ct.user_id
    LEFT JOIN profiles p ON p.user_id = ct.user_id
  )
  SELECT * FROM ranked_correct
  ORDER BY rank
  LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_correct_friends(p_period text)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  name text,
  avatar_url text,
  correct_count bigint,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date timestamptz;
  v_user_id uuid;
  sprint_active boolean;
BEGIN
  v_user_id := auth.uid();
  sprint_active := public.is_sprint_active();

  CASE lower(p_period)
    WHEN 'day' THEN start_date := date_trunc('day', now() AT TIME ZONE 'UTC');
    WHEN 'week' THEN start_date := date_trunc('week', now() AT TIME ZONE 'UTC');
    WHEN 'month' THEN start_date := date_trunc('month', now() AT TIME ZONE 'UTC');
    ELSE start_date := date_trunc('day', now() AT TIME ZONE 'UTC');
  END CASE;

  RETURN QUERY
  WITH correct_totals AS (
    SELECT
      ca.user_id,
      SUM(ca.correct_count) as total_correct
    FROM correct_answers_all ca
    WHERE ca.created_at >= start_date
      AND (
        NOT sprint_active
        OR ca.source IN ('mock', 'challenge')
      )
      AND (
        ca.user_id = v_user_id
        OR ca.user_id IN (
          SELECT requester FROM friendships
          WHERE receiver = v_user_id AND status = 'accepted'
          UNION
          SELECT receiver FROM friendships
          WHERE requester = v_user_id AND status = 'accepted'
        )
      )
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  ),
  ranked_correct AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY ct.total_correct DESC, ct.user_id) as rank,
      ct.user_id,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') as name,
      p.avatar_url,
      ct.total_correct,
      (ct.user_id = v_user_id) as is_self
    FROM correct_totals ct
    LEFT JOIN auth.users u ON u.id = ct.user_id
    LEFT JOIN profiles p ON p.user_id = ct.user_id
  )
  SELECT * FROM ranked_correct
  ORDER BY rank
  LIMIT 100;
END;
$$;
