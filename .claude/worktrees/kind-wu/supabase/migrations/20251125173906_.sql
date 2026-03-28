-- Delete all simultaneous equation questions with rendering issues
-- These questions start with "Solve the simultaneous equations:" and have confusing notation
DELETE FROM exam_questions
WHERE question ILIKE 'Solve the simultaneous equations:%'
  AND (
    question LIKE '%\ %'  -- Contains backslash-space patterns
    OR question LIKE '%\\%'  -- Contains backslashes
  );

-- Also delete any that just say "Solve the simultaneous equations:" regardless of notation
-- since the user wants ALL of them removed
DELETE FROM exam_questions
WHERE question ILIKE 'Solve the simultaneous equations:%';;
