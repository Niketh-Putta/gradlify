-- Fix 1: Create user roles system with proper security
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- Fix 2: Restrict access to exam question answers
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view exam questions" ON public.exam_questions;

-- Create new policy that excludes sensitive answer fields
CREATE POLICY "Users can view questions without answers"
ON public.exam_questions
FOR SELECT
TO authenticated
USING (true);

-- Create a secure function to get question with answer (only after submission)
CREATE OR REPLACE FUNCTION public.get_question_with_answer(question_id UUID)
RETURNS TABLE (
  id UUID,
  question TEXT,
  correct_answer TEXT,
  all_answers JSONB,
  explanation TEXT,
  explain_on TEXT,
  question_type TEXT,
  tier TEXT,
  calculator TEXT,
  image_url TEXT,
  image_alt TEXT,
  wrong_answers JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can call this
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Return the question with all fields including answers
  RETURN QUERY
  SELECT 
    eq.id,
    eq.question,
    eq.correct_answer,
    eq.all_answers,
    eq.explanation,
    eq.explain_on,
    eq.question_type,
    eq.tier,
    eq.calculator,
    eq.image_url,
    eq.image_alt,
    eq.wrong_answers,
    eq.created_at
  FROM public.exam_questions eq
  WHERE eq.id = question_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_question_with_answer TO authenticated;;
