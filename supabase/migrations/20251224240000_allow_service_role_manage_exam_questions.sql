-- Allow service_role to manage exam_questions (insert/update/delete) under RLS.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exam_questions'
      AND policyname = 'Service role can manage exam questions'
  ) THEN
    CREATE POLICY "Service role can manage exam questions"
      ON public.exam_questions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
