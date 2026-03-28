# Import instructions for `exam_questions` (revamp)

WARNING: The migration `supabase/migrations/20251220120000_revamp_exam_questions_v2.sql` truncates `public.exam_questions`. BACK UP your data before applying.

Quick steps

1. Back up current table (via Supabase UI -> Table Editor -> Export CSV) or with psql:

```bash
# using psql; replace <CONN> with your DB connection string
psql "<CONN>" -c "\copy (SELECT * FROM public.exam_questions) TO 'exam_questions_backup.csv' CSV HEADER"
```

2. (Optional) Upload images to your Supabase Storage bucket. Use the Supabase Dashboard Storage UI and upload files under the paths referenced in `image_url` in the CSV (e.g. `notes-diagrams/number/linear1.svg`).

3. Apply the migration (this truncates the table):

Via Supabase SQL editor: open `supabase/migrations/20251220120000_revamp_exam_questions_v2.sql` and run it.

Or via psql:

```bash
psql "<CONN>" -f supabase/migrations/20251220120000_revamp_exam_questions_v2.sql
```

4. Validate your CSV locally (recommended):

```bash
python3 supabase/import/validate_import.py supabase/data/exam_questions_import_template.csv
```

5. Import the CSV:

- Via Supabase UI: Table Editor -> Import CSV -> choose `supabase/data/exam_questions_import_template.csv`. Map columns if necessary and run import.

- Or with psql (example):

```bash
psql "<CONN>" -c "\copy public.exam_questions(track,subtopic,question_type,tier,calculator,question,correct_answer,wrong_answers,marks,difficulty,estimated_time_sec,image_url,image_alt,explanation) FROM 'supabase/data/exam_questions_import_template.csv' CSV HEADER"
```

Notes & field guidance
- `id`: optional; leave blank to let the DB assign an id.
- `track`: `gcse` or `11plus`.
- `subtopic`: use `topicKey,subtopicKey` for 11+ (e.g. `number,place-value`, `algebra,equations`). Legacy `topicKey|subtopicKey` is still supported for GCSE/backfill scripts.
- `question_type`: top-level module/topic used by practice filtering (e.g. `Number`, `Algebra`, `Geometry & Measures`, `Statistics`, `Problem Solving`).
- `tier`: GCSE rows use `Foundation Tier` or `Higher Tier`; 11+ rows use `11+ Standard`.
- `calculator`: GCSE rows use `Calculator`/`Non-Calculator`; 11+ rows must be `Non-Calculator`.
- `question`: plain text or LaTeX (the app supports KaTeX rendering). Do not wrap simple numbers in LaTeX (use `2-digit`, not `$2$-digit`).
- `correct_answer`: string representation; for math expressions use LaTeX (e.g. `$x^2 + C$`).
- `wrong_answers`: MUST be a PostgreSQL text[] literal with curly braces and double-quoted values (e.g. `{"1","2","3"}`).
- `wrong_answers` + `correct_answer`: provide exactly 3 distinct wrong answers so the app renders 4 options total.
- `marks`: integer, default 1.
- `difficulty`: GCSE uses 1..5; 11+ uses 1..3 (`1=Fluency`, `2=Application`, `3=Reasoning`).
- `estimated_time_sec`: integer seconds (defaults to 90 if omitted).
- `image_url`: path to storage object (recommended) like `notes-diagrams/number/linear1.svg`. The app will resolve object paths to public URLs.
- `explanation`: use structured multi-line text:
  - `Step 1: ...`
  - `Step 2: ...`
  - `Tip: ...`
  You can separate lines with real line breaks, `\\n`, or `<br>`.

If you want, I can now:
- run the migration and import for you (you must provide DB connection or grant access), or
- produce a larger JSON import file and an automated upload script to also push images to Supabase Storage.
