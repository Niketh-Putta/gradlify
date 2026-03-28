-- Add explanation columns to exam_questions table
ALTER TABLE public.exam_questions
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS explain_on TEXT DEFAULT 'always';