-- Replace ASCII 'x' with the multiplication sign in standard-form content.
-- Keeps the presentation consistent for the 40 standard-form questions in the bank.

UPDATE public.exam_questions
SET question = regexp_replace(question, '(?<!×)x(?=\\s*10)', '×', 'gi')
WHERE subtopic = 'number|standard_form';

UPDATE public.exam_questions
SET explanation = regexp_replace(explanation, '(?<!×)x(?=\\s*10)', '×', 'gi')
WHERE subtopic = 'number|standard_form' AND explanation IS NOT NULL;

UPDATE public.exam_questions
SET correct_answer = regexp_replace(correct_answer, '(?<!×)x(?=\\s*10)', '×', 'gi')
WHERE subtopic = 'number|standard_form' AND correct_answer IS NOT NULL;

UPDATE public.exam_questions eq
SET wrong_answers = updated.new_wrong_answers
FROM (
  SELECT eq.id,
         array_agg(
           regexp_replace(w.elem, '(?<!×)x(?=\\s*10)', '×', 'gi') ORDER BY w.ord
         ) AS new_wrong_answers
  FROM public.exam_questions eq
  CROSS JOIN LATERAL unnest(eq.wrong_answers) WITH ORDINALITY AS w(elem, ord)
  WHERE eq.subtopic = 'number|standard_form'
  GROUP BY eq.id
) AS updated
WHERE eq.id = updated.id;
