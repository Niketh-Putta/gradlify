-- First check if study_sessions table exists and add missing constraints
DO $$ 
BEGIN
    -- Add unique constraint to study_sessions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'study_sessions_user_id_date_start_time_key'
        AND table_name = 'study_sessions'
    ) THEN
        ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_user_id_date_start_time_key 
        UNIQUE(user_id, date, start_time);
    END IF;
EXCEPTION
    WHEN others THEN
        -- If adding constraint fails, continue
        NULL;
END $$;

-- Create study_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_date DATE NOT NULL,
  sessions_per_week INTEGER NOT NULL,
  minutes_per_session INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create study_plan_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.study_plan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  topic TEXT,
  subtopic TEXT,
  goal TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_date, start_time)
);

-- Add RLS policies for study_plans
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own study plans" ON public.study_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for study_plan_sessions  
ALTER TABLE public.study_plan_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own study plan sessions" ON public.study_plan_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create chat tables if they don't exist (using different names to avoid conflicts)
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for chat tables
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own chat threads" ON public.chat_threads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own chat messages" ON public.chat_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);