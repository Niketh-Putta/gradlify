-- Remove percentage questions incorrectly tagged as integers/place value.

BEGIN;

DELETE FROM public.exam_questions
WHERE subtopic = 'number|integers'
  AND (
    question ILIKE '%percent%'
    OR question ILIKE '%percentage%'
    OR question LIKE '%\%%' ESCAPE '\'
  );

COMMIT;
