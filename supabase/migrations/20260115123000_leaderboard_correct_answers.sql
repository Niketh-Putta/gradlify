-- Leaderboard should reflect correct answers (not attempts).
CREATE OR REPLACE VIEW public.question_events_all AS
-- Practice questions (use correct as question count)
SELECT
  user_id,
  created_at,
  correct AS question_count
FROM public.practice_results
WHERE attempts > 0

UNION ALL

-- Mock exam questions (count fully correct questions)
SELECT
  ma.user_id,
  ma.created_at,
  SUM(
    CASE
      WHEN COALESCE(mq.marks, 0) > 0
        AND COALESCE(mq.awarded_marks, 0) >= mq.marks
        THEN 1
      ELSE 0
    END
  )::int AS question_count
FROM public.mock_attempts ma
LEFT JOIN public.mock_questions mq ON mq.attempt_id = ma.id
WHERE ma.status IN ('completed', 'submitted', 'scored')
GROUP BY ma.id, ma.user_id, ma.created_at;

COMMENT ON VIEW public.question_events_all IS 'Aggregates correct answers from practice and mock exams.';
