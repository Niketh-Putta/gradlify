-- Add show_on_global_leaderboard column to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN show_on_global_leaderboard boolean NOT NULL DEFAULT false;

-- RPC: Get current user's global opt-in status
CREATE OR REPLACE FUNCTION public.get_my_global_opt_in()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT show_on_global_leaderboard 
     FROM user_settings 
     WHERE user_id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_global_opt_in() TO authenticated, anon;

-- RPC: Set global opt-in status
CREATE OR REPLACE FUNCTION public.set_global_opt_in(p_opt_in boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO user_settings (user_id, show_on_global_leaderboard, updated_at)
  VALUES (auth.uid(), p_opt_in, now())
  ON CONFLICT (user_id) DO UPDATE
    SET show_on_global_leaderboard = EXCLUDED.show_on_global_leaderboard,
        updated_at = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_global_opt_in(boolean) TO authenticated, anon;

-- Update get_leaderboard to respect global opt-in
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text);

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
STABLE
SECURITY DEFINER
SET search_path = public
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
        lower(p_scope) = 'friends'
        OR (
          lower(p_scope) = 'global' 
          AND EXISTS (
            SELECT 1 FROM user_settings us 
            WHERE us.user_id = qe.user_id 
            AND us.show_on_global_leaderboard = true
          )
        )
      )
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

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text) TO authenticated, anon;;
