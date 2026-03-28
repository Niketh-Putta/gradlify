# Challenge Questions Format

Use `public.extreme_questions` for Challenge mode content (both GCSE and 11+).

## Table schema for supplied rows

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | No | Auto-generated if omitted. |
| `track` | `user_track` | Yes | Must be `gcse` or `11plus`. |
| `question` | `text` | Yes | Full prompt. Can include LaTeX. |
| `correct_answer` | `text` | Yes | Single correct option value. |
| `wrong_answers` | `text[]` | Yes | Exactly 4 unique wrong options. |
| `all_answers` | `text[]` | Yes | Exactly 5 unique options including `correct_answer`. |
| `explanation` | `text` | Yes | Step-by-step + final line: `Final answer: ...`. |
| `explain_on` | `text` | No | Default is `always`. |
| `image_url` | `text` | No | Optional diagram/image path or URL. |
| `image_alt` | `text` | No | Accessibility alt text when image is present. |
| `created_at` | `timestamp` | No | Auto-generated. |

## Option rules

- Keep options unique after trimming spaces/case.
- Ensure `wrong_answers` does not contain the correct answer.
- Keep all 5 options plausible and close to the target skill.
- Avoid placeholders such as `N/A`, `TBD`, `None`.

## Explanation rules

- Include at least 2 clear steps.
- End with one final line in this format: `Final answer: <value>`.
- Keep language concise and student-friendly.

## Import template

Use:

- `supabase/data/extreme_questions_import_template.csv`

Array fields in CSV should use Postgres array syntax, for example:

- `{"A","B","C","D"}`
- `{"A","B","C","D","E"}`

