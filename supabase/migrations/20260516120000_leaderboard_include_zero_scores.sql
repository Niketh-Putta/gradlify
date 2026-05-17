-- Windowed leaderboard since sprint reset (14 May 2026 08:30 Europe/London).
-- Include learners with 0 correct in that window; do NOT list every profile on the track.
-- Keep in sync with SPRINT_START_AT in src/lib/foundersSprint.ts.

CREATE TABLE IF NOT EXISTS public.leaderboard_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  effective_start timestamptz NOT NULL
);

INSERT INTO public.leaderboard_config (id, effective_start)
VALUES (1, TIMESTAMPTZ '2026-05-14 08:30:00 Europe/London')
ON CONFLICT (id) DO UPDATE
SET effective_start = EXCLUDED.effective_start;

CREATE OR REPLACE FUNCTION public.get_leaderboard_correct_global_for_track(
  p_period text,
  p_track public.user_track
)
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
  effective_start timestamptz;
  period_start timestamptz;
  window_start timestamptz;
  v_user_id uuid;
  v_track public.user_track;
BEGIN
  SELECT lc.effective_start
  INTO effective_start
  FROM public.leaderboard_config lc
  WHERE lc.id = 1;

  effective_start := COALESCE(
    effective_start,
    TIMESTAMPTZ '2026-05-14 08:30:00 Europe/London'
  );

  v_user_id := auth.uid();
  v_track := COALESCE(p_track, '11plus'::public.user_track);

  CASE lower(coalesce(p_period, 'month'))
    WHEN 'day' THEN period_start := date_trunc('day', now() AT TIME ZONE 'UTC');
    WHEN 'week' THEN period_start := date_trunc('week', now() AT TIME ZONE 'UTC');
    WHEN 'month' THEN period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
    ELSE period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
  END CASE;

  window_start := GREATEST(effective_start, period_start);

  RETURN QUERY
  WITH eligible_users AS (
    SELECT p.user_id
    FROM public.profiles p
    LEFT JOIN public.user_settings us ON us.user_id = p.user_id
    WHERE COALESCE(p.track, 'gcse'::public.user_track) = v_track
      AND COALESCE(us.show_on_global_leaderboard, true)
  ),
  correct_totals AS (
    SELECT
      ca.user_id,
      SUM(ca.correct_count)::bigint AS total_correct
    FROM public.correct_answers_all ca
    JOIN public.profiles p ON p.user_id = ca.user_id
    JOIN eligible_users eu ON eu.user_id = ca.user_id
    WHERE ca.created_at >= window_start
      AND COALESCE(ca.track, COALESCE(p.track, 'gcse'::public.user_track)) = v_track
    GROUP BY ca.user_id
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(ct.total_correct, 0) DESC,
               COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous'),
               eu.user_id
    ) AS rank,
    eu.user_id,
    COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
    p.avatar_url,
    COALESCE(ct.total_correct, 0)::bigint AS correct_count,
    (eu.user_id = v_user_id) AS is_self,
    p.founder_track
  FROM eligible_users eu
  JOIN public.profiles p ON p.user_id = eu.user_id
  JOIN auth.users u ON u.id = eu.user_id
  LEFT JOIN correct_totals ct ON ct.user_id = eu.user_id
  ORDER BY rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_correct_global_for_track(text, public.user_track) TO authenticated;

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
  effective_start timestamptz;
  period_start timestamptz;
  window_start timestamptz;
  v_user_id uuid;
  v_user_track public.user_track;
BEGIN
  SELECT lc.effective_start
  INTO effective_start
  FROM public.leaderboard_config lc
  WHERE lc.id = 1;

  effective_start := COALESCE(
    effective_start,
    TIMESTAMPTZ '2026-05-14 08:30:00 Europe/London'
  );

  v_user_id := auth.uid();

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_user_track
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  v_user_track := COALESCE(v_user_track, 'gcse'::public.user_track);

  CASE lower(coalesce(p_period, 'month'))
    WHEN 'day' THEN period_start := date_trunc('day', now() AT TIME ZONE 'UTC');
    WHEN 'week' THEN period_start := date_trunc('week', now() AT TIME ZONE 'UTC');
    WHEN 'month' THEN period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
    ELSE period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
  END CASE;

  window_start := GREATEST(effective_start, period_start);

  RETURN QUERY
  WITH friend_ids AS (
    SELECT requester AS uid
    FROM public.friendships
    WHERE receiver = v_user_id AND status = 'accepted'
    UNION
    SELECT receiver AS uid
    FROM public.friendships
    WHERE requester = v_user_id AND status = 'accepted'
    UNION
    SELECT v_user_id AS uid
  ),
  correct_totals AS (
    SELECT
      ca.user_id,
      SUM(ca.correct_count)::bigint AS total_correct
    FROM public.correct_answers_all ca
    JOIN public.profiles p ON p.user_id = ca.user_id
    JOIN friend_ids f ON f.uid = ca.user_id
    WHERE ca.created_at >= window_start
      AND COALESCE(ca.track, COALESCE(p.track, 'gcse'::public.user_track)) = v_user_track
    GROUP BY ca.user_id
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(ct.total_correct, 0) DESC,
               COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous'),
               f.uid
    ) AS rank,
    f.uid AS user_id,
    COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
    p.avatar_url,
    COALESCE(ct.total_correct, 0)::bigint AS correct_count,
    (f.uid = v_user_id) AS is_self,
    p.founder_track
  FROM friend_ids f
  JOIN public.profiles p ON p.user_id = f.uid
  JOIN auth.users u ON u.id = f.uid
  LEFT JOIN correct_totals ct ON ct.user_id = f.uid
  ORDER BY rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_correct_friends(text) TO authenticated;
