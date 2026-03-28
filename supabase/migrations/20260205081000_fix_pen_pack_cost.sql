-- Update the pen pack question so the answer and explanation match the correct total cost.
UPDATE exam_questions
SET
    correct_answer = '£12.00',
    wrong_answers = ARRAY['£6.00', '£10.00', '£8.00'],
    all_answers = ARRAY['£12.00', '£6.00', '£10.00', '£8.00'],
    explanation = $$Step 1: One pack costs £2.40.
Step 2: Multiply to find five packs: 5 × £2.40 = £12.00.
Final answer: £12.00$$
WHERE question = 'A shop sells a pack of 3 pens for £2.40. How much would 5 packs cost?';
