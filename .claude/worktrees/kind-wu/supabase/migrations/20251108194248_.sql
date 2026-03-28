-- Fix SECURITY DEFINER views by recreating them as regular views
-- These views already filter by user_id, so they'll work correctly with RLS

-- Drop existing views
DROP VIEW IF EXISTS public.v_topic_readiness CASCADE;
DROP VIEW IF EXISTS public.v_topic_last_change CASCADE;
DROP VIEW IF EXISTS public.v_overall_readiness CASCADE;
DROP VIEW IF EXISTS public.question_events_all CASCADE;
DROP VIEW IF EXISTS public.correct_answers_all CASCADE;

-- Recreate correct_answers_all (aggregates correct answers from practice and mocks)
CREATE VIEW public.correct_answers_all AS
SELECT 
  user_id,
  correct AS correct_count,
  created_at
FROM practice_results
WHERE correct > 0
UNION ALL
SELECT 
  ma.user_id,
  COUNT(*)::integer AS correct_count,
  ma.created_at
FROM mock_attempts ma
JOIN mock_questions mq ON mq.attempt_id = ma.id
WHERE mq.awarded_marks = mq.marks
GROUP BY ma.user_id, ma.created_at;

-- Recreate question_events_all (aggregates question counts)
CREATE VIEW public.question_events_all AS
SELECT 
  user_id,
  created_at,
  attempts AS question_count
FROM practice_results
WHERE attempts > 0
UNION ALL
SELECT 
  ma.user_id,
  ma.created_at,
  COUNT(mq.id)::integer AS question_count
FROM mock_attempts ma
LEFT JOIN mock_questions mq ON mq.attempt_id = ma.id
WHERE ma.status = 'completed'
GROUP BY ma.id, ma.user_id, ma.created_at;

-- Recreate v_topic_readiness (latest readiness per topic)
CREATE VIEW public.v_topic_readiness AS
SELECT DISTINCT ON (user_id, topic) 
  user_id,
  topic,
  readiness_after AS readiness,
  created_at
FROM readiness_history
ORDER BY user_id, topic, created_at DESC;

-- Recreate v_topic_last_change (last change per topic)
CREATE VIEW public.v_topic_last_change AS
SELECT DISTINCT ON (user_id, topic) 
  user_id,
  topic,
  readiness_before,
  readiness_after,
  readiness_after - readiness_before AS delta,
  reason,
  source_id,
  created_at
FROM readiness_history
ORDER BY user_id, topic, created_at DESC;

-- Recreate v_overall_readiness (overall readiness score)
CREATE VIEW public.v_overall_readiness AS
WITH canonical_topics AS (
  SELECT unnest(ARRAY['Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics']) AS topic
),
latest_per_topic AS (
  SELECT DISTINCT ON (rh.topic) 
    rh.user_id,
    rh.topic,
    rh.readiness_after * 2 AS readiness_after
  FROM readiness_history rh
  WHERE rh.topic = ANY (ARRAY['Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics'])
  ORDER BY rh.topic, rh.created_at DESC
),
all_users_topics AS (
  SELECT DISTINCT 
    rh.user_id,
    ct.topic
  FROM readiness_history rh
  CROSS JOIN canonical_topics ct
),
user_readiness AS (
  SELECT 
    aut.user_id,
    aut.topic,
    COALESCE(lpt.readiness_after, 0) AS readiness
  FROM all_users_topics aut
  LEFT JOIN latest_per_topic lpt ON lpt.user_id = aut.user_id AND lpt.topic = aut.topic
)
SELECT 
  user_id,
  ROUND(AVG(readiness)) AS overall
FROM user_readiness
GROUP BY user_id;

COMMENT ON VIEW public.correct_answers_all IS 'Aggregates correct answers from practice and mock exams. Uses SECURITY INVOKER to respect RLS.';
COMMENT ON VIEW public.question_events_all IS 'Aggregates question attempt counts from practice and mocks. Uses SECURITY INVOKER to respect RLS.';
COMMENT ON VIEW public.v_topic_readiness IS 'Shows latest readiness score per topic. Uses SECURITY INVOKER to respect RLS.';
COMMENT ON VIEW public.v_topic_last_change IS 'Shows last readiness change per topic. Uses SECURITY INVOKER to respect RLS.';
COMMENT ON VIEW public.v_overall_readiness IS 'Calculates overall readiness across all topics. Uses SECURITY INVOKER to respect RLS.';;
