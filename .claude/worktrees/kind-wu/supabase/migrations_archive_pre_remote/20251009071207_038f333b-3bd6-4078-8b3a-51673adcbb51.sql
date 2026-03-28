-- Fix: Enable RLS on reference data tables (topics and subtopics)
-- These tables contain the course catalog structure and should be publicly readable,
-- but we enable RLS with explicit policies for better security control

-- Enable RLS on topics table
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subtopics table  
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

-- Create public read policy for topics
CREATE POLICY "Anyone can view topics catalog"
ON public.topics
FOR SELECT
USING (true);

-- Create public read policy for subtopics
CREATE POLICY "Anyone can view subtopics catalog"
ON public.subtopics
FOR SELECT
USING (true);

-- Add comments explaining the security model
COMMENT ON TABLE public.topics IS 'Course topics catalog. Publicly readable with explicit RLS policy for controlled access.';
COMMENT ON TABLE public.subtopics IS 'Course subtopics catalog. Publicly readable with explicit RLS policy for controlled access.';