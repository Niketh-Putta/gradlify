-- 1. Reset all persistent leaderboard scores to 0 to start the new sprint fresh
UPDATE public.profiles SET leaderboard_score = 0;

-- 2. Recalculate scores ONLY from mock exams completed after 8 PM on April 19th, 2026
UPDATE public.profiles p
SET leaderboard_score = COALESCE((
    SELECT SUM(ma.score)
    FROM public.mock_attempts ma
    WHERE ma.user_id = p.user_id
      AND (ma.status = 'scored' OR ma.status = 'completed')
      AND ma.created_at >= '2026-04-19T20:00:00Z'
), 0);

-- 3. Update the leaderboard RPCs to strictly enforce this time window
-- This ensures that even as new mocks are added, the "Global" and "Friends" views
-- only reflect this specific sprint/period.
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
  v_sprint_start timestamptz := '2026-04-19T20:00:00Z';
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
    AND NOT (v_user_track = '11plus'::public.user_track AND lower(u.email) = 'kputtab@gmail.com')
    AND p.updated_at >= v_sprint_start -- Only show users active in this sprint
  ORDER BY rank;
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
  v_user_id uuid;
  v_user_track public.user_track;
  v_sprint_start timestamptz := '2026-04-19T20:00:00Z';
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
    AND p.updated_at >= v_sprint_start
  ORDER BY rank;
END;
$$;

-- 4. Update the trigger function to only count results after the sprint start
CREATE OR REPLACE FUNCTION public.update_leaderboard_from_mock_attempt()
RETURNS trigger AS $$
BEGIN
    -- Only increment if status changes to 'scored' or 'completed'
    -- AND the attempt was created after the sprint start
    IF (NEW.created_at >= '2026-04-19T20:00:00Z' 
        AND (NEW.status = 'scored' OR NEW.status = 'completed') 
        AND (OLD.status IS NULL OR (OLD.status != 'scored' AND OLD.status != 'completed'))) THEN
        
        UPDATE public.profiles
        SET leaderboard_score = leaderboard_score + COALESCE(NEW.score, 0),
            updated_at = now()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
