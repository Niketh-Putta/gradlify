-- Update readiness calculation to penalize low volume and lack of level 3+ questions.

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
      WHEN lower(COALESCE(pr.topic, '')) IN ('number', 'arithmetic & number skills', 'number & arithmetic') THEN 'Number'
      WHEN lower(COALESCE(pr.topic, '')) IN ('algebra') THEN 'Algebra'
      WHEN lower(COALESCE(pr.topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion', 'word problems & reasoning', 'fractions/decimals/percentages (fdp)', 'fdp') THEN 'Ratio & Proportion'
      WHEN lower(COALESCE(pr.topic, '')) IN ('geometry', 'geometry & measures', 'geometry and measures', 'geometry & spatial awareness') THEN 'Geometry'
      WHEN lower(COALESCE(pr.topic, '')) IN ('probability', 'speed & accuracy', 'data, probability & problem solving') THEN 'Probability'
      WHEN lower(COALESCE(pr.topic, '')) IN ('statistics') THEN 'Statistics'
      ELSE NULL
    END AS topic,
    SUM(COALESCE(pr.correct, 0))::numeric AS correct_count,
    SUM(COALESCE(pr.attempts, 0))::numeric AS attempt_count,
    COUNT(DISTINCT CASE WHEN COALESCE(eq.difficulty, 1) >= 3 THEN pr.question_id END)::numeric AS hard_questions,
    COUNT(DISTINCT pr.question_id)::numeric AS unique_questions,
    MAX(pr.created_at) AS latest_event
  FROM public.practice_results pr
  JOIN user_tracks ut ON ut.user_id = pr.user_id
  LEFT JOIN public.exam_questions eq ON NULLIF(pr.question_id, '') IS NOT NULL AND (pr.question_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AND eq.id = pr.question_id::uuid
  WHERE COALESCE(pr.attempts, 0) > 0
  GROUP BY pr.user_id, ut.track, 3
),
mock_rollup AS (
  SELECT
    ma.user_id,
    ut.track,
    CASE
      WHEN lower(COALESCE(mq.topic, '')) IN ('number', 'arithmetic & number skills', 'number & arithmetic') THEN 'Number'
      WHEN lower(COALESCE(mq.topic, '')) IN ('algebra') THEN 'Algebra'
      WHEN lower(COALESCE(mq.topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion', 'word problems & reasoning', 'fractions/decimals/percentages (fdp)', 'fdp') THEN 'Ratio & Proportion'
      WHEN lower(COALESCE(mq.topic, '')) IN ('geometry', 'geometry & measures', 'geometry and measures', 'geometry & spatial awareness') THEN 'Geometry'
      WHEN lower(COALESCE(mq.topic, '')) IN ('probability', 'speed & accuracy', 'data, probability & problem solving') THEN 'Probability'
      WHEN lower(COALESCE(mq.topic, '')) IN ('statistics') THEN 'Statistics'
      ELSE NULL
    END AS topic,
    SUM(CASE WHEN COALESCE(mq.marks, 0) > 0 AND COALESCE(mq.awarded_marks, 0) >= mq.marks THEN 1 ELSE 0 END)::numeric AS correct_count,
    COUNT(mq.id)::numeric AS attempt_count,
    0::numeric AS hard_questions,
    COUNT(mq.id)::numeric AS unique_questions,
    MAX(ma.created_at) AS latest_event
  FROM public.mock_attempts ma
  JOIN public.mock_questions mq ON mq.attempt_id = ma.id
  JOIN user_tracks ut ON ut.user_id = ma.user_id
  WHERE ma.status IN ('completed', 'submitted', 'scored')
  GROUP BY ma.user_id, ut.track, 3
),
combined AS (
  SELECT * FROM practice_rollup WHERE topic IS NOT NULL
  UNION ALL
  SELECT * FROM mock_rollup WHERE topic IS NOT NULL
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
      -- Bayesian Average: start at a baseline of 40% with a weight of 15 attempts.
      -- So if you do 2 questions perfectly, you don't instantly jump to 100%.
      -- (user_correct + (15 * 0.40)) / (user_attempts + 15) * 100
      -- Also cap the maximum readiness to 85% if they haven't completed at least 5 level 3 questions
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

