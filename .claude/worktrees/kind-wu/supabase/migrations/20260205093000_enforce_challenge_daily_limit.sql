-- Enforce daily challenge limits at the database layer.
-- Blocks direct inserts into extreme_results once the daily limit is reached.

CREATE OR REPLACE FUNCTION public.enforce_challenge_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Service role bypass (backfills/admin maintenance).
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_result := public.consume_challenge_session();

  IF COALESCE((v_result->>'allowed')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Daily challenge limit reached'
      USING ERRCODE = 'P0001',
      DETAIL = v_give me the sqresult::text;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_challenge_daily_limit ON public.extreme_results;

CREATE TRIGGER trg_enforce_challenge_daily_limit
BEFORE INSERT ON public.extreme_results
FOR EACH ROW
EXECUTE FUNCTION public.enforce_challenge_daily_limit();

