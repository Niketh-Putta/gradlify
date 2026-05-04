-- Referral links and bonus mock credits.
-- A successful referred signup grants the referrer five shared mock credits,
-- usable across Maths and English after the user's free daily subject mock.

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'rewarded' CHECK (status IN ('pending', 'rewarded', 'rejected')),
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_no_self_referral CHECK (referrer_user_id <> referred_user_id)
);

CREATE TABLE IF NOT EXISTS public.mock_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('referral_bonus', 'referral_spend', 'admin_adjustment')),
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  delta integer NOT NULL CHECK (delta <> 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code_lower
  ON public.referral_codes (lower(code));

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user_id
  ON public.referrals (referrer_user_id);

CREATE INDEX IF NOT EXISTS idx_mock_credit_ledger_user_created
  ON public.mock_credit_ledger (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mock_credit_ledger_referral_bonus_once
  ON public.mock_credit_ledger (referral_id)
  WHERE source = 'referral_bonus';

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own referral code" ON public.referral_codes;
CREATE POLICY "Users can view their own referral code"
ON public.referral_codes
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view referrals they are part of" ON public.referrals;
CREATE POLICY "Users can view referrals they are part of"
ON public.referrals
FOR SELECT
TO authenticated
USING ((select auth.uid()) = referrer_user_id OR (select auth.uid()) = referred_user_id);

DROP POLICY IF EXISTS "Users can view their own mock credit ledger" ON public.mock_credit_ledger;
CREATE POLICY "Users can view their own mock credit ledger"
ON public.mock_credit_ledger
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.normalize_referral_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.referral_codes rc
      WHERE lower(rc.code) = lower(v_code)
    );
  END LOOP;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT code
  INTO v_code
  FROM public.referral_codes
  WHERE user_id = v_user_id;

  WHILE v_code IS NULL LOOP
    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (v_user_id, public.generate_referral_code())
      ON CONFLICT (user_id) DO UPDATE
      SET code = public.referral_codes.code
      RETURNING code INTO v_code;
    EXCEPTION WHEN unique_violation THEN
      v_code := NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mock_credit_balance()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT greatest(0, coalesce(sum(delta), 0))::integer
  FROM public.mock_credit_ledger
  WHERE user_id = auth.uid();
$$;

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
  v_successful_referrals integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_code := public.get_my_referral_code();

  SELECT public.get_mock_credit_balance()
  INTO v_balance;

  SELECT count(*)::integer
  INTO v_successful_referrals
  FROM public.referrals
  WHERE referrer_user_id = v_user_id
    AND status = 'rewarded';

  RETURN jsonb_build_object(
    'code', v_code ->> 'code',
    'bonus_mock_credits', v_balance,
    'successful_referrals', v_successful_referrals
  );
END;
$$;

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
  VALUES (
    v_referrer_user_id,
    'referral_bonus',
    v_referral_id,
    5,
    'Referral signup bonus'
  );

  RETURN jsonb_build_object(
    'claimed', true,
    'rewarded_credits', 5,
    'referrer_user_id', v_referrer_user_id
  );
END;
$$;

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
  v_now timestamptz := now();
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

GRANT EXECUTE ON FUNCTION public.get_my_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mock_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_mock_start(text, integer, text) TO authenticated;
