-- Add founder track flag for Founders' Circle access.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founder_track text;

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_founder_track_check
    CHECK (founder_track IN ('competitor', 'founder'));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

COMMENT ON COLUMN public.profiles.founder_track IS 'Founders’ Circle access track: competitor or founder.';

CREATE INDEX IF NOT EXISTS idx_profiles_founder_track ON public.profiles(founder_track);

-- Exclude founder-track users from sprint leaderboards while sprint is active.
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
      SUM(ca.correct_count) AS total_correct
    FROM public.correct_answers_all ca
    LEFT JOIN public.profiles p ON p.user_id = ca.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = ca.user_id AND ur.role = 'admin'::public.app_role
    WHERE ca.created_at >= start_date
      AND (
        NOT sprint_active
        OR ca.source IN ('mock', 'challenge')
      )
      AND NOT (
        sprint_active
        AND p.founder_track IS NOT DISTINCT FROM 'founder'
        AND ur.user_id IS NULL
      )
      AND (
        NOT EXISTS (SELECT 1 FROM public.user_settings us WHERE us.user_id = ca.user_id)
        OR EXISTS (
          SELECT 1
          FROM public.user_settings us
          WHERE us.user_id = ca.user_id
            AND us.show_on_global_leaderboard = true
        )
      )
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  ),
  ranked_correct AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY ct.total_correct DESC, ct.user_id) AS rank,
      ct.user_id,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
      p.avatar_url,
      ct.total_correct,
      (ct.user_id = v_user_id) AS is_self
    FROM correct_totals ct
    LEFT JOIN auth.users u ON u.id = ct.user_id
    LEFT JOIN public.profiles p ON p.user_id = ct.user_id
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
      SUM(ca.correct_count) AS total_correct
    FROM public.correct_answers_all ca
    LEFT JOIN public.profiles p ON p.user_id = ca.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = ca.user_id AND ur.role = 'admin'::public.app_role
    WHERE ca.created_at >= start_date
      AND (
        NOT sprint_active
        OR ca.source IN ('mock', 'challenge')
      )
      AND NOT (
        sprint_active
        AND p.founder_track IS NOT DISTINCT FROM 'founder'
        AND ur.user_id IS NULL
      )
      AND (
        ca.user_id = v_user_id
        OR ca.user_id IN (
          SELECT requester FROM public.friendships
          WHERE receiver = v_user_id AND status = 'accepted'
          UNION
          SELECT receiver FROM public.friendships
          WHERE requester = v_user_id AND status = 'accepted'
        )
      )
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  ),
  ranked_correct AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY ct.total_correct DESC, ct.user_id) AS rank,
      ct.user_id,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
      p.avatar_url,
      ct.total_correct,
      (ct.user_id = v_user_id) AS is_self
    FROM correct_totals ct
    LEFT JOIN auth.users u ON u.id = ct.user_id
    LEFT JOIN public.profiles p ON p.user_id = ct.user_id
  )
  SELECT * FROM ranked_correct
  ORDER BY rank
  LIMIT 100;
END;
$$;

-- Exclude founder-track users from sprint eligibility stats used for prize checks.
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
    LEFT JOIN public.profiles p ON p.user_id = ma.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = ma.user_id AND ur.role = 'admin'::public.app_role
    WHERE ma.created_at >= p_start
      AND ma.created_at < p_end
      AND ma.mode IS DISTINCT FROM 'practice'
      AND ma.status IS DISTINCT FROM 'in_progress'
      AND NOT (p.founder_track IS NOT DISTINCT FROM 'founder' AND ur.user_id IS NULL)
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
