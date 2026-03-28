-- Normalize 11+ logic-and-reasoning subtopic variants to a single canonical key.
UPDATE public.exam_questions
SET subtopic = 'strategies|logic'
WHERE track = '11plus'
  AND lower(coalesce(subtopic, '')) IN (
    'strategies|logic',
    'strategies,logic',
    'strategies|logic-reasoning',
    'strategies|logic_reasoning',
    'strategies|logic and reasoning',
    'strategies|logic-and-reasoning',
    'strategies|logic&reasoning',
    'strategies,logic-reasoning',
    'strategies,logic_reasoning',
    'strategies,logic and reasoning',
    'strategies,logic-and-reasoning',
    'problem-solving|logic',
    'problem-solving,logic',
    'problem-solving|logic-reasoning',
    'problem-solving,logic-reasoning',
    'problem-solving|logic_reasoning',
    'problem-solving,logic_reasoning',
    'problem-solving|logic-and-reasoning',
    'problem-solving,logic-and-reasoning',
    'problem_solving_strategies|logic',
    'problem_solving_strategies|logic_reasoning',
    'problem_solving_strategies|logic_and_reasoning',
    'problem_solving_strategies|logic-reasoning'
  );
