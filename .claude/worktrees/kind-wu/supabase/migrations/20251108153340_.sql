-- Update v_overall_readiness view to include all 6 canonical topics with 0% default
DROP VIEW IF EXISTS public.v_overall_readiness;

CREATE VIEW public.v_overall_readiness AS
WITH canonical_topics AS (
  SELECT unnest(ARRAY['Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics']) AS topic
),
latest_per_topic AS (
  SELECT DISTINCT ON (rh.topic)
    rh.user_id,
    rh.topic,
    rh.readiness_after
  FROM readiness_history rh
  WHERE rh.topic IN ('Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics')
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
    COALESCE(lpt.readiness_after, 0) as readiness
  FROM all_users_topics aut
  LEFT JOIN latest_per_topic lpt 
    ON lpt.user_id = aut.user_id 
    AND lpt.topic = aut.topic
)
SELECT 
  user_id,
  ROUND(AVG(readiness), 1) as overall
FROM user_readiness
GROUP BY user_id;;
