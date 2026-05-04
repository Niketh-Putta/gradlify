CREATE TABLE IF NOT EXISTS public.live_mock_exam_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  mock_slug text NOT NULL,
  mock_starts_at timestamptz NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_mock_exam_signups_email_not_blank CHECK (length(trim(email)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS live_mock_exam_signups_mock_user_key
  ON public.live_mock_exam_signups (mock_slug, user_id);

CREATE INDEX IF NOT EXISTS live_mock_exam_signups_mock_starts_at_idx
  ON public.live_mock_exam_signups (mock_starts_at);

ALTER TABLE public.live_mock_exam_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can view their own live mock signups"
ON public.live_mock_exam_signups
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can create their own live mock signups"
ON public.live_mock_exam_signups
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own live mock signups" ON public.live_mock_exam_signups;
CREATE POLICY "Users can update their own live mock signups"
ON public.live_mock_exam_signups
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
