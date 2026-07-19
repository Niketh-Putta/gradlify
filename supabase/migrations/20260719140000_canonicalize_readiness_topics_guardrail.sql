-- Hardening: single DB source of truth for readiness topic labels + write-time guard.
-- Prevents 11+ bank labels (e.g. "Algebra & Ratio") from silently scoring 0% mastery.
-- Keep in sync with src/lib/canonicalTopics.ts

CREATE OR REPLACE FUNCTION public.canonicalize_readiness_topic(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'number', 'arithmetic & number skills', 'number & arithmetic', 'number and arithmetic'
    ) THEN 'Number'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'algebra', 'algebra & ratio', 'algebra and ratio'
    ) THEN 'Algebra'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'ratio', 'ratio & proportion', 'ratio and proportion',
      'word problems & reasoning', 'fractions/decimals/percentages (fdp)', 'fdp'
    ) THEN 'Ratio & Proportion'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'geometry', 'geometry & measures', 'geometry and measures', 'geometry & spatial awareness'
    ) THEN 'Geometry'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'probability', 'speed & accuracy', 'data, probability & problem solving'
    ) THEN 'Probability'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'statistics', 'statistics & data', 'statistics and data', 'data'
    ) THEN 'Statistics'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'comprehension', 'comprehension masterclass'
    ) THEN 'Comprehension'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'vocabulary', 'advanced vocabulary'
    ) THEN 'Vocabulary'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'grammar', 'grammar & syntax', 'spag'
    ) THEN 'Grammar'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'spelling', 'spelling & punctuation'
    ) THEN 'Spelling'
    ELSE NULL
  END;
$$;

-- Combined 11+ sections also credit a paired topic for Topic Progress averages.
CREATE OR REPLACE FUNCTION public.canonicalize_readiness_topic_secondary(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(COALESCE(raw, ''))) IN ('algebra & ratio', 'algebra and ratio')
      THEN 'Ratio & Proportion'
    WHEN lower(trim(COALESCE(raw, ''))) IN ('statistics & data', 'statistics and data')
      THEN 'Probability'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.canonicalize_readiness_topic(text) IS
  'Maps bank/UI topic labels to readiness topics. Mirror: src/lib/canonicalTopics.ts';
COMMENT ON FUNCTION public.canonicalize_readiness_topic_secondary(text) IS
  'Secondary credit for combined 11+ sections. Mirror: src/lib/canonicalTopics.ts';

-- Force-normalize on write so unknown aliases can't slip through.
-- Keep combined 11+ labels (Algebra & Ratio / Statistics & Data) for dual-credit in the view.
CREATE OR REPLACE FUNCTION public.trg_canonicalize_topic_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  canonical text;
  secondary text;
  key text;
BEGIN
  IF NEW.topic IS NULL OR btrim(NEW.topic) = '' THEN
    RETURN NEW;
  END IF;

  key := lower(btrim(NEW.topic));
  secondary := public.canonicalize_readiness_topic_secondary(NEW.topic);

  IF secondary IS NOT NULL THEN
    IF key IN ('algebra & ratio', 'algebra and ratio') THEN
      NEW.topic := 'Algebra & Ratio';
    ELSIF key IN ('statistics & data', 'statistics and data') THEN
      NEW.topic := 'Statistics & Data';
    END IF;
    RETURN NEW;
  END IF;

  canonical := public.canonicalize_readiness_topic(NEW.topic);
  IF canonical IS NOT NULL THEN
    NEW.topic := canonical;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_canonicalize_mock_questions_topic ON public.mock_questions;
CREATE TRIGGER trg_canonicalize_mock_questions_topic
  BEFORE INSERT OR UPDATE OF topic ON public.mock_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_canonicalize_topic_column();

DROP TRIGGER IF EXISTS trg_canonicalize_practice_results_topic ON public.practice_results;
CREATE TRIGGER trg_canonicalize_practice_results_topic
  BEFORE INSERT OR UPDATE OF topic ON public.practice_results
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_canonicalize_topic_column();

-- Rebuild readiness view on the shared SQL functions (aliases live in one place).
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
    public.canonicalize_readiness_topic(pr.topic) AS topic,
    SUM(COALESCE(pr.correct, 0))::numeric AS correct_count,
    SUM(COALESCE(pr.attempts, 0))::numeric AS attempt_count,
    COUNT(DISTINCT CASE WHEN COALESCE(eq.difficulty::integer, 1) >= 3 THEN pr.question_id ELSE NULL END)::numeric AS hard_questions,
    COUNT(DISTINCT pr.question_id)::numeric AS unique_questions,
    MAX(pr.created_at) AS latest_event
  FROM public.practice_results pr
  JOIN user_tracks ut ON ut.user_id = pr.user_id
  LEFT JOIN public.exam_questions eq
    ON pr.question_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND eq.id::text = pr.question_id::text
  WHERE COALESCE(pr.attempts, 0) > 0
  GROUP BY pr.user_id, ut.track, 3
),
practice_dual AS (
  SELECT
    pr.user_id,
    ut.track,
    public.canonicalize_readiness_topic_secondary(pr.topic) AS topic,
    SUM(COALESCE(pr.correct, 0))::numeric AS correct_count,
    SUM(COALESCE(pr.attempts, 0))::numeric AS attempt_count,
    COUNT(DISTINCT CASE WHEN COALESCE(eq.difficulty::integer, 1) >= 3 THEN pr.question_id ELSE NULL END)::numeric AS hard_questions,
    COUNT(DISTINCT pr.question_id)::numeric AS unique_questions,
    MAX(pr.created_at) AS latest_event
  FROM public.practice_results pr
  JOIN user_tracks ut ON ut.user_id = pr.user_id
  LEFT JOIN public.exam_questions eq
    ON pr.question_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND eq.id::text = pr.question_id::text
  WHERE COALESCE(pr.attempts, 0) > 0
    AND public.canonicalize_readiness_topic_secondary(pr.topic) IS NOT NULL
  GROUP BY pr.user_id, ut.track, 3
),
mock_rollup AS (
  SELECT
    ma.user_id,
    ut.track,
    public.canonicalize_readiness_topic(mq.topic) AS topic,
    SUM(COALESCE(mq.awarded_marks, 0))::numeric AS correct_count,
    SUM(COALESCE(mq.marks, 0))::numeric AS attempt_count,
    0::numeric AS hard_questions,
    COUNT(mq.id)::numeric AS unique_questions,
    MAX(ma.created_at) AS latest_event
  FROM public.mock_attempts ma
  JOIN public.mock_questions mq ON mq.attempt_id = ma.id
  JOIN user_tracks ut ON ut.user_id = ma.user_id
  WHERE ma.status = ANY (ARRAY['completed'::text, 'submitted'::text, 'scored'::text])
  GROUP BY ma.user_id, ut.track, 3
),
-- Dual-credit for combined 11+ labels still stored as "Algebra & Ratio" / "Statistics & Data".
mock_dual AS (
  SELECT
    ma.user_id,
    ut.track,
    public.canonicalize_readiness_topic_secondary(mq.topic) AS topic,
    SUM(COALESCE(mq.awarded_marks, 0))::numeric AS correct_count,
    SUM(COALESCE(mq.marks, 0))::numeric AS attempt_count,
    0::numeric AS hard_questions,
    COUNT(mq.id)::numeric AS unique_questions,
    MAX(ma.created_at) AS latest_event
  FROM public.mock_attempts ma
  JOIN public.mock_questions mq ON mq.attempt_id = ma.id
  JOIN user_tracks ut ON ut.user_id = ma.user_id
  WHERE ma.status = ANY (ARRAY['completed'::text, 'submitted'::text, 'scored'::text])
    AND public.canonicalize_readiness_topic_secondary(mq.topic) IS NOT NULL
  GROUP BY ma.user_id, ut.track, 3
),
combined AS (
  SELECT * FROM practice_rollup WHERE topic IS NOT NULL
  UNION ALL
  SELECT * FROM practice_dual WHERE topic IS NOT NULL
  UNION ALL
  SELECT * FROM mock_rollup WHERE topic IS NOT NULL
  UNION ALL
  SELECT * FROM mock_dual WHERE topic IS NOT NULL
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

-- Update mock readiness trigger to use the shared canonicalizer.
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
  IF (TG_OP = 'INSERT' AND NEW.status IN ('completed', 'submitted', 'scored'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('completed', 'submitted', 'scored') AND OLD.status IS DISTINCT FROM NEW.status) THEN

    FOR topic_rec IN
      WITH normalized AS (
        SELECT
          public.canonicalize_readiness_topic(mq.topic) AS topic,
          mq.marks,
          mq.awarded_marks
        FROM mock_questions mq
        WHERE mq.attempt_id = NEW.id
          AND mq.topic IS NOT NULL
      )
      SELECT
        topic,
        SUM(marks) AS total_marks,
        SUM(awarded_marks) AS total_awarded
      FROM normalized
      WHERE topic IS NOT NULL
      GROUP BY topic
      HAVING SUM(marks) > 0
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

-- Backfill only labels with no secondary dual-credit.
-- Leave "Algebra & Ratio" / "Statistics & Data" raw so Topic Progress dual-credit still works;
-- the view + write trigger still map them for Target Focus.
UPDATE public.mock_questions mq
SET topic = public.canonicalize_readiness_topic(mq.topic)
WHERE public.canonicalize_readiness_topic(mq.topic) IS NOT NULL
  AND public.canonicalize_readiness_topic_secondary(mq.topic) IS NULL
  AND mq.topic IS DISTINCT FROM public.canonicalize_readiness_topic(mq.topic);

UPDATE public.practice_results pr
SET topic = public.canonicalize_readiness_topic(pr.topic)
WHERE public.canonicalize_readiness_topic(pr.topic) IS NOT NULL
  AND public.canonicalize_readiness_topic_secondary(pr.topic) IS NULL
  AND pr.topic IS DISTINCT FROM public.canonicalize_readiness_topic(pr.topic);
