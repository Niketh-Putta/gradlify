-- Make the ordinary-number standard form question options all plain numbers with varying zero counts.
-- This keeps every option tightly focused on the decimal-place shift instead of near-miss values.

UPDATE public.exam_questions
SET wrong_answers = ARRAY[
  ((trim(correct_answer)::numeric / 100)::bigint)::text,
  ((trim(correct_answer)::numeric / 10)::bigint)::text,
  ((trim(correct_answer)::numeric * 10)::bigint)::text
],
    all_answers = ARRAY[
  ((trim(correct_answer)::numeric / 100)::bigint)::text,
  ((trim(correct_answer)::numeric / 10)::bigint)::text,
  ((trim(correct_answer)::numeric * 10)::bigint)::text,
  trim(correct_answer)
]
WHERE subtopic = 'number|standard_form'
  AND question ILIKE 'Write % × 10^% as an ordinary number%';
