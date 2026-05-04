-- Clean up legacy functions that currently fail remote Supabase schema lint.

CREATE OR REPLACE FUNCTION public.generate_mindprint_summary_sql(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
BEGIN
  -- The old implementation referenced http.invoke(), but the http schema/extension
  -- is not installed in this project. Keep the RPC callable and explicit.
  RETURN jsonb_build_object(
    'user_id', user_id,
    'status', 'unavailable',
    'message', 'Mindprint summary generation is not configured in the database'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_question_with_answer(question_id uuid)
RETURNS TABLE (
  id uuid,
  question text,
  correct_answer text,
  all_answers jsonb,
  explanation text,
  explain_on text,
  question_type text,
  tier text,
  calculator text,
  image_url text,
  image_alt text,
  wrong_answers jsonb,
  created_at timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    eq.id,
    eq.question,
    eq.correct_answer,
    to_jsonb(eq.all_answers),
    eq.explanation,
    eq.explain_on,
    eq.question_type,
    eq.tier,
    eq.calculator,
    eq.image_url,
    eq.image_alt,
    to_jsonb(eq.wrong_answers),
    eq.created_at
  FROM public.exam_questions eq
  WHERE eq.id = question_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalc_readiness(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM public.recalc_readiness_and_update_profile(p_user);
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_friend_request(p_receiver uuid)
RETURNS TABLE(id bigint, status text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  me uuid := auth.uid();
  a uuid := least(me, p_receiver);
  b uuid := greatest(me, p_receiver);
  rec public.friendships%rowtype;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_receiver IS NULL OR p_receiver = me THEN
    RAISE EXCEPTION 'Invalid receiver';
  END IF;

  BEGIN
    INSERT INTO public.friendships (requester, receiver, status)
    VALUES (me, p_receiver, 'pending')
    RETURNING * INTO rec;
  EXCEPTION WHEN unique_violation THEN
    SELECT *
      INTO rec
      FROM public.friendships f
     WHERE least(f.requester, f.receiver) = a
       AND greatest(f.requester, f.receiver) = b
     LIMIT 1;

    IF rec.status = 'declined' THEN
      UPDATE public.friendships f
         SET status = 'pending'
       WHERE f.id = rec.id
      RETURNING * INTO rec;
    END IF;
  END;

  RETURN QUERY SELECT rec.id, rec.status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fetch_exam_questions_v2(
  p_tiers text[] DEFAULT NULL::text[],
  p_calculators text[] DEFAULT NULL::text[],
  p_question_types text[] DEFAULT NULL::text[],
  p_subtopics text[] DEFAULT NULL::text[],
  p_difficulty_min integer DEFAULT NULL::integer,
  p_difficulty_max integer DEFAULT NULL::integer,
  p_exclude_ids text[] DEFAULT NULL::text[],
  p_limit integer DEFAULT 50
)
RETURNS SETOF public.exam_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access exam questions';
  END IF;

  RETURN QUERY
  WITH seen AS (
    SELECT pr.question_id::text AS qid
    FROM public.practice_results pr
    WHERE pr.user_id = auth.uid()
      AND pr.question_id IS NOT NULL

    UNION

    SELECT mq.exam_question_id AS qid
    FROM public.mock_questions mq
    JOIN public.mock_attempts ma ON ma.id = mq.attempt_id
    WHERE ma.user_id = auth.uid()
      AND mq.exam_question_id IS NOT NULL
      AND mq.exam_question_id <> ''
  )
  SELECT eq.*
  FROM public.exam_questions eq
  LEFT JOIN seen s ON s.qid = eq.id::text
  WHERE (p_tiers IS NULL OR eq.tier = ANY(p_tiers))
    AND (p_calculators IS NULL OR eq.calculator = ANY(p_calculators))
    AND (p_question_types IS NULL OR eq.question_type = ANY(p_question_types))
    AND (p_subtopics IS NULL OR eq.subtopic = ANY(p_subtopics))
    AND (p_difficulty_min IS NULL OR eq.difficulty >= p_difficulty_min)
    AND (p_difficulty_max IS NULL OR eq.difficulty <= p_difficulty_max)
    AND (p_exclude_ids IS NULL OR NOT (eq.id::text = ANY(p_exclude_ids)))
  ORDER BY (s.qid IS NULL) DESC, random()
  LIMIT GREATEST(1, LEAST(500, COALESCE(p_limit, 50)));
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_subtopic_progress(
  p_topic_key text,
  p_subtopic_key text,
  p_score integer
)
RETURNS TABLE(topic_key text, subtopic_key text, score integer, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subtopic_progress (user_id, topic_key, subtopic_key, score)
  VALUES (auth.uid(), p_topic_key, p_subtopic_key, p_score)
  ON CONFLICT ON CONSTRAINT subtopic_progress_user_id_topic_key_subtopic_key_key DO UPDATE
    SET score = EXCLUDED.score,
        updated_at = now();

  RETURN QUERY
    SELECT sp.topic_key, sp.subtopic_key, sp.score, sp.updated_at
    FROM public.subtopic_progress sp
    WHERE sp.user_id = auth.uid()
      AND sp.topic_key = p_topic_key
      AND sp.subtopic_key = p_subtopic_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_sprint_stats(
  p_sprint_id text,
  p_start timestamp with time zone,
  p_end timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_effective_start timestamptz;
BEGIN
  IF p_sprint_id IS NULL OR p_sprint_id = '' THEN
    RAISE EXCEPTION 'Sprint id is required';
  END IF;

  v_effective_start := date_trunc('day', p_start);

  WITH mock_rows AS (
    SELECT
      ma.user_id,
      ma.track,
      (ma.created_at AT TIME ZONE 'UTC')::date AS activity_day,
      SUM(COALESCE(ma.total_marks, 0))::integer AS attempted,
      SUM(COALESCE(ma.score, 0))::integer AS correct
    FROM public.mock_attempts ma
    LEFT JOIN public.profiles p ON p.user_id = ma.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = ma.user_id AND ur.role = 'admin'::public.app_role
    WHERE ma.created_at >= v_effective_start
      AND ma.created_at < p_end
      AND ma.mode IS DISTINCT FROM 'practice'
      AND ma.status IN ('completed', 'submitted', 'scored')
      AND NOT (p.founder_track IS NOT DISTINCT FROM 'founder' AND ur.user_id IS NULL)
    GROUP BY ma.user_id, ma.track, (ma.created_at AT TIME ZONE 'UTC')::date
  ),
  challenge_rows AS (
    SELECT
      er.user_id,
      er.track,
      (er.created_at AT TIME ZONE 'UTC')::date AS activity_day,
      COALESCE(er.attempts, 1)::integer AS attempted,
      COALESCE(er.correct, 0)::integer AS correct
    FROM public.extreme_results er
    LEFT JOIN public.profiles p ON p.user_id = er.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = er.user_id AND ur.role = 'admin'::public.app_role
    WHERE er.created_at >= v_effective_start
      AND er.created_at < p_end
      AND NOT (p.founder_track IS NOT DISTINCT FROM 'founder' AND ur.user_id IS NULL)
  ),
  question_rows AS (
    SELECT * FROM mock_rows
    UNION ALL
    SELECT * FROM challenge_rows
  ),
  aggregates AS (
    SELECT
      user_id,
      track,
      COUNT(DISTINCT activity_day) AS active_days,
      SUM(attempted)::integer AS questions_attempted,
      SUM(correct)::integer AS questions_correct
    FROM question_rows
    GROUP BY user_id, track
  )
  INSERT INTO public.sprint_stats (
    sprint_id,
    user_id,
    track,
    sprint_start_at,
    sprint_end_at,
    active_days,
    questions_attempted,
    questions_correct,
    accuracy_pct,
    computed_at
  )
  SELECT
    p_sprint_id,
    user_id,
    track,
    p_start,
    p_end,
    active_days,
    questions_attempted,
    questions_correct,
    CASE
      WHEN questions_attempted > 0
        THEN ROUND((questions_correct::numeric / questions_attempted::numeric) * 100, 1)
      ELSE 0
    END AS accuracy_pct,
    now()
  FROM aggregates
  ON CONFLICT (sprint_id, user_id, track) DO UPDATE
  SET sprint_start_at = EXCLUDED.sprint_start_at,
      sprint_end_at = EXCLUDED.sprint_end_at,
      active_days = EXCLUDED.active_days,
      questions_attempted = EXCLUDED.questions_attempted,
      questions_correct = EXCLUDED.questions_correct,
      accuracy_pct = EXCLUDED.accuracy_pct,
      computed_at = EXCLUDED.computed_at;
END;
$function$;
