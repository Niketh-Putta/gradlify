-- Keep sprint stats + sprint top10 leaderboard strictly separated by track.

-- 1) sprint_stats uniqueness must include track so GCSE and 11+ rows cannot overwrite each other.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'sprint_stats'
      AND tc.constraint_type = 'PRIMARY KEY'
      AND tc.constraint_name = 'sprint_stats_pkey'
  ) THEN
    ALTER TABLE public.sprint_stats DROP CONSTRAINT sprint_stats_pkey;
  END IF;
END $$;

ALTER TABLE public.sprint_stats
  ADD CONSTRAINT sprint_stats_pkey PRIMARY KEY (sprint_id, user_id, track);

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

  WITH mock_rows AS (
    SELECT
      ma.user_id,
      ma.track,
      (ma.created_at AT TIME ZONE 'UTC')::date AS activity_day,
      COUNT(*)::integer AS attempted,
      SUM(CASE WHEN mq.marks > 0 AND mq.awarded_marks >= mq.marks THEN 1 ELSE 0 END)::integer AS correct
    FROM public.mock_attempts ma
    JOIN public.mock_questions mq ON mq.attempt_id = ma.id
    LEFT JOIN public.profiles p ON p.user_id = ma.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = ma.user_id AND ur.role = 'admin'::public.app_role
    WHERE ma.created_at >= p_start
      AND ma.created_at < p_end
      AND ma.mode IS DISTINCT FROM 'practice'
      AND ma.status IS DISTINCT FROM 'in_progress'
      AND NOT (p.founder_track IS NOT DISTINCT FROM 'founder' AND ur.user_id IS NULL)
    GROUP BY ma.user_id, ma.track, (ma.created_at AT TIME ZONE 'UTC')::date
  ),
  challenge_rows AS (
    SELECT
      er.user_id,
      er.track,
      (er.created_at AT TIME ZONE 'UTC')::date AS activity_day,
      COALESCE(er.attempts, 1)::integer AS attempted,
      COALESCE(er.correct, 0)::integer AS correct
    FROM public.extreme_results er
    LEFT JOIN public.profiles p ON p.user_id = er.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = er.user_id AND ur.role = 'admin'::public.app_role
    WHERE er.created_at >= p_start
      AND er.created_at < p_end
      AND NOT (p.founder_track IS NOT DISTINCT FROM 'founder' AND ur.user_id IS NULL)
  ),
  question_rows AS (
    SELECT * FROM mock_rows
    UNION ALL
    SELECT * FROM challenge_rows
  ),
  aggregates AS (
    SELECT
      user_id,
      track,
      COUNT(DISTINCT activity_day) AS active_days,
      SUM(attempted)::integer AS questions_attempted,
      SUM(correct)::integer AS questions_correct
    FROM question_rows
    GROUP BY user_id, track
  )
  INSERT INTO public.sprint_stats (
    sprint_id,
    user_id,
    track,
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
    track,
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
  ON CONFLICT (sprint_id, user_id, track) DO UPDATE
  SET sprint_start_at = EXCLUDED.sprint_start_at,
      sprint_end_at = EXCLUDED.sprint_end_at,
      active_days = EXCLUDED.active_days,
      questions_attempted = EXCLUDED.questions_attempted,
      questions_correct = EXCLUDED.questions_correct,
      accuracy_pct = EXCLUDED.accuracy_pct,
      computed_at = EXCLUDED.computed_at;
END;
$$;

-- 2) sprint_top10 must be track-specific (per sprint + per track).
ALTER TABLE public.sprint_top10
  ADD COLUMN IF NOT EXISTS track public.user_track;

UPDATE public.sprint_top10 st
SET track = COALESCE(p.track, 'gcse'::public.user_track)
FROM public.profiles p
WHERE st.user_id = p.user_id
  AND st.track IS NULL;

UPDATE public.sprint_top10
SET track = 'gcse'::public.user_track
WHERE track IS NULL;

ALTER TABLE public.sprint_top10
  ALTER COLUMN track SET DEFAULT 'gcse'::public.user_track,
  ALTER COLUMN track SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'sprint_top10'
      AND tc.constraint_type = 'PRIMARY KEY'
      AND tc.constraint_name = 'sprint_top10_pkey'
  ) THEN
    ALTER TABLE public.sprint_top10 DROP CONSTRAINT sprint_top10_pkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'sprint_top10'
      AND tc.constraint_type = 'UNIQUE'
      AND tc.constraint_name = 'sprint_top10_sprint_id_user_id_key'
  ) THEN
    ALTER TABLE public.sprint_top10 DROP CONSTRAINT sprint_top10_sprint_id_user_id_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'sprint_top10'
      AND tc.constraint_name = 'sprint_top10_pkey'
  ) THEN
    ALTER TABLE public.sprint_top10
      ADD CONSTRAINT sprint_top10_pkey PRIMARY KEY (sprint_id, track, rank);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'sprint_top10'
      AND tc.constraint_name = 'sprint_top10_sprint_id_track_user_id_key'
  ) THEN
    ALTER TABLE public.sprint_top10
      ADD CONSTRAINT sprint_top10_sprint_id_track_user_id_key UNIQUE (sprint_id, track, user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sprint_top10_sprint_track
  ON public.sprint_top10 (sprint_id, track);

CREATE OR REPLACE FUNCTION public.capture_sprint_top10(
  p_sprint_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  SELECT start_at, end_at
  INTO v_start, v_end
  FROM public.sprint_windows
  WHERE id = p_sprint_id;

  IF v_start IS NULL OR v_end IS NULL THEN
    RAISE EXCEPTION 'Sprint % not found', p_sprint_id;
  END IF;

  UPDATE public.sprint_windows
  SET is_active = false,
      locked_at = now(),
      updated_at = now()
  WHERE id = p_sprint_id;

  UPDATE public.sprint_windows
  SET is_active = false,
      updated_at = now()
  WHERE id <> p_sprint_id
    AND is_active = true;

  DELETE FROM public.sprint_top10
  WHERE sprint_id = p_sprint_id;

  WITH track_list AS (
    SELECT unnest(ARRAY['gcse'::public.user_track, '11plus'::public.user_track]) AS track
  ),
  correct_totals AS (
    SELECT
      tl.track,
      ca.user_id,
      SUM(ca.correct_count) AS total_correct
    FROM track_list tl
    JOIN public.correct_answers_all ca ON true
    LEFT JOIN public.profiles p ON p.user_id = ca.user_id
    LEFT JOIN public.user_roles ur
      ON ur.user_id = ca.user_id AND ur.role = 'admin'::public.app_role
    WHERE ca.created_at >= v_start
      AND ca.created_at <= v_end
      AND ca.source IN ('mock', 'challenge')
      -- TRACK FILTER — Ensures separation between GCSE and 11+
      AND ca.track = tl.track
      AND NOT (
        p.founder_track IS NOT DISTINCT FROM 'founder'
        AND ur.user_id IS NULL
      )
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.user_settings us WHERE us.user_id = ca.user_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.user_settings us
          WHERE us.user_id = ca.user_id
            AND us.show_on_global_leaderboard = true
        )
      )
    GROUP BY tl.track, ca.user_id
    HAVING SUM(ca.correct_count) > 0
  ),
  ranked AS (
    SELECT
      ct.track,
      ROW_NUMBER() OVER (PARTITION BY ct.track ORDER BY ct.total_correct DESC, ct.user_id) AS rank,
      ct.user_id,
      ct.total_correct,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
      p.avatar_url
    FROM correct_totals ct
    LEFT JOIN auth.users u ON u.id = ct.user_id
    LEFT JOIN public.profiles p ON p.user_id = ct.user_id
  )
  INSERT INTO public.sprint_top10 (
    sprint_id,
    track,
    rank,
    user_id,
    correct_count,
    name,
    avatar_url,
    captured_at
  )
  SELECT
    p_sprint_id,
    track,
    rank,
    user_id,
    total_correct,
    name,
    avatar_url,
    now()
  FROM ranked
  WHERE rank <= 10
  ORDER BY track, rank;

  PERFORM public.refresh_sprint_stats(p_sprint_id, v_start, v_end);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sprint_top10(
  p_sprint_id text
)
RETURNS TABLE(
  rank integer,
  user_id uuid,
  name text,
  avatar_url text,
  correct_count bigint,
  captured_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_user_track AS (
    SELECT COALESCE(p.track, 'gcse'::public.user_track) AS track
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
  SELECT
    st.rank,
    st.user_id,
    st.name,
    st.avatar_url,
    st.correct_count,
    st.captured_at
  FROM public.sprint_top10 st
  WHERE st.sprint_id = p_sprint_id
    AND st.track = COALESCE((SELECT track FROM current_user_track), 'gcse'::public.user_track)
  ORDER BY st.rank;
$$;

GRANT EXECUTE ON FUNCTION public.capture_sprint_top10(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sprint_top10(text) TO authenticated, anon;
