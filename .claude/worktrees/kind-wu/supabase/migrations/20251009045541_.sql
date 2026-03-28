-- Add RLS policies for exam_questions table
-- Allow authenticated users to view exam questions (needed for practice and mock exams)
CREATE POLICY "Authenticated users can view exam questions"
ON public.exam_questions
FOR SELECT
TO authenticated
USING (true);

-- Note: No INSERT/UPDATE/DELETE policies are added intentionally
-- Only administrators should manage exam questions directly through the database
-- Regular users access questions through the fetch_exam_questions() function;
