-- Ensure session rows inherit the user's active track so leaderboard scoring is track-correct.

CREATE OR REPLACE FUNCTION public.set_row_track_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track public.user_track;
BEGIN
  SELECT p.track
  INTO v_track
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  v_track := COALESCE(v_track, 'gcse'::public.user_track);

  -- If caller did not explicitly set a non-default track, inherit from profile.
  IF NEW.track IS NULL OR NEW.track = 'gcse'::public.user_track THEN
    NEW.track := v_track;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill historical rows that were written with default GCSE while profile was 11+.
UPDATE public.practice_results pr
SET track = p.track
FROM public.profiles p
WHERE pr.user_id = p.user_id
  AND p.track = '11plus'::public.user_track
  AND pr.track <> p.track;

UPDATE public.mock_attempts ma
SET track = p.track
FROM public.profiles p
WHERE ma.user_id = p.user_id
  AND p.track = '11plus'::public.user_track
  AND ma.track <> p.track;

DO $$
BEGIN
  IF to_regclass('public.extreme_results') IS NOT NULL THEN
    EXECUTE $q$
      UPDATE public.extreme_results er
      SET track = p.track
      FROM public.profiles p
      WHERE er.user_id = p.user_id
        AND p.track = '11plus'::public.user_track
        AND er.track <> p.track
    $q$;
  END IF;
END;
$$;
