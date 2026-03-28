-- Manual rollback script for track support migration set.
-- Run in SQL editor only if you need to revert 20260212120000 + 20260212121500.

-- 1) Drop API-facing helper.
DROP FUNCTION IF EXISTS public.update_user_track(uuid, public.user_track);

-- 2) Remove track triggers for session tables.
DROP TRIGGER IF EXISTS trg_practice_results_track ON public.practice_results;
DROP TRIGGER IF EXISTS trg_mock_attempts_track ON public.mock_attempts;
DROP TRIGGER IF EXISTS trg_extreme_results_track ON public.extreme_results;
DROP FUNCTION IF EXISTS public.set_row_track_from_profile();

-- 3) Revert signup profile creation behavior.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4) Drop track columns from optional alias tables if they exist.
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'users',
      'questions',
      'leaderboards',
      'sprints',
      'practice_sessions',
      'mock_sessions'
    ])
  LOOP
    IF to_regclass('public.' || table_name) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS track', table_name);
  END LOOP;
END;
$$;

-- 5) Drop track columns from current app tables if desired.
-- NOTE: this removes data-level track separation.
ALTER TABLE IF EXISTS public.sprint_stats DROP COLUMN IF EXISTS track;
ALTER TABLE IF EXISTS public.sprint_windows DROP COLUMN IF EXISTS track;
ALTER TABLE IF EXISTS public.mock_attempts DROP COLUMN IF EXISTS track;
ALTER TABLE IF EXISTS public.practice_results DROP COLUMN IF EXISTS track;
ALTER TABLE IF EXISTS public.extreme_results DROP COLUMN IF EXISTS track;
ALTER TABLE IF EXISTS public.extreme_questions DROP COLUMN IF EXISTS track;
ALTER TABLE IF EXISTS public.exam_questions DROP COLUMN IF EXISTS track;
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS track;

-- 6) Drop enum only if it is unused.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_track'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    DROP TYPE IF EXISTS public.user_track;
  END IF;
END;
$$;
