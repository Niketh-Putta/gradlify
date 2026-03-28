-- Add unique constraint to prevent duplicate study sessions
ALTER TABLE public.study_sessions 
ADD CONSTRAINT unique_user_session_time 
UNIQUE (user_id, subject, topic, starts_at);

-- Add index for better performance on session queries
CREATE INDEX idx_study_sessions_user_starts_at 
ON public.study_sessions (user_id, starts_at);