
-- Fix quadratic formula answer to use proper LaTeX fractions
-- Changes: x = 7/8 - sqrt(209)/8 → x = \frac{7 - \sqrt{209}}{8}
UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{7 - \sqrt{209}}{8}, x = \frac{7 + \sqrt{209}}{8}',
  all_answers = ARRAY[
    'x = \frac{7 - \sqrt{209}}{8}, x = \frac{7 + \sqrt{209}}{8}',
    'x = 1',
    'x = 0', 
    'x = 2'
  ]
WHERE id = '5d863e98-92c7-4963-aab7-63fd7710c663';
;
