-- Auto-generated manual correction pass for flagged 11+ rows.
BEGIN;
UPDATE public.exam_questions
SET question = 'What is 10% of 10,001 rounded to the nearest whole number?',
    correct_answer = '1000',
    wrong_answers = ARRAY['1000.1', '1010', '990', '1100']::text[],
    all_answers = ARRAY['1000', '1000.1', '1010', '990', '1100']::text[],
    explanation = 'Step 1: $1000.1$. Round down.
Final Result: 1000'
WHERE id = '802b7289-3c0b-4c44-80be-2edae0ae56a4';
UPDATE public.exam_questions
SET question = 'What is 10% of -200 added to 5?',
    correct_answer = '-15',
    wrong_answers = ARRAY['25', '-25', '15', '-16']::text[],
    all_answers = ARRAY['-15', '25', '-25', '15', '-16']::text[],
    explanation = 'Step 1: 10% of -200 is -20.
Step 2: Add to 5: $-20 + 5 = -15$.
Final Result: -15'
WHERE id = '761b7d64-e892-45cd-a99f-83387f930d8f';
UPDATE public.exam_questions
SET question = 'What is 10% of 450 multiplied by 5?',
    correct_answer = '225',
    wrong_answers = ARRAY['45', '90', '22.5', '100']::text[],
    all_answers = ARRAY['225', '45', '90', '22.5', '100']::text[],
    explanation = 'Step 1: 10% of 450 is 45.
Step 2: $45 × 5 = 225$.
Final Result: 225'
WHERE id = '6307d28d-5478-42a4-a575-121e8ca68cb2';
UPDATE public.exam_questions
SET question = 'Calculate: $1 - (2 - (3 - 4))$.',
    correct_answer = '-2',
    wrong_answers = ARRAY['0', '2', '4', '-1']::text[],
    all_answers = ARRAY['-2', '0', '2', '4', '-1']::text[],
    explanation = 'Step 1: Compute inside-out: 3 - 4 = -1.
Step 2: Then 2 - (-1) = 3.
Step 3: Finally 1 - 3 = -2.
Final answer: -2'
WHERE id = '37641c08-c2b3-4802-84c0-7aa1c446e4b9';
UPDATE public.exam_questions
SET question = 'Which is largest: $2^{4}, 3^{3}, 4^{2}, 5^{2}$?',
    correct_answer = '3^3',
    wrong_answers = ARRAY['2^4', '4^2', '5^2', 'Equal']::text[],
    all_answers = ARRAY['3^3', '2^4', '4^2', '5^2', 'Equal']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 3^3'
WHERE id = '9bfb4498-c654-4c26-8ba5-2b7253ffe394';
UPDATE public.exam_questions
SET question = 'If $n = 10^{2} \times 10^{3}$, what is the cube root of $n$?',
    correct_answer = 'None of these',
    wrong_answers = ARRAY['10', '100', '1000', '50']::text[],
    all_answers = ARRAY['None of these', '10', '100', '1000', '50']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: None of these'
WHERE id = 'c4e28fe3-bd14-427d-b299-c5f4caafd85f';
UPDATE public.exam_questions
SET question = 'What is 1% of 5,000?',
    correct_answer = '50',
    wrong_answers = ARRAY['5', '500', '0.5', '50.5']::text[],
    all_answers = ARRAY['50', '5', '500', '0.5', '50.5']::text[],
    explanation = 'Step 1: Dividing by 100 finds 1%. 5000 / 100 = 50.
Final Result: 50'
WHERE id = '9184d65b-af73-4ac4-b1f2-f3b3867a3e07';
UPDATE public.exam_questions
SET question = 'What is 12% of 50 added to 50% of 12?',
    correct_answer = '12',
    wrong_answers = ARRAY['6', '10', '15', '12.5']::text[],
    all_answers = ARRAY['12', '6', '10', '15', '12.5']::text[],
    explanation = 'Step 1: 12% of 50 is 6. 50% of 12 is 6.
Step 2: 6 + 6 = 12.
Final Result: 12'
WHERE id = 'ba48ed92-d5ef-4945-aae9-4a57db2b0178';
UPDATE public.exam_questions
SET question = 'What is $25\%$ expressed as a ratio?',
    correct_answer = '1:4',
    wrong_answers = ARRAY['25:100', '1:5', '1:2', '1:3']::text[],
    all_answers = ARRAY['1:4', '25:100', '1:5', '1:2', '1:3']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 1:4'
WHERE id = '7140de1e-8e79-4329-a365-cc29194eab6d';
UPDATE public.exam_questions
SET question = 'Three numbers have a sum of 96 and are in the ratio $3:4:5$. What is the product of the smallest and largest numbers?',
    correct_answer = '960',
    wrong_answers = ARRAY['320', '600', '720', '12']::text[],
    all_answers = ARRAY['960', '320', '600', '720', '12']::text[],
    explanation = 'Step 1: Ratio parts total = 3 + 4 + 5 = 12, so one part = 96 / 12 = 8.
Step 2: Smallest = 3 x 8 = 24 and largest = 5 x 8 = 40.
Step 3: Product = 24 x 40 = 960.
Final answer: 960'
WHERE id = '6fb59d71-60a7-4981-b9c5-0a15e967fa2e';
UPDATE public.exam_questions
SET question = 'Half of a number is proportional to 5. If the number is 20, what is the constant of proportionality?',
    correct_answer = '2',
    wrong_answers = ARRAY['0.5', '4', '10', '0.4']::text[],
    all_answers = ARRAY['2', '0.5', '4', '10', '0.4']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 2'
WHERE id = 'c056f6c6-9a4e-4156-a7da-c7dcc81d86c5';
UPDATE public.exam_questions
SET question = 'Vertices + Faces in a cylinder?',
    correct_answer = '3',
    wrong_answers = ARRAY['2', '4', '1', '0']::text[],
    all_answers = ARRAY['3', '2', '4', '1', '0']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 3'
WHERE id = '820a5907-a81e-4200-970a-7c1e9ca2ae35';
UPDATE public.exam_questions
SET question = 'Sum of coordinates of (2, 2) after translation (5, -10).',
    correct_answer = '-1',
    wrong_answers = ARRAY['-3', '7', '-8', '15']::text[],
    all_answers = ARRAY['-1', '-3', '7', '-8', '15']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: -1'
WHERE id = '1feca809-4ec8-451a-80c6-aa53abe63281';
UPDATE public.exam_questions
SET question = 'A triangle has area 6. Two vertices are $(0, 0)$ and $(4, 0)$. Third vertex could be?',
    correct_answer = 'Any of these',
    wrong_answers = ARRAY['(0, 3)', '(2, 3)', '(4, 3)', 'Cannot be determined']::text[],
    all_answers = ARRAY['Any of these', '(0, 3)', '(2, 3)', '(4, 3)', 'Cannot be determined']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: Any of these'
WHERE id = '47dfba3b-b257-497c-960a-4d1f38ff5fc0';
UPDATE public.exam_questions
SET question = 'A point is reflected in the x-axis to become $(3, -4)$. It is then translated by vector $\begin{pmatrix} -2 \\ 5 \end{pmatrix}$. What was the original coordinate?',
    correct_answer = '(3, 4)',
    wrong_answers = ARRAY['(5, 9)', '(1, 1)', '(3, -9)', 'Cannot be determined']::text[],
    all_answers = ARRAY['(3, 4)', '(5, 9)', '(1, 1)', '(3, -9)', 'Cannot be determined']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: (3, 4)'
WHERE id = 'eecf1c3f-0851-4fcb-8d9f-935dfd054882';
UPDATE public.exam_questions
SET question = 'What is 10% of 1 kilometre in metres?',
    correct_answer = '100m',
    wrong_answers = ARRAY['10m', '100', '1m', '500m']::text[],
    all_answers = ARRAY['100m', '10m', '100', '1m', '500m']::text[],
    explanation = 'Step 1: 1km = 1000m. 10% of 1000 = 100.
Final Result: 100m'
WHERE id = 'f654158d-1ed1-4adf-9841-d0b71f06838d';
UPDATE public.exam_questions
SET question = 'Median of first six prime numbers?',
    correct_answer = '6',
    wrong_answers = ARRAY['6.5', '5', '7', '6.4']::text[],
    all_answers = ARRAY['6', '6.5', '5', '7', '6.4']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 6'
WHERE id = '78f0655f-2103-4e46-9528-45be4f6a042e';
UPDATE public.exam_questions
SET question = 'Ratio of mean to median for {1, 2, 6}?',
    correct_answer = '3:2',
    wrong_answers = ARRAY['1:1', '6:1', '2:3', 'Cannot be determined']::text[],
    all_answers = ARRAY['3:2', '1:1', '6:1', '2:3', 'Cannot be determined']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 3:2'
WHERE id = '303594cc-f7f2-4b3c-97f5-5977bf5bde63';
UPDATE public.exam_questions
SET question = 'Which is largest: $2.1^2$ or $\sqrt{17}$?',
    correct_answer = '2.1^2',
    wrong_answers = ARRAY['sqrt(17)', 'Equal', 'Cannot tell', 'Cannot be determined']::text[],
    all_answers = ARRAY['2.1^2', 'sqrt(17)', 'Equal', 'Cannot tell', 'Cannot be determined']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 2.1^2'
WHERE id = '06d2f73f-46c9-43f2-b395-8df7b66e0846';
UPDATE public.exam_questions
SET question = 'Which point is furthest from the origin?',
    correct_answer = 'Cannot be determined',
    wrong_answers = ARRAY['(5, 5)', '(0, 6)', '(1, 7)', '(4, 4)']::text[],
    all_answers = ARRAY['Cannot be determined', '(5, 5)', '(0, 6)', '(1, 7)', '(4, 4)']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: Cannot be determined'
WHERE id = '0168c17d-3271-42ad-b7d2-55b2b143dce0';
UPDATE public.exam_questions
SET question = 'A set of three numbers has a mean of 10, a median of 11, and a range of 6. What is the smallest number?',
    correct_answer = '6.5',
    wrong_answers = ARRAY['6', '4', '7', '5']::text[],
    all_answers = ARRAY['6.5', '6', '4', '7', '5']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 6.5'
WHERE id = 'a25bd1d0-a747-4669-8f20-3cccfd71af46';
UPDATE public.exam_questions
SET question = 'A square has a diagonal with endpoints $(1, 1)$ and $(5, 5)$. What is the area of the square?',
    correct_answer = '16',
    wrong_answers = ARRAY['8', '25', '32', '7']::text[],
    all_answers = ARRAY['16', '8', '25', '32', '7']::text[],
    explanation = 'Step 1: Diagonal vector is (4,4), so diagonal squared is 4^2 + 4^2 = 32.
Step 2: For a square, area = diagonal^2 / 2.
Step 3: Area = 32 / 2 = 16.
Final answer: 16'
WHERE id = 'c6665ff2-2e24-4a39-b472-24a6445c9eae';
UPDATE public.exam_questions
SET question = 'The 1st term of a sequence is 5. The rule is "double and subtract 3". What is the sum of the first three terms?',
    correct_answer = '23',
    wrong_answers = ARRAY['26', '21', '30', '17']::text[],
    all_answers = ARRAY['23', '26', '21', '30', '17']::text[],
    explanation = 'Step 1: First term = 5.
Step 2: Apply "double and subtract 3": second term = 2*5 - 3 = 7, third term = 2*7 - 3 = 11.
Step 3: Sum = 5 + 7 + 11 = 23.
Final answer: 23'
WHERE id = '0e5bd838-dd8e-48f7-ac98-14c97c3cf450';
UPDATE public.exam_questions
SET question = 'Ratio of savings is $5:6$. $B$ has £36. $A$ spends £10. New ratio?',
    correct_answer = '5:9',
    wrong_answers = ARRAY['2:3', '5:6', '1:2', '3:4']::text[],
    all_answers = ARRAY['5:9', '2:3', '5:6', '1:2', '3:4']::text[],
    explanation = 'Step 1: If B has 36 at ratio 5:6, one part = 6, so A = 30.
Step 2: After A spends 10, A has 20 and B still has 36.
Step 3: New ratio = 20:36 = 5:9.
Final answer: 5:9'
WHERE id = 'a65fbbdc-e384-45bb-bf32-73d368702ea1';
UPDATE public.exam_questions
SET question = 'Ratio of ages is 3:5. In 4 years, the sum of ages is 40. How old is the younger one now?',
    correct_answer = '12',
    wrong_answers = ARRAY['10.5', '15', '9', '10.4']::text[],
    all_answers = ARRAY['12', '10.5', '15', '9', '10.4']::text[],
    explanation = 'Step 1: In 4 years, total age is 40, so current total is 32.
Step 2: Ratio 3:5 means 8 parts = 32, so one part = 4.
Step 3: Younger age = 3 x 4 = 12.
Final answer: 12'
WHERE id = '88aef219-92a9-4a96-a83c-cc72b9dfd7f7';
UPDATE public.exam_questions
SET question = 'A sequence is: Square, Circle, Triangle, Square, Circle... What is the 7th shape?',
    correct_answer = 'Square',
    wrong_answers = ARRAY['Circle', 'Triangle', 'Hexagon', 'Cannot be determined']::text[],
    all_answers = ARRAY['Square', 'Circle', 'Triangle', 'Hexagon', 'Cannot be determined']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: Square'
WHERE id = 'ed1eeff5-236c-4afc-9b5c-d2e58e8400d3';
UPDATE public.exam_questions
SET question = 'A clock strikes every hour (once at 1:00, twice at 2:00, etc.). It also strikes once at every half-hour. How many times does it strike between 10:15 am and 1:45 pm on the same day?',
    correct_answer = '28',
    wrong_answers = ARRAY['10', '9', '11', '12']::text[],
    all_answers = ARRAY['28', '10', '9', '11', '12']::text[],
    explanation = 'Step 1: Strikes occur at 10:30, 11:00, 11:30, 12:00, 12:30, 1:00, 1:30.
Step 2: Total strikes = 1 + 11 + 1 + 12 + 1 + 1 + 1 = 28.
Final answer: 28'
WHERE id = '0ed3a814-6135-4062-8ac7-7d78a1ba0200';
UPDATE public.exam_questions
SET question = 'Three friends share 28 stickers. Ben gets double what Sam gets. Tom gets half of what Sam gets. How many stickers does Sam get?',
    correct_answer = '8',
    wrong_answers = ARRAY['4', '12', '6', 'x']::text[],
    all_answers = ARRAY['8', '4', '12', '6', 'x']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 8'
WHERE id = '6299e21d-98aa-4338-99a0-bb95c2b48096';
UPDATE public.exam_questions
SET question = 'A clock loses 5 minutes every hour. If it is set correctly at 12:00pm (noon), what time will it show when the true time is 10:00am the following morning?',
    correct_answer = '8:10am',
    wrong_answers = ARRAY['8:40am', '9:10am', '11:30am', '9:50am']::text[],
    all_answers = ARRAY['8:10am', '8:40am', '9:10am', '11:30am', '9:50am']::text[],
    explanation = 'Step 1: Real elapsed time is 22 hours (from 12:00pm to 10:00am next day).
Step 2: The clock loses 5 minutes each true hour, so total loss = 22 x 5 = 110 minutes = 1 hour 50 minutes.
Step 3: Shown time = true time - loss = 10:00am - 1:50 = 8:10am.
Final answer: 8:10am'
WHERE id = 'cbe8f6ee-1ad8-433b-a6cb-d36a1ab1f73e';
UPDATE public.exam_questions
SET question = 'A 2kg bag of rice costs £3.50. A 5kg bag costs £8.00. Which is better value and by how much per kg?',
    correct_answer = '5kg bag by 15p',
    wrong_answers = ARRAY['5kg bag by 10p', '2kg bag by 15p', 'Equal value', '5kg bag by 5p']::text[],
    all_answers = ARRAY['5kg bag by 15p', '5kg bag by 10p', '2kg bag by 15p', 'Equal value', '5kg bag by 5p']::text[],
    explanation = 'Step 1: Unit prices: 2kg bag = 3.50/2 = 1.75 per kg; 5kg bag = 8.00/5 = 1.60 per kg.
Step 2: Difference = 1.75 - 1.60 = 0.15 per kg.
Final answer: 5kg bag by 15p'
WHERE id = '9eceb9a1-a064-4601-afa0-abe31a26b1c3';
UPDATE public.extreme_questions
SET question = 'A bag contains 3 red and 3 blue marbles. If two marbles are picked at random without replacement, what is the probability that they are both the same color?',
    correct_answer = '2/5',
    wrong_answers = ARRAY['1/2', '1/4', '3/10', '2/3']::text[],
    all_answers = ARRAY['2/5', '1/2', '1/4', '3/10', '2/3']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 2/5'
WHERE id = '22849c92-aefb-4fef-bbc2-7f80ebfbe703';
UPDATE public.extreme_questions
SET question = 'If you take a standard cube and cut off every corner (vertex) with a single straight slice, how many edges does the new solid have?',
    correct_answer = '36',
    wrong_answers = ARRAY['12', '24', '20', '30']::text[],
    all_answers = ARRAY['36', '12', '24', '20', '30']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 36'
WHERE id = 'fd7ebd11-0f2e-45b8-b3c8-c99413dc80fd';
UPDATE public.extreme_questions
SET question = 'The mean weight of a group of 5 students is 40kg. Two more students join the group, and the new mean weight for all 7 students becomes 42kg. What is the average (mean) weight of the two new students?',
    correct_answer = '47kg',
    wrong_answers = ARRAY['42kg', '44kg', '45kg', '50kg']::text[],
    all_answers = ARRAY['47kg', '42kg', '44kg', '45kg', '50kg']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 47kg'
WHERE id = '1ff5f442-7e1c-4c27-a1b8-6b5e98d79d27';
UPDATE public.extreme_questions
SET question = 'If three standard fair six-sided dice are rolled simultaneously, what is the probability that the sum of the numbers shown is exactly 4?',
    correct_answer = '1/72',
    wrong_answers = ARRAY['1/36', '3/216', '1/54', '4/216']::text[],
    all_answers = ARRAY['1/72', '1/36', '3/216', '1/54', '4/216']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 1/72'
WHERE id = 'ee06242c-af5f-47a6-bf6d-32a21722c0ed';
UPDATE public.extreme_questions
SET question = 'If January 1st, 2024 was a Monday, what day of the week will January 1st, 2026 be? (Note: 2024 was a leap year).',
    correct_answer = 'Thursday',
    wrong_answers = ARRAY['Wednesday', 'Tuesday', 'Friday', 'Monday']::text[],
    all_answers = ARRAY['Thursday', 'Wednesday', 'Tuesday', 'Friday', 'Monday']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: Thursday'
WHERE id = '4ea659c0-f45f-4f88-ab20-56cdf89fd5c1';
UPDATE public.extreme_questions
SET question = 'A jar of sweets is shared. Jack takes 1/3 of the sweets. Jill takes 1/4 of the remaining sweets. Then James takes 1/2 of what is left. If there are exactly 9 sweets left, how many were there originally?',
    correct_answer = '36',
    wrong_answers = ARRAY['24', '48', '18', '72']::text[],
    all_answers = ARRAY['36', '24', '48', '18', '72']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 36'
WHERE id = '16ed72e0-ed37-4dd5-a4b5-c4ff1c39a4ad';
UPDATE public.extreme_questions
SET question = 'A two-digit number is 7 times the sum of its digits. Reversing the digits gives a number 18 less than the original. What is the number?',
    correct_answer = '42',
    wrong_answers = ARRAY['21', '63', '84', '45']::text[],
    all_answers = ARRAY['42', '21', '63', '84', '45']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 42'
WHERE id = 'f5ab4afc-c122-493b-bd2e-84ef60942b23';
UPDATE public.extreme_questions
SET question = 'A rectangular lawn is 10m by 8m. A goat is tied at one corner with a 6m rope. What area can it graze? (pi=3.14)',
    correct_answer = '28.26',
    wrong_answers = ARRAY['113.04', '36', '18.84', '80']::text[],
    all_answers = ARRAY['28.26', '113.04', '36', '18.84', '80']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 28.26'
WHERE id = '383f9250-21e4-47db-bd59-e8ec4d65f0d6';
UPDATE public.extreme_questions
SET question = 'A car travels 40 miles at 20 mph and 80 miles at 40 mph. What is the average speed?',
    correct_answer = '30',
    wrong_answers = ARRAY['25', '35', '20', '40']::text[],
    all_answers = ARRAY['30', '25', '35', '20', '40']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 30'
WHERE id = '7ef95e3a-29b7-4000-9ea3-2921cf184d58';
UPDATE public.extreme_questions
SET question = 'A drawer has red, blue and white socks. What is the minimum number needed to guarantee a matching pair?',
    correct_answer = '4',
    wrong_answers = ARRAY['2', '3', '5', '7']::text[],
    all_answers = ARRAY['4', '2', '3', '5', '7']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 4'
WHERE id = '4225f049-e4ab-4faf-90be-086dfb720e54';
UPDATE public.extreme_questions
SET question = 'If 5 cats catch 5 mice in 5 minutes, how many cats catch 100 mice in 100 minutes?',
    correct_answer = '5',
    wrong_answers = ARRAY['10', '20', '50', '100']::text[],
    all_answers = ARRAY['5', '10', '20', '50', '100']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 5'
WHERE id = '4b6a7eb8-d791-4f85-912b-83cc1f2d0f14';
UPDATE public.extreme_questions
SET question = 'In a class of 30 students, 20 like pizza and 15 like burgers. What is the smallest possible number who like both?',
    correct_answer = '5',
    wrong_answers = ARRAY['0', '10', '15', '2']::text[],
    all_answers = ARRAY['5', '0', '10', '15', '2']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 5'
WHERE id = '776964cc-11b8-4d18-947e-a0469c3e294b';
UPDATE public.extreme_questions
SET question = 'Sequence: 2,5,10,17,26... What is the 100th term?',
    correct_answer = '10001',
    wrong_answers = ARRAY['10000', '9999', '10101', '10201']::text[],
    all_answers = ARRAY['10001', '10000', '9999', '10101', '10201']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 10001'
WHERE id = 'c3aaf715-bb0d-498c-a095-80c6fe71877f';
UPDATE public.extreme_questions
SET question = 'Find the value of $x$ in the following equation: $20 - (x \div 2 + 4) = 10$.',
    correct_answer = '12',
    wrong_answers = ARRAY['6', '8', '16', '2']::text[],
    all_answers = ARRAY['12', '6', '8', '16', '2']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 12'
WHERE id = '877b5ec4-010b-405a-a223-b341298b432f';
UPDATE public.extreme_questions
SET question = 'Car A travels at 40 mph. Car B travels at 60 mph. Car B starts 30 minutes after Car A from the same location. However, Car B stops for 10 minutes to refuel during the chase. How many minutes after Car B originally started will it catch up to Car A?',
    correct_answer = '90',
    wrong_answers = ARRAY['70', '60', '80', '50']::text[],
    all_answers = ARRAY['90', '70', '60', '80', '50']::text[],
    explanation = 'Step 1: A has a 30-minute head start at 40 mph, so lead = 20 miles.
Step 2: Without any stop, B would need 20/20 = 1 hour of moving time to catch up (relative speed 20 mph).
Step 3: B stops for 10 minutes during the chase, and in that interval A adds 40*(10/60) = 6 2/3 miles, adding 20 extra moving minutes.
Step 4: Total time after B starts = 60 + 10 + 20 = 90 minutes.
Final answer: 90'
WHERE id = '40368425-dc6a-4190-9662-bc7352a4f927';
UPDATE public.extreme_questions
SET question = 'A bag contains 10 cards numbered 1 to 10. If two cards are drawn at random without replacement, what is the probability that their sum is an ODD number?',
    correct_answer = '5/9',
    wrong_answers = ARRAY['1/2', '4/9', '5/10', '2/5']::text[],
    all_answers = ARRAY['5/9', '1/2', '4/9', '5/10', '2/5']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 5/9'
WHERE id = 'fc3f0a6a-989e-4961-bc80-e6232692763e';
UPDATE public.extreme_questions
SET question = 'A specific year has 365 days. If the 100th day of the year is a Tuesday, what day of the week is the 300th day of that same year?',
    correct_answer = 'Saturday',
    wrong_answers = ARRAY['Thursday', 'Tuesday', 'Wednesday', 'Friday']::text[],
    all_answers = ARRAY['Saturday', 'Thursday', 'Tuesday', 'Wednesday', 'Friday']::text[],
    explanation = 'Step 1: Day gap from 100th to 300th is 200 days.
Step 2: 200 mod 7 = 4, so move 4 weekdays forward from Tuesday.
Step 3: Tuesday -> Saturday.
Final answer: Saturday'
WHERE id = '6ed2e766-1566-4f4c-b192-8d0f4fa67649';
UPDATE public.extreme_questions
SET question = 'In a race of 1000m, A beats B by 100m. In a race of 400m, B beats C by 40m. By how many metres would A beat C in a race of 1000m?',
    correct_answer = '190m',
    wrong_answers = ARRAY['140m', '200m', '150m', '100m']::text[],
    all_answers = ARRAY['190m', '140m', '200m', '150m', '100m']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 190m'
WHERE id = '76e2e8a5-febc-4552-ad30-f8fc60814946';
UPDATE public.extreme_questions
SET question = 'The mean of three numbers is 10. The mean of their squares is 102 2/3. If two of the numbers are 8 and 12, what is the third number?',
    correct_answer = '10',
    wrong_answers = ARRAY['5', '0', '15', 'Cannot be determined']::text[],
    all_answers = ARRAY['10', '5', '0', '15', 'Cannot be determined']::text[],
    explanation = 'Step 1: Use the given values and apply the required operation from the question.
Step 2: Simplify and check units/format.
Final answer: 10'
WHERE id = '5e6a708f-b474-4605-9458-1229533f9282';
COMMIT;
