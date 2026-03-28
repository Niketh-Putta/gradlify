-- Update v_overall_readiness to round to whole numbers
DROP VIEW IF EXISTS v_overall_readiness;

CREATE VIEW v_overall_readiness AS
WITH canonical_topics AS (
  SELECT unnest(ARRAY['Number'::text, 'Algebra'::text, 'Ratio & Proportion'::text, 'Geometry'::text, 'Probability'::text, 'Statistics'::text]) AS topic
), latest_per_topic AS (
  SELECT DISTINCT ON (rh.topic) 
    rh.user_id,
    rh.topic,
    rh.readiness_after * 2 AS readiness_after
  FROM readiness_history rh
  WHERE rh.topic = ANY (ARRAY['Number'::text, 'Algebra'::text, 'Ratio & Proportion'::text, 'Geometry'::text, 'Probability'::text, 'Statistics'::text])
  ORDER BY rh.topic, rh.created_at DESC
), all_users_topics AS (
  SELECT DISTINCT rh.user_id, ct.topic
  FROM readiness_history rh
  CROSS JOIN canonical_topics ct
), user_readiness AS (
  SELECT 
    aut.user_id,
    aut.topic,
    COALESCE(lpt.readiness_after, 0::numeric) AS readiness
  FROM all_users_topics aut
  LEFT JOIN latest_per_topic lpt ON lpt.user_id = aut.user_id AND lpt.topic = aut.topic
)
SELECT 
  user_id,
  round(avg(readiness)) AS overall
FROM user_readiness
GROUP BY user_id;;
