-- Fix Supabase Security Advisor findings:
-- 1) SECURITY DEFINER view flags on public.correct_answers_all and public.question_events_all
-- 2) RLS disabled on public.sprint_windows and public.exam_questions_backup_higher_tier_20251223

-- Keep view logic unchanged, only switch execution mode to SECURITY INVOKER.
ALTER VIEW public.correct_answers_all SET (security_invoker = true);
ALTER VIEW public.question_events_all SET (security_invoker = true);

-- Enable RLS on sprint windows and keep existing read behavior for app clients.
ALTER TABLE public.sprint_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sprint_windows_read ON public.sprint_windows;
CREATE POLICY sprint_windows_read
ON public.sprint_windows
FOR SELECT
TO anon, authenticated
USING (true);

-- Enable RLS on backup table so it is no longer flagged.
-- No SELECT policy is added; this keeps backup data non-public by default.
ALTER TABLE public.exam_questions_backup_higher_tier_20251223 ENABLE ROW LEVEL SECURITY;

-- Defensive hardening in case any grants were applied previously.
REVOKE ALL ON TABLE public.exam_questions_backup_higher_tier_20251223 FROM anon, authenticated;
