-- 11+ compatibility hardening for exam_questions.
-- - Supports track='11plus'
-- - Allows tier='11+ Standard' for 11+ rows
-- - Keeps subtopic ready for module|category keys
-- - Ensures image metadata columns exist

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

ALTER TABLE public.exam_questions
  ALTER COLUMN track SET DEFAULT 'gcse'::public.user_track;

UPDATE public.exam_questions
SET track = 'gcse'::public.user_track
WHERE track IS NULL;

ALTER TABLE public.exam_questions
  ALTER COLUMN track SET NOT NULL;

ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS subtopic text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text;

DO $$
DECLARE
  c record;
BEGIN
  -- Remove legacy one-field checks so we can enforce track-aware rules.
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.exam_questions'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%tier%'
        OR pg_get_constraintdef(oid) ILIKE '%calculator%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.exam_questions DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.exam_questions
  ADD CONSTRAINT exam_questions_tier_calculator_track_check
  CHECK (
    (
      track = '11plus'::public.user_track
      AND tier = '11+ Standard'
      AND calculator = 'Non-Calculator'
    )
    OR
    (
      track <> '11plus'::public.user_track
      AND tier IN ('Foundation Tier', 'Higher Tier')
      AND calculator IN ('Calculator', 'Non-Calculator')
    )
  );

ALTER TABLE public.exam_questions
  ADD CONSTRAINT exam_questions_subtopic_pipe_format_check
  CHECK (
    subtopic IS NULL
    OR subtopic !~ '\|'
    OR subtopic ~ '^[a-z0-9_]+\|[a-z0-9_-]+$'
  );

CREATE INDEX IF NOT EXISTS idx_exam_questions_track_question_type_subtopic
  ON public.exam_questions(track, question_type, subtopic);
