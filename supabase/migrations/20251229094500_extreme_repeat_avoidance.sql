-- Challenge/Extreme repeat avoidance
--
-- Stores per-user attempts for extreme_questions and provides an unseen-first selector.

CREATE TABLE IF NOT EXISTS public.extreme_results (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  correct integer NOT NULL DEFAULT 0 CHECK (correct >= 0 AND correct <= attempts),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT extreme_results_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.extreme_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS extreme_results_user_question_idx ON public.extreme_results(user_id, question_id);
CREATE INDEX IF NOT EXISTS extreme_results_user_created_idx ON public.extreme_results(user_id, created_at DESC);

ALTER TABLE public.extreme_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner read" ON public.extreme_results;
DROP POLICY IF EXISTS "owner write" ON public.extreme_results;

CREATE POLICY "owner read" ON public.extreme_results
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "owner write" ON public.extreme_results
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.fetch_extreme_questions_v1(
  p_exclude_ids uuid[],
  p_limit integer
)
RETURNS SETOF public.extreme_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access extreme questions';
  END IF;

  RETURN QUERY
  WITH user_attempt_rows AS (
    SELECT
      er.question_id::uuid AS question_id,
      er.created_at AS attempted_at,
      er.attempts::int AS attempts,
      er.correct::int AS correct
    FROM public.extreme_results er
    WHERE er.user_id = auth.uid()
  ),
  user_stats AS (
    SELECT
      question_id,
      SUM(attempts)::int AS attempts,
      SUM(correct)::int AS correct,
      MAX(attempted_at) AS last_attempt_at
    FROM user_attempt_rows
    GROUP BY question_id
  )
  SELECT q.*
  FROM public.extreme_questions q
  LEFT JOIN user_stats us ON us.question_id = q.id
  WHERE (p_exclude_ids IS NULL OR NOT (q.id = ANY(p_exclude_ids)))
  ORDER BY
    (COALESCE(us.attempts, 0) = 0) DESC,
    (COALESCE(us.attempts, 0) > COALESCE(us.correct, 0)) DESC,
    COALESCE(us.last_attempt_at, to_timestamp(0)) ASC,
    random()
  LIMIT COALESCE(p_limit, 20);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_extreme_questions_v1(uuid[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_extreme_questions_v1(uuid[], integer) TO service_role;
