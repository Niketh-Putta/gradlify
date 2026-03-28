-- Create a normalized view for all question events (practice + mock)
CREATE OR REPLACE VIEW question_events_all AS
-- Practice questions (use attempts as question count)
SELECT 
  user_id,
  created_at,
  attempts as question_count
FROM practice_results
WHERE attempts > 0

UNION ALL

-- Mock exam questions (count individual questions)
SELECT 
  ma.user_id,
  ma.created_at,
  COUNT(mq.id)::int as question_count
FROM mock_attempts ma
LEFT JOIN mock_questions mq ON mq.attempt_id = ma.id
WHERE ma.status = 'completed'
GROUP BY ma.id, ma.user_id, ma.created_at;

-- Drop the old study-minutes based leaderboard function
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text);

-- Create new questions-based leaderboard function
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_period text, p_scope text)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  name text,
  avatar_url text,
  total_questions bigint,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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

  -- Return ranked data
  RETURN QUERY
  WITH question_totals AS (
    SELECT 
      qe.user_id,
      SUM(qe.question_count) as total_questions
    FROM question_events_all qe
    WHERE qe.created_at >= start_date
      AND (
        lower(p_scope) = 'global' 
        OR (lower(p_scope) = 'friends' AND (
          qe.user_id IN (
            SELECT requester FROM friendships 
            WHERE receiver = v_user_id AND status = 'accepted'
            UNION
            SELECT receiver FROM friendships 
            WHERE requester = v_user_id AND status = 'accepted'
          )
          OR qe.user_id = v_user_id
        ))
      )
    GROUP BY qe.user_id
    HAVING SUM(qe.question_count) > 0
  ),
  ranked_questions AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY qt.total_questions DESC, qt.user_id) as rank,
      qt.user_id,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') as name,
      p.avatar_url,
      qt.total_questions,
      (qt.user_id = v_user_id) as is_self
    FROM question_totals qt
    LEFT JOIN auth.users u ON u.id = qt.user_id
    LEFT JOIN profiles p ON p.user_id = qt.user_id
  )
  SELECT * FROM ranked_questions
  ORDER BY rank
  LIMIT 100;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text) TO authenticated, anon;