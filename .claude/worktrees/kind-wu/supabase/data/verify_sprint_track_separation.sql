-- Read-only verification checks for sprint track separation.
-- Run in Supabase SQL editor after applying:
--   20260213193000_sprint_leaderboard_track_separation.sql

-- 1) sprint_stats primary key must include track.
SELECT
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
 AND tc.table_name = kcu.table_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'sprint_stats'
  AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.constraint_name, tc.constraint_type;

-- 2) sprint_top10 keys must be track-aware.
SELECT
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
 AND tc.table_name = kcu.table_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'sprint_top10'
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
GROUP BY tc.constraint_name, tc.constraint_type
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3) Ensure all existing rows now have a valid track value.
SELECT
  'sprint_stats' AS table_name,
  COUNT(*) FILTER (WHERE track IS NULL) AS null_track_rows,
  COUNT(*) AS total_rows
FROM public.sprint_stats
UNION ALL
SELECT
  'sprint_top10' AS table_name,
  COUNT(*) FILTER (WHERE track IS NULL) AS null_track_rows,
  COUNT(*) AS total_rows
FROM public.sprint_top10;

-- 4) Confirm get_sprint_top10 reads by current user's track.
SELECT pg_get_functiondef('public.get_sprint_top10(text)'::regprocedure) AS function_sql;

-- 5) Confirm refresh_sprint_stats upsert key includes track.
SELECT pg_get_functiondef('public.refresh_sprint_stats(text, timestamptz, timestamptz)'::regprocedure) AS function_sql;

-- 6) Quick data sanity: per sprint, rows are partitioned by track.
SELECT
  sprint_id,
  track,
  COUNT(*) AS rows_per_track
FROM public.sprint_stats
GROUP BY sprint_id, track
ORDER BY sprint_id, track;

SELECT
  sprint_id,
  track,
  COUNT(*) AS top10_rows_per_track
FROM public.sprint_top10
GROUP BY sprint_id, track
ORDER BY sprint_id, track;
