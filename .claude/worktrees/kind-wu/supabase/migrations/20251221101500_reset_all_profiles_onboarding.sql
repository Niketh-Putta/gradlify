-- Force onboarding to re-run for all existing users
-- This clears saved onboarding answers and removes the completion timestamp.

update public.profiles
set
  onboarding = '{}'::jsonb,
  onboarding_completed_at = null;
