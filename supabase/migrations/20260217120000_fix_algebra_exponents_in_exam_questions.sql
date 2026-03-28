-- Ensure the 11+ algebra question uses proper LaTeX exponents in every option.
BEGIN;

UPDATE public.exam_questions
SET correct_answer = '6a^{3}',
    wrong_answers = ARRAY['5a^{3}', '6a^{2}', '5a^{2}', '6a']::text[],
    all_answers = ARRAY['6a^{3}', '5a^{3}', '6a^{2}', '5a^{2}', '6a']::text[],
    explanation = 'Step 1: Multiply numbers: $2 × 3 = 6$.\\nStep 2: Multiply variables: $a^{2} × a = a^{3}$.\\nFinal Result: 6a^{3}'
WHERE id = 'ae305c0d-b1b0-4afb-8255-e3e4aaba745c';

COMMIT;
