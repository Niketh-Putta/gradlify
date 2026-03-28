
-- Fix malformed \sqrt{ patterns with missing closing braces
-- Patterns like "\sqrt{(4x + 7) = x + 3" need the brace closed properly

-- Fix pattern: \sqrt{(expression) followed by = or other operators without closing }
-- Strategy: Find \sqrt{ followed by content up to next major delimiter, then close it

UPDATE exam_questions
SET question = regexp_replace(
  question,
  '\\sqrt\{(\([^)]+\))(\s*[=<>+\-])',
  '\\sqrt{\1}\2',
  'g'
)
WHERE question ~ '\\sqrt\{\([^}]+\)[=<>+\-]';

-- Fix pattern: \sqrt{expression = where brace is never closed before =
UPDATE exam_questions
SET question = regexp_replace(
  question,
  '\\sqrt\{([^}]+)(\s*=)',
  '\\sqrt{\1}\2',
  'g'
)
WHERE question ~ '\\sqrt\{[^}]+=';

-- Fix pattern: \sqrt{expression − where brace is never closed before −
UPDATE exam_questions
SET question = regexp_replace(
  question,
  '\\sqrt\{([^}]+)([\s]*[−\-])',
  '\\sqrt{\1}\2',
  'g'
)
WHERE question ~ '\\sqrt\{[^}]+[−\-]';

-- Fix any remaining \sqrt{ at end of string without closing }
UPDATE exam_questions
SET question = regexp_replace(
  question,
  '\\sqrt\{([^}]+)$',
  '\\sqrt{\1}',
  'g'
)
WHERE question ~ '\\sqrt\{[^}]+$';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed unclosed sqrt braces in questions';
END $$;
;
