-- Add track-specific premium ownership for Stripe subscriptions.
-- Existing premium users are treated as GCSE premium for backward compatibility.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_track text;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_premium_track_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_premium_track_check
CHECK (
  premium_track IS NULL
  OR premium_track IN ('gcse', 'eleven_plus')
);

UPDATE public.profiles
SET premium_track = 'gcse'
WHERE premium_track IS NULL
  AND (
    tier = 'premium'
    OR is_premium = true
    OR (plan IS NOT NULL AND plan <> 'free')
  );

CREATE INDEX IF NOT EXISTS idx_profiles_premium_track
ON public.profiles (premium_track);
