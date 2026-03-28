-- Create view for correct answers from practice and mocks
CREATE OR REPLACE VIEW public.correct_answers_all AS
SELECT 
  user_id,
  correct as correct_count,
  created_at
FROM practice_results
WHERE correct > 0
UNION ALL
SELECT 
  ma.user_id,
  COUNT(*)::integer as correct_count,
  ma.created_at
FROM mock_attempts ma
JOIN mock_questions mq ON mq.attempt_id = ma.id
WHERE mq.awarded_marks = mq.marks
GROUP BY ma.user_id, ma.created_at;

-- Grant access to the view
GRANT SELECT ON public.correct_answers_all TO authenticated;

-- Function to get global leaderboard (correct answers only)
CREATE OR REPLACE FUNCTION public.get_leaderboard_correct_global(p_period text)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  name text,
  avatar_url text,
  correct_count bigint,
  is_self boolean
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
      AND EXISTS (
        SELECT 1 FROM user_settings us 
        WHERE us.user_id = ca.user_id 
        AND us.show_on_global_leaderboard = true
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
$$;

-- Function to get friends leaderboard (correct answers only)
CREATE OR REPLACE FUNCTION public.get_leaderboard_correct_friends(p_period text)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  name text,
  avatar_url text,
  correct_count bigint,
  is_self boolean
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
      AND (
        ca.user_id = v_user_id
        OR ca.user_id IN (
          SELECT requester FROM friendships 
          WHERE receiver = v_user_id AND status = 'accepted'
          UNION
          SELECT receiver FROM friendships 
          WHERE requester = v_user_id AND status = 'accepted'
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
$$;;
