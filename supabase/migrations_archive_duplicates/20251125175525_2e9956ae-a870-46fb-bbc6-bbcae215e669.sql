-- Fix double backslashes in LaTeX notation across all exam questions
-- This corrects database entries where LaTeX commands were double-escaped
-- Example: \\sqrt{55} → \sqrt{55}, \\frac{1}{2} → \frac{1}{2}

-- Update correct_answer field
UPDATE exam_questions
SET correct_answer = regexp_replace(correct_answer, '\\\\', '\', 'g')
WHERE correct_answer ~ '\\\\';

-- Update all_answers array elements
UPDATE exam_questions
SET all_answers = ARRAY(
  SELECT regexp_replace(elem, '\\\\', '\', 'g')
  FROM unnest(all_answers) AS elem
)
WHERE all_answers::text ~ '\\\\';

-- Log the number of affected rows
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Fixed double backslashes in % questions', affected_count;
END $$;