
-- Fix all "Solve:" questions with improper fraction/sqrt notation to use proper LaTeX

-- 1. Fix simple fraction answers (x = 17/2 → x = \frac{17}{2})
UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{17}{2}',
  all_answers = ARRAY['x = \frac{17}{2}', 'x = 1', 'x = 0', 'x = 2']
WHERE id = '52853f2f-3074-4765-aee9-e3b0ec0033e1';

UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{19}{2}',
  all_answers = ARRAY['x = \frac{19}{2}', 'x = 1', 'x = 0', 'x = 2']
WHERE id = '66562ed7-7ebb-480c-99ba-2c36632a27e6';

UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{7}{2}',
  all_answers = ARRAY['x = \frac{7}{2}', 'x = 1', 'x = 2', 'x = 3']
WHERE id = '2c273a1c-c043-4121-aa52-95328471d0ae';

UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{9}{2}',
  all_answers = ARRAY['x = \frac{9}{2}', 'x = 1', 'x = 2', 'x = 3']
WHERE id = '678f3b9d-9e34-4635-8625-c6ba8e20e5a0';

-- 2. Fix cube root expressions (x = 1 - 10**(1/3) → x = 1 - \sqrt[3]{10})
UPDATE exam_questions
SET 
  correct_answer = 'x = 1 - \sqrt[3]{10}',
  all_answers = ARRAY['x = 1 - \sqrt[3]{10}', 'x = 1', 'x = 0', 'x = 3']
WHERE id = '28fcd739-db74-4b3e-a9c0-3a1520cfc462';

UPDATE exam_questions
SET 
  correct_answer = 'x = 2 - \sqrt[3]{10}',
  all_answers = ARRAY['x = 2 - \sqrt[3]{10}', 'x = 1', 'x = 0', 'x = 3']
WHERE id = 'f576700d-154a-46ad-bc34-f3721fd96568';

UPDATE exam_questions
SET 
  correct_answer = 'x = 3 - \sqrt[3]{9}',
  all_answers = ARRAY['x = 3 - \sqrt[3]{9}', 'x = 1', 'x = 0', 'x = 3']
WHERE id = '13559959-e217-4c27-aae7-116c22c1465b';

-- 3. Fix fraction with sqrt (x = 1/2 - sqrt(73)/2 → x = \frac{1 - \sqrt{73}}{2})
UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{1 - \sqrt{73}}{2}',
  all_answers = ARRAY['x = \frac{1 - \sqrt{73}}{2}', 'x = 0', 'x = 1', 'x = 5']
WHERE id = '9fd6f3f6-b247-4f83-b159-d10849e44747';

-- 4. Fix quadratic formula results with fractions
UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{7 - \sqrt{201}}{4}, x = \frac{7 + \sqrt{201}}{4}',
  all_answers = ARRAY[
    'x = \frac{7 - \sqrt{201}}{4}, x = \frac{7 + \sqrt{201}}{4}',
    'x = 1',
    'x = 0',
    'x = 2'
  ]
WHERE id = '18960474-d314-43df-aea0-4142c5d7855f';

UPDATE exam_questions
SET 
  correct_answer = 'x = 1 - \sqrt{10}, x = 1 + \sqrt{10}',
  all_answers = ARRAY[
    'x = 1 - \sqrt{10}, x = 1 + \sqrt{10}',
    'x = 1',
    'x = 0',
    'x = 2'
  ]
WHERE id = '645257e0-c85b-43db-a7d2-17c8bc320845';

UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{3 - \sqrt{897}}{12}, x = \frac{3 + \sqrt{897}}{12}',
  all_answers = ARRAY[
    'x = \frac{3 - \sqrt{897}}{12}, x = \frac{3 + \sqrt{897}}{12}',
    'x = 1',
    'x = 0',
    'x = 2'
  ]
WHERE id = '842afa9f-00f2-43be-92be-94a5bf6fd859';

-- 5. Fix complex sqrt expression
UPDATE exam_questions
SET 
  correct_answer = 'x = \frac{10 - 7\sqrt{5} - \sqrt{10} + 10\sqrt{2}}{7}',
  all_answers = ARRAY[
    'x = \frac{10 - 7\sqrt{5} - \sqrt{10} + 10\sqrt{2}}{7}',
    'x = 1',
    'x = 0',
    'x = 5'
  ]
WHERE id = '532f638e-ebf1-4791-b25e-7b1184054152';

-- 6. Fix imaginary number expression
UPDATE exam_questions
SET 
  correct_answer = 'x = 6 - i\sqrt{55}, x = 6 + i\sqrt{55}',
  all_answers = ARRAY[
    'x = 6 - i\sqrt{55}, x = 6 + i\sqrt{55}',
    'x = 0',
    'x = 1',
    'x = 2'
  ]
WHERE id = '0f608470-7b44-4f54-bb9f-0109b5a89120';
;
