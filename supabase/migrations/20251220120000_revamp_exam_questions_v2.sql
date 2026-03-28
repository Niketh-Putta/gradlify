-- Revamp exam_questions schema for v2 dataset (start from scratch)
--
-- Notes:
-- - This migration truncates existing rows as requested.
-- - It adds optional metadata columns used by the app: subtopics, difficulty controls,
--   marks, and estimated time per question.
-- - The app generates/shuffles answer options at runtime from correct_answer + wrong_answers.

begin;

truncate table public.exam_questions;

alter table public.exam_questions
  add column if not exists subtopic text,
  add column if not exists difficulty smallint,
  add column if not exists marks smallint,
  add column if not exists estimated_time_sec integer;

alter table public.exam_questions
  alter column difficulty set default 3,
  alter column marks set default 1,
  alter column estimated_time_sec set default 90;

commit;
