-- Reset daily mock uses to 0 for all users
UPDATE public.profiles 
SET daily_mock_uses = 0, 
    daily_mock_reset_at = now()
WHERE daily_mock_uses > 0;;
