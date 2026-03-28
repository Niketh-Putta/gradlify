UPDATE public.extreme_questions
SET explanation = $$Step 1: Put each part over a common denominator of √5:
\(\frac{1}{\sqrt{5}}-\sqrt{5}=\frac{1-5}{\sqrt{5}}=\frac{-4}{\sqrt{5}}\).
\(\frac{1}{\sqrt{5}}+\sqrt{5}=\frac{1+5}{\sqrt{5}}=\frac{6}{\sqrt{5}}\).

Step 2: Substitute into the big fraction:
\(\frac{-4/\sqrt{5}}{6/\sqrt{5}}\).

Step 3: Dividing by a fraction multiplies by its reciprocal:
\(\frac{-4}{\sqrt{5}}\cdot\frac{\sqrt{5}}{6}\).

Step 4: Cancel the common √5:
\(\frac{-4}{6}=-\frac{2}{3}\).

Step 5: This is already in simplest form.

Final answer: \(-\frac{2}{3}\)$$
WHERE question ILIKE 'Evaluate and simplify:%'
  AND correct_answer = '-\frac{2}{3}';
