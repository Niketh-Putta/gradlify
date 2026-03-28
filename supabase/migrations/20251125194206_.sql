
-- COMPREHENSIVE FIX: All LaTeX notation issues in one migration
-- Fixes: frac without backslash, sqrt without backslash, double backslashes, cube roots, trig degree notation

-- 1. Fix frac without backslash in all_answers (array elements)
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '([^\\])frac\{', '\1\\frac{', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '[^\\]frac\{';

-- 2. Fix frac at start of string in all_answers
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '^frac\{', '\\frac{', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '^frac\{';

-- 3. Fix sqrt without backslash in all_answers
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '([^\\])sqrt', '\1\\sqrt', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '[^\\]sqrt';

-- 4. Fix sqrt at start of string in all_answers
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '^sqrt', '\\sqrt', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '^sqrt';

-- 5. Fix cube root notation: sqrt[3] → \sqrt[3]
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, 'sqrt\[([0-9]+)\]', '\\sqrt[\1]', 'g')
WHERE correct_answer ~ 'sqrt\[[0-9]+\]';

UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, 'sqrt\[([0-9]+)\]', '\\sqrt[\1]', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ 'sqrt\[[0-9]+\]';

-- 6. Fix frac without backslash in correct_answer
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '([^\\])frac\{', '\1\\frac{', 'g')
WHERE correct_answer ~ '[^\\]frac\{';

UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '^frac\{', '\\frac{', 'g')
WHERE correct_answer ~ '^frac\{';

-- 7. Fix sqrt without backslash in correct_answer
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '([^\\])sqrt', '\1\\sqrt', 'g')
WHERE correct_answer ~ '[^\\]sqrt';

UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '^sqrt', '\\sqrt', 'g')
WHERE correct_answer ~ '^sqrt';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed all frac, sqrt, and cube root notation issues';
END $$;
;
