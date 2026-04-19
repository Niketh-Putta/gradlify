-- 1. Add persistent leaderboard_score to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leaderboard_score INTEGER DEFAULT 0;

-- 2. Function to securely increment the leaderboard score
-- This is what we will call from the frontend the second the submit button is clicked.
CREATE OR REPLACE FUNCTION public.increment_leaderboard_score(p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.profiles
  SET leaderboard_score = COALESCE(leaderboard_score, 0) + p_amount,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- 3. Simplified Global Leaderboard RPC
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
  v_user_id uuid;
  v_user_track public.user_track;
BEGIN
  v_user_id := auth.uid();
  
  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_user_track
  FROM public.profiles p
  WHERE p.user_id = v_user_id;
  v_user_track := COALESCE(v_user_track, 'gcse'::public.user_track);

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY p.leaderboard_score DESC, COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous'), p.user_id) AS rank,
    p.user_id,
    COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
    p.avatar_url,
    p.leaderboard_score::bigint AS correct_count,
    (p.user_id = v_user_id) AS is_self,
    p.founder_track
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE COALESCE(p.track, 'gcse'::public.user_track) = v_user_track
  ORDER BY rank;
END;
$$;

-- 4. Simplified Friends Leaderboard RPC
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
  v_user_id uuid;
  v_user_track public.user_track;
BEGIN
  v_user_id := auth.uid();
  
  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_user_track
  FROM public.profiles p
  WHERE p.user_id = v_user_id;
  v_user_track := COALESCE(v_user_track, 'gcse'::public.user_track);

  RETURN QUERY
  WITH friend_ids AS (
    SELECT requester AS uid FROM public.friendships WHERE receiver = v_user_id AND status = 'accepted'
    UNION
    SELECT receiver AS uid FROM public.friendships WHERE requester = v_user_id AND status = 'accepted'
    UNION
    SELECT v_user_id AS uid
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY p.leaderboard_score DESC, COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous'), p.user_id) AS rank,
    p.user_id,
    COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
    p.avatar_url,
    p.leaderboard_score::bigint AS correct_count,
    (p.user_id = v_user_id) AS is_self,
    p.founder_track
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  JOIN friend_ids f ON f.uid = p.user_id
  WHERE COALESCE(p.track, 'gcse'::public.user_track) = v_user_track
  ORDER BY rank;
END;
$$;
