-- Fix duplicated prompts in geometry|shapes and increase variety/complexity for number|unit_conversions (Higher tier).
-- Generated manually to avoid editing prior migrations.

BEGIN;

DELETE FROM public.exam_questions
WHERE subtopic IN ('geometry|shapes', 'number|unit_conversions');

-- -----------------------------
-- geometry|shapes (2D and 3D shapes) — 8 varied questions
-- -----------------------------

INSERT INTO public.exam_questions (
  question,
  correct_answer,
  wrong_answers,
  all_answers,
  explanation,
  explain_on,
  question_type,
  subtopic,
  tier,
  calculator,
  difficulty,
  marks,
  estimated_time_sec,
  image_url,
  image_alt
)
VALUES (
  'A cuboid has 12 edges.

How many vertices does a cuboid have?',
  '8',
  ARRAY['6','10','12'],
  ARRAY['8','6','10','12'],
  'Step 1: A cuboid has 8 corner points (vertices).

Final answer: 8',
  'always',
  'Geometry & Measures',
  'geometry|shapes',
  'Foundation Tier',
  'Non-Calculator',
  1,
  1,
  60,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'Which 3D shape has 1 curved surface and 2 circular faces?

A) Cone
B) Cylinder
C) Sphere
D) Cube',
  'Cylinder',
  ARRAY['Cone','Sphere','Cube'],
  ARRAY['Cylinder','Cone','Sphere','Cube'],
  'Step 1: A cylinder has 2 circular faces (top and bottom) and 1 curved surface.

Final answer: Cylinder',
  'always',
  'Geometry & Measures',
  'geometry|shapes',
  'Foundation Tier',
  'Non-Calculator',
  1,
  1,
  70,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'A cube has side length 6 cm.

Find the total length of all its edges.',
  '72 cm',
  ARRAY['36 cm','48 cm','144 cm'],
  ARRAY['72 cm','36 cm','48 cm','144 cm'],
  'Step 1: A cube has 12 edges.

Step 2: Total edge length = 12 × 6 = 72.

Final answer: 72 cm',
  'always',
  'Geometry & Measures',
  'geometry|shapes',
  'Foundation Tier',
  'Calculator',
  2,
  2,
  110,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'A cuboid has length 8 cm, width 5 cm and height 4 cm.

Find the total length of all its edges.',
  '68 cm',
  ARRAY['34 cm','17 cm','136 cm'],
  ARRAY['68 cm','34 cm','17 cm','136 cm'],
  'Step 1: A cuboid has 4 edges of each dimension (length, width, height).

Step 2: Total edge length = 4(l + w + h) = 4(8 + 5 + 4) = 68.

Final answer: 68 cm',
  'always',
  'Geometry & Measures',
  'geometry|shapes',
  'Foundation Tier',
  'Calculator',
  2,
  2,
  120,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'A solid has 5 faces and 9 edges.

Which solid is it?

A) Triangular prism
B) Square-based pyramid
C) Cube
D) Tetrahedron',
  'Triangular prism',
  ARRAY['Square-based pyramid','Cube','Tetrahedron'],
  ARRAY['Triangular prism','Square-based pyramid','Cube','Tetrahedron'],
  'Step 1: A triangular prism has 2 triangular faces and 3 rectangular faces = 5 faces.

Step 2: It has 9 edges in total.

Final answer: Triangular prism',
  'always',
  'Geometry & Measures',
  'geometry|shapes',
  'Higher Tier',
  'Non-Calculator',
  4,
  2,
  150,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'A net is made of 6 congruent squares.

Explain why it can fold to make a cube.',
  'Because a cube has 6 square faces',
  ARRAY['Because a cube has 8 faces','Because a cube has 12 faces','Because a cube has 4 faces'],
  ARRAY['Because a cube has 6 square faces','Because a cube has 8 faces','Because a cube has 12 faces','Because a cube has 4 faces'],
  'Step 1: A cube is made from 6 congruent square faces.

Step 2: A valid cube net consists of 6 squares arranged so they can fold without overlap.

Final answer: A cube has 6 square faces',
  'always',
  'Geometry & Measures',
  'geometry|shapes',
  'Higher Tier',
  'Non-Calculator',
  4,
  2,
  160,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'The total length of all the edges of a cube is 96 cm.

Find the length of one edge.',
  '8 cm',
  ARRAY['16 cm','12 cm','4 cm'],
  ARRAY['8 cm','16 cm','12 cm','4 cm'],
  'Step 1: A cube has 12 edges.

Step 2: Total edge length = 12 × side.

Step 3: side = 96 ÷ 12 = 8.

Final answer: 8 cm',
  'always',
  'Geometry & Measures',
  'geometry|shapes',
  'Higher Tier',
  'Calculator',
  4,
  3,
  180,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'A cuboid has 8 vertices and 12 edges.

How many faces does it have?',
  '6',
  ARRAY['5','8','12'],
  ARRAY['6','5','8','12'],
  'Step 1: A cuboid has 6 rectangular faces.

Final answer: 6',
  'always',
  'Geometry & Measures',
  'geometry|shapes',
  'Higher Tier',
  'Calculator',
  3,
  1,
  80,
  NULL,
  NULL
);

-- -----------------------------
-- number|unit_conversions — 8 varied questions (Higher includes multi-step and speed conversions)
-- -----------------------------

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'Convert 4500 g to kg.',
  '4.5 kg',
  ARRAY['45 kg','4500 kg','4500000 kg'],
  ARRAY['4.5 kg','45 kg','4500 kg','4500000 kg'],
  'Step 1: 1000 g = 1 kg.

Step 2: Divide by 1000: 4500 ÷ 1000 = 4.5.

Final answer: 4.5 kg',
  'always',
  'Number',
  'number|unit_conversions',
  'Foundation Tier',
  'Calculator',
  1,
  1,
  70,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'Convert 240 cm to m.',
  '2.4 m',
  ARRAY['24 m','240 m','24000 m'],
  ARRAY['2.4 m','24 m','240 m','24000 m'],
  'Step 1: 100 cm = 1 m.

Step 2: Divide by 100: 240 ÷ 100 = 2.4.

Final answer: 2.4 m',
  'always',
  'Number',
  'number|unit_conversions',
  'Foundation Tier',
  'Calculator',
  1,
  1,
  70,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'Convert 750 ml to litres.',
  '0.75 L',
  ARRAY['7.5 L','75 L','750 L'],
  ARRAY['0.75 L','7.5 L','75 L','750 L'],
  'Step 1: 1000 ml = 1 L.

Step 2: Divide by 1000: 750 ÷ 1000 = 0.75.

Final answer: 0.75 L',
  'always',
  'Number',
  'number|unit_conversions',
  'Foundation Tier',
  'Non-Calculator',
  1,
  1,
  70,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'Convert 560 mm to cm.',
  '56 cm',
  ARRAY['5.6 cm','5600 cm','0.56 cm'],
  ARRAY['56 cm','5.6 cm','5600 cm','0.56 cm'],
  'Step 1: 10 mm = 1 cm.

Step 2: Divide by 10: 560 ÷ 10 = 56.

Final answer: 56 cm',
  'always',
  'Number',
  'number|unit_conversions',
  'Foundation Tier',
  'Non-Calculator',
  1,
  1,
  70,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'Convert 72 km/h to m/s.',
  '20.00 m/s',
  ARRAY['259.20 m/s','2.00 m/s','1200.00 m/s'],
  ARRAY['20.00 m/s','259.20 m/s','2.00 m/s','1200.00 m/s'],
  'Step 1: Convert km/h to m/s by multiplying by \frac{1000}{3600}.

Step 2: 72 × \frac{1000}{3600} = 20.

Final answer: 20.00 m/s',
  'always',
  'Number',
  'number|unit_conversions',
  'Higher Tier',
  'Calculator',
  4,
  2,
  150,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'A runner travels 900 m in 90 seconds.

Find their average speed in km/h.',
  '36.00 km/h',
  ARRAY['10.00 km/h','2.78 km/h','360.00 km/h'],
  ARRAY['36.00 km/h','10.00 km/h','2.78 km/h','360.00 km/h'],
  'Step 1: Speed = \frac{distance}{time} = \frac{900}{90} = 10 m/s.

Step 2: Convert m/s to km/h by multiplying by 3.6.

Step 3: 10 × 3.6 = 36 km/h.

Final answer: 36.00 km/h',
  'always',
  'Number',
  'number|unit_conversions',
  'Higher Tier',
  'Calculator',
  4,
  3,
  210,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'A car travels at 20 m/s for 3 minutes.

How far does it travel in km?',
  '3.6 km',
  ARRAY['3600 km','36 km','0.36 km'],
  ARRAY['3.6 km','3600 km','36 km','0.36 km'],
  'Step 1: Convert time to seconds: 3 minutes = 180 seconds.

Step 2: Distance = speed × time = 20 × 180 = 3600 m.

Step 3: Convert metres to kilometres: 3600 m = 3.6 km.

Final answer: 3.6 km',
  'always',
  'Number',
  'number|unit_conversions',
  'Higher Tier',
  'Non-Calculator',
  4,
  3,
  200,
  NULL,
  NULL
);

INSERT INTO public.exam_questions (
  question, correct_answer, wrong_answers, all_answers, explanation, explain_on,
  question_type, subtopic, tier, calculator, difficulty, marks, estimated_time_sec, image_url, image_alt
)
VALUES (
  'A container holds 1.5 L of water. Then 350 ml is added.

Find the total volume in cm^3.',
  '1850 cm^3',
  ARRAY['185 cm^3','18500 cm^3','1500 cm^3'],
  ARRAY['1850 cm^3','185 cm^3','18500 cm^3','1500 cm^3'],
  'Step 1: Convert litres to cm^3: 1 L = 1000 cm^3.

So 1.5 L = 1500 cm^3.

Step 2: Convert ml to cm^3: 1 ml = 1 cm^3, so 350 ml = 350 cm^3.

Step 3: Add: 1500 + 350 = 1850 cm^3.

Final answer: 1850 cm^3',
  'always',
  'Number',
  'number|unit_conversions',
  'Higher Tier',
  'Non-Calculator',
  4,
  3,
  200,
  NULL,
  NULL
);

COMMIT;
