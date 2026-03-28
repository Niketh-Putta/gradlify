-- AUTO-GENERATED on 2025-12-26T20:15:53.256Z
-- Seed: 8 questions per mini-subtopic (79 subtopics => 632 questions)
-- Notes:
-- - Uses strict \frac{a}{b} vertical fractions.
-- - Includes 3 wrong options and detailed explanations.

BEGIN;

DELETE FROM public.exam_questions WHERE subtopic = 'algebra|nth_term';

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 4, 7, 10, 13, ...

Find an expression for the nth term.', '3n + 1', ARRAY['3n - 1', '1n + 3', '3n + 2'], ARRAY['3n + 2', '1n + 3', '3n - 1', '3n + 1'], 'Step 1: The common difference is 3, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 4.

Step 3: So 3 + c = 4 and c = 1.

Final answer: 3n + 1', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 1, 9, 17, 25, ...

Find an expression for the nth term.', '8n + -7', ARRAY['8n - -7', '-7n + 8', '8n + -6'], ARRAY['8n - -7', '8n + -7', '-7n + 8', '8n + -6'], 'Step 1: The common difference is 8, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 1.

Step 3: So 8 + c = 1 and c = -7.

Final answer: 8n + -7', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 4, 8, 12, 16, ...

Find an expression for the nth term.', '4n + 0', ARRAY['4n - 0', '0n + 4', '4n + 1'], ARRAY['4n + 1', '0n + 4', '4n - 0', '4n + 0'], 'Step 1: The common difference is 4, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 4.

Step 3: So 4 + c = 4 and c = 0.

Final answer: 4n + 0', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 9, 12, 15, 18, ...

Find an expression for the nth term.', '3n + 6', ARRAY['3n - 6', '6n + 3', '3n + 7'], ARRAY['3n + 6', '3n - 6', '3n + 7', '6n + 3'], 'Step 1: The common difference is 3, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 9.

Step 3: So 3 + c = 9 and c = 6.

Final answer: 3n + 6', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 10, 13, 16, 19, ...

Find an expression for the nth term.', '3n + 7', ARRAY['3n - 7', '7n + 3', '3n + 8'], ARRAY['3n + 8', '7n + 3', '3n - 7', '3n + 7'], 'Step 1: The common difference is 3, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 10.

Step 3: So 3 + c = 10 and c = 7.

Final answer: 3n + 7', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 11, 13, 15, 17, ...

Find an expression for the nth term.', '2n + 9', ARRAY['2n - 9', '9n + 2', '2n + 10'], ARRAY['9n + 2', '2n - 9', '2n + 9', '2n + 10'], 'Step 1: The common difference is 2, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 11.

Step 3: So 2 + c = 11 and c = 9.

Final answer: 2n + 9', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 10, 18, 26, 34, ...

Find an expression for the nth term.', '8n + 2', ARRAY['8n - 2', '2n + 8', '8n + 3'], ARRAY['8n + 3', '2n + 8', '8n - 2', '8n + 2'], 'Step 1: The common difference is 8, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 10.

Step 3: So 8 + c = 10 and c = 2.

Final answer: 8n + 2', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 11, 19, 27, 35, ...

Find an expression for the nth term.', '8n + 3', ARRAY['8n - 3', '3n + 8', '8n + 4'], ARRAY['3n + 8', '8n + 3', '8n - 3', '8n + 4'], 'Step 1: The common difference is 8, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 11.

Step 3: So 8 + c = 11 and c = 3.

Final answer: 8n + 3', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 4, 9, 14, 19, ...

Find an expression for the nth term.', '5n + -1', ARRAY['5n - -1', '-1n + 5', '5n + 0'], ARRAY['5n + -1', '5n + 0', '5n - -1', '-1n + 5'], 'Step 1: The common difference is 5, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 4.

Step 3: So 5 + c = 4 and c = -1.

Final answer: 5n + -1', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 6, 11, 16, 21, ...

Find an expression for the nth term.', '5n + 1', ARRAY['5n - 1', '1n + 5', '5n + 2'], ARRAY['5n + 1', '5n - 1', '5n + 2', '1n + 5'], 'Step 1: The common difference is 5, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 6.

Step 3: So 5 + c = 6 and c = 1.

Final answer: 5n + 1', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 12, 15, 18, 21, ...

Find an expression for the nth term.', '3n + 9', ARRAY['3n - 9', '9n + 3', '3n + 10'], ARRAY['3n - 9', '3n + 10', '9n + 3', '3n + 9'], 'Step 1: The common difference is 3, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 12.

Step 3: So 3 + c = 12 and c = 9.

Final answer: 3n + 9', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 4, 11, 18, 25, ...

Find an expression for the nth term.', '7n + -3', ARRAY['7n - -3', '-3n + 7', '7n + -2'], ARRAY['7n + -3', '7n - -3', '-3n + 7', '7n + -2'], 'Step 1: The common difference is 7, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 4.

Step 3: So 7 + c = 4 and c = -3.

Final answer: 7n + -3', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 12, 20, 28, 36, ...

Find an expression for the nth term.', '8n + 4', ARRAY['8n - 4', '4n + 8', '8n + 5'], ARRAY['8n + 5', '4n + 8', '8n - 4', '8n + 4'], 'Step 1: The common difference is 8, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 12.

Step 3: So 8 + c = 12 and c = 4.

Final answer: 8n + 4', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 10, 14, 18, 22, ...

Find an expression for the nth term.', '4n + 6', ARRAY['4n - 6', '6n + 4', '4n + 7'], ARRAY['4n - 6', '4n + 6', '6n + 4', '4n + 7'], 'Step 1: The common difference is 4, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 10.

Step 3: So 4 + c = 10 and c = 6.

Final answer: 4n + 6', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 7, 12, 17, 22, ...

Find an expression for the nth term.', '5n + 2', ARRAY['5n - 2', '2n + 5', '5n + 3'], ARRAY['5n + 2', '5n - 2', '2n + 5', '5n + 3'], 'Step 1: The common difference is 5, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 7.

Step 3: So 5 + c = 7 and c = 2.

Final answer: 5n + 2', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 8, 16, 24, 32, ...

Find an expression for the nth term.', '8n + 0', ARRAY['8n - 0', '0n + 8', '8n + 1'], ARRAY['0n + 8', '8n - 0', '8n + 1', '8n + 0'], 'Step 1: The common difference is 8, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 8.

Step 3: So 8 + c = 8 and c = 0.

Final answer: 8n + 0', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 3, 5, 7, 9, ...

Find an expression for the nth term.', '2n + 1', ARRAY['2n - 1', '1n + 2', '2n + 2'], ARRAY['1n + 2', '2n - 1', '2n + 1', '2n + 2'], 'Step 1: The common difference is 2, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 3.

Step 3: So 2 + c = 3 and c = 1.

Final answer: 2n + 1', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 5, 8, 11, 14, ...

Find an expression for the nth term.', '3n + 2', ARRAY['3n - 2', '2n + 3', '3n + 3'], ARRAY['3n - 2', '3n + 2', '3n + 3', '2n + 3'], 'Step 1: The common difference is 3, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 5.

Step 3: So 3 + c = 5 and c = 2.

Final answer: 3n + 2', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 7, 14, 21, 28, ...

Find an expression for the nth term.', '7n + 0', ARRAY['7n - 0', '0n + 7', '7n + 1'], ARRAY['7n - 0', '7n + 1', '0n + 7', '7n + 0'], 'Step 1: The common difference is 7, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 7.

Step 3: So 7 + c = 7 and c = 0.

Final answer: 7n + 0', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 4, 12, 20, 28, ...

Find an expression for the nth term.', '8n + -4', ARRAY['8n - -4', '-4n + 8', '8n + -3'], ARRAY['8n + -3', '-4n + 8', '8n - -4', '8n + -4'], 'Step 1: The common difference is 8, so the sequence is linear and has form dn + c.

Step 2: Substitute n = 1 gives d(1) + c = 4.

Step 3: So 8 + c = 4 and c = -4.

Final answer: 8n + -4', 'always', 'Algebra', 'algebra|nth_term', 'Foundation Tier', 'Non-Calculator', 2, 2, 140, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 5, 10, 19, 32, ...

Find an expression for the nth term.', '2n^2 - 1n + 4', ARRAY['2n^2 + 4', '2n^2 - 1n + 5', '2n^2 + 1n + 4'], ARRAY['2n^2 + 4', '2n^2 + 1n + 4', '2n^2 - 1n + 4', '2n^2 - 1n + 5'], 'Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is 2n^2 - 1n + 4.

Final answer: 2n^2 - 1n + 4', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 30, 22, 14, 6, ...

Find an expression for the nth term.', '-8n + 38', ARRAY['-8n - 38', '38n + -8', '-8n + 40'], ARRAY['-8n - 38', '-8n + 40', '-8n + 38', '38n + -8'], 'Step 1: The common difference is -8, so the sequence is linear.

Step 2: Use n = 1: -8(1) + c = 30, so c = 38.

Final answer: -8n + 38', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 6, 18, 54, 162, ...

Find an expression for the nth term.', '6 × 3^{n-1}', ARRAY['6 × 3^{n}', '3 × 6^{n-1}', '9^{n-1}'], ARRAY['6 × 3^{n}', '6 × 3^{n-1}', '3 × 6^{n-1}', '9^{n-1}'], 'Step 1: The sequence is geometric with common ratio 3.

Step 2: The nth term is 6 × 3^{n-1}.

Final answer: 6 × 3^{n-1}', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: -2, 2, 10, 22, ...

Find an expression for the nth term.', '2n^2 - 2n - 2', ARRAY['2n^2 - 1n - 2', '2n^2 - 2n - 1', '2n^2 + 2n - 2'], ARRAY['2n^2 - 2n - 2', '2n^2 - 1n - 2', '2n^2 - 2n - 1', '2n^2 + 2n - 2'], 'Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is 2n^2 - 2n - 2.

Final answer: 2n^2 - 2n - 2', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 24, 17, 10, 3, ...

Find an expression for the nth term.', '-7n + 31', ARRAY['-7n - 31', '31n + -7', '-7n + 33'], ARRAY['-7n + 33', '31n + -7', '-7n - 31', '-7n + 31'], 'Step 1: The common difference is -7, so the sequence is linear.

Step 2: Use n = 1: -7(1) + c = 24, so c = 31.

Final answer: -7n + 31', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 1, 3, 9, 27, ...

Find an expression for the nth term.', '1 × 3^{n-1}', ARRAY['1 × 3^{n}', '3 × 1^{n-1}', '4^{n-1}'], ARRAY['4^{n-1}', '3 × 1^{n-1}', '1 × 3^{n}', '1 × 3^{n-1}'], 'Step 1: The sequence is geometric with common ratio 3.

Step 2: The nth term is 1 × 3^{n-1}.

Final answer: 1 × 3^{n-1}', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 4, 11, 20, 31, ...

Find an expression for the nth term.', 'n^2 + 4n - 1', ARRAY['n^2 + 5n - 1', 'n^2 + 4n', 'n^2 - 4n - 1'], ARRAY['n^2 + 5n - 1', 'n^2 + 4n - 1', 'n^2 + 4n', 'n^2 - 4n - 1'], 'Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is n^2 + 4n - 1.

Final answer: n^2 + 4n - 1', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 29, 23, 17, 11, ...

Find an expression for the nth term.', '-6n + 35', ARRAY['-6n - 35', '35n + -6', '-6n + 37'], ARRAY['-6n + 35', '-6n + 37', '-6n - 35', '35n + -6'], 'Step 1: The common difference is -6, so the sequence is linear.

Step 2: Use n = 1: -6(1) + c = 29, so c = 35.

Final answer: -6n + 35', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 4, 12, 36, 108, ...

Find an expression for the nth term.', '4 × 3^{n-1}', ARRAY['4 × 3^{n}', '3 × 4^{n-1}', '7^{n-1}'], ARRAY['3 × 4^{n-1}', '4 × 3^{n}', '4 × 3^{n-1}', '7^{n-1}'], 'Step 1: The sequence is geometric with common ratio 3.

Step 2: The nth term is 4 × 3^{n-1}.

Final answer: 4 × 3^{n-1}', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 1, 5, 13, 25, ...

Find an expression for the nth term.', '2n^2 - 2n + 1', ARRAY['2n^2 - 1n + 1', '2n^2 - 2n + 2', '2n^2 + 2n + 1'], ARRAY['2n^2 + 2n + 1', '2n^2 - 2n + 1', '2n^2 - 1n + 1', '2n^2 - 2n + 2'], 'Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is 2n^2 - 2n + 1.

Final answer: 2n^2 - 2n + 1', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: -8, -9, -8, -5, ...

Find an expression for the nth term.', 'n^2 - 4n - 5', ARRAY['n^2 - 3n - 5', 'n^2 - 4n - 4', 'n^2 + 4n - 5'], ARRAY['n^2 + 4n - 5', 'n^2 - 4n - 5', 'n^2 - 3n - 5', 'n^2 - 4n - 4'], 'Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is n^2 - 4n - 5.

Final answer: n^2 - 4n - 5', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 28, 26, 24, 22, ...

Find an expression for the nth term.', '-2n + 30', ARRAY['-2n - 30', '30n + -2', '-2n + 32'], ARRAY['-2n + 30', '-2n - 30', '30n + -2', '-2n + 32'], 'Step 1: The common difference is -2, so the sequence is linear.

Step 2: Use n = 1: -2(1) + c = 28, so c = 30.

Final answer: -2n + 30', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 5, 10, 20, 40, ...

Find an expression for the nth term.', '5 × 2^{n-1}', ARRAY['5 × 2^{n}', '2 × 5^{n-1}', '7^{n-1}'], ARRAY['2 × 5^{n-1}', '5 × 2^{n}', '7^{n-1}', '5 × 2^{n-1}'], 'Step 1: The sequence is geometric with common ratio 2.

Step 2: The nth term is 5 × 2^{n-1}.

Final answer: 5 × 2^{n-1}', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 4, 14, 28, 46, ...

Find an expression for the nth term.', '2n^2 + 4n - 2', ARRAY['2n^2 + 5n - 2', '2n^2 + 4n - 1', '2n^2 - 4n - 2'], ARRAY['2n^2 - 4n - 2', '2n^2 + 4n - 2', '2n^2 + 5n - 2', '2n^2 + 4n - 1'], 'Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is 2n^2 + 4n - 2.

Final answer: 2n^2 + 4n - 2', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 29, 20, 11, 2, ...

Find an expression for the nth term.', '-9n + 38', ARRAY['-9n - 38', '38n + -9', '-9n + 40'], ARRAY['-9n + 40', '38n + -9', '-9n + 38', '-9n - 38'], 'Step 1: The common difference is -9, so the sequence is linear.

Step 2: Use n = 1: -9(1) + c = 29, so c = 38.

Final answer: -9n + 38', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 2, 6, 18, 54, ...

Find an expression for the nth term.', '2 × 3^{n-1}', ARRAY['2 × 3^{n}', '3 × 2^{n-1}', '5^{n-1}'], ARRAY['2 × 3^{n}', '2 × 3^{n-1}', '5^{n-1}', '3 × 2^{n-1}'], 'Step 1: The sequence is geometric with common ratio 3.

Step 2: The nth term is 2 × 3^{n-1}.

Final answer: 2 × 3^{n-1}', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: -4, -2, 2, 8, ...

Find an expression for the nth term.', 'n^2 - 1n - 4', ARRAY['n^2 - 4', 'n^2 - 1n - 3', 'n^2 + 1n - 4'], ARRAY['n^2 + 1n - 4', 'n^2 - 1n - 4', 'n^2 - 4', 'n^2 - 1n - 3'], 'Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is n^2 - 1n - 4.

Final answer: n^2 - 1n - 4', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 19, 13, 7, 1, ...

Find an expression for the nth term.', '-6n + 25', ARRAY['-6n - 25', '25n + -6', '-6n + 27'], ARRAY['-6n + 27', '-6n + 25', '-6n - 25', '25n + -6'], 'Step 1: The common difference is -6, so the sequence is linear.

Step 2: Use n = 1: -6(1) + c = 19, so c = 25.

Final answer: -6n + 25', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 3, 6, 12, 24, ...

Find an expression for the nth term.', '3 × 2^{n-1}', ARRAY['3 × 2^{n}', '2 × 3^{n-1}', '5^{n-1}'], ARRAY['5^{n-1}', '3 × 2^{n}', '2 × 3^{n-1}', '3 × 2^{n-1}'], 'Step 1: The sequence is geometric with common ratio 2.

Step 2: The nth term is 3 × 2^{n-1}.

Final answer: 3 × 2^{n-1}', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The sequence is: 5, 7, 11, 17, ...

Find an expression for the nth term.', 'n^2 - 1n + 5', ARRAY['n^2 + 5', 'n^2 - 1n + 6', 'n^2 + 1n + 5'], ARRAY['n^2 + 1n + 5', 'n^2 - 1n + 5', 'n^2 + 5', 'n^2 - 1n + 6'], 'Step 1: The second difference is constant, so it is quadratic.

Step 2: Use n = 1,2,3 to find the form an^2 + bn + c.

Step 3: The nth term is n^2 - 1n + 5.

Final answer: n^2 - 1n + 5', 'always', 'Algebra', 'algebra|nth_term', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

DELETE FROM public.exam_questions WHERE subtopic = 'algebra|graphs';

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 0x + 6.

What is the y-intercept?', '6', ARRAY['0', '-6', '7'], ARRAY['0', '6', '7', '-6'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 0(0) + 6 = 6.

Final answer: 6', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 1x + 5.

What is the y-intercept?', '5', ARRAY['1', '-5', '6'], ARRAY['1', '-5', '6', '5'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 1(0) + 5 = 5.

Final answer: 5', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 4x + 0.

What is the y-intercept?', '0', ARRAY['4', '1', '-1'], ARRAY['-1', '1', '4', '0'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 4(0) + 0 = 0.

Final answer: 0', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 5x + 7.

What is the y-intercept?', '7', ARRAY['5', '-7', '8'], ARRAY['7', '5', '-7', '8'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 5(0) + 7 = 7.

Final answer: 7', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 2x + 7.

What is the y-intercept?', '7', ARRAY['2', '-7', '8'], ARRAY['7', '2', '8', '-7'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 2(0) + 7 = 7.

Final answer: 7', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 0x + 5.

What is the y-intercept?', '5', ARRAY['0', '-5', '6'], ARRAY['6', '-5', '0', '5'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 0(0) + 5 = 5.

Final answer: 5', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 4x - 1.

What is the y-intercept?', '-1', ARRAY['4', '1', '0'], ARRAY['0', '1', '4', '-1'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 4(0) - 1 = -1.

Final answer: -1', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 1x - 4.

What is the y-intercept?', '-4', ARRAY['1', '4', '-3'], ARRAY['1', '-4', '4', '-3'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 1(0) - 4 = -4.

Final answer: -4', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 0x + 2.

What is the y-intercept?', '2', ARRAY['0', '-2', '3'], ARRAY['0', '-2', '2', '3'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 0(0) + 2 = 2.

Final answer: 2', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 4x - 3.

What is the y-intercept?', '-3', ARRAY['4', '3', '-2'], ARRAY['-3', '4', '3', '-2'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 4(0) - 3 = -3.

Final answer: -3', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 5x + 2.

What is the y-intercept?', '2', ARRAY['5', '-2', '3'], ARRAY['2', '5', '3', '-2'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 5(0) + 2 = 2.

Final answer: 2', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = -1x + 1.

What is the y-intercept?', '1', ARRAY['-1', '2', '0'], ARRAY['1', '0', '-1', '2'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = -1(0) + 1 = 1.

Final answer: 1', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = -2x - 6.

What is the y-intercept?', '-6', ARRAY['-2', '6', '-5'], ARRAY['-6', '6', '-5', '-2'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = -2(0) - 6 = -6.

Final answer: -6', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 1x - 3.

What is the y-intercept?', '-3', ARRAY['1', '3', '-2'], ARRAY['1', '3', '-2', '-3'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 1(0) - 3 = -3.

Final answer: -3', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = -3x + 1.

What is the y-intercept?', '1', ARRAY['-3', '-1', '2'], ARRAY['2', '1', '-3', '-1'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = -3(0) + 1 = 1.

Final answer: 1', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = -3x - 5.

What is the y-intercept?', '-5', ARRAY['-3', '5', '-4'], ARRAY['-3', '-4', '-5', '5'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = -3(0) - 5 = -5.

Final answer: -5', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 2x - 2.

What is the y-intercept?', '-2', ARRAY['2', '-1', '-3'], ARRAY['-3', '-1', '2', '-2'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 2(0) - 2 = -2.

Final answer: -2', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = -3x - 6.

What is the y-intercept?', '-6', ARRAY['-3', '6', '-5'], ARRAY['-5', '6', '-3', '-6'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = -3(0) - 6 = -6.

Final answer: -6', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = -2x + 0.

What is the y-intercept?', '0', ARRAY['-2', '1', '-1'], ARRAY['0', '-2', '-1', '1'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = -2(0) + 0 = 0.

Final answer: 0', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('A line has equation y = 1x - 5.

What is the y-intercept?', '-5', ARRAY['1', '5', '-4'], ARRAY['5', '1', '-5', '-4'], 'Step 1: The y-intercept is the value of y when x = 0.

Step 2: Substitute x = 0: y = 1(0) - 5 = -5.

Final answer: -5', 'always', 'Algebra', 'algebra|graphs', 'Foundation Tier', 'Non-Calculator', 1, 1, 70, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, -3) and B(-4, -9).

Find the equation of the line.', 'y = 3x + 3', ARRAY['y = -3x + 3', 'y = 3x - 3', 'y = 4x + 3'], ARRAY['y = 3x + 3', 'y = 4x + 3', 'y = -3x + 3', 'y = 3x - 3'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = 3x + 3', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/850d1241-e0c8-4023-89d9-6c31fd1fbd93.svg', 'Graph of a straight line through A(-2,-3) and B(-4,-9)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(0, -1) and B(2, 5).

Find the equation of the line.', 'y = 3x - 1', ARRAY['y = -3x - 1', 'y = 3x + 1', 'y = 4x - 1'], ARRAY['y = 4x - 1', 'y = -3x - 1', 'y = 3x + 1', 'y = 3x - 1'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = 3x - 1', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/993a67ce-b0ca-4e13-b911-bc087b37726a.svg', 'Graph of a straight line through A(0,-1) and B(2,5)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, 2) and B(0, -4).

Find the equation of the line.', 'y = -3x - 4', ARRAY['y = 3x - 4', 'y = -3x + 4', 'y = -2x - 4'], ARRAY['y = -2x - 4', 'y = -3x + 4', 'y = 3x - 4', 'y = -3x - 4'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = -3x - 4', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/7b65c85c-b287-4ed1-9211-1d64547565a6.svg', 'Graph of a straight line through A(-2,2) and B(0,-4)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, 3) and B(0, -3).

Find the equation of the line.', 'y = -3x - 3', ARRAY['y = 3x - 3', 'y = -3x + 3', 'y = -2x - 3'], ARRAY['y = -3x + 3', 'y = -2x - 3', 'y = 3x - 3', 'y = -3x - 3'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = -3x - 3', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/24f44154-3b07-47b4-92ff-abc4619d09e9.svg', 'Graph of a straight line through A(-2,3) and B(0,-3)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-4, 5) and B(-2, 1).

Find the equation of the line.', 'y = -2x - 3', ARRAY['y = 2x - 3', 'y = -2x + 3', 'y = -x - 3'], ARRAY['y = -2x + 3', 'y = -x - 3', 'y = 2x - 3', 'y = -2x - 3'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = -2x - 3', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/89f8c46f-121d-4efc-adbe-d69635cbe213.svg', 'Graph of a straight line through A(-4,5) and B(-2,1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(4, 0) and B(-4, -4).

Find the equation of the line.', 'y = \frac{1}{2}x - 2', ARRAY['y = \frac{-1}{2}x - 2', 'y = \frac{1}{2}x + 2', 'y = x - 2'], ARRAY['y = \frac{-1}{2}x - 2', 'y = \frac{1}{2}x + 2', 'y = \frac{1}{2}x - 2', 'y = x - 2'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{1}{2}x - 2', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/25d33eb9-07b4-4de3-b030-6b64cb4daaaf.svg', 'Graph of a straight line through A(4,0) and B(-4,-4)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(2, -2) and B(0, 2).

Find the equation of the line.', 'y = -2x + 2', ARRAY['y = 2x + 2', 'y = -2x - 2', 'y = -x + 2'], ARRAY['y = -x + 2', 'y = -2x + 2', 'y = 2x + 2', 'y = -2x - 2'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = -2x + 2', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/8620ec39-c1be-4c2a-9d0b-b80cdfb0c6b3.svg', 'Graph of a straight line through A(2,-2) and B(0,2)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-4, 1) and B(4, -3).

Find the equation of the line.', 'y = \frac{-1}{2}x - 1', ARRAY['y = \frac{1}{2}x - 1', 'y = \frac{-1}{2}x + 1', 'y = 0x - 1'], ARRAY['y = 0x - 1', 'y = \frac{-1}{2}x + 1', 'y = \frac{1}{2}x - 1', 'y = \frac{-1}{2}x - 1'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{-1}{2}x - 1', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/8a83c7af-d69a-408b-9f0a-1ce7f74b7c7b.svg', 'Graph of a straight line through A(-4,1) and B(4,-3)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, -4) and B(2, 2).

Find the equation of the line.', 'y = \frac{3}{2}x - 1', ARRAY['y = \frac{-3}{2}x - 1', 'y = \frac{3}{2}x + 1', 'y = 2x - 1'], ARRAY['y = \frac{3}{2}x + 1', 'y = \frac{-3}{2}x - 1', 'y = \frac{3}{2}x - 1', 'y = 2x - 1'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{3}{2}x - 1', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/51a45313-7a9e-4867-8303-fbe976d385ec.svg', 'Graph of a straight line through A(-2,-4) and B(2,2)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, 5) and B(0, -1).

Find the equation of the line.', 'y = -3x - 1', ARRAY['y = 3x - 1', 'y = -3x + 1', 'y = -2x - 1'], ARRAY['y = -3x - 1', 'y = 3x - 1', 'y = -3x + 1', 'y = -2x - 1'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = -3x - 1', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Calculator', 4, 3, 180, 'generated/20251224240004/7d56b1d3-6e83-4260-93a2-00b1b22cb3f0.svg', 'Graph of a straight line through A(-2,5) and B(0,-1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(2, 0) and B(4, 1).

Find the equation of the line.', 'y = \frac{1}{2}x - 1', ARRAY['y = \frac{-1}{2}x - 1', 'y = \frac{1}{2}x + 1', 'y = x - 1'], ARRAY['y = \frac{1}{2}x + 1', 'y = \frac{1}{2}x - 1', 'y = \frac{-1}{2}x - 1', 'y = x - 1'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{1}{2}x - 1', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/386bbbc3-d73c-405f-82f6-84c730c77ffd.svg', 'Graph of a straight line through A(2,0) and B(4,1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, 2) and B(2, -10).

Find the equation of the line.', 'y = -3x - 4', ARRAY['y = 3x - 4', 'y = -3x + 4', 'y = -2x - 4'], ARRAY['y = -2x - 4', 'y = -3x + 4', 'y = 3x - 4', 'y = -3x - 4'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = -3x - 4', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/306245c0-a9d3-4a4c-82e1-ed19a3fbd485.svg', 'Graph of a straight line through A(-2,2) and B(2,-10)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, -4) and B(4, 5).

Find the equation of the line.', 'y = \frac{3}{2}x - 1', ARRAY['y = \frac{-3}{2}x - 1', 'y = \frac{3}{2}x + 1', 'y = 2x - 1'], ARRAY['y = 2x - 1', 'y = \frac{3}{2}x + 1', 'y = \frac{3}{2}x - 1', 'y = \frac{-3}{2}x - 1'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{3}{2}x - 1', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/a116fe53-29c3-46c2-b689-a9883a438a61.svg', 'Graph of a straight line through A(-2,-4) and B(4,5)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(2, 1) and B(4, 0).

Find the equation of the line.', 'y = \frac{-1}{2}x + 2', ARRAY['y = \frac{1}{2}x + 2', 'y = \frac{-1}{2}x - 2', 'y = 0x + 2'], ARRAY['y = 0x + 2', 'y = \frac{-1}{2}x - 2', 'y = \frac{1}{2}x + 2', 'y = \frac{-1}{2}x + 2'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{-1}{2}x + 2', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/5118483c-e998-4e25-88c5-ea19b999c2bf.svg', 'Graph of a straight line through A(2,1) and B(4,0)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, -2) and B(0, 4).

Find the equation of the line.', 'y = 3x + 4', ARRAY['y = -3x + 4', 'y = 3x - 4', 'y = 4x + 4'], ARRAY['y = 3x - 4', 'y = -3x + 4', 'y = 3x + 4', 'y = 4x + 4'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = 3x + 4', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/8fa293fb-7baa-4cfa-aeca-5e9d4f76b953.svg', 'Graph of a straight line through A(-2,-2) and B(0,4)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(4, 5) and B(2, 2).

Find the equation of the line.', 'y = \frac{3}{2}x - 1', ARRAY['y = \frac{-3}{2}x - 1', 'y = \frac{3}{2}x + 1', 'y = 2x - 1'], ARRAY['y = \frac{-3}{2}x - 1', 'y = \frac{3}{2}x - 1', 'y = \frac{3}{2}x + 1', 'y = 2x - 1'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{3}{2}x - 1', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/5929d860-59bd-4989-a5df-8662fc96ceef.svg', 'Graph of a straight line through A(4,5) and B(2,2)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-4, -2) and B(-2, -3).

Find the equation of the line.', 'y = \frac{-1}{2}x - 4', ARRAY['y = \frac{1}{2}x - 4', 'y = \frac{-1}{2}x + 4', 'y = 0x - 4'], ARRAY['y = \frac{-1}{2}x - 4', 'y = 0x - 4', 'y = \frac{1}{2}x - 4', 'y = \frac{-1}{2}x + 4'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{-1}{2}x - 4', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/892737d1-4dfe-4336-a7a9-7ea10ea3498f.svg', 'Graph of a straight line through A(-4,-2) and B(-2,-3)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(-2, 0) and B(-4, -3).

Find the equation of the line.', 'y = \frac{3}{2}x + 3', ARRAY['y = \frac{-3}{2}x + 3', 'y = \frac{3}{2}x - 3', 'y = 2x + 3'], ARRAY['y = \frac{3}{2}x + 3', 'y = 2x + 3', 'y = \frac{-3}{2}x + 3', 'y = \frac{3}{2}x - 3'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = \frac{3}{2}x + 3', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/1b75cf9a-6a70-464b-9d24-b66fb2cf5ffa.svg', 'Graph of a straight line through A(-2,0) and B(-4,-3)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(0, -1) and B(2, -5).

Find the equation of the line.', 'y = -2x - 1', ARRAY['y = 2x - 1', 'y = -2x + 1', 'y = -x - 1'], ARRAY['y = -2x - 1', 'y = -x - 1', 'y = 2x - 1', 'y = -2x + 1'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = -2x - 1', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/711d50ca-476a-4c19-bf8a-0e00c0717bbd.svg', 'Graph of a straight line through A(0,-1) and B(2,-5)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a straight line passing through A(0, 4) and B(-2, -2).

Find the equation of the line.', 'y = 3x + 4', ARRAY['y = -3x + 4', 'y = 3x - 4', 'y = 4x + 4'], ARRAY['y = 3x - 4', 'y = 3x + 4', 'y = -3x + 4', 'y = 4x + 4'], 'Step 1: Find the gradient from A to B.

Step 2: Use y = mx + c and substitute a point to find c.

Final answer: y = 3x + 4', 'always', 'Algebra', 'algebra|graphs', 'Higher Tier', 'Non-Calculator', 4, 3, 180, 'generated/20251224240004/3743770f-6447-431f-833a-feb2a2105d36.svg', 'Graph of a straight line through A(0,4) and B(-2,-2)');

DELETE FROM public.exam_questions WHERE subtopic = 'algebra|gradients';

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-2, -1) and (0, 4).', '\frac{5}{2}', ARRAY['\frac{2}{5}', '-1.5', '\frac{5}{3}'], ARRAY['\frac{5}{2}', '\frac{2}{5}', '\frac{5}{3}', '-1.5'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 4 - -1 = 5 and \Delta x = 0 - -2 = 2.

Step 3: Gradient = \frac{5}{2}.

Final answer: \frac{5}{2}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-2, -1) and (3, 2).', '\frac{3}{5}', ARRAY['\frac{5}{3}', '1', '\frac{1}{2}'], ARRAY['1', '\frac{1}{2}', '\frac{5}{3}', '\frac{3}{5}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 2 - -1 = 3 and \Delta x = 3 - -2 = 5.

Step 3: Gradient = \frac{3}{5}.

Final answer: \frac{3}{5}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-2, 2) and (4, 1).', '\frac{-1}{6}', ARRAY['-6', '1.5', '\frac{-1}{7}'], ARRAY['\frac{-1}{7}', '1.5', '-6', '\frac{-1}{6}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 1 - 2 = -1 and \Delta x = 4 - -2 = 6.

Step 3: Gradient = \frac{-1}{6}.

Final answer: \frac{-1}{6}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-3, 1) and (0, 1).', '0', ARRAY['3', '-0.6666666666666666', '1'], ARRAY['0', '3', '-0.6666666666666666', '1'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 1 - 1 = 0 and \Delta x = 0 - -3 = 3.

Step 3: Gradient = 0.

Final answer: 0', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-2, -1) and (5, -2).', '\frac{-1}{7}', ARRAY['-7', '-1', '\frac{-1}{8}'], ARRAY['\frac{-1}{8}', '\frac{-1}{7}', '-7', '-1'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -2 - -1 = -1 and \Delta x = 5 - -2 = 7.

Step 3: Gradient = \frac{-1}{7}.

Final answer: \frac{-1}{7}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (2, 3) and (4, 8).', '\frac{5}{2}', ARRAY['\frac{2}{5}', '1.8333333333333333', '\frac{5}{3}'], ARRAY['\frac{5}{2}', '\frac{2}{5}', '1.8333333333333333', '\frac{5}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 8 - 3 = 5 and \Delta x = 4 - 2 = 2.

Step 3: Gradient = \frac{5}{2}.

Final answer: \frac{5}{2}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (2, 1) and (8, 4).', '\frac{1}{2}', ARRAY['2', '0.5', '\frac{3}{7}'], ARRAY['\frac{1}{2}', '2', '0.5', '\frac{3}{7}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 4 - 1 = 3 and \Delta x = 8 - 2 = 6.

Step 3: Gradient = \frac{1}{2}.

Final answer: \frac{1}{2}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (2, 2) and (8, 0).', '\frac{-1}{3}', ARRAY['-3', '0.2', '\frac{-2}{7}'], ARRAY['\frac{-1}{3}', '-3', '0.2', '\frac{-2}{7}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 0 - 2 = -2 and \Delta x = 8 - 2 = 6.

Step 3: Gradient = \frac{-1}{3}.

Final answer: \frac{-1}{3}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (2, 4) and (6, -2).', '\frac{-3}{2}', ARRAY['\frac{-2}{3}', '0.25', '\frac{-6}{5}'], ARRAY['0.25', '\frac{-2}{3}', '\frac{-3}{2}', '\frac{-6}{5}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -2 - 4 = -6 and \Delta x = 6 - 2 = 4.

Step 3: Gradient = \frac{-3}{2}.

Final answer: \frac{-3}{2}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-1, 5) and (4, 8).', '\frac{3}{5}', ARRAY['\frac{5}{3}', '4.333333333333333', '\frac{1}{2}'], ARRAY['\frac{1}{2}', '\frac{3}{5}', '\frac{5}{3}', '4.333333333333333'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 8 - 5 = 3 and \Delta x = 4 - -1 = 5.

Step 3: Gradient = \frac{3}{5}.

Final answer: \frac{3}{5}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (0, 0) and (5, 5).', '1', ARRAY['\frac{5}{6}', '2', '0'], ARRAY['1', '2', '\frac{5}{6}', '0'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 5 - 0 = 5 and \Delta x = 5 - 0 = 5.

Step 3: Gradient = 1.

Final answer: 1', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (2, -4) and (4, -1).', '\frac{3}{2}', ARRAY['\frac{2}{3}', '-0.8333333333333334', '1'], ARRAY['\frac{2}{3}', '\frac{3}{2}', '1', '-0.8333333333333334'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -1 - -4 = 3 and \Delta x = 4 - 2 = 2.

Step 3: Gradient = \frac{3}{2}.

Final answer: \frac{3}{2}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (2, 0) and (9, -4).', '\frac{-4}{7}', ARRAY['\frac{-7}{4}', '-0.36363636363636365', '\frac{-1}{2}'], ARRAY['-0.36363636363636365', '\frac{-7}{4}', '\frac{-1}{2}', '\frac{-4}{7}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -4 - 0 = -4 and \Delta x = 9 - 2 = 7.

Step 3: Gradient = \frac{-4}{7}.

Final answer: \frac{-4}{7}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-4, 2) and (1, 1).', '\frac{-1}{5}', ARRAY['-5', '-1', '\frac{-1}{6}'], ARRAY['\frac{-1}{5}', '-5', '-1', '\frac{-1}{6}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 1 - 2 = -1 and \Delta x = 1 - -4 = 5.

Step 3: Gradient = \frac{-1}{5}.

Final answer: \frac{-1}{5}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-3, 2) and (1, 4).', '\frac{1}{2}', ARRAY['2', '-3', '\frac{2}{5}'], ARRAY['\frac{1}{2}', '2', '\frac{2}{5}', '-3'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 4 - 2 = 2 and \Delta x = 1 - -3 = 4.

Step 3: Gradient = \frac{1}{2}.

Final answer: \frac{1}{2}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (2, -1) and (7, 2).', '\frac{3}{5}', ARRAY['\frac{5}{3}', '0.1111111111111111', '\frac{1}{2}'], ARRAY['0.1111111111111111', '\frac{3}{5}', '\frac{5}{3}', '\frac{1}{2}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 2 - -1 = 3 and \Delta x = 7 - 2 = 5.

Step 3: Gradient = \frac{3}{5}.

Final answer: \frac{3}{5}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (0, 1) and (6, 2).', '\frac{1}{6}', ARRAY['6', '0.5', '\frac{1}{7}'], ARRAY['\frac{1}{6}', '6', '\frac{1}{7}', '0.5'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 2 - 1 = 1 and \Delta x = 6 - 0 = 6.

Step 3: Gradient = \frac{1}{6}.

Final answer: \frac{1}{6}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-3, -1) and (1, 0).', '\frac{1}{4}', ARRAY['4', '0.5', '\frac{1}{5}'], ARRAY['\frac{1}{5}', '\frac{1}{4}', '0.5', '4'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 0 - -1 = 1 and \Delta x = 1 - -3 = 4.

Step 3: Gradient = \frac{1}{4}.

Final answer: \frac{1}{4}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-3, 3) and (2, 3).', '0', ARRAY['5', '-6', '1'], ARRAY['5', '1', '0', '-6'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 3 - 3 = 0 and \Delta x = 2 - -3 = 5.

Step 3: Gradient = 0.

Final answer: 0', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Find the gradient of the line through the points (-1, 0) and (6, 6).', '\frac{6}{7}', ARRAY['\frac{7}{6}', '1.2', '\frac{3}{4}'], ARRAY['1.2', '\frac{7}{6}', '\frac{6}{7}', '\frac{3}{4}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 6 - 0 = 6 and \Delta x = 6 - -1 = 7.

Step 3: Gradient = \frac{6}{7}.

Final answer: \frac{6}{7}', 'always', 'Algebra', 'algebra|gradients', 'Foundation Tier', 'Non-Calculator', 2, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-4, 1) and B(-1, -3) on a line.

Find the gradient of the line AB.', '\frac{-4}{3}', ARRAY['\frac{-3}{4}', '\frac{4}{3}', '-1'], ARRAY['\frac{-4}{3}', '\frac{-3}{4}', '-1', '\frac{4}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -3 - 1 = -4 and \Delta x = -1 - -4 = 3.

Step 3: Gradient = \frac{-4}{3}.

Final answer: \frac{-4}{3}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/f207c7ab-3565-430c-84a4-0968aead0232.svg', 'Graph with points A(-4,1) and B(-1,-3)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(1, 1) and B(3, -2) on a line.

Find the gradient of the line AB.', '\frac{-3}{2}', ARRAY['\frac{-2}{3}', '\frac{3}{2}', '-1'], ARRAY['\frac{-2}{3}', '\frac{3}{2}', '\frac{-3}{2}', '-1'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -2 - 1 = -3 and \Delta x = 3 - 1 = 2.

Step 3: Gradient = \frac{-3}{2}.

Final answer: \frac{-3}{2}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/e7f073b6-31c1-4a2c-b75e-40b929b64d7b.svg', 'Graph with points A(1,1) and B(3,-2)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(1, 3) and B(6, -1) on a line.

Find the gradient of the line AB.', '\frac{-4}{5}', ARRAY['\frac{-5}{4}', '\frac{4}{5}', '\frac{-2}{3}'], ARRAY['\frac{-4}{5}', '\frac{-5}{4}', '\frac{4}{5}', '\frac{-2}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -1 - 3 = -4 and \Delta x = 6 - 1 = 5.

Step 3: Gradient = \frac{-4}{5}.

Final answer: \frac{-4}{5}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/9b19d944-89c5-4cfb-aebc-e2506d94416b.svg', 'Graph with points A(1,3) and B(6,-1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-3, 2) and B(2, 4) on a line.

Find the gradient of the line AB.', '\frac{2}{5}', ARRAY['\frac{5}{2}', '\frac{-2}{5}', '\frac{1}{3}'], ARRAY['\frac{5}{2}', '\frac{-2}{5}', '\frac{1}{3}', '\frac{2}{5}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 4 - 2 = 2 and \Delta x = 2 - -3 = 5.

Step 3: Gradient = \frac{2}{5}.

Final answer: \frac{2}{5}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/71116f77-0274-4530-a7ea-6ef35fc4a911.svg', 'Graph with points A(-3,2) and B(2,4)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-2, -2) and B(2, 1) on a line.

Find the gradient of the line AB.', '\frac{3}{4}', ARRAY['\frac{4}{3}', '\frac{-3}{4}', '\frac{3}{5}'], ARRAY['\frac{3}{4}', '\frac{4}{3}', '\frac{-3}{4}', '\frac{3}{5}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 1 - -2 = 3 and \Delta x = 2 - -2 = 4.

Step 3: Gradient = \frac{3}{4}.

Final answer: \frac{3}{4}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/1018dc6d-965b-4b54-a980-34334a9a6058.svg', 'Graph with points A(-2,-2) and B(2,1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-3, 0) and B(2, 2) on a line.

Find the gradient of the line AB.', '\frac{2}{5}', ARRAY['\frac{5}{2}', '\frac{-2}{5}', '\frac{1}{3}'], ARRAY['\frac{2}{5}', '\frac{5}{2}', '\frac{1}{3}', '\frac{-2}{5}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 2 - 0 = 2 and \Delta x = 2 - -3 = 5.

Step 3: Gradient = \frac{2}{5}.

Final answer: \frac{2}{5}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/fe81f49b-68da-424f-986f-2869d689c1ae.svg', 'Graph with points A(-3,0) and B(2,2)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-3, -3) and B(0, 1) on a line.

Find the gradient of the line AB.', '\frac{4}{3}', ARRAY['\frac{3}{4}', '\frac{-4}{3}', '1'], ARRAY['1', '\frac{3}{4}', '\frac{4}{3}', '\frac{-4}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 1 - -3 = 4 and \Delta x = 0 - -3 = 3.

Step 3: Gradient = \frac{4}{3}.

Final answer: \frac{4}{3}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/b28013ea-b03e-4643-9273-934e31fa0b08.svg', 'Graph with points A(-3,-3) and B(0,1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(0, -1) and B(2, -6) on a line.

Find the gradient of the line AB.', '\frac{-5}{2}', ARRAY['\frac{-2}{5}', '\frac{5}{2}', '\frac{-5}{3}'], ARRAY['\frac{-5}{2}', '\frac{-2}{5}', '\frac{5}{2}', '\frac{-5}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -6 - -1 = -5 and \Delta x = 2 - 0 = 2.

Step 3: Gradient = \frac{-5}{2}.

Final answer: \frac{-5}{2}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/4b494e8c-d3d1-44ea-ac85-3bde9cf66d9c.svg', 'Graph with points A(0,-1) and B(2,-6)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-4, -3) and B(0, -1) on a line.

Find the gradient of the line AB.', '\frac{1}{2}', ARRAY['2', '\frac{-1}{2}', '\frac{2}{5}'], ARRAY['\frac{1}{2}', '\frac{2}{5}', '2', '\frac{-1}{2}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -1 - -3 = 2 and \Delta x = 0 - -4 = 4.

Step 3: Gradient = \frac{1}{2}.

Final answer: \frac{1}{2}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/bcbac4c2-6e5a-4a83-b25c-98443852e277.svg', 'Graph with points A(-4,-3) and B(0,-1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-2, 1) and B(0, 6) on a line.

Find the gradient of the line AB.', '\frac{5}{2}', ARRAY['\frac{2}{5}', '\frac{-5}{2}', '\frac{5}{3}'], ARRAY['\frac{5}{2}', '\frac{2}{5}', '\frac{-5}{2}', '\frac{5}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 6 - 1 = 5 and \Delta x = 0 - -2 = 2.

Step 3: Gradient = \frac{5}{2}.

Final answer: \frac{5}{2}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Calculator', 4, 3, 170, 'generated/20251224240004/c907fdd1-c5df-4b0d-a30e-334cba482eac.svg', 'Graph with points A(-2,1) and B(0,6)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-3, -4) and B(0, -6) on a line.

Find the gradient of the line AB.', '\frac{-2}{3}', ARRAY['\frac{-3}{2}', '\frac{2}{3}', '\frac{-1}{2}'], ARRAY['\frac{-1}{2}', '\frac{2}{3}', '\frac{-3}{2}', '\frac{-2}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -6 - -4 = -2 and \Delta x = 0 - -3 = 3.

Step 3: Gradient = \frac{-2}{3}.

Final answer: \frac{-2}{3}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/1d044c3d-33c9-4881-b298-686534ff129a.svg', 'Graph with points A(-3,-4) and B(0,-6)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-2, 1) and B(1, 3) on a line.

Find the gradient of the line AB.', '\frac{2}{3}', ARRAY['\frac{3}{2}', '\frac{-2}{3}', '\frac{1}{2}'], ARRAY['\frac{2}{3}', '\frac{3}{2}', '\frac{-2}{3}', '\frac{1}{2}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 3 - 1 = 2 and \Delta x = 1 - -2 = 3.

Step 3: Gradient = \frac{2}{3}.

Final answer: \frac{2}{3}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/d7e6651f-b771-41e2-89d2-d0450ea59e96.svg', 'Graph with points A(-2,1) and B(1,3)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-3, 2) and B(1, 5) on a line.

Find the gradient of the line AB.', '\frac{3}{4}', ARRAY['\frac{4}{3}', '\frac{-3}{4}', '\frac{3}{5}'], ARRAY['\frac{-3}{4}', '\frac{3}{5}', '\frac{4}{3}', '\frac{3}{4}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 5 - 2 = 3 and \Delta x = 1 - -3 = 4.

Step 3: Gradient = \frac{3}{4}.

Final answer: \frac{3}{4}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/db79256c-7d22-4495-a14f-57f13563dc3c.svg', 'Graph with points A(-3,2) and B(1,5)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(0, 2) and B(5, 0) on a line.

Find the gradient of the line AB.', '\frac{-2}{5}', ARRAY['\frac{-5}{2}', '\frac{2}{5}', '\frac{-1}{3}'], ARRAY['\frac{-2}{5}', '\frac{-1}{3}', '\frac{-5}{2}', '\frac{2}{5}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 0 - 2 = -2 and \Delta x = 5 - 0 = 5.

Step 3: Gradient = \frac{-2}{5}.

Final answer: \frac{-2}{5}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/88a134d7-0bff-4640-8f49-b8040af76a34.svg', 'Graph with points A(0,2) and B(5,0)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-3, -3) and B(0, 2) on a line.

Find the gradient of the line AB.', '\frac{5}{3}', ARRAY['\frac{3}{5}', '\frac{-5}{3}', '\frac{5}{4}'], ARRAY['\frac{5}{3}', '\frac{-5}{3}', '\frac{3}{5}', '\frac{5}{4}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 2 - -3 = 5 and \Delta x = 0 - -3 = 3.

Step 3: Gradient = \frac{5}{3}.

Final answer: \frac{5}{3}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/6573dde1-5133-495d-b206-9eaf008fb4ae.svg', 'Graph with points A(-3,-3) and B(0,2)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-3, -3) and B(2, 1) on a line.

Find the gradient of the line AB.', '\frac{4}{5}', ARRAY['\frac{5}{4}', '\frac{-4}{5}', '\frac{2}{3}'], ARRAY['\frac{4}{5}', '\frac{5}{4}', '\frac{-4}{5}', '\frac{2}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 1 - -3 = 4 and \Delta x = 2 - -3 = 5.

Step 3: Gradient = \frac{4}{5}.

Final answer: \frac{4}{5}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/1b8484d8-4b0f-4682-a111-05e5cf99c98b.svg', 'Graph with points A(-3,-3) and B(2,1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-1, 3) and B(4, -1) on a line.

Find the gradient of the line AB.', '\frac{-4}{5}', ARRAY['\frac{-5}{4}', '\frac{4}{5}', '\frac{-2}{3}'], ARRAY['\frac{-5}{4}', '\frac{-4}{5}', '\frac{4}{5}', '\frac{-2}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -1 - 3 = -4 and \Delta x = 4 - -1 = 5.

Step 3: Gradient = \frac{-4}{5}.

Final answer: \frac{-4}{5}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/f1345981-1bbb-4d16-b9f0-3d141299ae28.svg', 'Graph with points A(-1,3) and B(4,-1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-1, -1) and B(3, 1) on a line.

Find the gradient of the line AB.', '\frac{1}{2}', ARRAY['2', '\frac{-1}{2}', '\frac{2}{5}'], ARRAY['\frac{2}{5}', '\frac{-1}{2}', '2', '\frac{1}{2}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = 1 - -1 = 2 and \Delta x = 3 - -1 = 4.

Step 3: Gradient = \frac{1}{2}.

Final answer: \frac{1}{2}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/99aa407b-0ba5-483a-a9f1-11bb529515cf.svg', 'Graph with points A(-1,-1) and B(3,1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(-2, 4) and B(1, -1) on a line.

Find the gradient of the line AB.', '\frac{-5}{3}', ARRAY['\frac{-3}{5}', '\frac{5}{3}', '\frac{-5}{4}'], ARRAY['\frac{-5}{4}', '\frac{5}{3}', '\frac{-3}{5}', '\frac{-5}{3}'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -1 - 4 = -5 and \Delta x = 1 - -2 = 3.

Step 3: Gradient = \frac{-5}{3}.

Final answer: \frac{-5}{3}', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/78b2c68a-2c2f-49ab-a07d-97ec76d53f8c.svg', 'Graph with points A(-2,4) and B(1,-1)');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows points A(1, -2) and B(3, -6) on a line.

Find the gradient of the line AB.', '-2', ARRAY['\frac{-1}{2}', '2', '\frac{-4}{3}'], ARRAY['\frac{-1}{2}', '-2', '\frac{-4}{3}', '2'], 'Step 1: Use gradient = \frac{\Delta y}{\Delta x}.

Step 2: \Delta y = -6 - -2 = -4 and \Delta x = 3 - 1 = 2.

Step 3: Gradient = -2.

Final answer: -2', 'always', 'Algebra', 'algebra|gradients', 'Higher Tier', 'Non-Calculator', 4, 3, 170, 'generated/20251224240004/e4c6603c-d0c3-459b-9d7f-a7e93d4467e3.svg', 'Graph with points A(1,-2) and B(3,-6)');

DELETE FROM public.exam_questions WHERE subtopic = 'algebra|quadratics';

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 + 1x - 30 = 0.', 'x = -6 or x = 5', ARRAY['x = 6 or x = -5', 'x = -1', 'x = -6 only'], ARRAY['x = -6 or x = 5', 'x = -6 only', 'x = 6 or x = -5', 'x = -1'], 'Step 1: Factorise: 1x^2 + 1x - 30 = 1(x + 6)(x - 5).

Step 2: Set each bracket to 0:

x + 6 = 0 gives x = -6

x - 5 = 0 gives x = 5

Final answer: x = -6 or x = 5', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 + 3x - 4 = 0.', 'x = 1 or x = -4', ARRAY['x = -1 or x = 4', 'x = -3', 'x = 1 only'], ARRAY['x = 1 or x = -4', 'x = -1 or x = 4', 'x = -3', 'x = 1 only'], 'Step 1: Factorise: 1x^2 + 3x - 4 = 1(x - 1)(x + 4).

Step 2: Set each bracket to 0:

x - 1 = 0 gives x = 1

x + 4 = 0 gives x = -4

Final answer: x = 1 or x = -4', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 11x + 30 = 0.', 'x = 5 or x = 6', ARRAY['x = -5 or x = -6', 'x = 11', 'x = 5 only'], ARRAY['x = 11', 'x = 5 only', 'x = -5 or x = -6', 'x = 5 or x = 6'], 'Step 1: Factorise: 1x^2 - 11x + 30 = 1(x - 5)(x - 6).

Step 2: Set each bracket to 0:

x - 5 = 0 gives x = 5

x - 6 = 0 gives x = 6

Final answer: x = 5 or x = 6', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 1x - 30 = 0.', 'x = 6 or x = -5', ARRAY['x = -6 or x = 5', 'x = 1', 'x = 6 only'], ARRAY['x = 6 or x = -5', 'x = -6 or x = 5', 'x = 6 only', 'x = 1'], 'Step 1: Factorise: 1x^2 - 1x - 30 = 1(x - 6)(x + 5).

Step 2: Set each bracket to 0:

x - 6 = 0 gives x = 6

x + 5 = 0 gives x = -5

Final answer: x = 6 or x = -5', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 4x - 12 = 0.', 'x = -2 or x = 6', ARRAY['x = 2 or x = -6', 'x = 4', 'x = -2 only'], ARRAY['x = -2 or x = 6', 'x = 2 or x = -6', 'x = 4', 'x = -2 only'], 'Step 1: Factorise: 1x^2 - 4x - 12 = 1(x + 2)(x - 6).

Step 2: Set each bracket to 0:

x + 2 = 0 gives x = -2

x - 6 = 0 gives x = 6

Final answer: x = -2 or x = 6', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 + 7x + 12 = 0.', 'x = -4 or x = -3', ARRAY['x = 4 or x = 3', 'x = -7', 'x = -4 only'], ARRAY['x = -4 or x = -3', 'x = -4 only', 'x = -7', 'x = 4 or x = 3'], 'Step 1: Factorise: 1x^2 + 7x + 12 = 1(x + 4)(x + 3).

Step 2: Set each bracket to 0:

x + 4 = 0 gives x = -4

x + 3 = 0 gives x = -3

Final answer: x = -4 or x = -3', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 2x - 15 = 0.', 'x = 5 or x = -3', ARRAY['x = -5 or x = 3', 'x = 2', 'x = 5 only'], ARRAY['x = 5 or x = -3', 'x = 5 only', 'x = -5 or x = 3', 'x = 2'], 'Step 1: Factorise: 1x^2 - 2x - 15 = 1(x - 5)(x + 3).

Step 2: Set each bracket to 0:

x - 5 = 0 gives x = 5

x + 3 = 0 gives x = -3

Final answer: x = 5 or x = -3', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 9x + 18 = 0.', 'x = 6 or x = 3', ARRAY['x = -6 or x = -3', 'x = 9', 'x = 6 only'], ARRAY['x = 9', 'x = -6 or x = -3', 'x = 6 only', 'x = 6 or x = 3'], 'Step 1: Factorise: 1x^2 - 9x + 18 = 1(x - 6)(x - 3).

Step 2: Set each bracket to 0:

x - 6 = 0 gives x = 6

x - 3 = 0 gives x = 3

Final answer: x = 6 or x = 3', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 5x + 4 = 0.', 'x = 4 or x = 1', ARRAY['x = -4 or x = -1', 'x = 5', 'x = 4 only'], ARRAY['x = 4 only', 'x = 4 or x = 1', 'x = 5', 'x = -4 or x = -1'], 'Step 1: Factorise: 1x^2 - 5x + 4 = 1(x - 4)(x - 1).

Step 2: Set each bracket to 0:

x - 4 = 0 gives x = 4

x - 1 = 0 gives x = 1

Final answer: x = 4 or x = 1', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 1x - 20 = 0.', 'x = 5 or x = -4', ARRAY['x = -5 or x = 4', 'x = 1', 'x = 5 only'], ARRAY['x = 5 or x = -4', 'x = -5 or x = 4', 'x = 1', 'x = 5 only'], 'Step 1: Factorise: 1x^2 - 1x - 20 = 1(x - 5)(x + 4).

Step 2: Set each bracket to 0:

x - 5 = 0 gives x = 5

x + 4 = 0 gives x = -4

Final answer: x = 5 or x = -4', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 + 6x + 8 = 0.', 'x = -4 or x = -2', ARRAY['x = 4 or x = 2', 'x = -6', 'x = -4 only'], ARRAY['x = 4 or x = 2', 'x = -6', 'x = -4 or x = -2', 'x = -4 only'], 'Step 1: Factorise: 1x^2 + 6x + 8 = 1(x + 4)(x + 2).

Step 2: Set each bracket to 0:

x + 4 = 0 gives x = -4

x + 2 = 0 gives x = -2

Final answer: x = -4 or x = -2', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 + 5x + 4 = 0.', 'x = -4 or x = -1', ARRAY['x = 4 or x = 1', 'x = -5', 'x = -4 only'], ARRAY['x = -4 or x = -1', 'x = -4 only', 'x = -5', 'x = 4 or x = 1'], 'Step 1: Factorise: 1x^2 + 5x + 4 = 1(x + 4)(x + 1).

Step 2: Set each bracket to 0:

x + 4 = 0 gives x = -4

x + 1 = 0 gives x = -1

Final answer: x = -4 or x = -1', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 3x - 4 = 0.', 'x = -1 or x = 4', ARRAY['x = 1 or x = -4', 'x = 3', 'x = -1 only'], ARRAY['x = -1 or x = 4', 'x = 1 or x = -4', 'x = 3', 'x = -1 only'], 'Step 1: Factorise: 1x^2 - 3x - 4 = 1(x + 1)(x - 4).

Step 2: Set each bracket to 0:

x + 1 = 0 gives x = -1

x - 4 = 0 gives x = 4

Final answer: x = -1 or x = 4', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 + 1x - 6 = 0.', 'x = 2 or x = -3', ARRAY['x = -2 or x = 3', 'x = -1', 'x = 2 only'], ARRAY['x = 2 or x = -3', 'x = -2 or x = 3', 'x = -1', 'x = 2 only'], 'Step 1: Factorise: 1x^2 + 1x - 6 = 1(x - 2)(x + 3).

Step 2: Set each bracket to 0:

x - 2 = 0 gives x = 2

x + 3 = 0 gives x = -3

Final answer: x = 2 or x = -3', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 + 2x - 8 = 0.', 'x = 2 or x = -4', ARRAY['x = -2 or x = 4', 'x = -2', 'x = 2 only'], ARRAY['x = -2 or x = 4', 'x = 2 only', 'x = -2', 'x = 2 or x = -4'], 'Step 1: Factorise: 1x^2 + 2x - 8 = 1(x - 2)(x + 4).

Step 2: Set each bracket to 0:

x - 2 = 0 gives x = 2

x + 4 = 0 gives x = -4

Final answer: x = 2 or x = -4', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 + 9x + 18 = 0.', 'x = -3 or x = -6', ARRAY['x = 3 or x = 6', 'x = -9', 'x = -3 only'], ARRAY['x = -9', 'x = -3 or x = -6', 'x = 3 or x = 6', 'x = -3 only'], 'Step 1: Factorise: 1x^2 + 9x + 18 = 1(x + 3)(x + 6).

Step 2: Set each bracket to 0:

x + 3 = 0 gives x = -3

x + 6 = 0 gives x = -6

Final answer: x = -3 or x = -6', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 6x + 8 = 0.', 'x = 2 or x = 4', ARRAY['x = -2 or x = -4', 'x = 6', 'x = 2 only'], ARRAY['x = 2 or x = 4', 'x = -2 or x = -4', 'x = 2 only', 'x = 6'], 'Step 1: Factorise: 1x^2 - 6x + 8 = 1(x - 2)(x - 4).

Step 2: Set each bracket to 0:

x - 2 = 0 gives x = 2

x - 4 = 0 gives x = 4

Final answer: x = 2 or x = 4', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 1x - 12 = 0.', 'x = -3 or x = 4', ARRAY['x = 3 or x = -4', 'x = 1', 'x = -3 only'], ARRAY['x = -3 only', 'x = 1', 'x = 3 or x = -4', 'x = -3 or x = 4'], 'Step 1: Factorise: 1x^2 - 1x - 12 = 1(x + 3)(x - 4).

Step 2: Set each bracket to 0:

x + 3 = 0 gives x = -3

x - 4 = 0 gives x = 4

Final answer: x = -3 or x = 4', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 5x - 6 = 0.', 'x = -1 or x = 6', ARRAY['x = 1 or x = -6', 'x = 5', 'x = -1 only'], ARRAY['x = 1 or x = -6', 'x = -1 only', 'x = -1 or x = 6', 'x = 5'], 'Step 1: Factorise: 1x^2 - 5x - 6 = 1(x + 1)(x - 6).

Step 2: Set each bracket to 0:

x + 1 = 0 gives x = -1

x - 6 = 0 gives x = 6

Final answer: x = -1 or x = 6', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 1x^2 - 2x - 8 = 0.', 'x = -2 or x = 4', ARRAY['x = 2 or x = -4', 'x = 2', 'x = -2 only'], ARRAY['x = -2 only', 'x = 2', 'x = 2 or x = -4', 'x = -2 or x = 4'], 'Step 1: Factorise: 1x^2 - 2x - 8 = 1(x + 2)(x - 4).

Step 2: Set each bracket to 0:

x + 2 = 0 gives x = -2

x - 4 = 0 gives x = 4

Final answer: x = -2 or x = 4', 'always', 'Algebra', 'algebra|quadratics', 'Foundation Tier', 'Non-Calculator', 3, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = 3 and is symmetric about x = 2.

What are the roots of the equation?', 'x = 3 or x = 1', ARRAY['x = -3 or x = -1', 'x = 4', 'x = 3 only'], ARRAY['x = 3 or x = 1', 'x = 3 only', 'x = -3 or x = -1', 'x = 4'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = 3 or x = 1', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 5, 3, 200, 'generated/20251224240004/5cb037ea-d359-4dc8-aea7-c64cd780b970.svg', 'Quadratic graph with x-intercepts at 3 and 1');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 4x^2 - 28x + 40 = 0.', 'x = 5 or x = 2', ARRAY['x = -5 or x = -2', 'x = 7', 'x = 5 only'], ARRAY['x = 5 or x = 2', 'x = -5 or x = -2', 'x = 5 only', 'x = 7'], 'Step 1: Factorise: 4x^2 - 28x + 40 = 4(x - 5)(x - 2).

Step 2: Set each bracket to 0:

x - 5 = 0 gives x = 5

x - 2 = 0 gives x = 2

Final answer: x = 5 or x = 2', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = -3 and is symmetric about x = 1.

What are the roots of the equation?', 'x = -1 or x = 3', ARRAY['x = 1 or x = -3', 'x = 2', 'x = -1 only'], ARRAY['x = 2', 'x = -1 or x = 3', 'x = -1 only', 'x = 1 or x = -3'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = -1 or x = 3', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 5, 3, 200, 'generated/20251224240004/909d0f47-d07c-4a78-bc4c-6318b17c9ba4.svg', 'Quadratic graph with x-intercepts at -1 and 3');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 3x^2 - 21x + 36 = 0.', 'x = 3 or x = 4', ARRAY['x = -3 or x = -4', 'x = 7', 'x = 3 only'], ARRAY['x = 7', 'x = -3 or x = -4', 'x = 3 only', 'x = 3 or x = 4'], 'Step 1: Factorise: 3x^2 - 21x + 36 = 3(x - 3)(x - 4).

Step 2: Set each bracket to 0:

x - 3 = 0 gives x = 3

x - 4 = 0 gives x = 4

Final answer: x = 3 or x = 4', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = 6 and is symmetric about x = \frac{5}{2}.

What are the roots of the equation?', 'x = 2 or x = 3', ARRAY['x = -2 or x = -3', 'x = 5', 'x = 2 only'], ARRAY['x = 2 only', 'x = 5', 'x = -2 or x = -3', 'x = 2 or x = 3'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = 2 or x = 3', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 5, 3, 200, 'generated/20251224240004/c90aa7c4-bf68-4236-a1ed-a9a95a96ae88.svg', 'Quadratic graph with x-intercepts at 2 and 3');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 2x^2 + 8x - 10 = 0.', 'x = -5 or x = 1', ARRAY['x = 5 or x = -1', 'x = -4', 'x = -5 only'], ARRAY['x = -5 or x = 1', 'x = 5 or x = -1', 'x = -5 only', 'x = -4'], 'Step 1: Factorise: 2x^2 + 8x - 10 = 2(x + 5)(x - 1).

Step 2: Set each bracket to 0:

x + 5 = 0 gives x = -5

x - 1 = 0 gives x = 1

Final answer: x = -5 or x = 1', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = -2 and is symmetric about x = \frac{-1}{2}.

What are the roots of the equation?', 'x = -2 or x = 1', ARRAY['x = 2 or x = -1', 'x = -1', 'x = -2 only'], ARRAY['x = -2 or x = 1', 'x = 2 or x = -1', 'x = -2 only', 'x = -1'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = -2 or x = 1', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 5, 3, 200, 'generated/20251224240004/e52538df-7b7b-40ae-9bf6-6e99e522e3df.svg', 'Quadratic graph with x-intercepts at -2 and 1');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 3x^2 + 30x + 72 = 0.', 'x = -4 or x = -6', ARRAY['x = 4 or x = 6', 'x = -10', 'x = -4 only'], ARRAY['x = -4 or x = -6', 'x = -4 only', 'x = 4 or x = 6', 'x = -10'], 'Step 1: Factorise: 3x^2 + 30x + 72 = 3(x + 4)(x + 6).

Step 2: Set each bracket to 0:

x + 4 = 0 gives x = -4

x + 6 = 0 gives x = -6

Final answer: x = -4 or x = -6', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = -3 and is symmetric about x = -1.

What are the roots of the equation?', 'x = 1 or x = -3', ARRAY['x = -1 or x = 3', 'x = -2', 'x = 1 only'], ARRAY['x = -2', 'x = -1 or x = 3', 'x = 1 or x = -3', 'x = 1 only'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = 1 or x = -3', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 5, 3, 200, 'generated/20251224240004/3550bb76-da13-4c7d-ad42-88565439492a.svg', 'Quadratic graph with x-intercepts at 1 and -3');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 3x^2 - 27x + 60 = 0.', 'x = 5 or x = 4', ARRAY['x = -5 or x = -4', 'x = 9', 'x = 5 only'], ARRAY['x = -5 or x = -4', 'x = 5 or x = 4', 'x = 9', 'x = 5 only'], 'Step 1: Factorise: 3x^2 - 27x + 60 = 3(x - 5)(x - 4).

Step 2: Set each bracket to 0:

x - 5 = 0 gives x = 5

x - 4 = 0 gives x = 4

Final answer: x = 5 or x = 4', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = 6 and is symmetric about x = \frac{-5}{2}.

What are the roots of the equation?', 'x = -2 or x = -3', ARRAY['x = 2 or x = 3', 'x = -5', 'x = -2 only'], ARRAY['x = 2 or x = 3', 'x = -5', 'x = -2 only', 'x = -2 or x = -3'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = -2 or x = -3', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 5, 3, 200, 'generated/20251224240004/416d69bd-9a14-4444-8db8-290006281818.svg', 'Quadratic graph with x-intercepts at -2 and -3');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 2x^2 + 20x + 48 = 0.', 'x = -6 or x = -4', ARRAY['x = 6 or x = 4', 'x = -10', 'x = -6 only'], ARRAY['x = -6 or x = -4', 'x = -6 only', 'x = 6 or x = 4', 'x = -10'], 'Step 1: Factorise: 2x^2 + 20x + 48 = 2(x + 6)(x + 4).

Step 2: Set each bracket to 0:

x + 6 = 0 gives x = -6

x + 4 = 0 gives x = -4

Final answer: x = -6 or x = -4', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = 2 and is symmetric about x = \frac{3}{2}.

What are the roots of the equation?', 'x = 2 or x = 1', ARRAY['x = -2 or x = -1', 'x = 3', 'x = 2 only'], ARRAY['x = 2 or x = 1', 'x = -2 or x = -1', 'x = 3', 'x = 2 only'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = 2 or x = 1', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 5, 3, 200, 'generated/20251224240004/f7d37b8a-2316-4278-ade7-132dc8523b51.svg', 'Quadratic graph with x-intercepts at 2 and 1');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 4x^2 + 24x + 32 = 0.', 'x = -4 or x = -2', ARRAY['x = 4 or x = 2', 'x = -6', 'x = -4 only'], ARRAY['x = -6', 'x = 4 or x = 2', 'x = -4 only', 'x = -4 or x = -2'], 'Step 1: Factorise: 4x^2 + 24x + 32 = 4(x + 4)(x + 2).

Step 2: Set each bracket to 0:

x + 4 = 0 gives x = -4

x + 2 = 0 gives x = -2

Final answer: x = -4 or x = -2', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = 3 and is symmetric about x = -2.

What are the roots of the equation?', 'x = -3 or x = -1', ARRAY['x = 3 or x = 1', 'x = -4', 'x = -3 only'], ARRAY['x = -3 or x = -1', 'x = 3 or x = 1', 'x = -4', 'x = -3 only'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = -3 or x = -1', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 5, 3, 200, 'generated/20251224240004/bf868ca3-ce81-42ae-9a11-3f5fea11dd77.svg', 'Quadratic graph with x-intercepts at -3 and -1');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 4x^2 + 16x - 48 = 0.', 'x = 2 or x = -6', ARRAY['x = -2 or x = 6', 'x = -4', 'x = 2 only'], ARRAY['x = 2 or x = -6', 'x = 2 only', 'x = -2 or x = 6', 'x = -4'], 'Step 1: Factorise: 4x^2 + 16x - 48 = 4(x - 2)(x + 6).

Step 2: Set each bracket to 0:

x - 2 = 0 gives x = 2

x + 6 = 0 gives x = -6

Final answer: x = 2 or x = -6', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = -6 and is symmetric about x = \frac{1}{2}.

What are the roots of the equation?', 'x = 3 or x = -2', ARRAY['x = -3 or x = 2', 'x = 1', 'x = 3 only'], ARRAY['x = 3 or x = -2', 'x = -3 or x = 2', 'x = 1', 'x = 3 only'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = 3 or x = -2', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 5, 3, 200, 'generated/20251224240004/76ff7219-278f-48f5-8f4c-d5e1b4a23c33.svg', 'Quadratic graph with x-intercepts at 3 and -2');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 2x^2 + 4x - 6 = 0.', 'x = -3 or x = 1', ARRAY['x = 3 or x = -1', 'x = -2', 'x = -3 only'], ARRAY['x = -3 only', 'x = -2', 'x = -3 or x = 1', 'x = 3 or x = -1'], 'Step 1: Factorise: 2x^2 + 4x - 6 = 2(x + 3)(x - 1).

Step 2: Set each bracket to 0:

x + 3 = 0 gives x = -3

x - 1 = 0 gives x = 1

Final answer: x = -3 or x = 1', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 4, 3, 220, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('The graph shows a quadratic curve that crosses the y-axis at y = -6 and is symmetric about x = \frac{-1}{2}.

What are the roots of the equation?', 'x = 2 or x = -3', ARRAY['x = -2 or x = 3', 'x = -1', 'x = 2 only'], ARRAY['x = 2 or x = -3', 'x = -2 or x = 3', 'x = 2 only', 'x = -1'], 'Step 1: The roots are the x-intercepts.

Step 2: Read where the curve crosses the x-axis.

Final answer: x = 2 or x = -3', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 5, 3, 200, 'generated/20251224240004/a192236b-40f1-4f68-8cc2-49f8edd74ae3.svg', 'Quadratic graph with x-intercepts at 2 and -3');

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Solve 4x^2 - 20x + 24 = 0.', 'x = 2 or x = 3', ARRAY['x = -2 or x = -3', 'x = 5', 'x = 2 only'], ARRAY['x = 2 or x = 3', 'x = -2 or x = -3', 'x = 5', 'x = 2 only'], 'Step 1: Factorise: 4x^2 - 20x + 24 = 4(x - 2)(x - 3).

Step 2: Set each bracket to 0:

x - 2 = 0 gives x = 2

x - 3 = 0 gives x = 3

Final answer: x = 2 or x = 3', 'always', 'Algebra', 'algebra|quadratics', 'Higher Tier', 'Non-Calculator', 4, 3, 220, NULL, NULL);

DELETE FROM public.exam_questions WHERE subtopic = 'algebra|algebraic_fractions';

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{36x}{28}.', '\frac{9}{7}x', ARRAY['\frac{10}{7}x', '\frac{9}{7}', 'Different answer 1'], ARRAY['\frac{9}{7}', 'Different answer 1', '\frac{10}{7}x', '\frac{9}{7}x'], 'Step 1: Simplify the fraction \frac{36}{28} by dividing by 4.

Step 2: \frac{36x}{28} = \frac{9}{7}x.

Final answer: \frac{9}{7}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 2, 1, 100, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{3x}{5x}.', '\frac{3}{5}', ARRAY['\frac{5}{3}', '\frac{3}{5}x', '35'], ARRAY['\frac{3}{5}', '\frac{3}{5}x', '\frac{5}{3}', '35'], 'Step 1: Cancel x from top and bottom.

Step 2: \frac{3x}{5x} = \frac{3}{5}.

Final answer: \frac{3}{5}', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 2, 2, 120, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{2x^2}{7x}.', '\frac{2}{7}x', ARRAY['\frac{7}{2}x', '2x^2', '\frac{2}{7}'], ARRAY['2x^2', '\frac{7}{2}x', '\frac{2}{7}', '\frac{2}{7}x'], 'Step 1: Cancel one x: \frac{x^2}{x} = x.

Step 2: \frac{2x^2}{7x} = \frac{2}{7}x.

Final answer: \frac{2}{7}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{4xy}{5y}.', '\frac{4}{5}x', ARRAY['\frac{5}{4}x', '4x', '\frac{4}{5}'], ARRAY['4x', '\frac{5}{4}x', '\frac{4}{5}x', '\frac{4}{5}'], 'Step 1: Cancel y from top and bottom.

Step 2: \frac{4xy}{5y} = \frac{4}{5}x.

Final answer: \frac{4}{5}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{2x^2y}{8xy}.', '\frac{1}{4}x', ARRAY['4x', '2xy', '\frac{1}{4}'], ARRAY['\frac{1}{4}', '2xy', '4x', '\frac{1}{4}x'], 'Step 1: Cancel x and y: \frac{x^2y}{xy} = x.

Step 2: \frac{2x^2y}{8xy} = \frac{1}{4}x.

Final answer: \frac{1}{4}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{12x}{8}.', '\frac{3}{2}x', ARRAY['2x', '\frac{3}{2}', 'Different answer 1'], ARRAY['\frac{3}{2}x', '2x', '\frac{3}{2}', 'Different answer 1'], 'Step 1: Simplify the fraction \frac{12}{8} by dividing by 4.

Step 2: \frac{12x}{8} = \frac{3}{2}x.

Final answer: \frac{3}{2}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 2, 1, 100, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{4x}{2x}.', '2', ARRAY['\frac{1}{2}', '2x', '42'], ARRAY['\frac{1}{2}', '2', '42', '2x'], 'Step 1: Cancel x from top and bottom.

Step 2: \frac{4x}{2x} = \frac{4}{2}.

Final answer: 2', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 2, 2, 120, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{4x^2}{6x}.', '\frac{2}{3}x', ARRAY['\frac{3}{2}x', '4x^2', '\frac{2}{3}'], ARRAY['\frac{2}{3}x', '\frac{3}{2}x', '4x^2', '\frac{2}{3}'], 'Step 1: Cancel one x: \frac{x^2}{x} = x.

Step 2: \frac{4x^2}{6x} = \frac{2}{3}x.

Final answer: \frac{2}{3}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{3xy}{9y}.', '\frac{1}{3}x', ARRAY['3x', '\frac{1}{3}', 'Different answer 1'], ARRAY['\frac{1}{3}x', '\frac{1}{3}', '3x', 'Different answer 1'], 'Step 1: Cancel y from top and bottom.

Step 2: \frac{3xy}{9y} = \frac{1}{3}x.

Final answer: \frac{1}{3}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{6x^2y}{4xy}.', '\frac{3}{2}x', ARRAY['\frac{2}{3}x', '6xy', '\frac{3}{2}'], ARRAY['\frac{3}{2}x', '\frac{2}{3}x', '6xy', '\frac{3}{2}'], 'Step 1: Cancel x and y: \frac{x^2y}{xy} = x.

Step 2: \frac{6x^2y}{4xy} = \frac{3}{2}x.

Final answer: \frac{3}{2}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{18x}{24}.', '\frac{3}{4}x', ARRAY['x', '\frac{3}{4}', 'Different answer 1'], ARRAY['Different answer 1', '\frac{3}{4}', 'x', '\frac{3}{4}x'], 'Step 1: Simplify the fraction \frac{18}{24} by dividing by 3.

Step 2: \frac{18x}{24} = \frac{3}{4}x.

Final answer: \frac{3}{4}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 2, 1, 100, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{5x}{3x}.', '\frac{5}{3}', ARRAY['\frac{3}{5}', '\frac{5}{3}x', '53'], ARRAY['53', '\frac{5}{3}', '\frac{3}{5}', '\frac{5}{3}x'], 'Step 1: Cancel x from top and bottom.

Step 2: \frac{5x}{3x} = \frac{5}{3}.

Final answer: \frac{5}{3}', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 2, 2, 120, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{7x^2}{2x}.', '\frac{7}{2}x', ARRAY['\frac{2}{7}x', '7x^2', '\frac{7}{2}'], ARRAY['\frac{2}{7}x', '\frac{7}{2}x', '\frac{7}{2}', '7x^2'], 'Step 1: Cancel one x: \frac{x^2}{x} = x.

Step 2: \frac{7x^2}{2x} = \frac{7}{2}x.

Final answer: \frac{7}{2}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{3xy}{5y}.', '\frac{3}{5}x', ARRAY['\frac{5}{3}x', '3x', '\frac{3}{5}'], ARRAY['\frac{3}{5}x', '\frac{3}{5}', '\frac{5}{3}x', '3x'], 'Step 1: Cancel y from top and bottom.

Step 2: \frac{3xy}{5y} = \frac{3}{5}x.

Final answer: \frac{3}{5}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{3x^2y}{8xy}.', '\frac{3}{8}x', ARRAY['\frac{8}{3}x', '3xy', '\frac{3}{8}'], ARRAY['\frac{3}{8}', '3xy', '\frac{8}{3}x', '\frac{3}{8}x'], 'Step 1: Cancel x and y: \frac{x^2y}{xy} = x.

Step 2: \frac{3x^2y}{8xy} = \frac{3}{8}x.

Final answer: \frac{3}{8}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{6x}{18}.', '\frac{1}{3}x', ARRAY['\frac{2}{3}x', '\frac{1}{3}', 'Different answer 1'], ARRAY['\frac{1}{3}x', 'Different answer 1', '\frac{2}{3}x', '\frac{1}{3}'], 'Step 1: Simplify the fraction \frac{6}{18} by dividing by 2.

Step 2: \frac{6x}{18} = \frac{1}{3}x.

Final answer: \frac{1}{3}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 2, 1, 100, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{8x}{2x}.', '4', ARRAY['\frac{1}{4}', '4x', '82'], ARRAY['\frac{1}{4}', '4', '4x', '82'], 'Step 1: Cancel x from top and bottom.

Step 2: \frac{8x}{2x} = \frac{8}{2}.

Final answer: 4', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 2, 2, 120, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{9x^2}{3x}.', '3x', ARRAY['\frac{1}{3}x', '9x^2', '3'], ARRAY['3', '3x', '\frac{1}{3}x', '9x^2'], 'Step 1: Cancel one x: \frac{x^2}{x} = x.

Step 2: \frac{9x^2}{3x} = 3x.

Final answer: 3x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{6xy}{5y}.', '\frac{6}{5}x', ARRAY['\frac{5}{6}x', '6x', '\frac{6}{5}'], ARRAY['\frac{6}{5}', '\frac{5}{6}x', '\frac{6}{5}x', '6x'], 'Step 1: Cancel y from top and bottom.

Step 2: \frac{6xy}{5y} = \frac{6}{5}x.

Final answer: \frac{6}{5}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{9x^2y}{8xy}.', '\frac{9}{8}x', ARRAY['\frac{8}{9}x', '9xy', '\frac{9}{8}'], ARRAY['\frac{9}{8}x', '\frac{9}{8}', '\frac{8}{9}x', '9xy'], 'Step 1: Cancel x and y: \frac{x^2y}{xy} = x.

Step 2: \frac{9x^2y}{8xy} = \frac{9}{8}x.

Final answer: \frac{9}{8}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Foundation Tier', 'Non-Calculator', 3, 2, 130, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{x^2 - 9}{x - 3}.', 'x + 3', ARRAY['x - 3', 'x^2 - 9', 'x + 9'], ARRAY['x^2 - 9', 'x + 9', 'x - 3', 'x + 3'], 'Step 1: Factorise the numerator: x^2 - 9 = (x - 3)(x + 3).

Step 2: Cancel (x - 3).

Final answer: x + 3', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{x^2 + 4x}{x}.', 'x + 4', ARRAY['x^2 + 4', 'x + 4x', '4'], ARRAY['x + 4x', 'x^2 + 4', '4', 'x + 4'], 'Step 1: Factorise: x^2 + 4x = x(x + 4).

Step 2: Cancel x.

Final answer: x + 4', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{2x^2y}{6xy^2}.', '\frac{2x}{6y}', ARRAY['\frac{2y}{6x}', '\frac{1}{3}x', '\frac{2}{6}xy'], ARRAY['\frac{2x}{6y}', '\frac{2}{6}xy', '\frac{2y}{6x}', '\frac{1}{3}x'], 'Step 1: Cancel x and y: \frac{x^2y}{xy^2} = \frac{x}{y}.

Step 2: \frac{2x^2y}{6xy^2} = \frac{2x}{6y}.

Final answer: \frac{2x}{6y}', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{3x^2}{8x}.', '\frac{3}{8}x', ARRAY['\frac{8}{3}x', '3x^2', '\frac{3}{8}'], ARRAY['\frac{3}{8}', '3x^2', '\frac{8}{3}x', '\frac{3}{8}x'], 'Step 1: Cancel one x: \frac{x^2}{x} = x.

Step 2: \frac{3x^2}{8x} = \frac{3}{8}x.

Final answer: \frac{3}{8}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{5xy}{7y}.', '\frac{5}{7}x', ARRAY['\frac{7}{5}x', '5x', '\frac{5}{7}'], ARRAY['5x', '\frac{5}{7}', '\frac{5}{7}x', '\frac{7}{5}x'], 'Step 1: Cancel y from top and bottom.

Step 2: \frac{5xy}{7y} = \frac{5}{7}x.

Final answer: \frac{5}{7}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{6x^2 - 6x}{6x}.', 'x - 1', ARRAY['x + 1', 'x^2 - 1', '1 - x'], ARRAY['x^2 - 1', 'x + 1', 'x - 1', '1 - x'], 'Step 1: Factorise the numerator: 6x^2 - 6x = 6x(x - 1).

Step 2: Cancel 6x.

Final answer: x - 1', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{x^2 - 36}{x - 6}.', 'x + 6', ARRAY['x - 6', 'x^2 - 36', 'x + 36'], ARRAY['x^2 - 36', 'x - 6', 'x + 6', 'x + 36'], 'Step 1: Factorise the numerator: x^2 - 36 = (x - 6)(x + 6).

Step 2: Cancel (x - 6).

Final answer: x + 6', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{x^2 + 7x}{x}.', 'x + 7', ARRAY['x^2 + 7', 'x + 7x', '7'], ARRAY['x + 7x', '7', 'x + 7', 'x^2 + 7'], 'Step 1: Factorise: x^2 + 7x = x(x + 7).

Step 2: Cancel x.

Final answer: x + 7', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{3x^2y}{2xy^2}.', '\frac{3x}{2y}', ARRAY['\frac{3y}{2x}', '\frac{3}{2}x', '\frac{3}{2}xy'], ARRAY['\frac{3}{2}x', '\frac{3}{2}xy', '\frac{3x}{2y}', '\frac{3y}{2x}'], 'Step 1: Cancel x and y: \frac{x^2y}{xy^2} = \frac{x}{y}.

Step 2: \frac{3x^2y}{2xy^2} = \frac{3x}{2y}.

Final answer: \frac{3x}{2y}', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{5x^2}{2x}.', '\frac{5}{2}x', ARRAY['\frac{2}{5}x', '5x^2', '\frac{5}{2}'], ARRAY['\frac{2}{5}x', '\frac{5}{2}', '\frac{5}{2}x', '5x^2'], 'Step 1: Cancel one x: \frac{x^2}{x} = x.

Step 2: \frac{5x^2}{2x} = \frac{5}{2}x.

Final answer: \frac{5}{2}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Calculator', 4, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{x^2 - 25}{x - 5}.', 'x + 5', ARRAY['x - 5', 'x^2 - 25', 'x + 25'], ARRAY['x + 25', 'x^2 - 25', 'x - 5', 'x + 5'], 'Step 1: Factorise the numerator: x^2 - 25 = (x - 5)(x + 5).

Step 2: Cancel (x - 5).

Final answer: x + 5', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{x^2 + 3x}{x}.', 'x + 3', ARRAY['x^2 + 3', 'x + 3x', '3'], ARRAY['x + 3', 'x^2 + 3', 'x + 3x', '3'], 'Step 1: Factorise: x^2 + 3x = x(x + 3).

Step 2: Cancel x.

Final answer: x + 3', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{5x^2y}{6xy^2}.', '\frac{5x}{6y}', ARRAY['\frac{5y}{6x}', '\frac{5}{6}x', '\frac{5}{6}xy'], ARRAY['\frac{5x}{6y}', '\frac{5y}{6x}', '\frac{5}{6}xy', '\frac{5}{6}x'], 'Step 1: Cancel x and y: \frac{x^2y}{xy^2} = \frac{x}{y}.

Step 2: \frac{5x^2y}{6xy^2} = \frac{5x}{6y}.

Final answer: \frac{5x}{6y}', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{8x^2}{3x}.', '\frac{8}{3}x', ARRAY['\frac{3}{8}x', '8x^2', '\frac{8}{3}'], ARRAY['\frac{8}{3}x', '8x^2', '\frac{3}{8}x', '\frac{8}{3}'], 'Step 1: Cancel one x: \frac{x^2}{x} = x.

Step 2: \frac{8x^2}{3x} = \frac{8}{3}x.

Final answer: \frac{8}{3}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{4xy}{7y}.', '\frac{4}{7}x', ARRAY['\frac{7}{4}x', '4x', '\frac{4}{7}'], ARRAY['\frac{4}{7}x', '\frac{7}{4}x', '4x', '\frac{4}{7}'], 'Step 1: Cancel y from top and bottom.

Step 2: \frac{4xy}{7y} = \frac{4}{7}x.

Final answer: \frac{4}{7}x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 2, 150, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{4x^2 - 4x}{4x}.', 'x - 1', ARRAY['x + 1', 'x^2 - 1', '1 - x'], ARRAY['x - 1', '1 - x', 'x + 1', 'x^2 - 1'], 'Step 1: Factorise the numerator: 4x^2 - 4x = 4x(x - 1).

Step 2: Cancel 4x.

Final answer: x - 1', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{x^2 - 49}{x - 7}.', 'x + 7', ARRAY['x - 7', 'x^2 - 49', 'x + 49'], ARRAY['x + 7', 'x - 7', 'x^2 - 49', 'x + 49'], 'Step 1: Factorise the numerator: x^2 - 49 = (x - 7)(x + 7).

Step 2: Cancel (x - 7).

Final answer: x + 7', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{x^2 + 8x}{x}.', 'x + 8', ARRAY['x^2 + 8', 'x + 8x', '8'], ARRAY['x + 8x', 'x^2 + 8', 'x + 8', '8'], 'Step 1: Factorise: x^2 + 8x = x(x + 8).

Step 2: Cancel x.

Final answer: x + 8', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 3, 160, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{9x^2y}{7xy^2}.', '\frac{9x}{7y}', ARRAY['\frac{9y}{7x}', '\frac{9}{7}x', '\frac{9}{7}xy'], ARRAY['\frac{9}{7}x', '\frac{9}{7}xy', '\frac{9y}{7x}', '\frac{9x}{7y}'], 'Step 1: Cancel x and y: \frac{x^2y}{xy^2} = \frac{x}{y}.

Step 2: \frac{9x^2y}{7xy^2} = \frac{9x}{7y}.

Final answer: \frac{9x}{7y}', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 3, 170, NULL, NULL);

INSERT INTO public.exam_questions (question, correct_answer, wrong_answers, all_answers, explanation, explain_on, question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt)
VALUES ('Simplify \frac{8x^2}{4x}.', '2x', ARRAY['\frac{1}{2}x', '8x^2', '2'], ARRAY['8x^2', '2x', '2', '\frac{1}{2}x'], 'Step 1: Cancel one x: \frac{x^2}{x} = x.

Step 2: \frac{8x^2}{4x} = 2x.

Final answer: 2x', 'always', 'Algebra', 'algebra|algebraic_fractions', 'Higher Tier', 'Non-Calculator', 4, 2, 150, NULL, NULL);
COMMIT;
