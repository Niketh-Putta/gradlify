-- Unfreeze the correct-answers leaderboard after the Mystery Spin results.
-- Keep the announced reset start time, but remove the competition close cap
-- so future correct answers can change the leaderboard again.

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
  effective_start timestamptz := '2026-04-29T17:30:00Z'::timestamptz;
  v_user_id uuid;
  v_track public.user_track;
BEGIN
  v_user_id := auth.uid();
  v_track := COALESCE(p_track, '11plus'::public.user_track);

  RETURN QUERY
  WITH correct_totals AS (
    SELECT
      ca.user_id,
      SUM(ca.correct_count)::bigint AS total_correct
    FROM public.correct_answers_all ca
    JOIN public.profiles p ON p.user_id = ca.user_id
    WHERE ca.created_at >= effective_start
      AND COALESCE(ca.track, COALESCE(p.track, 'gcse'::public.user_track)) = v_track
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY ct.total_correct DESC,
               COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous'),
               ct.user_id
    ) AS rank,
    ct.user_id,
    COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
    p.avatar_url,
    ct.total_correct AS correct_count,
    (ct.user_id = v_user_id) AS is_self,
    p.founder_track
  FROM correct_totals ct
  JOIN public.profiles p ON p.user_id = ct.user_id
  JOIN auth.users u ON u.id = ct.user_id
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
  effective_start timestamptz := '2026-04-29T17:30:00Z'::timestamptz;
  v_user_id uuid;
  v_user_track public.user_track;
BEGIN
  v_user_id := auth.uid();

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_user_track
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  v_user_track := COALESCE(v_user_track, 'gcse'::public.user_track);

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
      AND COALESCE(ca.track, COALESCE(p.track, 'gcse'::public.user_track)) = v_user_track
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY ct.total_correct DESC,
               COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous'),
               ct.user_id
    ) AS rank,
    ct.user_id,
    COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
    p.avatar_url,
    ct.total_correct AS correct_count,
    (ct.user_id = v_user_id) AS is_self,
    p.founder_track
  FROM correct_totals ct
  JOIN public.profiles p ON p.user_id = ct.user_id
  JOIN auth.users u ON u.id = ct.user_id
  ORDER BY rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_correct_friends(text) TO authenticated;
