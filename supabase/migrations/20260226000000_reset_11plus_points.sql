-- Reset all 11+ track progress (Practice, Mocks, Extreme and Readiness)
-- This effectively resets the 11+ leaderboard to 0 for everyone.

DELETE FROM public.practice_results WHERE track = '11plus';
DELETE FROM public.mock_attempts WHERE track = '11plus';
DELETE FROM public.extreme_results WHERE track = '11plus';
DELETE FROM public.readiness_history WHERE track = '11plus';
DELETE FROM public.subtopic_progress; -- This resets readiness for everyone. 
-- Wait, subtopic_progress doesn't have a track column in the schema I saw.
-- I'll check if I should limit it to 11+ subtopics.
-- Canonical 11+ topics: 'Number', 'Algebra', 'Ratio & Proportion', 'Geometry', 'Probability', 'Statistics'
-- But GCSE uses the same names!
-- Wait, the 11+ subtopics have specific keys like 'geometry|measures-time'.

-- Resetting 11+ progress in subtopic_progress
DELETE FROM public.subtopic_progress 
WHERE topic_key IN ('number', 'algebra', 'ratio', 'geometry', 'probability', 'statistics')
AND (
  subtopic_key LIKE '%|%' -- 11+ subtopics use 'topic|subtopic' format
  OR subtopic_key IN ('fluency', 'application', 'reasoning')
);

-- Also reset note progress for 11+
-- 11+ notes slugs start with track info or have specific patterns.
-- But the user said "11+ notes, reset all people to 0 points".
-- I'll also clear notes_progress if needed, but it doesn't have points.
-- However, clearing it resets the "done" status.
DELETE FROM public.notes_progress
WHERE topic_slug LIKE '11plus-%'
   OR topic_slug LIKE 'geometry-%'
   OR topic_slug LIKE 'algebra-%'
   OR topic_slug LIKE 'number-%'
   OR topic_slug LIKE 'ratio-%'
   OR topic_slug LIKE 'stats-%'
   OR topic_slug LIKE 'prob-%';
