-- Normalize Ratio topic naming across DB tables to the canonical app label.
-- Canonical: "Ratio & Proportion"

BEGIN;

-- topics catalog (reference data)
UPDATE public.topics
SET name = 'Ratio & Proportion'
WHERE (
	lower(coalesce(code, '')) = 'ratio'
	OR lower(coalesce(slug, '')) IN ('ratio', 'ratio-proportion', 'ratio-and-proportion')
	OR lower(coalesce(name, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion')
)
AND name <> 'Ratio & Proportion';

-- exam question bank
UPDATE public.exam_questions
SET question_type = 'Ratio & Proportion'
WHERE lower(coalesce(question_type, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion')
	AND question_type <> 'Ratio & Proportion';

-- practice tracking (feeds readiness)
UPDATE public.practice_results
SET topic = 'Ratio & Proportion'
WHERE lower(coalesce(topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion')
	AND topic <> 'Ratio & Proportion';

-- mock tracking (for analytics / review)
UPDATE public.mock_questions
SET topic = 'Ratio & Proportion'
WHERE lower(coalesce(topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion')
	AND topic <> 'Ratio & Proportion';

-- readiness tables (must satisfy canonical constraints)
UPDATE public.topic_readiness
SET topic = 'Ratio & Proportion'
WHERE lower(coalesce(topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion')
	AND topic <> 'Ratio & Proportion';

UPDATE public.readiness_history
SET topic = 'Ratio & Proportion'
WHERE lower(coalesce(topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion')
	AND topic <> 'Ratio & Proportion';

COMMIT;

