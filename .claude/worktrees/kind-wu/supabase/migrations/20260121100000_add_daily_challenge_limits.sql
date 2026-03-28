-- Add daily challenge tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_challenge_uses integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_challenge_reset_at timestamp with time zone DEFAULT NULL;

-- Consume a challenge session with server-side enforcement
CREATE OR REPLACE FUNCTION public.consume_challenge_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_now timestamptz := now();
  v_reset_at timestamptz;
  v_limit integer := 8;
  v_is_admin boolean := false;
BEGIN
  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- Admins and premium users are unlimited
  SELECT public.is_admin(auth.uid()) INTO v_is_admin;
  IF v_is_admin OR v_profile.tier = 'premium' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'daily_challenge_uses', v_profile.daily_challenge_uses,
      'daily_challenge_reset_at', v_profile.daily_challenge_reset_at,
      'daily_challenge_limit', v_limit
    );
  END IF;

  v_reset_at := v_profile.daily_challenge_reset_at;

  -- Align reset time with mock exams when possible
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
      'daily_challenge_limit', v_limit
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
    'daily_challenge_limit', v_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_challenge_session() TO authenticated;
