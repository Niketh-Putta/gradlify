-- Add pending_downgrade_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN pending_downgrade_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.pending_downgrade_at IS 'When the user has cancelled their subscription but still has access until this date';;
