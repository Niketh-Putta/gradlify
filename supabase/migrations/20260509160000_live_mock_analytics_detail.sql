-- Rich snapshots for per-user analytics exports (email cohorts, item analysis, option distractors)

ALTER TABLE public.live_mock_attempts
  ADD COLUMN IF NOT EXISTS user_email text;

COMMENT ON COLUMN public.live_mock_attempts.user_email IS 'Denormalized from auth at submit time for analytics exports without joining auth.users.';

CREATE INDEX IF NOT EXISTS live_mock_attempts_user_email_lower_idx
  ON public.live_mock_attempts (lower(trim(user_email)));

ALTER TABLE public.live_mock_answers
  ADD COLUMN IF NOT EXISTS question_number integer,
  ADD COLUMN IF NOT EXISTS section_key text,
  ADD COLUMN IF NOT EXISTS question_type text,
  ADD COLUMN IF NOT EXISTS stem_snapshot text,
  ADD COLUMN IF NOT EXISTS correct_option_id text,
  ADD COLUMN IF NOT EXISTS correct_option_label text,
  ADD COLUMN IF NOT EXISTS selected_option_label text,
  ADD COLUMN IF NOT EXISTS options_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.live_mock_answers.options_snapshot IS 'JSON array of {id,text,correct} at submit time for stable analytics if bank changes.';
COMMENT ON COLUMN public.live_mock_answers.stem_snapshot IS 'Question stem text at submit time.';

CREATE INDEX IF NOT EXISTS live_mock_answers_paper_question_num_idx
  ON public.live_mock_answers (paper_id, question_number);
