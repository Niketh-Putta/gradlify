-- Ensure leaderboard scoring reflects off-sprint behavior (count all sources).
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
BEGIN
  v_user_id := auth.uid();

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
BEGIN
  v_user_id := auth.uid();

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
  )
  SELECT * FROM ranked_users
  ORDER BY rank;
END;
$$;
