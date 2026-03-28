-- Create extreme_questions table (similar to exam_questions but without question_type, tier, calculator, difficulty_level)
CREATE TABLE public.extreme_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text,
  correct_answer text,
  wrong_answers text[],
  all_answers text[],
  explanation text,
  explain_on text DEFAULT 'always',
  image_url text,
  image_alt text,
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extreme_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to view questions
CREATE POLICY "Users can view extreme questions"
ON public.extreme_questions
FOR SELECT
TO authenticated
USING (true);

-- Create policy for authenticated read
CREATE POLICY "authenticated_read_extreme_questions"
ON public.extreme_questions
FOR SELECT
TO authenticated
USING (true);;
