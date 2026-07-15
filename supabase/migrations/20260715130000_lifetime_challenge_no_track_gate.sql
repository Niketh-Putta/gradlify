-- Lifetime / any paid Premium unlocks challenges on all tracks.
-- Previously enforce_challenge_daily_limit required premium_track to match
-- the challenge track, so lifetime buyers could still hit free caps.

CREATE OR REPLACE FUNCTION public.enforce_challenge_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
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

  SELECT *
  INTO v_profile
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for challenge attempt'
      USING ERRCODE = 'P0001';
  END IF;

  v_track := COALESCE(NEW.track, v_profile.track, 'gcse'::public.user_track);

  -- One Gradlify Premium product unlocks all modules (including lifetime).
  v_allowed :=
    v_profile.founder_track = 'founder'
    OR public.compute_is_premium(v_profile)
    OR v_profile.tier = 'premium';

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
$function$;
