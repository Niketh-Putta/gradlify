-- Track-aware leaderboard + sprint scoring + strict settings RPC.

CREATE OR REPLACE VIEW public.correct_answers_all AS
SELECT
  pr.user_id,
  pr.correct AS correct_count,
  pr.created_at,
  'practice'::text AS source,
  pr.track
FROM public.practice_results pr
WHERE pr.correct > 0
UNION ALL
SELECT
  ma.user_id,
  COUNT(*)::integer AS correct_count,
  ma.created_at,
  'mock'::text AS source,
  ma.track
FROM public.mock_attempts ma
JOIN public.mock_questions mq ON mq.attempt_id = ma.id
WHERE ma.status IN ('completed', 'submitted', 'scored')
  AND mq.awarded_marks = mq.marks
GROUP BY ma.user_id, ma.created_at, ma.track
UNION ALL
SELECT
  er.user_id,
  er.correct::integer AS correct_count,
  er.created_at,
  'challenge'::text AS source,
  er.track
FROM public.extreme_results er
WHERE er.correct > 0;

GRANT SELECT ON public.correct_answers_all TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard_correct_global(p_period text)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  name text,
  avatar_url text,
  correct_count bigint,
  is_self boolean,
  founder_track text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date timestamptz;
  v_user_id uuid;
  v_user_track public.user_track;
  sprint_active boolean;
BEGIN
  v_user_id := auth.uid();
  sprint_active := public.is_sprint_active();

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_user_track
  FROM public.profiles p
  WHERE p.user_id = v_user_id;
  v_user_track := COALESCE(v_user_track, 'gcse'::public.user_track);

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
    WHERE ca.created_at >= start_date
      AND ca.track = v_user_track
      AND (
        NOT sprint_active
        OR ca.source IN ('mock', 'challenge')
      )
    GROUP BY ca.user_id
  ),
  ranked_users AS (
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(ct.total_correct, 0) DESC,
                 COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous'),
                 u.id
      ) AS rank,
      u.id AS user_id,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
      p.avatar_url,
      COALESCE(ct.total_correct, 0)::bigint AS correct_count,
      (u.id = v_user_id) AS is_self,
      p.founder_track
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN correct_totals ct ON ct.user_id = u.id
    WHERE COALESCE(p.track, 'gcse'::public.user_track) = v_user_track
      AND NOT (
        v_user_track = '11plus'::public.user_track
        AND lower(u.email) = 'kputtab@gmail.com'
      )
  )
  SELECT * FROM ranked_users
  ORDER BY rank;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_correct_friends(p_period text)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  name text,
  avatar_url text,
  correct_count bigint,
  is_self boolean,
  founder_track text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date timestamptz;
  v_user_id uuid;
  v_user_track public.user_track;
  sprint_active boolean;
BEGIN
  v_user_id := auth.uid();
  sprint_active := public.is_sprint_active();

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_user_track
  FROM public.profiles p
  WHERE p.user_id = v_user_id;
  v_user_track := COALESCE(v_user_track, 'gcse'::public.user_track);

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
    WHERE ca.created_at >= start_date
      AND ca.track = v_user_track
      AND (
        NOT sprint_active
        OR ca.source IN ('mock', 'challenge')
      )
    GROUP BY ca.user_id
  ),
  friend_ids AS (
    SELECT requester AS user_id
    FROM public.friendships
    WHERE receiver = v_user_id AND status = 'accepted'
    UNION
    SELECT receiver AS user_id
    FROM public.friendships
    WHERE requester = v_user_id AND status = 'accepted'
    UNION
    SELECT v_user_id AS user_id
  ),
  ranked_users AS (
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(ct.total_correct, 0) DESC,
                 COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous'),
                 u.id
      ) AS rank,
      u.id AS user_id,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
      p.avatar_url,
      COALESCE(ct.total_correct, 0)::bigint AS correct_count,
      (u.id = v_user_id) AS is_self,
      p.founder_track
    FROM friend_ids f
    JOIN auth.users u ON u.id = f.user_id
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN correct_totals ct ON ct.user_id = u.id
    WHERE COALESCE(p.track, 'gcse'::public.user_track) = v_user_track
      AND NOT (
        v_user_track = '11plus'::public.user_track
        AND lower(u.email) = 'kputtab@gmail.com'
      )
  )
  SELECT * FROM ranked_users
  ORDER BY rank;
END;
$$;

-- Sprint scoring now includes only mock + challenge rows and is always track-aware.
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
  ON CONFLICT (sprint_id, user_id) DO UPDATE
  SET track = EXCLUDED.track,
      sprint_start_at = EXCLUDED.sprint_start_at,
      sprint_end_at = EXCLUDED.sprint_end_at,
      active_days = EXCLUDED.active_days,
      questions_attempted = EXCLUDED.questions_attempted,
      questions_correct = EXCLUDED.questions_correct,
      accuracy_pct = EXCLUDED.accuracy_pct,
      computed_at = EXCLUDED.computed_at;
END;
$$;

-- Strict server-side settings update endpoint support.
CREATE OR REPLACE FUNCTION public.update_user_track(
  p_user_id uuid,
  p_track public.user_track
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_profile public.profiles%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_uid <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: can only update your own track';
  END IF;

  UPDATE public.profiles
  SET track = p_track,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;

  IF v_profile.user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_track(uuid, public.user_track) TO authenticated;
