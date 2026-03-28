-- First, let's update the testing mode flag to be more comprehensive
-- Add TESTING_MODE environment variable support

-- Update study planner tables to support per-day time windows
-- Drop existing study_sessions table and create new structure
DROP TABLE IF EXISTS public.study_sessions CASCADE;

-- Create study_plans table for storing plan metadata
CREATE TABLE public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_date DATE NOT NULL,
  sessions_per_week INTEGER NOT NULL DEFAULT 3,
  minutes_per_session INTEGER NOT NULL DEFAULT 60,
  focus_topics TEXT[] DEFAULT ARRAY['Number', 'Algebra', 'Ratio & Proportion', 'Geometry & Measures', 'Probability', 'Statistics'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for study_plans
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for study_plans
CREATE POLICY "Users can view their own study plans" ON public.study_plans
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own study plans" ON public.study_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own study plans" ON public.study_plans
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own study plans" ON public.study_plans
  FOR DELETE USING (user_id = auth.uid());

-- Create study_plan_days table for per-day time preferences
CREATE TABLE public.study_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for study_plan_days
ALTER TABLE public.study_plan_days ENABLE ROW LEVEL SECURITY;

-- Create policies for study_plan_days (access through plan ownership)
CREATE POLICY "Users can view their study plan days" ON public.study_plan_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_plans 
      WHERE study_plans.id = study_plan_days.plan_id 
      AND study_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their study plan days" ON public.study_plan_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_plans 
      WHERE study_plans.id = study_plan_days.plan_id 
      AND study_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their study plan days" ON public.study_plan_days
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.study_plans 
      WHERE study_plans.id = study_plan_days.plan_id 
      AND study_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their study plan days" ON public.study_plan_days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.study_plans 
      WHERE study_plans.id = study_plan_days.plan_id 
      AND study_plans.user_id = auth.uid()
    )
  );

-- Create new study_sessions table for generated sessions
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  goal TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent duplicate sessions for same user at same time
  UNIQUE(user_id, starts_at)
);

-- Enable RLS for study_sessions
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for study_sessions
CREATE POLICY "Users can view their own study sessions" ON public.study_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own study sessions" ON public.study_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own study sessions" ON public.study_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own study sessions" ON public.study_sessions
  FOR DELETE USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_study_sessions_user_starts_at ON public.study_sessions(user_id, starts_at);
CREATE INDEX idx_study_sessions_plan_id ON public.study_sessions(plan_id);
CREATE INDEX idx_study_plan_days_plan_weekday ON public.study_plan_days(plan_id, weekday);

-- Update mock_attempts table to ensure it has proper status field
ALTER TABLE public.mock_attempts 
ALTER COLUMN status SET DEFAULT 'in_progress';

-- Ensure mock_attempts has the correct constraints
ALTER TABLE public.mock_attempts
DROP CONSTRAINT IF EXISTS mock_attempts_status_check;

ALTER TABLE public.mock_attempts
ADD CONSTRAINT mock_attempts_status_check 
CHECK (status IN ('in_progress', 'completed', 'submitted'));

-- Add index for better performance on mock queries
CREATE INDEX IF NOT EXISTS idx_mock_attempts_user_created ON public.mock_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_questions_attempt_idx ON public.mock_questions(attempt_id, idx);;
