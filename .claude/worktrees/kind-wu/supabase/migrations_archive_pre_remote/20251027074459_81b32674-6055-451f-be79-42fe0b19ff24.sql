-- Create friendships table
CREATE TABLE public.friendships (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  requester uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (requester, receiver)
);

-- Create study_activity table
CREATE TABLE public.study_activity (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minutes numeric NOT NULL DEFAULT 0,
  activity_date date NOT NULL DEFAULT current_date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_activity ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester OR auth.uid() = receiver);

CREATE POLICY "Users can create friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester);

CREATE POLICY "Users can update received requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = receiver);

CREATE POLICY "Users can delete their own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester OR auth.uid() = receiver);

-- Study activity policies
CREATE POLICY "Users can view their own study activity"
  ON public.study_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study activity"
  ON public.study_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study activity"
  ON public.study_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- Create leaderboard RPC function
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