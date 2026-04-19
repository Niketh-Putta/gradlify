-- 1. Backfill any missed scores from 'completed' status attempts to 'scored'
-- First, update all 'completed' attempts to 'scored' so the trigger/logic is consistent
UPDATE public.mock_attempts 
SET status = 'scored' 
WHERE status = 'completed';

-- 2. Recalculate leaderboard_score for all profiles to be sure it's accurate
UPDATE public.profiles p
SET leaderboard_score = COALESCE((
    SELECT SUM(score)
    FROM public.mock_attempts ma
    WHERE ma.user_id = p.user_id
      AND ma.status = 'scored'
), 0);
