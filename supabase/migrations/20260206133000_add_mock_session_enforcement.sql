-- Enforce daily mock limits and free question count server-side.
CREATE OR REPLACE FUNCTION public.consume_mock_session(p_question_count integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_now timestamptz := now();
  v_reset_at timestamptz;
  v_limit integer := 2;
  v_is_admin boolean := false;
  v_is_premium boolean := false;
  v_count integer := COALESCE(p_question_count, 10);
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
  v_is_premium := v_is_admin
    OR v_profile.founder_track = 'founder'
    OR public.compute_is_premium(v_profile);

  IF v_is_premium THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'daily_mock_uses', v_profile.daily_mock_uses,
      'daily_mock_reset_at', v_profile.daily_mock_reset_at,
      'daily_mock_limit', v_limit,
      'is_premium', true
    );
  END IF;

  IF v_count > 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'question_limit',
      'message', 'Free users can only start 10-question mocks.',
      'daily_mock_uses', v_profile.daily_mock_uses,
      'daily_mock_reset_at', v_profile.daily_mock_reset_at,
      'daily_mock_limit', v_limit,
      'is_premium', false
    );
  END IF;

  v_reset_at := v_profile.daily_mock_reset_at;

  IF v_reset_at IS NULL OR v_now > v_reset_at THEN
    v_reset_at := date_trunc('day', v_now) + interval '1 day';
    v_profile.daily_mock_uses := 0;
  END IF;

  IF v_profile.daily_mock_uses >= v_limit THEN
    UPDATE public.profiles
    SET
      daily_mock_uses = v_profile.daily_mock_uses,
      daily_mock_reset_at = v_reset_at
    WHERE user_id = v_profile.user_id;

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'message', 'Daily mock exam limit reached.',
      'daily_mock_uses', v_profile.daily_mock_uses,
      'daily_mock_reset_at', v_reset_at,
      'daily_mock_limit', v_limit,
      'is_premium', false
    );
  END IF;

  UPDATE public.profiles
  SET
    daily_mock_uses = v_profile.daily_mock_uses + 1,
    daily_mock_reset_at = v_reset_at
  WHERE user_id = v_profile.user_id
  RETURNING daily_mock_uses, daily_mock_reset_at
  INTO v_profile.daily_mock_uses, v_profile.daily_mock_reset_at;

  RETURN jsonb_build_object(
    'allowed', true,
    'daily_mock_uses', v_profile.daily_mock_uses,
    'daily_mock_reset_at', v_profile.daily_mock_reset_at,
    'daily_mock_limit', v_limit,
    'is_premium', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_mock_session(integer) TO authenticated;
