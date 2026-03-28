-- Normalize legacy topic aliases in practice_results and make readiness computation resilient.
-- Canonical topics used by the app:
--   Number, Algebra, Ratio & Proportion, Geometry & Measures, Probability, Statistics

BEGIN;

-- Normalize stored practice_results topics (these feed readiness triggers).
UPDATE public.practice_results
SET topic = 'Ratio & Proportion'
WHERE topic IN (
	'Ratio',
	'ratio',
	'Ratio and Proportion',
	'Ratio & Proportion',
	'ratio and proportion',
	'ratio & proportion'
);

UPDATE public.practice_results
SET topic = 'Geometry & Measures'
WHERE topic IN (
	'Geometry',
	'geometry',
	'Geometry & Measures',
	'geometry & measures',
	'Geometry and Measures',
	'geometry and measures'
);

-- Recreate compute_new_readiness with canonical topic normalization.
-- This prevents any future non-canonical topic string in practice_results from breaking readiness.
CREATE OR REPLACE FUNCTION public.compute_new_readiness(result_id bigint)
RETURNS TABLE(
	user_id uuid,
	topic text,
	previous_readiness numeric,
	new_readiness numeric,
	change numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id uuid;
	v_topic text;
	v_attempts integer;
	v_correct integer;
	v_created_at timestamp with time zone;
	v_accuracy numeric;
	v_recency numeric;
	v_consistency numeric;
	v_weighted numeric;
	v_prev_readiness numeric;
	v_new_readiness numeric;
	v_change numeric;
	v_days_ago integer;
	v_sessions integer;
BEGIN
	-- Get practice result data
	SELECT pr.user_id, pr.topic, pr.attempts, pr.correct, pr.created_at
	INTO v_user_id, v_topic, v_attempts, v_correct, v_created_at
	FROM practice_results pr
	WHERE pr.id = result_id;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Result ID % not found', result_id;
	END IF;

	-- Canonicalize topic labels (guards against legacy UI strings)
	v_topic := CASE
		WHEN lower(coalesce(v_topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion') THEN 'Ratio & Proportion'
		WHEN lower(coalesce(v_topic, '')) IN ('geometry', 'geometry & measures', 'geometry and measures') THEN 'Geometry & Measures'
		WHEN lower(coalesce(v_topic, '')) = 'number' THEN 'Number'
		WHEN lower(coalesce(v_topic, '')) = 'algebra' THEN 'Algebra'
		WHEN lower(coalesce(v_topic, '')) = 'probability' THEN 'Probability'
		WHEN lower(coalesce(v_topic, '')) = 'statistics' THEN 'Statistics'
		ELSE v_topic
	END;

	-- Get previous readiness (default to 0)
	SELECT tr.readiness INTO v_prev_readiness
	FROM topic_readiness tr
	WHERE tr.user_id = v_user_id AND tr.topic = v_topic;

	v_prev_readiness := COALESCE(v_prev_readiness, 0);

	-- Calculate accuracy
	v_accuracy := v_correct::numeric / v_attempts::numeric;

	-- Calculate recency
	v_days_ago := EXTRACT(day FROM now() - v_created_at)::integer;
	v_recency := recency_factor(v_days_ago);

	-- Calculate consistency
	v_sessions := monthly_sessions(v_user_id, v_topic);
	v_consistency := CASE WHEN v_sessions >= 4 THEN 1.0 ELSE 0.5 END;

	-- Calculate weighted score
	v_weighted := (v_accuracy * 0.7) + (v_recency * 0.2) + (v_consistency * 0.1);

	-- Calculate new readiness (60% previous, 40% new weighted)
	v_new_readiness := ROUND((0.6 * v_prev_readiness) + (0.4 * (v_weighted * 100)), 1);

	-- Ensure bounds
	v_new_readiness := GREATEST(0, LEAST(100, v_new_readiness));

	v_change := ROUND(v_new_readiness - v_prev_readiness, 1);

	RETURN QUERY SELECT v_user_id, v_topic, v_prev_readiness, v_new_readiness, v_change;
END;
$$;

COMMIT;

