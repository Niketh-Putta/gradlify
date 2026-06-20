/**
 * Single source of truth for the combined 11+ live mock (Maths + break + English).
 *
 * STRUCTURE ONLY — question content is added later. Section names/counts are
 * placeholders that can change once the real papers are finalised, but the
 * totals here drive the local prototype, the (future) Supabase seed, and the
 * authoritative timers, so keep them consistent everywhere by importing from
 * this file rather than hardcoding numbers.
 */

export const COMBINED_MOCK_EVENT_SLUG = "both_subjects_live_mock";

/** User-facing name for the combined live mock everywhere in the app. */
export const COMBINED_MOCK_DISPLAY_TITLE = "11+ maths and english mock 1";

/** Sitting the mock: anyone with a registration row (fixed-price or Premium). */
export const COMBINED_MOCK_ACCESS_RULE = "registered" as const;

/**
 * Scheduled go-live. Until this instant the `/live-mock-exams` page stays exactly
 * as it is today; the moment it passes, the page flips to the combined Maths +
 * English mock for everyone. UK is on BST (UTC+1) in June, so 3:58pm UK time is
 * written with the explicit +01:00 offset to avoid any timezone ambiguity.
 */
export const COMBINED_MOCK_RELEASE_AT = new Date("2026-06-14T15:58:00+01:00");

/** True once the combined mock has gone live (defaults to the current time). */
export const isCombinedMockReleased = (now: Date = new Date()): boolean =>
  now.getTime() >= COMBINED_MOCK_RELEASE_AT.getTime();

/* ───────────────────────────────────────────────────────────────────────────
 * SECOND COMBINED MOCK ("mock 2")
 *
 * Additive and fully isolated from mock 1: its own slug so registrations,
 * payments and signups never touch mock 1's data, scoring or saved scores.
 * Mock 2 is live; papers are seeded in Supabase as
 * `both_subjects_maths_mock_2` and `both_subjects_english_mock_2`.
 * ─────────────────────────────────────────────────────────────────────────── */

export const SECOND_MOCK_EVENT_SLUG = "both_subjects_live_mock_2";

/** User-facing name for the second combined live mock. */
export const SECOND_MOCK_DISPLAY_TITLE = "11+ maths and english mock 2";

/**
 * Mock 2 go-live: Sunday 14 June 2026, 10:00am UK (BST). Live for all registered
 * students on `/live-mock-exams/local-preview2/sit`.
 */
export const SECOND_MOCK_RELEASE_AT = new Date("2026-06-14T10:00:00+01:00");

/** User-facing release schedule, e.g. "Sunday at 10am". */
export const formatSecondMockReleaseSchedule = (
  date: Date = SECOND_MOCK_RELEASE_AT,
): string => {
  const weekday = date.toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "Europe/London",
  });
  const time = date
    .toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Europe/London",
    })
    .replace(":00", "")
    .replace(/\s/g, "")
    .toLowerCase();
  return `${weekday} at ${time}`;
};

export const SECOND_MOCK_RELEASE_SCHEDULE = formatSecondMockReleaseSchedule();

/** True once the second mock has gone live (defaults to the current time). */
export const isSecondMockReleased = (now: Date = new Date()): boolean =>
  now.getTime() >= SECOND_MOCK_RELEASE_AT.getTime();

export type MockPhase = "instructions" | "maths" | "break" | "english" | "complete";

/** Ordered timed phases the student moves through. */
export const TIMED_PHASES = ["maths", "break", "english"] as const;
export type TimedPhase = (typeof TIMED_PHASES)[number];

export type MockSection = {
  /** Stable key used for question grouping and (future) Supabase section rows. */
  key: string;
  /** Human label shown in the UI. */
  title: string;
  /** Number of questions in this section. */
  count: number;
};

export type MockPaper = {
  /** Stable slug for the Supabase paper row. */
  slug: string;
  subject: "maths" | "english";
  title: string;
  durationMinutes: number;
  sections: MockSection[];
};

/**
 * Maths paper. Section keys/titles mirror the seeded `live_mock_sections`
 * rows for `both_subjects_maths` (4 x 15 = 60); only the 60 total and the
 * 50-minute timer are locked.
 */
const MATHS_PAPER_SECTIONS: MockSection[] = [
  { key: "maths_number_calc", title: "Number, calculation & algebra", count: 15 },
  { key: "maths_measures_data", title: "Measures, rates & data", count: 15 },
  { key: "maths_ratio_geometry", title: "Ratio, geometry & logic", count: 15 },
  { key: "maths_problem_solving", title: "Mixed problem solving", count: 15 },
];

/** Mock 1 maths paper (`both_subjects_live_mock`). */
export const MATHS_PAPER: MockPaper = {
  slug: "both_subjects_maths",
  subject: "maths",
  title: "11+ Maths",
  durationMinutes: 50,
  sections: MATHS_PAPER_SECTIONS,
};

/**
 * Mock 2 maths paper (`both_subjects_live_mock_2`). Content lives in
 * `docs/live-mock-2-maths-paper.json` — QA-approved, imported to Supabase.
 */
export const MATHS_PAPER_MOCK2: MockPaper = {
  slug: "both_subjects_maths_mock_2",
  subject: "maths",
  title: "11+ Maths",
  durationMinutes: 50,
  sections: MATHS_PAPER_SECTIONS,
};

/** Returns the maths paper config for a combined mock event slug. */
export const mathsPaperForEvent = (eventSlug: string): MockPaper =>
  eventSlug === SECOND_MOCK_EVENT_SLUG ? MATHS_PAPER_MOCK2 : MATHS_PAPER;

const ENGLISH_PAPER_SECTIONS: MockSection[] = [
  { key: "fiction_comprehension", title: "Fiction comprehension", count: 15 },
  { key: "nonfiction_comprehension", title: "Non-fiction comprehension", count: 15 },
  { key: "spelling", title: "Spelling", count: 10 },
  { key: "punctuation", title: "Punctuation", count: 10 },
  { key: "grammar", title: "Grammar", count: 10 },
];

/**
 * English paper. Section keys mirror Supabase `live_mock_sections.section_key`
 * rows (15 / 15 / 10 / 10 / 10 = 60).
 */
export const ENGLISH_PAPER: MockPaper = {
  slug: "both_subjects_english",
  subject: "english",
  title: "11+ English",
  durationMinutes: 50,
  sections: ENGLISH_PAPER_SECTIONS,
};

/** Mock 2 English paper (`both_subjects_live_mock_2`). */
export const ENGLISH_PAPER_MOCK2: MockPaper = {
  slug: "both_subjects_english_mock_2",
  subject: "english",
  title: "11+ English",
  durationMinutes: 50,
  sections: ENGLISH_PAPER_SECTIONS,
};

/** Returns the English paper config for a combined mock event slug. */
export const englishPaperForEvent = (eventSlug: string): MockPaper =>
  eventSlug === SECOND_MOCK_EVENT_SLUG ? ENGLISH_PAPER_MOCK2 : ENGLISH_PAPER;

export const isSecondMockEvent = (eventSlug: string): boolean =>
  eventSlug === SECOND_MOCK_EVENT_SLUG;

/** User-facing title for a combined mock event (mock 1 vs mock 2). */
export const combinedMockDisplayTitleForEvent = (eventSlug: string): string =>
  isSecondMockEvent(eventSlug) ? SECOND_MOCK_DISPLAY_TITLE : COMBINED_MOCK_DISPLAY_TITLE;

/** Registration / info lobby path for a combined mock event. */
export const combinedMockLobbyPathForEvent = (eventSlug: string): string =>
  isSecondMockEvent(eventSlug) ? "/live-mock-exams/local-preview2" : "/live-mock-exams/local-preview";

/** Timed sitting route for a combined mock event. */
export const combinedMockSitPathForEvent = (eventSlug: string): string =>
  `${combinedMockLobbyPathForEvent(eventSlug)}/sit`;

/** Analytics URL scoped to one combined mock event (never mixes mock 1 and mock 2). */
export const combinedMockAnalyticsUrl = (
  eventSlug: string,
  subject: "maths" | "english" = "english",
): string =>
  `/live-mock-exams/analytics?combined=1&subject=${subject}&mock=${encodeURIComponent(eventSlug)}`;

/** Paper slugs for combined mock analytics / session routing. */
export const combinedPaperSlugsForEvent = (eventSlug: string) => ({
  maths: mathsPaperForEvent(eventSlug).slug,
  english: englishPaperForEvent(eventSlug).slug,
});

/** Mandatory break between the two papers. No questions, no answers. */
export const BREAK_MINUTES = 15;

const MINUTE = 60;

export const paperQuestionCount = (paper: MockPaper) =>
  paper.sections.reduce((total, section) => total + section.count, 0);

export const paperSeconds = (paper: MockPaper) => paper.durationMinutes * MINUTE;

export const BREAK_SECONDS = BREAK_MINUTES * MINUTE;

export const MATHS_QUESTION_COUNT = paperQuestionCount(MATHS_PAPER);
export const ENGLISH_QUESTION_COUNT = paperQuestionCount(ENGLISH_PAPER);
export const TOTAL_QUESTION_COUNT = MATHS_QUESTION_COUNT + ENGLISH_QUESTION_COUNT;

export const TOTAL_DURATION_SECONDS =
  paperSeconds(MATHS_PAPER) + BREAK_SECONDS + paperSeconds(ENGLISH_PAPER);

/** Returns the section a 1-indexed question number falls into for a paper. */
export const sectionForQuestion = (paper: MockPaper, questionNumber: number): MockSection | null => {
  let cursor = 0;
  for (const section of paper.sections) {
    cursor += section.count;
    if (questionNumber <= cursor) return section;
  }
  return null;
};

/** Dev-time guard so section counts never silently drift from the locked totals. */
if (import.meta.env.DEV) {
  if (MATHS_QUESTION_COUNT !== 60) {
    console.warn(`[liveMockCombinedConfig] Maths sections total ${MATHS_QUESTION_COUNT}, expected 60.`);
  }
  if (ENGLISH_QUESTION_COUNT !== 60) {
    console.warn(`[liveMockCombinedConfig] English sections total ${ENGLISH_QUESTION_COUNT}, expected 60.`);
  }
}
