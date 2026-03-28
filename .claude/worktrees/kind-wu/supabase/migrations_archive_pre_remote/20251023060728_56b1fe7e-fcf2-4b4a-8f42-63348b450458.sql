-- Create table for user personal notes on revision topics
CREATE TABLE IF NOT EXISTS public.user_topic_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_slug TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, topic_slug)
);

-- Enable RLS
ALTER TABLE public.user_topic_notes ENABLE ROW LEVEL SECURITY;

-- Users can view their own notes
CREATE POLICY "Users can view their own topic notes"
  ON public.user_topic_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert their own topic notes"
  ON public.user_topic_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update their own topic notes"
  ON public.user_topic_notes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own topic notes"
  ON public.user_topic_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_topic_notes_updated_at
  BEFORE UPDATE ON public.user_topic_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();