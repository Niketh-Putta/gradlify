-- Ensure premium_track stores canonical string values across existing environments.
-- Canonical values: 'gcse', 'eleven_plus', or NULL.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_track text;

ALTER TABLE public.profiles
ALTER COLUMN premium_track TYPE text
USING (
  CASE
    WHEN premium_track::text = '11plus' THEN 'eleven_plus'
    WHEN premium_track::text = 'gcse' THEN 'gcse'
    WHEN premium_track::text = 'eleven_plus' THEN 'eleven_plus'
    ELSE NULL
  END
);

UPDATE public.profiles
SET premium_track = 'eleven_plus'
WHERE premium_track = '11plus';

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_premium_track_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_premium_track_check
CHECK (
  premium_track IS NULL
  OR premium_track IN ('gcse', 'eleven_plus')
);
