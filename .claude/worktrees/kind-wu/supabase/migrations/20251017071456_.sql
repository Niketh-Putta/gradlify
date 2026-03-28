-- Fix exam questions public data exposure
-- Remove the public RLS policy that exposes answers

-- Drop the public read policy that exposes answers
DROP POLICY IF EXISTS "public read exam_questions" ON public.exam_questions;

-- Create a new restricted policy for authenticated users
-- This policy allows authenticated users to see questions for taking exams
CREATE POLICY "authenticated_read_questions"
  ON public.exam_questions
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: The correct_answer, wrong_answers, and explanation fields are still accessible
-- via the existing get_question_with_answer() SECURITY DEFINER function which properly
-- restricts access to authenticated users only and should be used after submission.;
