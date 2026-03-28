
-- Final LaTeX cleanup: Fix the question field that was missed
-- Removes Unicode symbols and fixes LaTeX commands in question text

-- Step 1: Replace Unicode × with \times in question
UPDATE exam_questions
SET question = regexp_replace(question, '×', '\\times', 'g')
WHERE question ~ '×';

-- Step 2: Replace Unicode √ with \sqrt{ in question  
UPDATE exam_questions
SET question = regexp_replace(question, '√', '\\sqrt{', 'g')
WHERE question ~ '√';

-- Step 3: Add backslash to frac when missing in question
-- This handles cases like "frac{1}{2}" -> "\frac{1}{2}"
UPDATE exam_questions
SET question = regexp_replace(question, '([^\\])frac\{', '\1\\frac{', 'g')
WHERE question ~ '[^\\]frac\{';

-- Step 4: Handle frac at start of string
UPDATE exam_questions
SET question = regexp_replace(question, '^frac\{', '\\frac{', 'g')
WHERE question ~ '^frac\{';

-- Step 5: Fix sqrt followed by digits without braces in question
UPDATE exam_questions
SET question = regexp_replace(question, '\\sqrt([0-9]+)', '\\sqrt{\1}', 'g')
WHERE question ~ '\\sqrt[0-9]';

-- Step 6: Close any unclosed sqrt{ from Unicode replacement
UPDATE exam_questions  
SET question = regexp_replace(question, '\\sqrt\{([0-9]+)(?!\})', '\\sqrt{\1}', 'g')
WHERE question ~ '\\sqrt\{[0-9]+[^}]';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Question field LaTeX cleanup complete';
END $$;
