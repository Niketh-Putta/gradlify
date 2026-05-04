CREATE OR REPLACE FUNCTION public.consume_mock_start(
  p_subject text DEFAULT 'maths',
  p_question_count integer DEFAULT 10,
  p_title text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_start_of_day timestamptz := date_trunc('day', now());
  v_subject text := lower(coalesce(p_subject, 'maths'));
  v_mode text;
  v_title text;
  v_question_count integer := greatest(1, coalesce(p_question_count, 10));
  v_is_admin boolean := false;
  v_is_premium boolean := false;
  v_daily_count integer := 0;
  v_credit_balance integer := 0;
  v_attempt_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_subject NOT IN ('maths', 'english') THEN
    v_subject := 'maths';
  END IF;

  v_mode := CASE WHEN v_subject = 'english' THEN 'mock-exam' ELSE 'mock' END;
  v_title := coalesce(
    nullif(trim(p_title), ''),
    CASE WHEN v_subject = 'english' THEN 'English Mock Exam' ELSE 'Maths Mock Exam' END
  );

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  SELECT public.is_admin(v_user_id) INTO v_is_admin;
  v_is_premium := coalesce(v_is_admin, false)
    OR v_profile.founder_track = 'founder'
    OR public.compute_is_premium(v_profile);

  IF v_is_premium THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'source', 'premium',
      'daily_mock_uses', v_daily_count,
      'daily_mock_limit', 'unlimited',
      'bonus_mock_credits', public.get_mock_credit_balance(),
      'is_premium', true
    );
  END IF;

  IF v_question_count > 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'question_limit',
      'message', 'Free and referral mock credits can only start 10-question mocks.',
      'daily_mock_uses', v_daily_count,
      'daily_mock_limit', 1,
      'bonus_mock_credits', public.get_mock_credit_balance(),
      'is_premium', false
    );
  END IF;

  SELECT count(*)::integer
  INTO v_daily_count
  FROM public.mock_attempts ma
  WHERE ma.user_id = v_user_id
    AND ma.created_at >= v_start_of_day
    AND ma.mode = v_mode;

  IF v_daily_count < 1 THEN
    INSERT INTO public.mock_attempts (
      user_id,
      title,
      mode,
      total_marks,
      status
    )
    VALUES (
      v_user_id,
      v_title,
      v_mode,
      0,
      'in_progress'
    )
    RETURNING id INTO v_attempt_id;

    RETURN jsonb_build_object(
      'allowed', true,
      'source', 'daily_free',
      'attempt_id', v_attempt_id,
      'daily_mock_uses', v_daily_count + 1,
      'daily_mock_limit', 1,
      'bonus_mock_credits', public.get_mock_credit_balance(),
      'is_premium', false
    );
  END IF;

  SELECT public.get_mock_credit_balance()
  INTO v_credit_balance;

  IF v_credit_balance < 1 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'message', 'You have already used your free mock exam for this subject today.',
      'daily_mock_uses', v_daily_count,
      'daily_mock_limit', 1,
      'bonus_mock_credits', v_credit_balance,
      'is_premium', false
    );
  END IF;

  INSERT INTO public.mock_credit_ledger (
    user_id,
    source,
    delta,
    reason
  )
  VALUES (
    v_user_id,
    'referral_spend',
    -1,
    'Started bonus referral mock'
  );

  INSERT INTO public.mock_attempts (
    user_id,
    title,
    mode,
    total_marks,
    status
  )
  VALUES (
    v_user_id,
    v_title,
    v_mode,
    0,
    'in_progress'
  )
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'source', 'referral_credit',
    'attempt_id', v_attempt_id,
    'daily_mock_uses', v_daily_count + 1,
    'daily_mock_limit', 1,
    'bonus_mock_credits', v_credit_balance - 1,
    'is_premium', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_mock_start(text, integer, text) TO authenticated;
