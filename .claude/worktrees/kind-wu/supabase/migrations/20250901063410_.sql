-- Ensure subtopic_progress table has the right structure and RLS
-- Update table to use subtopic_key instead of subtopic_id to match existing schema
CREATE TABLE IF NOT EXISTS public.subtopic_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_key TEXT NOT NULL,
  subtopic_key TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_key, subtopic_key)
);

-- Enable RLS
ALTER TABLE public.subtopic_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own progress" ON public.subtopic_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.subtopic_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.subtopic_progress;

-- Create policies
CREATE POLICY "own_read" ON public.subtopic_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_upsert" ON public.subtopic_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_update" ON public.subtopic_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);;
