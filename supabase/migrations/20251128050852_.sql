-- Change default for show_on_global_leaderboard to true
ALTER TABLE public.user_settings 
ALTER COLUMN show_on_global_leaderboard SET DEFAULT true;

-- Update all existing users to show on global leaderboard
UPDATE public.user_settings 
SET show_on_global_leaderboard = true;;
