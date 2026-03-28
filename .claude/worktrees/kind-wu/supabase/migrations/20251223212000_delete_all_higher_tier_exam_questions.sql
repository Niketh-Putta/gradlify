-- Delete ALL Higher Tier questions from the exam_questions bank.
-- Safety: copy them to a backup table first.

BEGIN;

CREATE TABLE IF NOT EXISTS public.exam_questions_backup_higher_tier_20251223 AS
SELECT *
FROM public.exam_questions
WHERE tier = 'Higher Tier';

DELETE FROM public.exam_questions
WHERE tier = 'Higher Tier';

COMMIT;

