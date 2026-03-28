-- Normalize common math operator commands in stored question text
-- Goal: prevent raw "\\times" / "\\div" from ever showing up in UI if math parsing fails.

BEGIN;

-- Replace in question + explanation
UPDATE public.exam_questions
SET
  question = replace(replace(question, E'\\times', '×'), E'\\div', '÷'),
  explanation = CASE
    WHEN explanation IS NULL THEN NULL
    ELSE replace(replace(explanation, E'\\times', '×'), E'\\div', '÷')
  END
WHERE
  question LIKE '%\\times%' OR question LIKE '%\\div%'
  OR (explanation IS NOT NULL AND (explanation LIKE '%\\times%' OR explanation LIKE '%\\div%'));

-- Replace in answer fields
UPDATE public.exam_questions
SET
  correct_answer = replace(replace(correct_answer, E'\\times', '×'), E'\\div', '÷'),
  wrong_answers = ARRAY(
    SELECT replace(replace(x, E'\\times', '×'), E'\\div', '÷')
    FROM unnest(wrong_answers) AS x
  ),
  all_answers = ARRAY(
    SELECT replace(replace(x, E'\\times', '×'), E'\\div', '÷')
    FROM unnest(all_answers) AS x
  )
WHERE
  correct_answer LIKE '%\\times%' OR correct_answer LIKE '%\\div%'
  OR EXISTS (SELECT 1 FROM unnest(wrong_answers) AS x WHERE x LIKE '%\\times%' OR x LIKE '%\\div%')
  OR EXISTS (SELECT 1 FROM unnest(all_answers) AS x WHERE x LIKE '%\\times%' OR x LIKE '%\\div%');

COMMIT;
