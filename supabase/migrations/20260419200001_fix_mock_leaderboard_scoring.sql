-- Robust leaderboard view update
-- This ensures mock exam results are captured correctly even if the status is different,
-- and simplifies the logic to use the already calculated 'score' column in mock_attempts.

CREATE OR REPLACE VIEW public.correct_answers_all AS
SELECT
  pr.user_id,
  pr.correct AS correct_count,
  pr.created_at,
  'practice'::text AS source,
  pr.track
FROM public.practice_results pr
WHERE pr.correct > 0
UNION ALL
SELECT
  ma.user_id,
  COALESCE(ma.score, 0)::integer AS correct_count,
  ma.created_at,
  'mock'::text AS source,
  ma.track
FROM public.mock_attempts ma
WHERE ma.status IN ('completed', 'submitted', 'scored', 'finished')
  AND ma.score > 0
UNION ALL
SELECT
  er.user_id,
  er.correct::integer AS correct_count,
  er.created_at,
  'challenge'::text AS source,
  er.track
FROM public.extreme_results er
WHERE er.correct > 0;

GRANT SELECT ON public.correct_answers_all TO authenticated;
