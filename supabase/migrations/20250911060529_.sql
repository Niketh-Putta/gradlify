-- Add image support columns to exam_questions table
ALTER TABLE public.exam_questions 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- Insert a test geometry question with the triangle diagram
INSERT INTO public.exam_questions 
(question, question_type, tier, calculator, correct_answer, all_answers, wrong_answers, image_url, image_alt)
VALUES 
(
  'Find the area of the triangle shown in the diagram.',
  'geometry',
  'Foundation',
  'Calculator', 
  '24 cm²',
  '["12 cm²", "24 cm²", "48 cm²", "6 cm²"]',
  '["12 cm²", "48 cm²", "6 cm²"]',
  'https://gknnfbalijxykqycopic.supabase.co/storage/v1/object/public/questions/geom_demo_triangle.svg',
  'Right triangle with base 8cm and height 6cm'
)
ON CONFLICT DO NOTHING;;
