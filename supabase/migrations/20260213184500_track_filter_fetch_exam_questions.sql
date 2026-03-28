-- Enforce per-user track filtering inside question-fetch RPCs.

CREATE OR REPLACE FUNCTION public.fetch_exam_questions(
  p_tier text,
  p_calculator text,
  p_question_types text[],
  p_limit integer
)
RETURNS SETOF public.exam_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_track public.user_track;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access exam questions';
  END IF;

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_user_track
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  v_user_track := COALESCE(v_user_track, 'gcse'::public.user_track);

  RETURN QUERY
  SELECT *
  FROM public.exam_questions q
  WHERE (p_tier IS NULL OR q.tier = p_tier)
    AND (p_calculator IS NULL OR q.calculator = p_calculator)
    AND (p_question_types IS NULL OR q.question_type = ANY(p_question_types))
    -- TRACK FILTER — Ensures separation between GCSE and 11+
    AND q.track = v_user_track
  ORDER BY random()
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.fetch_exam_questions_v3(
  p_tiers text[],
  p_calculators text[],
  p_question_types text[],
  p_subtopics text[],
  p_difficulty_min integer,
  p_difficulty_max integer,
  p_exclude_ids uuid[],
  p_limit integer
)
RETURNS SETOF public.exam_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_track public.user_track;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access exam questions';
  END IF;

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_user_track
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  v_user_track := COALESCE(v_user_track, 'gcse'::public.user_track);

  RETURN QUERY
  WITH user_attempt_rows AS (
    SELECT
      pr.question_id::uuid AS question_id,
      pr.created_at AS attempted_at,
      pr.attempts::int AS attempts,
      pr.correct::int AS correct
    FROM public.practice_results pr
    WHERE pr.user_id = auth.uid()
      AND pr.question_id IS NOT NULL
      AND pr.attempts > 0
    UNION ALL
    SELECT
      mq.exam_question_id::uuid AS question_id,
      ma.created_at AS attempted_at,
      1 AS attempts,
      CASE
        WHEN COALESCE(mq.marks, 0) > 0 AND COALESCE(mq.awarded_marks, 0) >= COALESCE(mq.marks, 0) THEN 1
        ELSE 0
      END AS correct
    FROM public.mock_attempts ma
    JOIN public.mock_questions mq ON mq.attempt_id = ma.id
    WHERE ma.user_id = auth.uid()
      AND ma.status = 'completed'
      AND mq.exam_question_id IS NOT NULL
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
  FROM public.exam_questions q
  LEFT JOIN user_stats us ON us.question_id = q.id
  WHERE (p_exclude_ids IS NULL OR NOT (q.id = ANY(p_exclude_ids)))
    AND (p_tiers IS NULL OR array_length(p_tiers, 1) IS NULL OR q.tier = ANY(p_tiers))
    AND (p_calculators IS NULL OR array_length(p_calculators, 1) IS NULL OR q.calculator = ANY(p_calculators))
    AND (p_question_types IS NULL OR array_length(p_question_types, 1) IS NULL OR q.question_type = ANY(p_question_types))
    AND (p_subtopics IS NULL OR array_length(p_subtopics, 1) IS NULL OR q.subtopic = ANY(p_subtopics))
    AND (p_difficulty_min IS NULL OR q.difficulty >= p_difficulty_min)
    AND (p_difficulty_max IS NULL OR q.difficulty <= p_difficulty_max)
    -- TRACK FILTER — Ensures separation between GCSE and 11+
    AND q.track = v_user_track
  ORDER BY
    (COALESCE(us.attempts, 0) = 0) DESC,
    (COALESCE(us.attempts, 0) > COALESCE(us.correct, 0)) DESC,
    COALESCE(us.last_attempt_at, to_timestamp(0)) ASC,
    random()
  LIMIT COALESCE(p_limit, 20);
END;
$$;
