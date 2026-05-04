CREATE OR REPLACE FUNCTION public.get_referral_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code jsonb;
  v_balance integer;
  v_earned_mock_credits integer;
  v_successful_referrals integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_code := public.get_my_referral_code();

  SELECT public.get_mock_credit_balance()
  INTO v_balance;

  SELECT coalesce(sum(delta), 0)::integer
  INTO v_earned_mock_credits
  FROM public.mock_credit_ledger
  WHERE user_id = v_user_id
    AND source = 'referral_bonus'
    AND delta > 0;

  SELECT count(*)::integer
  INTO v_successful_referrals
  FROM public.referrals
  WHERE referrer_user_id = v_user_id
    AND status = 'rewarded';

  RETURN jsonb_build_object(
    'code', v_code ->> 'code',
    'bonus_mock_credits', v_balance,
    'earned_mock_credits', v_earned_mock_credits,
    'successful_referrals', v_successful_referrals
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_summary() TO authenticated;
