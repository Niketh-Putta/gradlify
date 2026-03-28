-- Create view for per-topic readiness rollups
CREATE OR REPLACE VIEW public.v_topic_readiness AS
SELECT 
  user_id,
  topic,
  readiness_after as readiness,
  created_at as updated_at
FROM (
  SELECT 
    user_id,
    topic,
    readiness_after,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id, topic ORDER BY id DESC) as rn
  FROM public.readiness_history
) ranked
WHERE rn = 1;

-- Create ai_readiness_events table for AI-driven readiness updates
CREATE TABLE IF NOT EXISTS public.ai_readiness_events (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  topic text NOT NULL,
  correct boolean NOT NULL,
  difficulty integer,
  time_secs integer,
  model_reasoning text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on ai_readiness_events
ALTER TABLE public.ai_readiness_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_readiness_events
CREATE POLICY "Users can view their own ai readiness events"
  ON public.ai_readiness_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert ai readiness events"
  ON public.ai_readiness_events FOR INSERT
  WITH CHECK (true);

-- Function to compute readiness change from AI feedback
CREATE OR REPLACE FUNCTION public.compute_ai_readiness_delta(
  p_prev_readiness numeric,
  p_correct boolean,
  p_difficulty integer,
  p_time_secs integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_delta numeric;
  difficulty_mult numeric;
  time_mult numeric;
  final_delta numeric;
BEGIN
  -- Base delta: +10 for correct, -5 for incorrect
  base_delta := CASE WHEN p_correct THEN 10 ELSE -5 END;
  
  -- Difficulty multiplier (1-5 scale, default 3)
  difficulty_mult := COALESCE(p_difficulty, 3) / 3.0;
  
  -- Time multiplier (faster = better, use 60s as baseline)
  time_mult := CASE 
    WHEN p_time_secs IS NULL THEN 1.0
    WHEN p_time_secs <= 30 THEN 1.2
    WHEN p_time_secs <= 60 THEN 1.0
    ELSE 0.8
  END;
  
  -- Calculate final delta
  final_delta := base_delta * difficulty_mult * time_mult;
  
  RETURN final_delta;
END;
$$;

-- Trigger function for ai_readiness_events inserts
CREATE OR REPLACE FUNCTION public.handle_ai_readiness_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_readiness numeric;
  new_readiness numeric;
  delta numeric;
BEGIN
  -- Get previous topic readiness (default 0)
  SELECT readiness INTO prev_readiness
  FROM v_topic_readiness
  WHERE user_id = NEW.user_id AND topic = NEW.topic;
  
  prev_readiness := COALESCE(prev_readiness, 0);
  
  -- Compute delta
  delta := compute_ai_readiness_delta(
    prev_readiness, 
    NEW.correct, 
    NEW.difficulty, 
    NEW.time_secs
  );
  
  -- Calculate new readiness (clamped [0,100])
  new_readiness := GREATEST(0, LEAST(100, prev_readiness + delta));
  
  -- Log the change
  INSERT INTO readiness_history (
    user_id, 
    topic, 
    readiness_before, 
    readiness_after, 
    reason, 
    source_id
  ) VALUES (
    NEW.user_id,
    NEW.topic,
    prev_readiness,
    new_readiness,
    'ai_inference',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on ai_readiness_events
DROP TRIGGER IF EXISTS trg_ai_readiness_event_insert ON public.ai_readiness_events;
CREATE TRIGGER trg_ai_readiness_event_insert
  AFTER INSERT ON public.ai_readiness_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_ai_readiness_event();

-- Grant access to view
GRANT SELECT ON public.v_topic_readiness TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_readiness_events_user_id ON public.ai_readiness_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_readiness_events_created_at ON public.ai_readiness_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_history_user_topic ON public.readiness_history(user_id, topic, id DESC);