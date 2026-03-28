-- One-time normalization:
-- Put all existing exam questions under GCSE before importing new 11+ data.

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

ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS track public.user_track;

ALTER TABLE public.exam_questions
  ALTER COLUMN track TYPE public.user_track
  USING (
    CASE
      WHEN lower(coalesce(track::text, '')) = '11plus' THEN '11plus'::public.user_track
      ELSE 'gcse'::public.user_track
    END
  );

-- Normalize existing rows to a constraint-safe track assignment.
-- 11+ tier rows must stay on 11plus to satisfy exam_questions_tier_calculator_track_check.
UPDATE public.exam_questions
SET track = CASE
  WHEN tier = '11+ Standard' THEN '11plus'::public.user_track
  ELSE 'gcse'::public.user_track
END;

ALTER TABLE public.exam_questions
  ALTER COLUMN track SET DEFAULT 'gcse'::public.user_track,
  ALTER COLUMN track SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exam_questions_track
  ON public.exam_questions(track);
