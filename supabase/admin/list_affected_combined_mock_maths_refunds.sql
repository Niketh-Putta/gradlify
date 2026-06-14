-- ============================================================================
-- Affected-cohort refund list — combined live mock "Maths key-mismatch" bug.
--
-- WHAT THIS IS
--   A read-only admin query that lists every user hit by the bug where Maths
--   answers were saved under `non-calculator maths-N` but submit read `maths-N`,
--   leaving a SUBMITTED `both_subjects_maths` attempt with answered_count = 0 and
--   every live_mock_answers.selected_option = NULL.
--
-- HOW TO RUN
--   Paste into the Supabase SQL editor (project gknnfbalijxykqycopic) while
--   signed in as an admin, or run via psql with the service role. Read-only.
--
-- WHAT YOU GET
--   One row per affected user, with the email + Stripe customer reference so
--   Niketh can issue the £5 apology refund MANUALLY in Stripe. This script does
--   NOT touch Stripe and does NOT change any data.
--
-- COHORT RULE (must match src/pages/LocalCombinedMock.tsx detectAffectedMathsAttempt):
--   attempt.status = 'submitted'
--   AND attempt.answered_count = 0
--   AND no live_mock_answers row for the attempt has a non-null selected_option.
-- A re-sit fixes a user in place (same attempt row), so once they redo Maths
-- they drop OUT of this list automatically — re-run any time to see who is left.
-- ============================================================================

WITH maths_paper AS (
  SELECT id FROM public.live_mock_papers WHERE slug = 'both_subjects_maths'
),
affected AS (
  SELECT
    a.id            AS attempt_id,
    a.user_id,
    a.user_email    AS attempt_email,
    a.submitted_at,
    a.answered_count
  FROM public.live_mock_attempts a
  WHERE a.paper_id = (SELECT id FROM maths_paper)
    AND a.status = 'submitted'
    AND a.answered_count = 0
    -- Final guard: zero non-null selections on this attempt.
    AND NOT EXISTS (
      SELECT 1 FROM public.live_mock_answers ans
      WHERE ans.attempt_id = a.id
        AND ans.selected_option IS NOT NULL
    )
)
SELECT
  aff.user_id,
  COALESCE(aff.attempt_email, s.email)        AS email,
  aff.attempt_id,
  aff.submitted_at,
  p.is_premium,
  -- Stripe / payment reference for the manual £5 refund. Premium users registered
  -- free (refund the £5 goodwill or skip per Niketh's call); fixed-price payers
  -- have a Stripe customer id below.
  p.stripe_customer_id_live,
  p.stripe_customer_id_test,
  s.registered_at                              AS mock_registered_at,
  5.00                                         AS suggested_refund_gbp
FROM affected aff
LEFT JOIN public.live_mock_exam_signups s
  ON s.user_id = aff.user_id
 AND s.mock_slug = 'both_subjects_live_mock'
LEFT JOIN public.profiles p
  ON p.user_id = aff.user_id
ORDER BY aff.submitted_at NULLS LAST, email;

-- ----------------------------------------------------------------------------
-- AUTOMATED-REFUND HOOK (intentionally NOT implemented).
--
-- Do NOT auto-charge / auto-refund here. When Niketh decides to automate the
-- £5 apology refunds, wire it OUTSIDE this query against the emails / Stripe
-- customer ids above, e.g. a guarded server-side script that, per row:
--   1. resolves the Stripe PaymentIntent / Charge for the combined-mock signup
--      (look up by stripe_customer_id_live + amount/metadata), and
--   2. calls stripe.refunds.create({ payment_intent, amount: 500 }) // £5 = 500p
--      with idempotency keys + a dry-run flag, logging each refund id.
-- Keep it manual-approval gated; never refund the whole cohort unattended.
-- ----------------------------------------------------------------------------
