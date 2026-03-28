-- Add onboarding fields to profiles so we can force a first-run questionnaire

alter table public.profiles
  add column if not exists onboarding jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_completed_at timestamptz;
