-- Fix trigonometry function syntax and degree symbols
-- Patterns like \sin31° need to become \sin(31^\circ)

-- 1. Fix degree symbols in correct_answer: ° → ^\circ
UPDATE exam_questions
SET correct_answer = replace(correct_answer, '°', '^\circ')
WHERE correct_answer ~ '°';

-- 2. Fix trig functions in correct_answer: \sin31 → \sin(31)
-- Pattern: \sin, \cos, \tan, \cot, \sec, \csc followed by digits
UPDATE exam_questions
SET correct_answer = regexp_replace(
  correct_answer,
  '(\\\\sin|\\\\cos|\\\\tan|\\\\cot|\\\\sec|\\\\csc)([0-9]+)',
  '\1(\2)',
  'g'
)
WHERE correct_answer ~ '(\\sin|\\cos|\\tan|\\cot|\\sec|\\csc)[0-9]';

-- 3. Fix degree symbols in all_answers array
UPDATE exam_questions
SET all_answers = array(
  SELECT replace(ans, '°', '^\circ')
  FROM unnest(all_answers) AS ans
)
WHERE EXISTS (
  SELECT 1 FROM unnest(all_answers) AS ans WHERE ans ~ '°'
);

-- 4. Fix trig functions in all_answers array
UPDATE exam_questions
SET all_answers = array(
  SELECT regexp_replace(
    ans,
    '(\\\\sin|\\\\cos|\\\\tan|\\\\cot|\\\\sec|\\\\csc)([0-9]+)',
    '\1(\2)',
    'g'
  )
  FROM unnest(all_answers) AS ans
)
WHERE EXISTS (
  SELECT 1 FROM unnest(all_answers) AS ans 
  WHERE ans ~ '(\\sin|\\cos|\\tan|\\cot|\\sec|\\csc)[0-9]'
);

-- 5. Fix degree symbols in questions
UPDATE exam_questions
SET question = replace(question, '°', '^\circ')
WHERE question ~ '°';

-- 6. Fix trig functions in questions  
UPDATE exam_questions
SET question = regexp_replace(
  question,
  '(\\\\sin|\\\\cos|\\\\tan|\\\\cot|\\\\sec|\\\\csc)([0-9]+)',
  '\1(\2)',
  'g'
)
WHERE question ~ '(\\sin|\\cos|\\tan|\\cot|\\sec|\\csc)[0-9]';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed trigonometry syntax and degree symbols across all exam questions';
END $$;