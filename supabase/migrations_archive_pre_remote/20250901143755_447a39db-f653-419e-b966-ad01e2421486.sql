-- Add unique constraint to prevent duplicate study sessions
ALTER TABLE public.study_sessions 
ADD CONSTRAINT unique_user_session_time 
UNIQUE (user_id, subject, topic, starts_at);