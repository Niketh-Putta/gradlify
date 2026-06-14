-- PLACEHOLDER SEED for the combined 11+ live mock. STRUCTURE ONLY.
--
-- NOT run automatically by `supabase db push`. Apply manually only when you
-- explicitly want placeholder rows in a database:
--   supabase db execute --file supabase/seed/live_mock_combined_placeholder.sql
--
-- Creates: maths paper + 4 sections, english paper + 5 sections,
-- 120 placeholder questions (60 each), and the combined event linking them.
-- Idempotent: safe to re-run; upserts by slug / (paper, key) / (paper, number).
-- Section names/counts mirror src/lib/liveMockCombinedConfig.ts.

DO $$
DECLARE
  v_maths uuid;
  v_english uuid;
  v_section uuid;
  v_event uuid;
  v_start timestamptz := date_trunc('hour', now()) + interval '7 days';
  v_qnum int;
  i int;
  sec record;
BEGIN
  -- Papers ------------------------------------------------------------------
  INSERT INTO public.live_mock_papers (slug, title, track, subject, starts_at, duration_minutes, question_count, status)
  VALUES ('both_subjects_maths', '11+ Maths', '11plus', 'maths', v_start, 50, 60, 'draft')
  ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title, duration_minutes = EXCLUDED.duration_minutes, question_count = EXCLUDED.question_count
  RETURNING id INTO v_maths;

  INSERT INTO public.live_mock_papers (slug, title, track, subject, starts_at, duration_minutes, question_count, status)
  VALUES ('both_subjects_english', '11+ English', '11plus', 'english', v_start, 50, 60, 'draft')
  ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title, duration_minutes = EXCLUDED.duration_minutes, question_count = EXCLUDED.question_count
  RETURNING id INTO v_english;

  -- Maths sections + placeholder questions ----------------------------------
  v_qnum := 0;
  FOR sec IN
    SELECT * FROM (VALUES
      ('maths_arithmetic', 'Arithmetic', 1, 15),
      ('maths_reasoning', 'Numerical reasoning', 2, 15),
      ('maths_geometry', 'Geometry & measures', 3, 15),
      ('maths_data', 'Data & problem solving', 4, 15)
    ) AS t(key, title, ord, cnt)
  LOOP
    INSERT INTO public.live_mock_sections (paper_id, section_order, section_key, title, instructions)
    VALUES (v_maths, sec.ord, sec.key, sec.title, 'Placeholder section. Content added later.')
    ON CONFLICT (paper_id, section_key) DO UPDATE
      SET title = EXCLUDED.title, section_order = EXCLUDED.section_order
    RETURNING id INTO v_section;

    FOR i IN 1..sec.cnt LOOP
      v_qnum := v_qnum + 1;
      INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, topic)
      VALUES (
        v_maths, v_section, v_qnum, 'placeholder',
        format('Placeholder Maths question %s (%s).', v_qnum, sec.title),
        '["A","B","C","D","E"]'::jsonb, 'A', sec.title
      )
      ON CONFLICT (paper_id, question_number) DO UPDATE
        SET section_id = EXCLUDED.section_id, stem = EXCLUDED.stem, topic = EXCLUDED.topic;
    END LOOP;
  END LOOP;

  -- English sections + placeholder questions --------------------------------
  v_qnum := 0;
  FOR sec IN
    SELECT * FROM (VALUES
      ('english_fiction', 'Fiction comprehension', 1, 15),
      ('english_non_fiction', 'Non-fiction comprehension', 2, 15),
      ('english_spelling', 'Spelling', 3, 10),
      ('english_punctuation', 'Punctuation', 4, 10),
      ('english_grammar', 'Grammar', 5, 10)
    ) AS t(key, title, ord, cnt)
  LOOP
    INSERT INTO public.live_mock_sections (paper_id, section_order, section_key, title, instructions)
    VALUES (v_english, sec.ord, sec.key, sec.title, 'Placeholder section. Content added later.')
    ON CONFLICT (paper_id, section_key) DO UPDATE
      SET title = EXCLUDED.title, section_order = EXCLUDED.section_order
    RETURNING id INTO v_section;

    FOR i IN 1..sec.cnt LOOP
      v_qnum := v_qnum + 1;
      INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, topic)
      VALUES (
        v_english, v_section, v_qnum, 'placeholder',
        format('Placeholder English question %s (%s).', v_qnum, sec.title),
        '["A","B","C","D","E"]'::jsonb, 'A', sec.title
      )
      ON CONFLICT (paper_id, question_number) DO UPDATE
        SET section_id = EXCLUDED.section_id, stem = EXCLUDED.stem, topic = EXCLUDED.topic;
    END LOOP;
  END LOOP;

  -- Combined event linking both papers --------------------------------------
  INSERT INTO public.live_mock_events (slug, title, track, starts_at, break_minutes, maths_paper_id, english_paper_id, access_rule, status)
  VALUES ('both_subjects_live_mock', '11+ Maths & English Live Mock', '11plus', v_start, 15, v_maths, v_english, 'registered', 'draft')
  ON CONFLICT (slug) DO UPDATE
    SET maths_paper_id = EXCLUDED.maths_paper_id,
        english_paper_id = EXCLUDED.english_paper_id,
        starts_at = EXCLUDED.starts_at,
        break_minutes = EXCLUDED.break_minutes
  RETURNING id INTO v_event;

  RAISE NOTICE 'Seeded combined mock event % (maths %, english %).', v_event, v_maths, v_english;
END $$;
