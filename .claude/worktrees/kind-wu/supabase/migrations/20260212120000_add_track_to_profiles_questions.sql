-- Track foundation migration for GCSE + 11+.
-- This migration is idempotent and supports both current table names
-- (profiles/exam_questions/mock_attempts/practice_results/sprint_windows)
-- and requested generic aliases (users/questions/mock_sessions/practice_sessions/sprints/leaderboards).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_track'
  ) THEN
    CREATE TYPE public.user_track AS ENUM ('gcse', '11plus');
  END IF;
END;
$$;

DO $$
DECLARE
  v_table_name text;
BEGIN
  FOR v_table_name IN
    SELECT unnest(ARRAY[
      'profiles',
      'exam_questions',
      'extreme_questions',
      'practice_results',
      'mock_attempts',
      'sprint_windows',
      'sprint_stats',
      'extreme_results',
      'users',
      'questions',
      'leaderboards',
      'sprints',
      'practice_sessions',
      'mock_sessions'
    ])
  LOOP
    IF to_regclass('public.' || v_table_name) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS track public.user_track', v_table_name);

    -- Convert legacy text columns safely if needed.
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_table_name
        AND c.column_name = 'track'
        AND c.udt_name <> 'user_track'
    ) THEN
      EXECUTE format(
        $f$
        ALTER TABLE public.%I
        ALTER COLUMN track TYPE public.user_track
        USING (
          CASE
            WHEN lower(coalesce(track::text, '')) = '11plus' THEN '11plus'::public.user_track
            ELSE 'gcse'::public.user_track
          END
        )
        $f$,
        v_table_name
      );
    END IF;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN track SET DEFAULT %L::public.user_track', v_table_name, 'gcse');
    EXECUTE format('UPDATE public.%I SET track = %L::public.user_track WHERE track IS NULL', v_table_name, 'gcse');
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN track SET NOT NULL', v_table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_track ON public.%I(track)', v_table_name, v_table_name);
  END LOOP;
END;
$$;

-- Keep historical rows GCSE by default.
UPDATE public.profiles
SET track = 'gcse'::public.user_track
WHERE track IS NULL;

-- Future session rows inherit user track automatically if caller doesn't provide it.
CREATE OR REPLACE FUNCTION public.set_row_track_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track public.user_track;
BEGIN
  IF NEW.track IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.track INTO v_track
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  NEW.track := COALESCE(v_track, 'gcse'::public.user_track);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_practice_results_track ON public.practice_results;
CREATE TRIGGER trg_practice_results_track
BEFORE INSERT ON public.practice_results
FOR EACH ROW
EXECUTE FUNCTION public.set_row_track_from_profile();

DROP TRIGGER IF EXISTS trg_mock_attempts_track ON public.mock_attempts;
CREATE TRIGGER trg_mock_attempts_track
BEFORE INSERT ON public.mock_attempts
FOR EACH ROW
EXECUTE FUNCTION public.set_row_track_from_profile();

DO $$
BEGIN
  IF to_regclass('public.extreme_results') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_extreme_results_track ON public.extreme_results;
    CREATE TRIGGER trg_extreme_results_track
    BEFORE INSERT ON public.extreme_results
    FOR EACH ROW
    EXECUTE FUNCTION public.set_row_track_from_profile();
  END IF;
END;
$$;

-- Registration default: 11+ unless explicitly provided as GCSE.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_track text;
  v_track public.user_track;
BEGIN
  v_raw_track := lower(coalesce(NEW.raw_user_meta_data ->> 'track', ''));
  v_track := CASE
    WHEN v_raw_track = 'gcse' THEN 'gcse'::public.user_track
    WHEN v_raw_track = '11plus' THEN '11plus'::public.user_track
    ELSE '11plus'::public.user_track
  END;

  INSERT INTO public.profiles (user_id, track)
  VALUES (NEW.id, v_track)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
