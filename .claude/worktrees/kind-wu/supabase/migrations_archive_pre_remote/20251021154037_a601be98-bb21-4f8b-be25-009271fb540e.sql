-- Create notes_progress table for tracking completed topics
CREATE TABLE IF NOT EXISTS public.notes_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_slug TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_slug)
);

-- Enable RLS
ALTER TABLE public.notes_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view their own notes progress"
ON public.notes_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own notes progress"
ON public.notes_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update their own notes progress"
ON public.notes_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete their own notes progress"
ON public.notes_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notes_progress_user_id ON public.notes_progress(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_notes_progress_updated_at
  BEFORE UPDATE ON public.notes_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();