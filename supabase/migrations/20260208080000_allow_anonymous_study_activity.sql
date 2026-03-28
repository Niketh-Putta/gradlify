-- Allow anonymous landing-page visits in study_activity
ALTER TABLE public.study_activity
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.study_activity
  ADD COLUMN IF NOT EXISTS visitor_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'study_activity_user_or_visitor'
      AND conrelid = 'public.study_activity'::regclass
  ) THEN
    ALTER TABLE public.study_activity
      ADD CONSTRAINT study_activity_user_or_visitor
      CHECK (user_id IS NOT NULL OR visitor_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS study_activity_visitor_id_idx
  ON public.study_activity (visitor_id);
