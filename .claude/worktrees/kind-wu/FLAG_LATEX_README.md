# Flag Broken LaTeX Questions

## How to Use

1. Open the browser console (F12)
2. Run the following command:
   ```javascript
   await window.flagBrokenLatex()
   ```
3. Wait for the scan to complete
4. The function will:
   - Scan all `exam_questions` where `needs_fix = false`
   - Detect broken LaTeX patterns
   - Flag rows with `needs_fix = true`
   - Return summary with count and sample IDs

## Patterns Detected

- `\frac` without proper braces
- `\sqrt` without complete braces (e.g., `\sqrt5`)
- Backslashes followed by digits (e.g., `\73`)
- Double dollar signs (`$$`)
- Unmatched braces `{` and `}`
- Dollar signs in answer options
- Any LaTeX notation in answer options (answers should be plain text)

## Output Example

```json
{
  "flagged_count": 74,
  "sample_ids": [
    "cde84703-5138-4b9f-8615-8db5d6585596",
    "a71ba202-c4f2-4c1f-9167-838adbf8536b",
    "922eacda-3cba-4500-a062-34f7e301bc00",
    "526ad999-68be-4610-83d8-4b5bb95b4a11",
    "d88b8b47-49fd-41b5-ae05-1d8d1a156198"
  ]
}
```

## Important

- This ONLY flags rows, it does NOT modify content
- Questions with clean LaTeX are ignored
- Already flagged rows (`needs_fix = true`) are skipped
