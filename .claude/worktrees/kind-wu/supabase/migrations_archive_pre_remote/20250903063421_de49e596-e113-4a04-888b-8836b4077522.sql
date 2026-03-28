-- Add mock exam daily usage tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN daily_mock_uses integer NOT NULL DEFAULT 0;

-- Add mock exam reset timestamp
ALTER TABLE public.profiles 
ADD COLUMN daily_mock_reset_at timestamp with time zone DEFAULT NULL;