-- Combined 11+ live mock (Maths + break + English) structural skeleton.
--
-- STRUCTURE ONLY. No question content here. This builds on the existing
-- live_mock_papers / live_mock_sections / live_mock_questions / live_mock_attempts
-- tables: a combined event links two papers, and a per-user combined session
-- coordinates the phase order and owns the authoritative phase_ends_at clock.
--
-- Access rule (confirmed): anyone with a live_mock_exam_signups row for the
-- event slug may sit it. That row is the single access grant and already covers
-- both fixed-price payers and Premium/trial registrants.

-- 1) The combined event: one row that ties the maths + english papers together.
CREATE TABLE IF NOT EXISTS public.live_mock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  track text NOT NULL DEFAULT '11plus',
  starts_at timestamptz,
  break_minutes integer NOT NULL DEFAULT 15 CHECK (break_minutes >= 0),
  maths_paper_id uuid REFERENCES public.live_mock_papers(id) ON DELETE SET NULL,
  english_paper_id uuid REFERENCES public.live_mock_papers(id) ON DELETE SET NULL,
  access_rule text NOT NULL DEFAULT 'registered'
    CHECK (access_rule IN ('registered', 'registered_and_active_paid_premium')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'results_released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Per-user combined session: drives phase order and the authoritative timer.
--    The two attempt rows reuse the existing live_mock_attempts table.
CREATE TABLE IF NOT EXISTS public.live_mock_combined_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.live_mock_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'instructions'
    CHECK (phase IN ('instructions', 'maths', 'break', 'english', 'complete')),
  maths_attempt_id uuid REFERENCES public.live_mock_attempts(id) ON DELETE SET NULL,
  english_attempt_id uuid REFERENCES public.live_mock_attempts(id) ON DELETE SET NULL,
  -- Server-side end time for the current timed phase. The client clock is
  -- cosmetic; this column is the source of truth for auto-advance/auto-submit.
  phase_ends_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One attempt per student per event.
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_mock_combined_sessions_user_idx
  ON public.live_mock_combined_sessions(user_id);
CREATE INDEX IF NOT EXISTS live_mock_combined_sessions_event_idx
  ON public.live_mock_combined_sessions(event_id);

ALTER TABLE public.live_mock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_mock_combined_sessions ENABLE ROW LEVEL SECURITY;

-- Events are readable by any authenticated user (same as papers).
DROP POLICY IF EXISTS "Authenticated users can view live mock events" ON public.live_mock_events;
CREATE POLICY "Authenticated users can view live mock events"
ON public.live_mock_events
FOR SELECT
TO authenticated
USING (true);

-- A user can read their own combined session.
DROP POLICY IF EXISTS "Users can view their own combined session" ON public.live_mock_combined_sessions;
CREATE POLICY "Users can view their own combined session"
ON public.live_mock_combined_sessions
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- A user can start a session only if they own it AND hold a registration row
-- for the event slug. The signups table's own RLS limits the EXISTS subquery to
-- the caller's rows, so this checks the caller's own registration.
DROP POLICY IF EXISTS "Registered users can create their combined session" ON public.live_mock_combined_sessions;
CREATE POLICY "Registered users can create their combined session"
ON public.live_mock_combined_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = user_id
  AND EXISTS (
    SELECT 1
    FROM public.live_mock_exam_signups s
    JOIN public.live_mock_events e ON e.slug = s.mock_slug
    WHERE e.id = live_mock_combined_sessions.event_id
      AND s.user_id = (select auth.uid())
  )
);

-- A user can update their own session (phase transitions, attempt links).
DROP POLICY IF EXISTS "Users can update their own combined session" ON public.live_mock_combined_sessions;
CREATE POLICY "Users can update their own combined session"
ON public.live_mock_combined_sessions
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS set_live_mock_events_updated_at ON public.live_mock_events;
CREATE TRIGGER set_live_mock_events_updated_at
BEFORE UPDATE ON public.live_mock_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_live_mock_combined_sessions_updated_at ON public.live_mock_combined_sessions;
CREATE TRIGGER set_live_mock_combined_sessions_updated_at
BEFORE UPDATE ON public.live_mock_combined_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
