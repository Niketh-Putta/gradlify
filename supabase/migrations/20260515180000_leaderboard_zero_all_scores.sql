-- Zero the Connect leaderboard: bump the scoring floor to now() and clear cached profile scores.
-- To reset again later:
--   UPDATE public.leaderboard_config SET effective_start = timezone('utc', now()) WHERE id = 1;
--   UPDATE public.profiles SET leaderboard_score = 0;

CREATE TABLE IF NOT EXISTS public.leaderboard_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  effective_start timestamptz NOT NULL
);

INSERT INTO public.leaderboard_config (id, effective_start)
VALUES (1, timezone('utc', now()))
ON CONFLICT (id) DO UPDATE
SET effective_start = EXCLUDED.effective_start;

UPDATE public.profiles
SET leaderboard_score = 0;

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

  effective_start := COALESCE(effective_start, timezone('utc', now()));

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
  WITH correct_totals AS (
    SELECT
      ca.user_id,
      SUM(ca.correct_count)::bigint AS total_correct
    FROM public.correct_answers_all ca
    JOIN public.profiles p ON p.user_id = ca.user_id
    WHERE ca.created_at >= window_start
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

  effective_start := COALESCE(effective_start, timezone('utc', now()));

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
