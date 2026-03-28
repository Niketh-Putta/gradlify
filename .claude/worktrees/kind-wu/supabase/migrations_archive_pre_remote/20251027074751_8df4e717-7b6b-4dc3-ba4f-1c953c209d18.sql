-- Add name and avatar fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Update the get_leaderboard function to handle the new columns
CREATE OR REPLACE FUNCTION public.get_leaderboard(period text, scope text)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  name text,
  avatar_url text,
  total_minutes numeric,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date date;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Determine date range
  CASE period
    WHEN 'day' THEN start_date := current_date;
    WHEN 'week' THEN start_date := current_date - INTERVAL '7 days';
    WHEN 'month' THEN start_date := current_date - INTERVAL '30 days';
    ELSE start_date := current_date;
  END CASE;

  -- Return ranked data
  RETURN QUERY
  WITH activity_totals AS (
    SELECT 
      sa.user_id,
      SUM(sa.minutes) as total_minutes
    FROM study_activity sa
    WHERE sa.activity_date >= start_date
      AND (
        scope = 'global' 
        OR (scope = 'friends' AND (
          sa.user_id IN (
            SELECT requester FROM friendships 
            WHERE receiver = v_user_id AND status = 'accepted'
            UNION
            SELECT receiver FROM friendships 
            WHERE requester = v_user_id AND status = 'accepted'
          )
          OR sa.user_id = v_user_id
        ))
      )
    GROUP BY sa.user_id
  ),
  ranked_activity AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY at.total_minutes DESC) as rank,
      at.user_id,
      COALESCE(p.full_name, 'Anonymous') as name,
      p.avatar_url,
      at.total_minutes,
      (at.user_id = v_user_id) as is_self
    FROM activity_totals at
    LEFT JOIN profiles p ON p.user_id = at.user_id
  )
  SELECT * FROM ranked_activity
  ORDER BY rank;
END;
$$;