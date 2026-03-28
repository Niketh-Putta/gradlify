-- Enforce strict track isolation for readiness calculations.

ALTER TABLE public.readiness_history
  ADD COLUMN IF NOT EXISTS track public.user_track;

UPDATE public.readiness_history rh
SET track = COALESCE(p.track, 'gcse'::public.user_track)
FROM public.profiles p
WHERE rh.user_id = p.user_id
  AND rh.track IS NULL;

-- Preserve historical GCSE progress for existing users.
UPDATE public.readiness_history
SET track = 'gcse'::public.user_track
WHERE created_at < '2026-02-12T00:00:00Z'::timestamptz;

UPDATE public.readiness_history
SET track = 'gcse'::public.user_track
WHERE track IS NULL;

ALTER TABLE public.readiness_history
  ALTER COLUMN track SET DEFAULT 'gcse'::public.user_track,
  ALTER COLUMN track SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_readiness_history_user_track_topic_created
  ON public.readiness_history (user_id, track, topic, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_readiness_history_track_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track public.user_track;
BEGIN
  IF NEW.track IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_track
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  NEW.track := COALESCE(v_track, 'gcse'::public.user_track);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_readiness_history_track ON public.readiness_history;
CREATE TRIGGER trg_readiness_history_track
BEFORE INSERT ON public.readiness_history
FOR EACH ROW
EXECUTE FUNCTION public.set_readiness_history_track_from_profile();

CREATE OR REPLACE FUNCTION public.log_readiness_change(
  p_topic text,
  p_before numeric,
  p_after numeric,
  p_reason text DEFAULT 'manual:update'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_track public.user_track;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_track
  FROM public.profiles p
  WHERE p.user_id = v_uid;
  v_track := COALESCE(v_track, 'gcse'::public.user_track);

  INSERT INTO public.readiness_history (
    user_id,
    topic,
    readiness_before,
    readiness_after,
    change,
    reason,
    source_id,
    track,
    created_at
  )
  VALUES (
    v_uid,
    p_topic,
    p_before,
    p_after,
    p_after - p_before,
    COALESCE(NULLIF(trim(p_reason), ''), 'manual:update'),
    NULL,
    v_track,
    now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_readiness_change(text, numeric, numeric, text) TO authenticated;

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
  -- TRACK ISOLATION — Prevents GCSE activity affecting 11+ readiness
  WHERE rh.track = ut.track
  ORDER BY rh.user_id, rh.track, rh.topic, rh.created_at DESC
),
practice_rollup AS (
  SELECT
    pr.user_id,
    ut.track,
    CASE
      WHEN lower(COALESCE(pr.topic, '')) IN ('number', 'arithmetic & number skills', 'number & arithmetic') THEN 'Number'
      WHEN lower(COALESCE(pr.topic, '')) IN ('algebra') THEN 'Algebra'
      WHEN lower(COALESCE(pr.topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion', 'word problems & reasoning', 'fractions/decimals/percentages (fdp)', 'fdp') THEN 'Ratio & Proportion'
      WHEN lower(COALESCE(pr.topic, '')) IN ('geometry', 'geometry & measures', 'geometry and measures', 'geometry & spatial awareness') THEN 'Geometry'
      WHEN lower(COALESCE(pr.topic, '')) IN ('probability', 'speed & accuracy', 'data, probability & problem solving') THEN 'Probability'
      WHEN lower(COALESCE(pr.topic, '')) IN ('statistics') THEN 'Statistics'
      ELSE NULL
    END AS topic,
    SUM(COALESCE(pr.correct, 0))::numeric AS correct_count,
    SUM(COALESCE(pr.attempts, 0))::numeric AS attempt_count,
    MAX(pr.created_at) AS latest_event
  FROM public.practice_results pr
  JOIN user_tracks ut ON ut.user_id = pr.user_id
  -- TRACK ISOLATION — Prevents GCSE activity affecting 11+ readiness
  WHERE pr.track = ut.track
    AND COALESCE(pr.attempts, 0) > 0
  GROUP BY pr.user_id, ut.track, 3
),
mock_rollup AS (
  SELECT
    ma.user_id,
    ut.track,
    CASE
      WHEN lower(COALESCE(mq.topic, '')) IN ('number', 'arithmetic & number skills', 'number & arithmetic') THEN 'Number'
      WHEN lower(COALESCE(mq.topic, '')) IN ('algebra') THEN 'Algebra'
      WHEN lower(COALESCE(mq.topic, '')) IN ('ratio', 'ratio & proportion', 'ratio and proportion', 'word problems & reasoning', 'fractions/decimals/percentages (fdp)', 'fdp') THEN 'Ratio & Proportion'
      WHEN lower(COALESCE(mq.topic, '')) IN ('geometry', 'geometry & measures', 'geometry and measures', 'geometry & spatial awareness') THEN 'Geometry'
      WHEN lower(COALESCE(mq.topic, '')) IN ('probability', 'speed & accuracy', 'data, probability & problem solving') THEN 'Probability'
      WHEN lower(COALESCE(mq.topic, '')) IN ('statistics') THEN 'Statistics'
      ELSE NULL
    END AS topic,
    SUM(CASE WHEN COALESCE(mq.marks, 0) > 0 AND COALESCE(mq.awarded_marks, 0) >= mq.marks THEN 1 ELSE 0 END)::numeric AS correct_count,
    COUNT(mq.id)::numeric AS attempt_count,
    MAX(ma.created_at) AS latest_event
  FROM public.mock_attempts ma
  JOIN public.mock_questions mq ON mq.attempt_id = ma.id
  JOIN user_tracks ut ON ut.user_id = ma.user_id
  -- TRACK ISOLATION — Prevents GCSE activity affecting 11+ readiness
  WHERE ma.track = ut.track
    AND ma.status IN ('completed', 'submitted', 'scored')
  GROUP BY ma.user_id, ut.track, 3
),
combined AS (
  SELECT * FROM practice_rollup WHERE topic IS NOT NULL
  UNION ALL
  SELECT * FROM mock_rollup WHERE topic IS NOT NULL
),
aggregated AS (
  SELECT
    c.user_id,
    c.track,
    c.topic,
    SUM(c.correct_count) AS total_correct,
    SUM(c.attempt_count) AS total_attempts,
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
    WHEN COALESCE(a.total_attempts, 0) > 0
      THEN ROUND((a.total_correct / a.total_attempts) * 100, 1)::numeric(5,1)
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

CREATE OR REPLACE VIEW public.v_topic_last_change
WITH (security_invoker = true) AS
WITH current_tracks AS (
  SELECT p.user_id, COALESCE(p.track, 'gcse'::public.user_track) AS track
  FROM public.profiles p
)
SELECT DISTINCT ON (rh.user_id, rh.topic)
  rh.user_id,
  rh.topic,
  rh.readiness_before,
  rh.readiness_after,
  rh.readiness_after - rh.readiness_before AS delta,
  rh.reason,
  rh.source_id,
  rh.created_at,
  rh.track
FROM public.readiness_history rh
JOIN current_tracks ct ON ct.user_id = rh.user_id
-- TRACK ISOLATION — Prevents GCSE activity affecting 11+ readiness
WHERE rh.track = ct.track
ORDER BY rh.user_id, rh.topic, rh.created_at DESC;

CREATE OR REPLACE VIEW public.v_overall_readiness
WITH (security_invoker = true) AS
SELECT
  vtr.user_id,
  ROUND(AVG(vtr.readiness), 1) AS overall,
  vtr.track
FROM public.v_topic_readiness vtr
GROUP BY vtr.user_id, vtr.track;

CREATE OR REPLACE FUNCTION public.get_readiness_overview()
RETURNS TABLE(
  topic text,
  readiness numeric,
  last_updated timestamptz,
  overall_average numeric,
  tracking_mode public.tracking_mode
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_track public.user_track;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(p.track, 'gcse'::public.user_track)
  INTO v_track
  FROM public.profiles p
  WHERE p.user_id = v_uid;
  v_track := COALESCE(v_track, 'gcse'::public.user_track);

  RETURN QUERY
  WITH topic_rows AS (
    SELECT
      vtr.topic,
      vtr.readiness,
      vtr.created_at AS last_updated
    FROM public.v_topic_readiness vtr
    -- TRACK ISOLATION — Prevents GCSE activity affecting 11+ readiness
    WHERE vtr.user_id = v_uid
      AND vtr.track = v_track
  ),
  avg_row AS (
    SELECT COALESCE(ROUND(AVG(topic_rows.readiness), 1), 0::numeric) AS overall_average
    FROM topic_rows
  ),
  mode_row AS (
    SELECT COALESCE(us.tracking, 'auto'::public.tracking_mode) AS tracking_mode
    FROM public.user_settings us
    WHERE us.user_id = v_uid
  )
  SELECT
    tr.topic,
    tr.readiness,
    tr.last_updated,
    ar.overall_average,
    COALESCE((SELECT mr.tracking_mode FROM mode_row mr), 'auto'::public.tracking_mode) AS tracking_mode
  FROM topic_rows tr
  CROSS JOIN avg_row ar
  ORDER BY tr.topic;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_readiness_overview() TO authenticated;
