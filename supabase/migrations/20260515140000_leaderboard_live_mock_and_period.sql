-- 1) Include submitted live-mock correct answers in correct_answers_all (Connect leaderboard source).
-- 2) Honour day/week/month in get_leaderboard_correct_global_for_track + get_leaderboard_correct_friends
--    (still never before the competition reset effective_start).
-- correct_count must stay bigint across branches so CREATE OR REPLACE VIEW succeeds (42P16 if types drift).

CREATE OR REPLACE VIEW public.correct_answers_all AS
SELECT
  pr.user_id,
  pr.correct::bigint AS correct_count,
  pr.created_at,
  'practice'::text AS source,
  pr.track
FROM public.practice_results pr
WHERE pr.correct > 0
UNION ALL
SELECT
  ma.user_id,
  COUNT(*)::bigint AS correct_count,
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
  er.correct::bigint AS correct_count,
  er.created_at,
  'challenge'::text AS source,
  er.track
FROM public.extreme_results er
WHERE er.correct > 0
UNION ALL
SELECT
  lma.user_id,
  COUNT(*)::bigint AS correct_count,
  lma.submitted_at AS created_at,
  'live_mock'::text AS source,
  CASE
    WHEN lower(trim(lp.track)) = '11plus' THEN '11plus'::public.user_track
    ELSE 'gcse'::public.user_track
  END AS track
FROM public.live_mock_attempts lma
JOIN public.live_mock_papers lp ON lp.id = lma.paper_id
JOIN public.live_mock_answers la ON la.attempt_id = lma.id
WHERE lma.status = 'submitted'
  AND lma.submitted_at IS NOT NULL
  AND la.is_correct IS TRUE
GROUP BY lma.user_id, lma.submitted_at, lp.track;

COMMENT ON VIEW public.correct_answers_all IS
  'Aggregates correct answers from practice, mocks, live mocks, and challenge attempts with source tags.';

GRANT SELECT ON public.correct_answers_all TO authenticated;

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
  period_start timestamptz;
  window_start timestamptz;
  v_user_id uuid;
  v_track public.user_track;
BEGIN
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
  effective_start timestamptz := '2026-04-29T17:30:00Z'::timestamptz;
  period_start timestamptz;
  window_start timestamptz;
  v_user_id uuid;
  v_user_track public.user_track;
BEGIN
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

-- Leaderboard UI listens on postgres_changes for source tables; enable realtime for live mocks.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_mock_attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_mock_attempts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_mock_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_mock_answers;
  END IF;
END $$;
