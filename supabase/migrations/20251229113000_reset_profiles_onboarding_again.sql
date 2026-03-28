-- Reset onboarding answers so every profile sees the first-run questionnaire again

update public.profiles
set
  onboarding = '{}'::jsonb,
  onboarding_completed_at = null;
