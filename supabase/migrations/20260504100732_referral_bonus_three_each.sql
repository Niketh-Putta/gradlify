-- Referrals now grant 3 bonus mocks to both the inviter and the new user.

DROP INDEX IF EXISTS public.idx_mock_credit_ledger_referral_bonus_once;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mock_credit_ledger_referral_bonus_once_per_user
  ON public.mock_credit_ledger (referral_id, user_id)
  WHERE source = 'referral_bonus';

UPDATE public.mock_credit_ledger
SET
  delta = 3,
  reason = CASE
    WHEN reason = 'Referral signup bonus' THEN 'Referral signup bonus for inviter'
    ELSE reason
  END
WHERE source = 'referral_bonus'
  AND delta > 3;

INSERT INTO public.mock_credit_ledger (
  user_id,
  source,
  referral_id,
  delta,
  reason
)
SELECT
  r.referred_user_id,
  'referral_bonus',
  r.id,
  3,
  'Referral signup bonus for new user'
FROM public.referrals r
WHERE r.status = 'rewarded'
  AND NOT EXISTS (
    SELECT 1
    FROM public.mock_credit_ledger mcl
    WHERE mcl.referral_id = r.id
      AND mcl.user_id = r.referred_user_id
      AND mcl.source = 'referral_bonus'
  );

CREATE OR REPLACE FUNCTION public.claim_referral(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_user_id uuid := auth.uid();
  v_code text := public.normalize_referral_code(p_code);
  v_referrer_user_id uuid;
  v_referral_id uuid;
  v_existing public.referrals%ROWTYPE;
  v_reward integer := 3;
BEGIN
  IF v_referred_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_code = '' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'missing_code');
  END IF;

  SELECT rc.user_id
  INTO v_referrer_user_id
  FROM public.referral_codes rc
  WHERE lower(rc.code) = lower(v_code);

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'invalid_code');
  END IF;

  IF v_referrer_user_id = v_referred_user_id THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'self_referral');
  END IF;

  SELECT *
  INTO v_existing
  FROM public.referrals
  WHERE referred_user_id = v_referred_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'already_referred',
      'referrer_user_id', v_existing.referrer_user_id
    );
  END IF;

  INSERT INTO public.referrals (
    referrer_user_id,
    referred_user_id,
    referral_code,
    status,
    rewarded_at
  )
  VALUES (
    v_referrer_user_id,
    v_referred_user_id,
    v_code,
    'rewarded',
    now()
  )
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING id INTO v_referral_id;

  IF v_referral_id IS NULL THEN
    SELECT *
    INTO v_existing
    FROM public.referrals
    WHERE referred_user_id = v_referred_user_id;

    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'already_referred',
      'referrer_user_id', v_existing.referrer_user_id
    );
  END IF;

  INSERT INTO public.mock_credit_ledger (
    user_id,
    source,
    referral_id,
    delta,
    reason
  )
  VALUES
    (
      v_referrer_user_id,
      'referral_bonus',
      v_referral_id,
      v_reward,
      'Referral signup bonus for inviter'
    ),
    (
      v_referred_user_id,
      'referral_bonus',
      v_referral_id,
      v_reward,
      'Referral signup bonus for new user'
    )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'claimed', true,
    'rewarded_credits', v_reward,
    'referred_user_credits', v_reward,
    'referrer_user_id', v_referrer_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
