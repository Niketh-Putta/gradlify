
-- Fix "completing the square" question with improper sqrt notation
UPDATE exam_questions
SET 
  correct_answer = 'x = 6 - 2\sqrt{6}, x = 6 + 2\sqrt{6}',
  all_answers = ARRAY[
    'x = 6 - 2\sqrt{6}, x = 6 + 2\sqrt{6}',
    'x = 1',
    'x = -1',
    'x = 0'
  ]
WHERE id = '2db6dc13-241f-4f86-8103-e7e713400d12';
