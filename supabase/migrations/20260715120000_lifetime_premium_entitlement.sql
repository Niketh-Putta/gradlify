-- Lifetime Premium is a one-time purchase: no current_period_end / premium_until.
-- Server RPCs and live-mock access must treat lifetime the same as paid Premium.

CREATE OR REPLACE FUNCTION public.compute_is_premium(p public.profiles)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN
    COALESCE(p.is_premium, false)
    OR p.plan = 'premium_lifetime'
    OR p.subscription_interval = 'lifetime'
    OR COALESCE(p.stripe_subscription_status, p.subscription_status) = 'lifetime'
    OR (p.premium_until IS NOT NULL AND p.premium_until > now())
    OR (
      p.plan IS NOT NULL
      AND p.plan <> 'free'
      AND p.current_period_end IS NOT NULL
      AND p.current_period_end > now()
    )
    OR p.stripe_subscription_status = 'trialing';
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_challenge_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_now timestamptz := now();
  v_reset_at timestamptz;
  v_limit integer := 8;
  v_is_admin boolean := false;
  v_is_premium boolean := false;
BEGIN
  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  SELECT public.is_admin(auth.uid()) INTO v_is_admin;
  v_is_premium := public.compute_is_premium(v_profile)
    OR v_profile.tier = 'premium'
    OR v_profile.founder_track = 'founder';

  IF v_is_admin OR v_is_premium THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'daily_challenge_uses', v_profile.daily_challenge_uses,
      'daily_challenge_reset_at', v_profile.daily_challenge_reset_at,
      'daily_challenge_limit', 'unlimited',
      'is_premium', true
    );
  END IF;

  v_reset_at := v_profile.daily_challenge_reset_at;

  IF v_reset_at IS NULL OR v_now > v_reset_at THEN
    IF v_profile.daily_mock_reset_at IS NOT NULL THEN
      v_reset_at := v_profile.daily_mock_reset_at;
      IF v_now > v_reset_at THEN
        v_reset_at := v_reset_at + make_interval(
          days => ceil(extract(epoch from (v_now - v_reset_at)) / 86400)::int
        );
      END IF;
    ELSE
      v_reset_at := date_trunc('day', v_now) + interval '1 day';
    END IF;
    v_profile.daily_challenge_uses := 0;
  END IF;

  IF v_profile.daily_challenge_uses >= v_limit THEN
    UPDATE public.profiles
    SET
      daily_challenge_uses = v_profile.daily_challenge_uses,
      daily_challenge_reset_at = v_reset_at
    WHERE user_id = v_profile.user_id;

    RETURN jsonb_build_object(
      'allowed', false,
      'daily_challenge_uses', v_profile.daily_challenge_uses,
      'daily_challenge_reset_at', v_reset_at,
      'daily_challenge_limit', v_limit,
      'is_premium', false
    );
  END IF;

  UPDATE public.profiles
  SET
    daily_challenge_uses = v_profile.daily_challenge_uses + 1,
    daily_challenge_reset_at = v_reset_at
  WHERE user_id = v_profile.user_id
  RETURNING daily_challenge_uses, daily_challenge_reset_at
  INTO v_profile.daily_challenge_uses, v_profile.daily_challenge_reset_at;

  RETURN jsonb_build_object(
    'allowed', true,
    'daily_challenge_uses', v_profile.daily_challenge_uses,
    'daily_challenge_reset_at', v_profile.daily_challenge_reset_at,
    'daily_challenge_limit', v_limit,
    'is_premium', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_live_mock_premium_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = p_user_id
      AND COALESCE(p.stripe_subscription_status, p.subscription_status) IS DISTINCT FROM 'trialing'
      AND (
        p.founder_track = 'founder'
        OR p.plan = 'premium_lifetime'
        OR p.subscription_interval = 'lifetime'
        OR COALESCE(p.stripe_subscription_status, p.subscription_status) = 'lifetime'
        OR (
          COALESCE(p.stripe_subscription_status, p.subscription_status) = 'active'
          AND (
            p.tier = 'premium'
            OR COALESCE(p.is_premium, false) = true
            OR (p.plan IS NOT NULL AND p.plan <> 'free')
          )
        )
        OR (
          p.plan IS NOT NULL
          AND p.plan <> 'free'
          AND COALESCE(p.premium_until, p.current_period_end) IS NOT NULL
          AND COALESCE(p.premium_until, p.current_period_end) > now()
        )
        OR (
          COALESCE(p.is_premium, false) = true
          AND (
            COALESCE(p.premium_until, p.current_period_end) IS NULL
            OR COALESCE(p.premium_until, p.current_period_end) > now()
          )
        )
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.has_live_mock_premium_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_challenge_session() TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_tier_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.compute_is_premium(NEW) THEN
    NEW.tier := 'premium';
    -- Keep lifetime flags coherent when any entitlement field is written.
    IF NEW.plan = 'premium_lifetime'
      OR NEW.subscription_interval = 'lifetime'
      OR COALESCE(NEW.stripe_subscription_status, NEW.subscription_status) = 'lifetime'
    THEN
      NEW.is_premium := true;
      NEW.plan := 'premium_lifetime';
      NEW.subscription_interval := 'lifetime';
      NEW.subscription_status := 'lifetime';
      NEW.stripe_subscription_status := 'lifetime';
      NEW.premium_until := NULL;
      NEW.current_period_end := NULL;
      NEW.cancel_at_period_end := false;
    END IF;
  ELSE
    NEW.tier := 'free';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tier_from_subscription ON public.profiles;

CREATE TRIGGER trg_sync_tier_from_subscription
BEFORE INSERT OR UPDATE OF
  is_premium,
  premium_until,
  plan,
  current_period_end,
  stripe_subscription_status,
  subscription_status,
  subscription_interval,
  tier
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_tier_from_subscription();
