-- Clean up non-canonical topic entries
DELETE FROM topic_readiness 
WHERE topic NOT IN ('Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics');

-- Clean up non-canonical history entries
DELETE FROM readiness_history 
WHERE topic NOT IN ('Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics');

-- Add a check constraint to prevent future non-canonical topics
ALTER TABLE topic_readiness DROP CONSTRAINT IF EXISTS topic_readiness_canonical_check;
ALTER TABLE topic_readiness ADD CONSTRAINT topic_readiness_canonical_check 
  CHECK (topic IN ('Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics'));

ALTER TABLE readiness_history DROP CONSTRAINT IF EXISTS readiness_history_canonical_check;
ALTER TABLE readiness_history ADD CONSTRAINT readiness_history_canonical_check 
  CHECK (topic IN ('Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics'));

COMMENT ON CONSTRAINT topic_readiness_canonical_check ON topic_readiness 
  IS 'Ensures only canonical GCSE Maths topics are tracked';
COMMENT ON CONSTRAINT readiness_history_canonical_check ON readiness_history 
  IS 'Ensures only canonical GCSE Maths topics are tracked';;
