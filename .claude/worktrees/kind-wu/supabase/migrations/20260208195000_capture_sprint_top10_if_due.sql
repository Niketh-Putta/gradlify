-- Capture sprint top 10 only after the sprint has ended.
CREATE OR REPLACE FUNCTION public.capture_sprint_top10_if_due(
  p_sprint_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end timestamptz;
  v_locked timestamptz;
BEGIN
  SELECT end_at, locked_at
  INTO v_end, v_locked
  FROM public.sprint_windows
  WHERE id = p_sprint_id;

  IF v_end IS NULL THEN
    RAISE EXCEPTION 'Sprint % not found', p_sprint_id;
  END IF;

  IF v_locked IS NOT NULL THEN
    RETURN false;
  END IF;

  IF now() < v_end THEN
    RETURN false;
  END IF;

  PERFORM public.capture_sprint_top10(p_sprint_id);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.capture_sprint_top10_if_due(text) TO authenticated, anon;
