-- Include English readiness topics in v_topic_readiness + allow English history rows.
-- Without this, Comprehension/SPaG/Vocabulary Target Focus stays at 0% forever.

ALTER TABLE public.readiness_history
  DROP CONSTRAINT IF EXISTS readiness_history_canonical_check;

ALTER TABLE public.readiness_history
  ADD CONSTRAINT readiness_history_canonical_check
  CHECK (topic = ANY (ARRAY[
    'Number'::text,
    'Algebra'::text,
    'Ratio & Proportion'::text,
    'Geometry'::text,
    'Geometry & Measures'::text,
    'Probability'::text,
    'Statistics'::text,
    'Comprehension'::text,
    'Vocabulary'::text,
    'Grammar'::text,
    'Spelling'::text
  ]));

CREATE OR REPLACE VIEW public.v_topic_readiness
WITH (security_invoker = true) AS
WITH canonical_topics AS (
  SELECT unnest(ARRAY[
    'Number'::text,
    'Algebra'::text,
    'Ratio & Proportion'::text,
    'Geometry'::text,
    'Probability'::text,
    'Statistics'::text,
    'Comprehension'::text,
    'Vocabulary'::text,
    'Grammar'::text,
    'Spelling'::text
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
    public.canonicalize_readiness_topic(pr.topic) AS topic,
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
    public.canonicalize_readiness_topic_secondary(pr.topic) AS topic,
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
    AND public.canonicalize_readiness_topic_secondary(pr.topic) IS NOT NULL
  GROUP BY pr.user_id, ut.track, 3
),
mock_rollup AS (
  SELECT
    ma.user_id,
    ut.track,
    public.canonicalize_readiness_topic(mq.topic) AS topic,
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
    public.canonicalize_readiness_topic_secondary(mq.topic) AS topic,
    SUM(COALESCE(mq.awarded_marks, 0))::numeric AS correct_count,
    SUM(COALESCE(mq.marks, 0))::numeric AS attempt_count,
    0::numeric AS hard_questions,
    COUNT(mq.id)::numeric AS unique_questions,
    MAX(ma.created_at) AS latest_event
  FROM public.mock_attempts ma
  JOIN public.mock_questions mq ON mq.attempt_id = ma.id
  JOIN user_tracks ut ON ut.user_id = ma.user_id
  WHERE ma.status = ANY (ARRAY['completed'::text, 'submitted'::text, 'scored'::text])
    AND public.canonicalize_readiness_topic_secondary(mq.topic) IS NOT NULL
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
