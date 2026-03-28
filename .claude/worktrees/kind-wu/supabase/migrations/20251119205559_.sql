-- Create mindprint_events table to store raw performance data
CREATE TABLE IF NOT EXISTS public.mindprint_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT,
  correct BOOLEAN NOT NULL,
  time_spent INTEGER, -- seconds
  topic TEXT NOT NULL,
  difficulty INTEGER, -- 1-5 scale
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'mock')),
  confidence TEXT CHECK (confidence IN ('confident', 'unsure')),
  wrong_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mindprint_summary table to store AI-generated insights
CREATE TABLE IF NOT EXISTS public.mindprint_summary (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  efficiency_score INTEGER CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
  peak_hours TEXT,
  top_errors JSONB,
  confidence_accuracy NUMERIC,
  ai_summary TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.mindprint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindprint_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for mindprint_events
CREATE POLICY "Users can view their own mindprint events"
  ON public.mindprint_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mindprint events"
  ON public.mindprint_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for mindprint_summary
CREATE POLICY "Users can view their own mindprint summary"
  ON public.mindprint_summary
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can upsert mindprint summary"
  ON public.mindprint_summary
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_mindprint_events_user_id ON public.mindprint_events(user_id);
CREATE INDEX idx_mindprint_events_created_at ON public.mindprint_events(created_at DESC);
CREATE INDEX idx_mindprint_events_user_created ON public.mindprint_events(user_id, created_at DESC);;
