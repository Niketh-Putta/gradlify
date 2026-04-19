-- 1. Add persistent leaderboard_score to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leaderboard_score INTEGER DEFAULT 0;

-- 2. Drop all old complex leaderboard logic
DROP VIEW IF EXISTS public.correct_answers_all CASCADE;
DROP FUNCTION IF EXISTS public.get_leaderboard_correct_global(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_leaderboard_correct_friends(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text) CASCADE;

-- 3. Create a simple function to update leaderboard_score from mock exams
CREATE OR REPLACE FUNCTION public.update_leaderboard_from_mock_attempt()
RETURNS trigger AS $$
BEGIN
    -- Only increment if status changes to 'scored' or 'completed'
    -- (Support both to prevent breakage)
    IF ((NEW.status = 'scored' OR NEW.status = 'completed') 
        AND (OLD.status IS NULL OR (OLD.status != 'scored' AND OLD.status != 'completed'))) THEN
        UPDATE public.profiles
        SET leaderboard_score = leaderboard_score + COALESCE(NEW.score, 0),
            updated_at = now()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on mock_attempts
DROP TRIGGER IF EXISTS trg_update_leaderboard_after_mock ON public.mock_attempts;
CREATE TRIGGER trg_update_leaderboard_after_mock
AFTER UPDATE ON public.mock_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_leaderboard_from_mock_attempt();

-- 5. Create new simple RPCs for the leaderboard that use the persistent score
-- We keep the arguments to avoid breaking the frontend immediately, but ignore period for now 
-- as the user requested a simple cumulative score.
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
    AND NOT (v_user_track = '11plus'::public.user_track AND lower(u.email) = 'kputtab@gmail.com')
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

-- 6. Backfill leaderboard_score from existing scored mock attempts
UPDATE public.profiles p
SET leaderboard_score = COALESCE((
    SELECT SUM(score)
    FROM public.mock_attempts ma
    WHERE ma.user_id = p.user_id
      AND ma.status = 'scored'
), 0);
