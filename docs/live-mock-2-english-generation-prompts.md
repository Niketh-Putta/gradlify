# Mock 2 English  -  AI generation prompts

Send these as **two separate chats** (Prompt 1 first, then Prompt 2).  
Target: **Gradlify Live Mock 2 English**  -  same style as Mock 1, **100% new content**.

After generation, save outputs as:
- `docs/live-mock-2-english-comprehension.json` (Prompt 1)
- `docs/live-mock-2-english-spag.json` (Prompt 2)

Then merge into one file or import separately.

---

## PROMPT 1  -  Comprehension (Questions 1 - 30)

Copy everything inside the box below:

```
You are an expert 11+ selective-school English exam author writing for Gradlify (UK grammar/independent school entrance, age 10 - 11).

TASK
Write the COMPREHENSION HALF of "11+ maths and english mock 2"  -  exactly 30 multiple-choice questions in TWO sections:
• Section 1: Fiction comprehension  -  questions 1 - 15
• Section 2: Non-fiction comprehension  -  questions 16 - 30

This must match the STYLE, DIFFICULTY, and FORMAT of a premium UK 11+ live mock (same calibre as GL/CEM-style selective exams), but the content must be COMPLETELY ORIGINAL.

DO NOT reuse, paraphrase closely, or echo Mock 1 content:
• No gothic manor / Yorkshire moors / Uncle Alistair / Blackwood
• No Roman aqueducts / chorobates / castellum aquae / Pont du Gard
• No deep-sea trench / museum heist themes from Mock 1 SPaG either

Pick fresh topics, e.g.:
• Fiction: Arctic expedition, lighthouse keeper, wartime evacuee, space colony, archaeological dig  -  your choice, but vivid and age-appropriate
• Non-fiction: Victorian railways, honeybees, weather forecasting, printing press, coral reefs  -  factual, informative, not fiction

PAPER METADATA (include in JSON)
• slug: both_subjects_english_mock_2
• title: 11+ English
• track: 11plus
• subject: english
• duration_minutes: 50 (whole paper; this output is only the first 30 questions)
• calculator: non-calculator

SECTION RULES
Each comprehension section must include:
1. section_order (1 then 2)
2. section_key: "fiction_comprehension" then "nonfiction_comprehension"
3. title: "Section 1: Fiction Comprehension" / "Section 2: Non-Fiction Comprehension"
4. instructions: "Read the passage carefully, then answer questions 1 to 15." (or 16 to 30)
5. passage_title: a short, exam-style title
6. passage_blocks: exactly 3 paragraphs as JSON array:
   [{ "id": "p1-1", "text": "..." }, { "id": "p1-2", "text": "..." }, { "id": "p1-3", "text": "..." }]
   Use p1-* ids for fiction and p2-* ids for non-fiction.
7. Total passage length per section: roughly 450 - 650 words (3 substantial paragraphs, Mock 1 scale)

QUESTION RULES (both sections)
• Exactly 15 questions per section, numbered 1 - 15 and 16 - 30 globally
• question_type: "comprehension"
• topic: "English"
• subtopic: use one of: vocabulary_in_context | inference | evidence | literary_device | tone | author_technique | fact_retrieval | calculation
• difficulty: integer 1 (easier), 2 (standard 11+), or 3 (stretch)  -  mix roughly 4× L1, 8× L2, 3× L3 per section
• stem: one clear question; comprehension only  -  every answer must be provable from the passage
• options: exactly 5 (A - E), ONE correct
• correct_answer: single letter A - E matching the correct option id
• explanation: 2 - 4 sentences. State why the correct answer fits AND why the strongest wrong answer is a trap. End with "Final answer: [letter]  -  [text]."
• trap field on each wrong option: short note on the mistake (null on correct option)

Question-type mix PER SECTION (15 questions each):
• 3 vocabulary in context (synonym or closest meaning  -  word must appear in passage)
• 2 literary device / author technique (simile, metaphor, personification, alliteration, foreshadowing, etc.)
• 3 inference / implication ("What does the passage suggest/imply…")
• 2 evidence retrieval ("Which phrase best shows…" / "According to the passage…")
• 1 tone or mood
• 1 structure / shift ("What major change occurs…")
• 1 author word choice ("Why does the author use X instead of Y…")
• 1 fact retrieval (non-fiction) OR narrative detail (fiction)
• 1 multi-step reasoning or light calculation (non-fiction only, e.g. convert units, scale a rate, simple percentage  -  must be fully solvable from the text)

Distractor quality
• Wrong options must be plausible (same part of speech for vocab; same category for facts)
• Never make two options nearly identical
• Never use "All of the above" / "None of the above"

OUTPUT FORMAT
Return ONLY valid JSON (no markdown fences, no commentary before or after). Use this exact top-level shape:

{
  "paper": {
    "slug": "both_subjects_english_mock_2",
    "title": "11+ English",
    "track": "11plus",
    "subject": "english",
    "duration_minutes": 50,
    "question_count": 60,
    "calculator": "non-calculator"
  },
  "sections": [
    {
      "section_order": 1,
      "section_key": "fiction_comprehension",
      "title": "Section 1: Fiction Comprehension",
      "instructions": "Read the passage carefully, then answer questions 1 to 15.",
      "passage_title": "...",
      "passage_blocks": [ ... ],
      "questions": [
        {
          "question_number": 1,
          "question_type": "comprehension",
          "topic": "English",
          "subtopic": "vocabulary_in_context",
          "difficulty": 2,
          "stem": "...",
          "options": [
            { "id": "A", "text": "...", "correct": false, "trap": "..." },
            { "id": "B", "text": "...", "correct": true, "trap": null },
            { "id": "C", "text": "...", "correct": false, "trap": "..." },
            { "id": "D", "text": "...", "correct": false, "trap": "..." },
            { "id": "E", "text": "...", "correct": false, "trap": "..." }
          ],
          "correct_answer": "B",
          "explanation": "..."
        }
      ]
    },
    {
      "section_order": 2,
      "section_key": "nonfiction_comprehension",
      "title": "Section 2: Non-Fiction Comprehension",
      "instructions": "Read the passage carefully, then answer questions 16 to 30.",
      "passage_title": "...",
      "passage_blocks": [ ... ],
      "questions": [ ... questions 16 - 30 ... ]
    }
  ]
}

SELF-CHECK before output
☐ 30 questions total, numbered 1 - 30 with no gaps or duplicates
☐ Exactly one correct option per question; correct_answer matches
☐ All fiction answers from section 1 passage only; all non-fiction from section 2 only
☐ British English spelling (colour, metres, practise as verb, etc.)
☐ No em dashes in student-facing text (use commas or full stops)
☐ JSON parses without errors; no trailing commas
```

---

## PROMPT 2  -  SPaG (Questions 31 - 60)

Copy everything inside the box below:

```
You are an expert 11+ selective-school English exam author writing for Gradlify (UK grammar/independent school entrance, age 10 - 11).

TASK
Write the SPaG HALF of "11+ maths and english mock 2"  -  exactly 30 multiple-choice questions in THREE sections:
• Section 3: Applied Spelling  -  questions 31 - 40 (10 questions)
• Section 4: Applied Punctuation  -  questions 41 - 50 (10 questions)
• Section 5: Applied Grammar  -  questions 51 - 60 (10 questions)

Match the STYLE and FORMAT of Gradlify Mock 1 (premium UK 11+ live mock), but use COMPLETELY NEW sentences and themes.

DO NOT reuse Mock 1 content:
• No abyssal trench / bathyscaphe / bioluminescent deep-sea sentences
• No midnight museum heist / Phantom Falcon sentences
• No Blackwood / aqueduct themes

Use one fresh thematic wrapper per SPaG section (title only  -  questions are standalone):
• Spelling theme example: "The Highland Wildlife Survey" (or similar)
• Punctuation theme example: "The School Science Fair" (or similar)
• Grammar: title "Sentence Completion"  -  no story passage needed

PAPER METADATA (include in JSON  -  same paper as comprehension half)
• slug: both_subjects_english_mock_2
• title: 11+ English
• track: 11plus
• subject: english
• duration_minutes: 50
• question_count: 60

SECTION RULES

SECTION 3  -  SPELLING (Q31 - 40)
• section_order: 3
• section_key: "spelling"
• title: "Section 3: Applied Spelling"
• instructions: "In each sentence, choose the fragment that contains a spelling mistake. If every fragment is spelled correctly, choose No error."
• passage_title: themed title (NOT used as a reading passage  -  decorative like Mock 1)
• passage_blocks: one block repeating the instruction:
  [{ "id": "sp1", "text": "In each sentence below, one fragment may contain a spelling mistake. Read all four fragments (A to D) and choose the one with the error. If every fragment is spelled correctly, choose No error." }]
• question_type: "spelling"
• stem format: ONE sentence split into four labelled fragments:
  "(A) ... (B) ... (C) ... (D) ..."
  Each fragment must be a grammatical part of one continuous sentence (Mock 1 style).
• options: ALWAYS exactly:
  A = "Fragment A", B = "Fragment B", C = "Fragment C", D = "Fragment D", E = "No error"
• correct_answer: the letter of the fragment WITH the misspelling, OR "E" if all correct
• Distribution: exactly 3× "No error" (E correct) and 7× real spelling errors across A - D (spread errors evenly  -  not always B)
• Errors must be realistic 11+ traps: -tion/-sion, double letters, -able/-ible, -ence/-ance, silent letters, ie/ei, -ous/-ious, missing middle syllables
• difficulty: 2 for most, one 1 and one 3
• explanation: name the wrong word, give correct spelling, explain the trap

SECTION 4  -  PUNCTUATION (Q41 - 50)
• section_order: 4
• section_key: "punctuation"
• title: "Section 4: Applied Punctuation"
• instructions: "In each sentence, choose the fragment that contains a punctuation error. If the punctuation is fully correct, choose No error."
• passage_title: themed title
• passage_blocks: one instruction block (id "sp2")
• question_type: "punctuation"
• Same stem fragment format (A) - (D) and same five options as spelling
• Distribution: exactly 3× "No error" and 7× errors
• Test only ONE punctuation issue per question. Use 11+ level rules:
   -  commas after fronted adverbials / intro phrases
   -  commas around embedded clauses (parenthesis)
   -  speech marks and comma before reporting clause
   -  question mark inside speech marks
   -  comma splice / semicolon before however, nevertheless
   -  colon before a list or quotation
   -  apostrophe errors (its/it's, plural vs possessive)
   -  semicolon misused where comma needed
• Do NOT test spelling in this section (only punctuation)

SECTION 5  -  GRAMMAR (Q51 - 60)
• section_order: 5
• section_key: "grammar"
• title: "Section 5: Applied Grammar"
• instructions: "Choose the option that correctly completes each sentence in standard written English."
• passage_title: "Sentence Completion"
• passage_blocks: one instruction block (id "sp3")
• question_type: "grammar"
• stem: one sentence with a blank "____" (single blank only)
• options: five word/phrase choices (A - E)  -  NOT "Fragment A" style
• difficulty mix: standard 11+ grammar
• Cover ALL of these across the 10 questions (one each, no duplicates):
  1. objective pronoun after preposition (I/me, who/whom)
  2. neither/either + singular verb
  3. relative pronoun who vs which
  4. conditional: If I ___ , I would...
  5. irregular past participle (e.g. flow/flowed not flown)
  6. adverb after verb (smoothly not smooth)
  7. subject - verb agreement (box of pencils IS...)
  8. fewer vs less
  9. parallel past tense in a list
  10. either...or verb agrees with nearest subject

COMMON FIELDS (all 30 questions)
• topic: "English"
• subtopic: "spelling" | "punctuation" | "grammar"
• correct_answer: single letter
• explanation: 2 - 3 sentences + "Final answer: [letter]  -  [text]."
• trap on wrong options where helpful

OUTPUT FORMAT
Return ONLY valid JSON (no markdown fences, no commentary). Top-level shape:

{
  "paper": {
    "slug": "both_subjects_english_mock_2",
    "title": "11+ English",
    "track": "11plus",
    "subject": "english",
    "duration_minutes": 50,
    "question_count": 60,
    "calculator": "non-calculator"
  },
  "sections": [
    {
      "section_order": 3,
      "section_key": "spelling",
      "title": "Section 3: Applied Spelling",
      "instructions": "...",
      "passage_title": "...",
      "passage_blocks": [ ... ],
      "questions": [ ... Q31 - 40 ... ]
    },
    {
      "section_order": 4,
      "section_key": "punctuation",
      ...
      "questions": [ ... Q41 - 50 ... ]
    },
    {
      "section_order": 5,
      "section_key": "grammar",
      ...
      "questions": [ ... Q51 - 60 ... ]
    }
  ]
}

SELF-CHECK before output
☐ 30 questions numbered 31 - 60, no gaps
☐ Spelling: 3× E correct, 7× misspellings; Punctuation: 3× E correct, 7× errors
☐ Grammar: 10 distinct grammar skills listed above
☐ Every spelling/punctuation stem has exactly four fragments (A) - (D)
☐ British English; no em dashes
☐ JSON valid; correct_answer matches exactly one option with "correct": true
```

---

## After both prompts  -  merge checklist

1. Paste Prompt 1 output → save as `docs/live-mock-2-english-comprehension.json`
2. Paste Prompt 2 output → save as `docs/live-mock-2-english-spag.json`
3. Verify global numbering 1 - 60 with no overlap
4. Run QA pass (same as maths): one correct answer each, explanations match, no Mock 1 duplicate themes
5. Import to Supabase slug `both_subjects_english_mock_2` (mirror maths import script when ready)

## Mock 1 reference (structure only  -  do not copy content)

| Section | Key | Questions |
|---------|-----|-----------|
| Fiction | `fiction_comprehension` | 1 - 15 |
| Non-fiction | `nonfiction_comprehension` | 16 - 30 |
| Spelling | `spelling` | 31 - 40 |
| Punctuation | `punctuation` | 41 - 50 |
| Grammar | `grammar` | 51 - 60 |

**Total:** 60 questions · 50 minutes · A - E (comprehension + grammar) · A - D + "No error" (spelling + punctuation)
