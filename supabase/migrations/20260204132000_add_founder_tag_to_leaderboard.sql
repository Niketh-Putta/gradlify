-- Include founder track in leaderboard results for UI badges.
DROP FUNCTION IF EXISTS public.get_leaderboard_correct_global(text);
DROP FUNCTION IF EXISTS public.get_leaderboard_correct_friends(text);

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
      (ct.user_id = v_user_id) AS is_self,
      p.founder_track
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
      (ct.user_id = v_user_id) AS is_self,
      p.founder_track
    FROM correct_totals ct
    LEFT JOIN auth.users u ON u.id = ct.user_id
    LEFT JOIN public.profiles p ON p.user_id = ct.user_id
  )
  SELECT * FROM ranked_correct
  ORDER BY rank
  LIMIT 100;
END;
$$;
