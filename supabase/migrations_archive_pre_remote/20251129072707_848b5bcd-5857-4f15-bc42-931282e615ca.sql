-- Fix get_leaderboard_correct_global to include users WITHOUT a user_settings row
-- (since default is now true, missing row = opted in)
CREATE OR REPLACE FUNCTION public.get_leaderboard_correct_global(p_period text)
 RETURNS TABLE(rank bigint, user_id uuid, name text, avatar_url text, correct_count bigint, is_self boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  start_date timestamptz;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Determine UTC date range
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
      SUM(ca.correct_count) as total_correct
    FROM correct_answers_all ca
    WHERE ca.created_at >= start_date
      -- Include users who either:
      -- 1. Have user_settings with show_on_global_leaderboard = true, OR
      -- 2. Don't have a user_settings row at all (default is now true)
      AND (
        NOT EXISTS (SELECT 1 FROM user_settings us WHERE us.user_id = ca.user_id)
        OR EXISTS (
          SELECT 1 FROM user_settings us 
          WHERE us.user_id = ca.user_id 
          AND us.show_on_global_leaderboard = true
        )
      )
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  ),
  ranked_correct AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY ct.total_correct DESC, ct.user_id) as rank,
      ct.user_id,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') as name,
      p.avatar_url,
      ct.total_correct,
      (ct.user_id = v_user_id) as is_self
    FROM correct_totals ct
    LEFT JOIN auth.users u ON u.id = ct.user_id
    LEFT JOIN profiles p ON p.user_id = ct.user_id
  )
  SELECT * FROM ranked_correct
  ORDER BY rank
  LIMIT 100;
END;
$function$;

-- Also fix get_my_global_opt_in to return true if no row exists (matching new default)
CREATE OR REPLACE FUNCTION public.get_my_global_opt_in()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT show_on_global_leaderboard 
     FROM user_settings 
     WHERE user_id = auth.uid()),
    true  -- Default to true if no row exists
  );
$function$;