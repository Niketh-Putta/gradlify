-- Fix v_overall_readiness to calculate correctly without multiplication
DROP VIEW IF EXISTS public.v_overall_readiness CASCADE;

CREATE VIEW public.v_overall_readiness 
WITH (security_invoker = true) AS
WITH canonical_topics AS (
  SELECT unnest(ARRAY['Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics']) AS topic
),
latest_per_topic AS (
  SELECT DISTINCT ON (rh.topic) 
    rh.user_id,
    rh.topic,
    rh.readiness_after AS readiness_after  -- Removed the * 2 multiplication
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

COMMENT ON VIEW public.v_overall_readiness IS 'Calculates overall readiness across all topics without multiplication. Uses SECURITY INVOKER to respect RLS.';