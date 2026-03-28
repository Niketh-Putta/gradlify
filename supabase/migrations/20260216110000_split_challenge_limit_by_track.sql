-- Enforce challenge daily limits per track (GCSE vs 11+) at the DB layer.
-- This replaces the prior shared-counter enforcement based on consume_challenge_session().

CREATE OR REPLACE FUNCTION public.enforce_challenge_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_track public.user_track;
  v_limit integer := 8;
  v_used integer := 0;
  v_window_start timestamptz;
  v_allowed boolean := false;
BEGIN
  -- Service role bypass (backfills/admin maintenance).
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT
    p.track,
    p.premium_track,
    p.founder_track,
    p.tier,
    p.plan,
    p.current_period_end
  INTO v_profile
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found for challenge attempt'
      USING ERRCODE = 'P0001';
  END IF;

  v_track := COALESCE(NEW.track, v_profile.track, 'gcse'::public.user_track);

  -- Track-aware premium gate: GCSE premium does not unlock 11+ and vice versa.
  v_allowed :=
    v_profile.founder_track = 'founder'
    OR (
      (
        v_profile.tier = 'premium'
        OR (
          v_profile.plan IS NOT NULL
          AND v_profile.plan <> 'free'
          AND v_profile.current_period_end IS NOT NULL
          AND v_profile.current_period_end > now()
        )
      )
      AND COALESCE(v_profile.premium_track, 'gcse') = CASE
        WHEN v_track = '11plus'::public.user_track THEN 'eleven_plus'
        ELSE 'gcse'
      END
    );

  IF v_allowed THEN
    RETURN NEW;
  END IF;

  v_window_start := date_trunc('day', now());

  SELECT COUNT(*)
  INTO v_used
  FROM public.extreme_results er
  WHERE er.user_id = NEW.user_id
    AND er.track = v_track
    AND er.created_at >= v_window_start;

  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Daily challenge limit reached'
      USING ERRCODE = 'P0001',
      DETAIL = jsonb_build_object(
        'allowed', false,
        'track', v_track,
        'daily_challenge_uses', v_used,
        'daily_challenge_limit', v_limit
      )::text;
  END IF;

  RETURN NEW;
END;
$$;
