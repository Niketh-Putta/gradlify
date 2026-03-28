-- Fix: Prevent students from cheating by viewing exam answers
-- Remove all public read policies that expose exam answers

-- Drop the existing public read policies
DROP POLICY IF EXISTS "Allow read access" ON public.exam_questions;
DROP POLICY IF EXISTS "Allow read access for all" ON public.exam_questions;
DROP POLICY IF EXISTS "public read exam_questions" ON public.exam_questions;

-- RLS is already enabled, keeping it that way
-- No direct user access allowed - all access must go through SECURITY DEFINER functions

-- Update the fetch_exam_questions function to add authentication check and fix search_path
CREATE OR REPLACE FUNCTION public.fetch_exam_questions(
  p_tier text, 
  p_calculator text, 
  p_question_types text[], 
  p_limit integer
)
RETURNS SETOF exam_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users to fetch questions
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access exam questions';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.exam_questions
  WHERE (p_tier IS NULL OR tier = p_tier)
    AND (p_calculator IS NULL OR calculator = p_calculator)
    AND (p_question_types IS NULL OR question_type = ANY(p_question_types))
  ORDER BY random()
  LIMIT p_limit;
END;
$$;

COMMENT ON TABLE public.exam_questions IS 'Exam questions with RLS enabled. Access controlled through SECURITY DEFINER functions only to prevent answer exposure.';;
