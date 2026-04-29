-- Reset leaderboard scoring to only count activity after
-- Wednesday 29 April 2026 18:30 BST / 17:30 UTC.

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
  effective_start timestamptz;
  v_user_id uuid;
  v_user_track public.user_track;
BEGIN
  v_user_id := auth.uid();

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

  effective_start := GREATEST(start_date, '2026-04-29T17:30:00Z'::timestamptz);

  RETURN QUERY
  WITH correct_totals AS (
    SELECT
      ca.user_id,
      SUM(ca.correct_count)::bigint AS total_correct
    FROM public.correct_answers_all ca
    JOIN public.profiles p ON p.user_id = ca.user_id
    LEFT JOIN public.user_settings us ON us.user_id = ca.user_id
    WHERE ca.created_at >= effective_start
      AND COALESCE(p.track, 'gcse'::public.user_track) = v_user_track
      AND COALESCE(us.show_on_global_leaderboard, true)
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY ct.total_correct DESC,
               COALESCE(p.full_name, 'Anonymous'),
               ct.user_id
    ) AS rank,
    ct.user_id,
    COALESCE(p.full_name, 'Anonymous') AS name,
    p.avatar_url,
    ct.total_correct AS correct_count,
    (ct.user_id = v_user_id) AS is_self,
    p.founder_track
  FROM correct_totals ct
  JOIN public.profiles p ON p.user_id = ct.user_id
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
  effective_start timestamptz;
  v_user_id uuid;
  v_user_track public.user_track;
BEGIN
  v_user_id := auth.uid();

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

  effective_start := GREATEST(start_date, '2026-04-29T17:30:00Z'::timestamptz);

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
    WHERE ca.created_at >= effective_start
      AND COALESCE(p.track, 'gcse'::public.user_track) = v_user_track
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY ct.total_correct DESC,
               COALESCE(p.full_name, 'Anonymous'),
               ct.user_id
    ) AS rank,
    ct.user_id,
    COALESCE(p.full_name, 'Anonymous') AS name,
    p.avatar_url,
    ct.total_correct AS correct_count,
    (ct.user_id = v_user_id) AS is_self,
    p.founder_track
  FROM correct_totals ct
  JOIN public.profiles p ON p.user_id = ct.user_id
  ORDER BY rank;
END;
$$;
