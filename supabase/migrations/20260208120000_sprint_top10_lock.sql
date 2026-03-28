-- Lock sprint at 8pm UTC and snapshot the top 10 leaderboard.

ALTER TABLE public.sprint_windows
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.sprint_top10 (
  sprint_id text NOT NULL,
  rank integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  correct_count bigint NOT NULL DEFAULT 0,
  name text,
  avatar_url text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sprint_id, rank),
  UNIQUE (sprint_id, user_id)
);

ALTER TABLE public.sprint_top10 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sprint top10 is readable by everyone"
  ON public.sprint_top10 FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_sprint_top10_sprint
  ON public.sprint_top10 (sprint_id);

-- Ensure the Feb 2026 sprint window matches the 8pm UTC cutoff.
INSERT INTO public.sprint_windows (id, start_at, end_at, is_active, description, updated_at)
VALUES (
  'founders-202602',
  '2026-02-02T00:00:00Z',
  '2026-02-08T20:00:00Z',
  true,
  'Founders Sprint — Feb 2026',
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description,
  updated_at = now();

UPDATE public.sprint_windows
SET is_active = false,
    updated_at = now()
WHERE id <> 'founders-202602'
  AND is_active = true;

-- Capture top 10 at sprint close and lock the window.
CREATE OR REPLACE FUNCTION public.capture_sprint_top10(
  p_sprint_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  SELECT start_at, end_at
  INTO v_start, v_end
  FROM public.sprint_windows
  WHERE id = p_sprint_id;

  IF v_start IS NULL OR v_end IS NULL THEN
    RAISE EXCEPTION 'Sprint % not found', p_sprint_id;
  END IF;

  UPDATE public.sprint_windows
  SET is_active = false,
      locked_at = now(),
      updated_at = now()
  WHERE id = p_sprint_id;

  UPDATE public.sprint_windows
  SET is_active = false,
      updated_at = now()
  WHERE id <> p_sprint_id
    AND is_active = true;

  DELETE FROM public.sprint_top10
  WHERE sprint_id = p_sprint_id;

  WITH correct_totals AS (
    SELECT
      ca.user_id,
      SUM(ca.correct_count) AS total_correct
    FROM public.correct_answers_all ca
    LEFT JOIN public.profiles p ON p.user_id = ca.user_id
    LEFT JOIN public.user_roles ur
      ON ur.user_id = ca.user_id AND ur.role = 'admin'::public.app_role
    WHERE ca.created_at >= v_start
      AND ca.created_at <= v_end
      AND ca.source IN ('mock', 'challenge')
      AND NOT (
        p.founder_track IS NOT DISTINCT FROM 'founder'
        AND ur.user_id IS NULL
      )
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.user_settings us WHERE us.user_id = ca.user_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.user_settings us
          WHERE us.user_id = ca.user_id
            AND us.show_on_global_leaderboard = true
        )
      )
    GROUP BY ca.user_id
    HAVING SUM(ca.correct_count) > 0
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY ct.total_correct DESC, ct.user_id) AS rank,
      ct.user_id,
      ct.total_correct,
      COALESCE(p.full_name, split_part(u.email, '@', 1), 'Anonymous') AS name,
      p.avatar_url
    FROM correct_totals ct
    LEFT JOIN auth.users u ON u.id = ct.user_id
    LEFT JOIN public.profiles p ON p.user_id = ct.user_id
  )
  INSERT INTO public.sprint_top10 (
    sprint_id,
    rank,
    user_id,
    correct_count,
    name,
    avatar_url,
    captured_at
  )
  SELECT
    p_sprint_id,
    rank,
    user_id,
    total_correct,
    name,
    avatar_url,
    now()
  FROM ranked
  WHERE rank <= 10
  ORDER BY rank;

  PERFORM public.refresh_sprint_stats(p_sprint_id, v_start, v_end);
END;
$$;

GRANT EXECUTE ON FUNCTION public.capture_sprint_top10(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_sprint_top10(
  p_sprint_id text
)
RETURNS TABLE(
  rank integer,
  user_id uuid,
  name text,
  avatar_url text,
  correct_count bigint,
  captured_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rank,
    user_id,
    name,
    avatar_url,
    correct_count,
    captured_at
  FROM public.sprint_top10
  WHERE sprint_id = p_sprint_id
  ORDER BY rank;
$$;

GRANT EXECUTE ON FUNCTION public.get_sprint_top10(text) TO authenticated, anon;
