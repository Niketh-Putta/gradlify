-- Add new fields to study_sessions table for weekly planning
ALTER TABLE public.study_sessions 
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS topic_key text,
ADD COLUMN IF NOT EXISTS subtopic_key text,
ADD COLUMN IF NOT EXISTS day_of_week integer,
ADD COLUMN IF NOT EXISTS start_time time without time zone,
ADD COLUMN IF NOT EXISTS end_time time without time zone,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT true;;
