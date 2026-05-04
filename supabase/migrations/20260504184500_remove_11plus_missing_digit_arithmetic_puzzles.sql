DELETE FROM public.exam_questions
WHERE track = '11plus'
  AND subtopic = 'number|addition-subtraction'
  AND (
    question ILIKE '%ancient addition puzzle%'
    OR question ILIKE '%partial inscription%'
    OR question ILIKE '%replace the blank%'
  );
