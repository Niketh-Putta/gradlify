# Bulk question pumper (generator + Supabase upload)

This folder contains **stdlib-only** Python scripts to generate **tons** of MCQ-style questions and push them into your Supabase `exam_questions` table.

Images are generated in **auto mode by default**:
- Most questions have **no image** (pure text in the table)
- Only diagram-heavy questions (e.g. Geometry & Measures, some Statistics) get `image_url` + an SVG uploaded to the `questions` bucket

## What you must provide

- `SUPABASE_URL` (your project URL)
- `SUPABASE_SERVICE_ROLE_KEY` (service role key)

Security:
- Do **not** commit keys to git.
- If you ever paste a service role key anywhere public, rotate it immediately in Supabase.

## Assumptions (matches your app)

- Storage bucket name: `questions` (public)
- `exam_questions.question_type` is used as **topic** (e.g. `Number`, `Algebra`, ...)
- `exam_questions.tier` values are `Foundation Tier` / `Higher Tier`
- `exam_questions.calculator` values are `Calculator` / `Non-Calculator`
- `exam_questions.track` values are `gcse` / `11plus`
- 11+ rows should use `tier='11+ Standard'` and `calculator='Non-Calculator'`
- MCQ options should be exactly 4 total (`correct_answer` + 3 distinct `wrong_answers`)
- `wrong_answers` should use PostgreSQL array-literal formatting: `{"A","B","C"}`
- Avoid simple-number LaTeX in text fields (`2-digit` not `$2$-digit`)

## Explanation format for generated questions

Use this structure for every `explanation` string:

```text
Step 1: ...
Step 2: ...
Tip: ...
```

Line breaks can be real newlines, `\\n`, or `<br>`.

## One-command usage

Generate only (no Supabase calls):

```bash
python3 supabase/import/pump_questions.py --tier foundation --count 2000
```

Disable images completely:

```bash
python3 supabase/import/pump_questions.py --tier foundation --count 2000 --images none
```

## Wipe everything (questions + generated images) and start over

If you want to delete the current question bank and the generated SVGs from the `questions` bucket:

```bash
export SUPABASE_URL="https://YOURPROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

# Dry run (prints counts)
python3 supabase/import/cleanup_questions_and_images.py --dry-run --prefix generated/

# Actually delete
python3 supabase/import/cleanup_questions_and_images.py --prefix generated/
```

## Recommended: start with 500 questions (250 + 250)

This creates **one combined batch CSV** so it’s easier to manage.

```bash
python3 supabase/import/pump_questions.py --tier foundation --count 250 --images auto --batch-id first_500
python3 supabase/import/pump_questions.py --tier higher --count 250 --images auto --batch-id first_500 --append
```

Then push:

```bash
export SUPABASE_URL="https://YOURPROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

python3 supabase/import/upload_and_insert.py supabase/data/generated/batch_first_500/exam_questions.csv
```

Generate and push (uploads images + inserts rows):

```bash
export SUPABASE_URL="https://YOURPROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

python3 supabase/import/pump_questions.py --tier foundation --count 2000 --push
python3 supabase/import/pump_questions.py --tier higher --count 2000 --push
```

Generate + push WITH images:

```bash
python3 supabase/import/pump_questions.py --tier foundation --count 2000 --push --images all
python3 supabase/import/pump_questions.py --tier higher --count 2000 --push --images all
```

Output is written under:
- `supabase/data/generated/batch_<timestamp>/exam_questions.csv`
- `supabase/data/generated/batch_<timestamp>/images/*.svg`

## If you want to push a pre-generated CSV

```bash
export SUPABASE_URL="https://YOURPROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

python3 supabase/import/upload_and_insert.py supabase/data/generated/<batch>/exam_questions.csv
```
