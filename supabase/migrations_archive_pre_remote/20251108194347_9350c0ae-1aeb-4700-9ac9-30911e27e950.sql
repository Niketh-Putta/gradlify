-- Fix SECURITY DEFINER views by explicitly setting SECURITY INVOKER
-- This ensures views respect the querying user's RLS policies

-- Drop existing views
DROP VIEW IF EXISTS public.v_topic_readiness CASCADE;
DROP VIEW IF EXISTS public.v_topic_last_change CASCADE;
DROP VIEW IF EXISTS public.v_overall_readiness CASCADE;
DROP VIEW IF EXISTS public.question_events_all CASCADE;
DROP VIEW IF EXISTS public.correct_answers_all CASCADE;

-- Recreate correct_answers_all with SECURITY INVOKER
CREATE VIEW public.correct_answers_all 
WITH (security_invoker = true) AS
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

-- Recreate question_events_all with SECURITY INVOKER
CREATE VIEW public.question_events_all 
WITH (security_invoker = true) AS
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

-- Recreate v_topic_readiness with SECURITY INVOKER
CREATE VIEW public.v_topic_readiness 
WITH (security_invoker = true) AS
SELECT DISTINCT ON (user_id, topic) 
  user_id,
  topic,
  readiness_after AS readiness,
  created_at
FROM readiness_history
ORDER BY user_id, topic, created_at DESC;

-- Recreate v_topic_last_change with SECURITY INVOKER
CREATE VIEW public.v_topic_last_change 
WITH (security_invoker = true) AS
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

-- Recreate v_overall_readiness with SECURITY INVOKER
CREATE VIEW public.v_overall_readiness 
WITH (security_invoker = true) AS
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