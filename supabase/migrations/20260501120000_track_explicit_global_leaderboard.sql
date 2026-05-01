-- Make the global leaderboard deterministic across viewers.
-- The viewer only affects is_self; ordering is based on the requested track.

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
  start_date timestamptz;
  effective_start timestamptz;
  v_user_id uuid;
  v_track public.user_track;
BEGIN
  v_user_id := auth.uid();
  v_track := COALESCE(p_track, '11plus'::public.user_track);

  CASE lower(COALESCE(p_period, 'day'))
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
      AND COALESCE(p.track, 'gcse'::public.user_track) = v_track
      AND COALESCE(us.show_on_global_leaderboard, true)
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
