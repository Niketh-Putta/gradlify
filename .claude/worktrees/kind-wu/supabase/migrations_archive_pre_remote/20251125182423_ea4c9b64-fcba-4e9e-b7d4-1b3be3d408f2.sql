
-- Comprehensive LaTeX cleanup: Fix all 86 broken questions
-- This removes dollar signs, replaces Unicode symbols, and normalizes LaTeX commands

-- Step 1: Remove all dollar signs from correct_answer
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '\$', '', 'g')
WHERE correct_answer ~ '\$';

-- Step 2: Remove all dollar signs from all_answers array elements
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '\$', '', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '\$';

-- Step 3: Replace Unicode × with \times in correct_answer
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '×', '\\times', 'g')
WHERE correct_answer ~ '×';

-- Step 4: Replace Unicode × with \times in all_answers
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '×', '\\times', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '×';

-- Step 5: Replace Unicode √ with \sqrt{ in correct_answer
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '√', '\\sqrt{', 'g')
WHERE correct_answer ~ '√';

-- Step 6: Replace Unicode √ with \sqrt{ in all_answers
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '√', '\\sqrt{', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '√';

-- Step 7: Fix \sqrt followed by digits without braces in correct_answer
-- Converts \sqrt2 to \sqrt{2}, \sqrt55 to \sqrt{55}, etc.
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '\\sqrt([0-9]+)', '\\sqrt{\1}', 'g')
WHERE correct_answer ~ '\\sqrt[0-9]';

-- Step 8: Fix \sqrt followed by digits without braces in all_answers
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '\\sqrt([0-9]+)', '\\sqrt{\1}', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '\\sqrt[0-9]';

-- Log summary
DO $$
BEGIN
  RAISE NOTICE 'LaTeX cleanup complete: removed dollar signs, replaced Unicode symbols, normalized sqrt commands';
END $$;
