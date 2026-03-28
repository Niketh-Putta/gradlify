
DROP VIEW IF EXISTS public.v_topic_readiness CASCADE;
DROP VIEW IF EXISTS public.v_topic_last_change CASCADE;
DROP VIEW IF EXISTS public.v_overall_readiness CASCADE;
DROP VIEW IF EXISTS public.question_events_all CASCADE;
DROP VIEW IF EXISTS public.correct_answers_all CASCADE;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'readiness_history'
			AND column_name = 'source_id'
			AND data_type <> 'text'
	) THEN
		ALTER TABLE public.readiness_history
			ALTER COLUMN source_id TYPE text
			USING source_id::text;
	END IF;
END $$;

CREATE OR REPLACE FUNCTION public.practice_results_auto_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_tracking tracking_mode;
	v_computed record;
BEGIN
	SELECT tracking INTO v_tracking
	FROM user_settings
	WHERE user_id = NEW.user_id;

	v_tracking := COALESCE(v_tracking, 'auto');

	IF v_tracking = 'auto' THEN
		SELECT * INTO v_computed
		FROM compute_new_readiness(NEW.id);

		INSERT INTO topic_readiness (user_id, topic, readiness, updated_at)
		VALUES (v_computed.user_id, v_computed.topic, v_computed.new_readiness, now())
		ON CONFLICT (user_id, topic) DO UPDATE
			SET readiness = EXCLUDED.readiness,
					updated_at = EXCLUDED.updated_at;

		INSERT INTO readiness_history (
			user_id, topic, readiness_before, readiness_after,
			change, reason, source_id, created_at
		) VALUES (
			v_computed.user_id, v_computed.topic, v_computed.previous_readiness,
			v_computed.new_readiness, v_computed.change, 'auto:update', NEW.id::text, now()
		);
	END IF;

	RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_readiness_from_mock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
	v_topic text;
	v_before numeric := 0;
	v_after numeric := 0;
	v_topic_marks numeric := 0;
	v_topic_awarded numeric := 0;
	v_score_pct numeric := 0;
	topic_rec record;
BEGIN
	IF (TG_OP = 'INSERT' AND NEW.status = 'completed')
		 OR (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed') THEN

		FOR topic_rec IN
			SELECT
				mq.topic,
				SUM(mq.marks) as total_marks,
				SUM(mq.awarded_marks) as total_awarded
			FROM mock_questions mq
			WHERE mq.attempt_id = NEW.id
				AND mq.topic IS NOT NULL
				AND mq.topic IN ('Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics')
			GROUP BY mq.topic
			HAVING SUM(mq.marks) > 0
		LOOP
			v_topic := topic_rec.topic;
			v_topic_marks := topic_rec.total_marks;
			v_topic_awarded := topic_rec.total_awarded;

			v_score_pct := (v_topic_awarded / v_topic_marks) * 100;

			SELECT readiness INTO v_before
			FROM public.v_topic_readiness
			WHERE user_id = NEW.user_id AND topic = v_topic
			ORDER BY created_at DESC
			LIMIT 1;

			v_before := COALESCE(v_before, 0);

			v_after := ROUND(0.6 * v_score_pct + 0.4 * v_before, 1);

			INSERT INTO public.readiness_history(
				user_id, topic, readiness_before, readiness_after, reason, source_id
			) VALUES (
				NEW.user_id, v_topic, v_before, v_after, 'mock', NEW.id::text
			);
		END LOOP;
	END IF;

	RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_ai_readiness_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	prev_readiness numeric;
	new_readiness numeric;
	delta numeric;
BEGIN
	SELECT readiness INTO prev_readiness
	FROM v_topic_readiness
	WHERE user_id = NEW.user_id AND topic = NEW.topic;

	prev_readiness := COALESCE(prev_readiness, 0);

	delta := compute_ai_readiness_delta(
		prev_readiness,
		NEW.correct,
		NEW.difficulty,
		NEW.time_secs
	);

	new_readiness := GREATEST(0, LEAST(100, prev_readiness + delta));

	INSERT INTO readiness_history (
		user_id,
		topic,
		readiness_before,
		readiness_after,
		reason,
		source_id
	) VALUES (
		NEW.user_id,
		NEW.topic,
		prev_readiness,
		new_readiness,
		'ai_inference',
		NEW.id::text
	);

	RETURN NEW;
END;
$$;

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

CREATE VIEW public.v_topic_readiness
WITH (security_invoker = true) AS
WITH canonical_topics AS (
	SELECT DISTINCT topic_key
	FROM topic_catalog
),
canonical_subtopics AS (
	SELECT topic_key, subtopic_key
	FROM topic_catalog
),
users_with_profiles AS (
	SELECT user_id
	FROM profiles
),
user_subtopic_grid AS (
	SELECT 
		users_with_profiles.user_id,
		canonical_subtopics.topic_key,
		canonical_subtopics.subtopic_key
	FROM users_with_profiles
	CROSS JOIN canonical_subtopics
),
completed_scores AS (
	SELECT
		user_subtopic_grid.user_id,
		user_subtopic_grid.topic_key,
		user_subtopic_grid.subtopic_key,
		COALESCE(sp.score, 0) AS score,
		sp.last_updated
	FROM user_subtopic_grid
	LEFT JOIN subtopic_progress sp
		ON sp.user_id = user_subtopic_grid.user_id
		AND sp.topic_key = user_subtopic_grid.topic_key
		AND sp.subtopic_key = user_subtopic_grid.subtopic_key
)
SELECT
	user_id,
	CASE topic_key
		WHEN 'number' THEN 'Number'
		WHEN 'algebra' THEN 'Algebra'
		WHEN 'ratio' THEN 'Ratio & Proportion'
		WHEN 'geometry' THEN 'Geometry & Measures'
		WHEN 'probability' THEN 'Probability'
		WHEN 'statistics' THEN 'Statistics'
		ELSE topic_key
	END AS topic,
	ROUND(AVG(score)) AS readiness,
	COALESCE(MAX(last_updated), now()) AS created_at
FROM completed_scores
GROUP BY user_id, topic_key;

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
