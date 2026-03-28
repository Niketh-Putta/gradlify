-- Comprehensive LaTeX notation fixes for exam_questions table
-- Fixing: fractions, square roots, cube roots, and trigonometry notations

-- 1. Fix missing backslash before frac{ in correct_answer
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '([^\\])frac\{', '\1\\frac{', 'g')
WHERE correct_answer ~ '[^\\]frac\{';

-- Fix frac at start of string
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '^frac\{', '\\frac{', 'g')
WHERE correct_answer ~ '^frac\{';

-- 2. Fix missing backslash before sqrt{ in correct_answer
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '([^\\])sqrt\{', '\1\\sqrt{', 'g')
WHERE correct_answer ~ '[^\\]sqrt\{';

-- Fix sqrt at start of string
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '^sqrt\{', '\\sqrt{', 'g')
WHERE correct_answer ~ '^sqrt\{';

-- 3. Fix missing backslash before sqrt[ (cube roots, etc.)
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '([^\\])sqrt\[', '\1\\sqrt[', 'g')
WHERE correct_answer ~ '[^\\]sqrt\[';

-- Fix sqrt[ at start of string
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '^sqrt\[', '\\sqrt[', 'g')
WHERE correct_answer ~ '^sqrt\[';

-- 4. Fix double backslashes \\sqrt to \sqrt (rendering issue)
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '\\\\sqrt', '\\sqrt', 'g')
WHERE correct_answer ~ '\\\\sqrt';

-- 5. Fix double backslashes \\frac to \frac
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '\\\\frac', '\\frac', 'g')
WHERE correct_answer ~ '\\\\frac';

-- Now fix all_answers array (same patterns)
-- 6. Fix missing backslash before frac{ in all_answers
UPDATE exam_questions
SET all_answers = array(
  SELECT regexp_replace(
    regexp_replace(ans, '([^\\])frac\{', '\1\\frac{', 'g'),
    '^frac\{', '\\frac{', 'g'
  )
  FROM unnest(all_answers) AS ans
)
WHERE EXISTS (
  SELECT 1 FROM unnest(all_answers) AS ans
  WHERE ans ~ '(^|[^\\])frac\{'
);

-- 7. Fix missing backslash before sqrt{ in all_answers
UPDATE exam_questions
SET all_answers = array(
  SELECT regexp_replace(
    regexp_replace(ans, '([^\\])sqrt\{', '\1\\sqrt{', 'g'),
    '^sqrt\{', '\\sqrt{', 'g'
  )
  FROM unnest(all_answers) AS ans
)
WHERE EXISTS (
  SELECT 1 FROM unnest(all_answers) AS ans
  WHERE ans ~ '(^|[^\\])sqrt\{'
);

-- 8. Fix missing backslash before sqrt[ in all_answers
UPDATE exam_questions
SET all_answers = array(
  SELECT regexp_replace(
    regexp_replace(ans, '([^\\])sqrt\[', '\1\\sqrt[', 'g'),
    '^sqrt\[', '\\sqrt[', 'g'
  )
  FROM unnest(all_answers) AS ans
)
WHERE EXISTS (
  SELECT 1 FROM unnest(all_answers) AS ans
  WHERE ans ~ '(^|[^\\])sqrt\['
);

-- 9. Fix double backslashes in all_answers
UPDATE exam_questions
SET all_answers = array(
  SELECT regexp_replace(
    regexp_replace(ans, '\\\\sqrt', '\\sqrt', 'g'),
    '\\\\frac', '\\frac', 'g'
  )
  FROM unnest(all_answers) AS ans
)
WHERE EXISTS (
  SELECT 1 FROM unnest(all_answers) AS ans
  WHERE ans ~ '(\\\\sqrt|\\\\frac)'
);

-- 10. Fix broken degree symbols in trig functions (○ should be °)
UPDATE exam_questions
SET question = replace(question, '○', '°')
WHERE question ~ '○';

UPDATE exam_questions
SET correct_answer = replace(correct_answer, '○', '°')
WHERE correct_answer ~ '○';

UPDATE exam_questions
SET all_answers = array(
  SELECT replace(ans, '○', '°')
  FROM unnest(all_answers) AS ans
)
WHERE EXISTS (
  SELECT 1 FROM unnest(all_answers) AS ans
  WHERE ans ~ '○'
);

-- Log completion
DO $$
DECLARE
  fixed_count int;
BEGIN
  SELECT COUNT(*) INTO fixed_count FROM exam_questions;
  RAISE NOTICE 'Completed comprehensive LaTeX notation fixes across % questions', fixed_count;
END $$;