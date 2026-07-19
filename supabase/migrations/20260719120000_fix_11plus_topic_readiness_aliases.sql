-- Fix 11+ mock topic labels so Target Focus / mastery updates from mocks.
-- Root cause: mock_questions store "Algebra & Ratio" / "Statistics & Data" etc.,
-- but v_topic_readiness only recognised GCSE-style names like "Algebra".
-- Matches live view join/scoring; only extends topic aliases + dual-credit for combined 11+ sections.

CREATE OR REPLACE VIEW public.v_topic_readiness
WITH (security_invoker = true) AS
WITH canonical_topics AS (
  SELECT unnest(ARRAY[
    'Number'::text,
    'Algebra'::text,
    'Ratio & Proportion'::text,
    'Geometry'::text,
    'Probability'::text,
    'Statistics'::text
  ]) AS topic
),
user_tracks AS (
  SELECT p.user_id, COALESCE(p.track, 'gcse'::public.user_track) AS track
  FROM public.profiles p
),
latest_history AS (
  SELECT DISTINCT ON (rh.user_id, rh.track, rh.topic)
    rh.user_id,
    rh.track,
    rh.topic,
    rh.readiness_after AS readiness,
    rh.created_at
  FROM public.readiness_history rh
  JOIN user_tracks ut ON ut.user_id = rh.user_id
  WHERE rh.track = ut.track
  ORDER BY rh.user_id, rh.track, rh.topic, rh.created_at DESC
),
practice_rollup AS (
  SELECT
    pr.user_id,
    ut.track,
    CASE
      WHEN lower(COALESCE(pr.topic, '')) IN ('number', 'arithmetic & number skills', 'number & arithmetic', 'number and arithmetic') THEN 'Number'
      WHEN lower(COALESCE(pr.topic, '')) IN ('algebra', 'algebra & ratio', 'algebra and ratio') THEN 'Algebra'
      WHEN lower(COALESCE(pr.topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion', 'word problems & reasoning', 'fractions/decimals/percentages (fdp)', 'fdp') THEN 'Ratio & Proportion'
      WHEN lower(COALESCE(pr.topic, '')) IN ('geometry', 'geometry & measures', 'geometry and measures', 'geometry & spatial awareness') THEN 'Geometry'
      WHEN lower(COALESCE(pr.topic, '')) IN ('probability', 'speed & accuracy', 'data, probability & problem solving') THEN 'Probability'
      WHEN lower(COALESCE(pr.topic, '')) IN ('statistics', 'statistics & data', 'statistics and data') THEN 'Statistics'
      ELSE NULL
    END AS topic,
    SUM(COALESCE(pr.correct, 0))::numeric AS correct_count,
    SUM(COALESCE(pr.attempts, 0))::numeric AS attempt_count,
    COUNT(DISTINCT CASE WHEN COALESCE(eq.difficulty::integer, 1) >= 3 THEN pr.question_id ELSE NULL END)::numeric AS hard_questions,
    COUNT(DISTINCT pr.question_id)::numeric AS unique_questions,
    MAX(pr.created_at) AS latest_event
  FROM public.practice_results pr
  JOIN user_tracks ut ON ut.user_id = pr.user_id
  LEFT JOIN public.exam_questions eq
    ON pr.question_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND eq.id::text = pr.question_id::text
  WHERE COALESCE(pr.attempts, 0) > 0
  GROUP BY pr.user_id, ut.track, 3
),
practice_dual AS (
  SELECT
    pr.user_id,
    ut.track,
    CASE
      WHEN lower(COALESCE(pr.topic, '')) IN ('algebra & ratio', 'algebra and ratio') THEN 'Ratio & Proportion'
      WHEN lower(COALESCE(pr.topic, '')) IN ('statistics & data', 'statistics and data') THEN 'Probability'
      ELSE NULL
    END AS topic,
    SUM(COALESCE(pr.correct, 0))::numeric AS correct_count,
    SUM(COALESCE(pr.attempts, 0))::numeric AS attempt_count,
    COUNT(DISTINCT CASE WHEN COALESCE(eq.difficulty::integer, 1) >= 3 THEN pr.question_id ELSE NULL END)::numeric AS hard_questions,
    COUNT(DISTINCT pr.question_id)::numeric AS unique_questions,
    MAX(pr.created_at) AS latest_event
  FROM public.practice_results pr
  JOIN user_tracks ut ON ut.user_id = pr.user_id
  LEFT JOIN public.exam_questions eq
    ON pr.question_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND eq.id::text = pr.question_id::text
  WHERE COALESCE(pr.attempts, 0) > 0
    AND lower(COALESCE(pr.topic, '')) IN (
      'algebra & ratio', 'algebra and ratio',
      'statistics & data', 'statistics and data'
    )
  GROUP BY pr.user_id, ut.track, 3
),
mock_rollup AS (
  SELECT
    ma.user_id,
    ut.track,
    CASE
      WHEN lower(COALESCE(mq.topic, '')) IN ('number', 'arithmetic & number skills', 'number & arithmetic', 'number and arithmetic') THEN 'Number'
      WHEN lower(COALESCE(mq.topic, '')) IN ('algebra', 'algebra & ratio', 'algebra and ratio') THEN 'Algebra'
      WHEN lower(COALESCE(mq.topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion', 'word problems & reasoning', 'fractions/decimals/percentages (fdp)', 'fdp') THEN 'Ratio & Proportion'
      WHEN lower(COALESCE(mq.topic, '')) IN ('geometry', 'geometry & measures', 'geometry and measures', 'geometry & spatial awareness') THEN 'Geometry'
      WHEN lower(COALESCE(mq.topic, '')) IN ('probability', 'speed & accuracy', 'data, probability & problem solving') THEN 'Probability'
      WHEN lower(COALESCE(mq.topic, '')) IN ('statistics', 'statistics & data', 'statistics and data') THEN 'Statistics'
      ELSE NULL
    END AS topic,
    SUM(COALESCE(mq.awarded_marks, 0))::numeric AS correct_count,
    SUM(COALESCE(mq.marks, 0))::numeric AS attempt_count,
    0::numeric AS hard_questions,
    COUNT(mq.id)::numeric AS unique_questions,
    MAX(ma.created_at) AS latest_event
  FROM public.mock_attempts ma
  JOIN public.mock_questions mq ON mq.attempt_id = ma.id
  JOIN user_tracks ut ON ut.user_id = ma.user_id
  WHERE ma.status = ANY (ARRAY['completed'::text, 'submitted'::text, 'scored'::text])
  GROUP BY ma.user_id, ut.track, 3
),
mock_dual AS (
  SELECT
    ma.user_id,
    ut.track,
    CASE
      WHEN lower(COALESCE(mq.topic, '')) IN ('algebra & ratio', 'algebra and ratio') THEN 'Ratio & Proportion'
      WHEN lower(COALESCE(mq.topic, '')) IN ('statistics & data', 'statistics and data') THEN 'Probability'
      ELSE NULL
    END AS topic,
    SUM(COALESCE(mq.awarded_marks, 0))::numeric AS correct_count,
    SUM(COALESCE(mq.marks, 0))::numeric AS attempt_count,
    0::numeric AS hard_questions,
    COUNT(mq.id)::numeric AS unique_questions,
    MAX(ma.created_at) AS latest_event
  FROM public.mock_attempts ma
  JOIN public.mock_questions mq ON mq.attempt_id = ma.id
  JOIN user_tracks ut ON ut.user_id = ma.user_id
  WHERE ma.status = ANY (ARRAY['completed'::text, 'submitted'::text, 'scored'::text])
    AND lower(COALESCE(mq.topic, '')) IN (
      'algebra & ratio', 'algebra and ratio',
      'statistics & data', 'statistics and data'
    )
  GROUP BY ma.user_id, ut.track, 3
),
combined AS (
  SELECT * FROM practice_rollup WHERE topic IS NOT NULL
  UNION ALL
  SELECT * FROM practice_dual WHERE topic IS NOT NULL
  UNION ALL
  SELECT * FROM mock_rollup WHERE topic IS NOT NULL
  UNION ALL
  SELECT * FROM mock_dual WHERE topic IS NOT NULL
),
aggregated AS (
  SELECT
    c.user_id,
    c.track,
    c.topic,
    SUM(c.correct_count) AS total_correct,
    SUM(c.attempt_count) AS total_attempts,
    SUM(c.hard_questions) AS total_hard_questions,
    SUM(c.unique_questions) AS total_unique_questions,
    MAX(c.latest_event) AS latest_event
  FROM combined c
  GROUP BY c.user_id, c.track, c.topic
),
grid AS (
  SELECT ut.user_id, ut.track, ct.topic
  FROM user_tracks ut
  CROSS JOIN canonical_topics ct
)
SELECT
  g.user_id,
  g.topic,
  CASE
    WHEN COALESCE(a.total_attempts, 0) > 0 THEN
      LEAST(
        ROUND(((a.total_correct + 6.0) / (a.total_attempts + 15.0)) * 100, 1)::numeric(5,1),
        CASE
          WHEN COALESCE(a.total_hard_questions, 0) < 5 THEN 85.0::numeric
          ELSE 100.0::numeric
        END
      )
    WHEN lh.readiness IS NOT NULL
      THEN ROUND(lh.readiness, 1)::numeric(5,1)
    ELSE 0::numeric(5,1)
  END AS readiness,
  COALESCE(a.latest_event, lh.created_at, now()) AS created_at,
  g.track
FROM grid g
LEFT JOIN aggregated a
  ON a.user_id = g.user_id
 AND a.track = g.track
 AND a.topic = g.topic
LEFT JOIN latest_history lh
  ON lh.user_id = g.user_id
 AND lh.track = g.track
 AND lh.topic = g.topic;

CREATE OR REPLACE FUNCTION auto_readiness_from_mock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_topic text;
  v_before numeric := 0;
  v_after numeric := 0;
  v_topic_marks numeric := 0;
  v_topic_awarded numeric := 0;
  v_score_pct numeric := 0;
  topic_rec record;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('completed', 'submitted', 'scored'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('completed', 'submitted', 'scored') AND OLD.status IS DISTINCT FROM NEW.status) THEN

    FOR topic_rec IN
      WITH normalized AS (
        SELECT
          CASE
            WHEN lower(COALESCE(mq.topic, '')) IN ('number', 'arithmetic & number skills', 'number & arithmetic', 'number and arithmetic') THEN 'Number'
            WHEN lower(COALESCE(mq.topic, '')) IN ('algebra', 'algebra & ratio', 'algebra and ratio') THEN 'Algebra'
            WHEN lower(COALESCE(mq.topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion') THEN 'Ratio & Proportion'
            WHEN lower(COALESCE(mq.topic, '')) IN ('geometry', 'geometry & measures', 'geometry and measures', 'geometry & spatial awareness') THEN 'Geometry'
            WHEN lower(COALESCE(mq.topic, '')) IN ('probability', 'speed & accuracy', 'data, probability & problem solving') THEN 'Probability'
            WHEN lower(COALESCE(mq.topic, '')) IN ('statistics', 'statistics & data', 'statistics and data') THEN 'Statistics'
            ELSE NULL
          END AS topic,
          mq.marks,
          mq.awarded_marks
        FROM mock_questions mq
        WHERE mq.attempt_id = NEW.id
          AND mq.topic IS NOT NULL
      )
      SELECT
        topic,
        SUM(marks) AS total_marks,
        SUM(awarded_marks) AS total_awarded
      FROM normalized
      WHERE topic IS NOT NULL
      GROUP BY topic
      HAVING SUM(marks) > 0
    LOOP
      v_topic := topic_rec.topic;
      v_topic_marks := topic_rec.total_marks;
      v_topic_awarded := topic_rec.total_awarded;
      v_score_pct := (v_topic_awarded / v_topic_marks) * 100;

      SELECT readiness INTO v_before
      FROM public.v_topic_readiness
      WHERE user_id = NEW.user_id AND topic = v_topic
      ORDER BY created_at DESC
      LIMIT 1;

      v_before := COALESCE(v_before, 0);
      v_after := ROUND(0.6 * v_score_pct + 0.4 * v_before, 1);

      INSERT INTO public.readiness_history(
        user_id, topic, readiness_before, readiness_after, reason, source_id
      ) VALUES (
        NEW.user_id, v_topic, v_before, v_after, 'mock', NEW.id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
