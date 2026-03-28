-- Ensure 11+ probability wording is age-appropriate and avoids symbolic conditional notation.
-- Specifically remove | / \mid / ∣ from stems, options, answers, and explanations.

CREATE OR REPLACE FUNCTION public.normalize_11plus_probability_text(p_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  t := p_input;

  -- Convert symbolic conditional notation to plain language.
  t := regexp_replace(t, E'\\\\mid', ' given ', 'gi');
  t := replace(t, '∣', ' given ');
  t := replace(t, '|', ' given ');

  -- Keep punctuation/spacing clean after replacements.
  t := regexp_replace(t, '\\s+given\\s+given\\s+', ' given ', 'gi');
  t := regexp_replace(t, '\\(\\s+', '(', 'g');
  t := regexp_replace(t, '\\s+\\)', ')', 'g');
  t := regexp_replace(t, '\\s{2,}', ' ', 'g');

  RETURN trim(t);
END;
$$;

WITH targets AS (
  SELECT q.id
  FROM public.exam_questions q
  WHERE q.track = '11plus'::public.user_track
    AND (
      lower(coalesce(q.question_type, '')) LIKE '%probability%'
      OR lower(coalesce(q.subtopic, '')) LIKE '%probability%'
    )
    AND (
      coalesce(q.question, '') LIKE '%|%'
      OR coalesce(q.correct_answer, '') LIKE '%|%'
      OR coalesce(q.explanation, '') LIKE '%|%'
      OR coalesce(q.question, '') LIKE '%\\mid%'
      OR coalesce(q.correct_answer, '') LIKE '%\\mid%'
      OR coalesce(q.explanation, '') LIKE '%\\mid%'
      OR coalesce(q.question, '') LIKE '%∣%'
      OR coalesce(q.correct_answer, '') LIKE '%∣%'
      OR coalesce(q.explanation, '') LIKE '%∣%'
      OR EXISTS (SELECT 1 FROM unnest(coalesce(q.all_answers, ARRAY[]::text[])) a WHERE a LIKE '%|%' OR a LIKE '%\\mid%' OR a LIKE '%∣%')
      OR EXISTS (SELECT 1 FROM unnest(coalesce(q.wrong_answers, ARRAY[]::text[])) a WHERE a LIKE '%|%' OR a LIKE '%\\mid%' OR a LIKE '%∣%')
    )
)
UPDATE public.exam_questions q
SET
  question = public.normalize_11plus_probability_text(q.question),
  correct_answer = public.normalize_11plus_probability_text(q.correct_answer),
  explanation = public.normalize_11plus_probability_text(q.explanation),
  all_answers = CASE
    WHEN q.all_answers IS NULL THEN NULL
    ELSE ARRAY(
      SELECT public.normalize_11plus_probability_text(a)
      FROM unnest(q.all_answers) a
    )
  END,
  wrong_answers = CASE
    WHEN q.wrong_answers IS NULL THEN NULL
    ELSE ARRAY(
      SELECT public.normalize_11plus_probability_text(a)
      FROM unnest(q.wrong_answers) a
    )
  END
WHERE q.id IN (SELECT id FROM targets);

-- Extreme challenge bank has no explicit topic column; use probability keyword guard.
WITH targets AS (
  SELECT q.id
  FROM public.extreme_questions q
  WHERE q.track = '11plus'::public.user_track
    AND (
      lower(coalesce(q.question, '')) LIKE '%probability%'
      OR lower(coalesce(q.explanation, '')) LIKE '%probability%'
    )
    AND (
      coalesce(q.question, '') LIKE '%|%'
      OR coalesce(q.correct_answer, '') LIKE '%|%'
      OR coalesce(q.explanation, '') LIKE '%|%'
      OR coalesce(q.question, '') LIKE '%\\mid%'
      OR coalesce(q.correct_answer, '') LIKE '%\\mid%'
      OR coalesce(q.explanation, '') LIKE '%\\mid%'
      OR coalesce(q.question, '') LIKE '%∣%'
      OR coalesce(q.correct_answer, '') LIKE '%∣%'
      OR coalesce(q.explanation, '') LIKE '%∣%'
      OR EXISTS (SELECT 1 FROM unnest(coalesce(q.all_answers, ARRAY[]::text[])) a WHERE a LIKE '%|%' OR a LIKE '%\\mid%' OR a LIKE '%∣%')
      OR EXISTS (SELECT 1 FROM unnest(coalesce(q.wrong_answers, ARRAY[]::text[])) a WHERE a LIKE '%|%' OR a LIKE '%\\mid%' OR a LIKE '%∣%')
    )
)
UPDATE public.extreme_questions q
SET
  question = public.normalize_11plus_probability_text(q.question),
  correct_answer = public.normalize_11plus_probability_text(q.correct_answer),
  explanation = public.normalize_11plus_probability_text(q.explanation),
  all_answers = CASE
    WHEN q.all_answers IS NULL THEN NULL
    ELSE ARRAY(
      SELECT public.normalize_11plus_probability_text(a)
      FROM unnest(q.all_answers) a
    )
  END,
  wrong_answers = CASE
    WHEN q.wrong_answers IS NULL THEN NULL
    ELSE ARRAY(
      SELECT public.normalize_11plus_probability_text(a)
      FROM unnest(q.wrong_answers) a
    )
  END
WHERE q.id IN (SELECT id FROM targets);
