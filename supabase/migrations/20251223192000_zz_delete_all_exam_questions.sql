-- Delete all rows from exam_questions as requested (no backup)
BEGIN;

DELETE FROM public.exam_questions;

-- Optionally mark related tables or reset sequences if needed
-- Reset id sequence (if using bigserial named exam_questions_id_seq)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'exam_questions_id_seq'
  ) THEN
    EXECUTE 'ALTER SEQUENCE exam_questions_id_seq RESTART WITH 1';
  END IF;
END$$;

COMMIT;
