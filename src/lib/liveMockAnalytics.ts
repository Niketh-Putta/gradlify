import { supabase } from "@/integrations/supabase/client";

import {
  COMBINED_MOCK_EVENT_SLUG,
  combinedMockAnalyticsUrl,
  englishPaperForEvent,
  LEGACY_ENGLISH_ONLY_LIVE_MOCK_SLUG,
} from "@/lib/liveMockCombinedConfig";

/** @deprecated Legacy English-only mock - use combined mock 1 paper slugs instead. */
export const LIVE_MOCK_PAPER_SLUG = LEGACY_ENGLISH_ONLY_LIVE_MOCK_SLUG;

const LIVE_MOCK_QUESTIONS = 60;
const LIVE_MOCK_DURATION = 50;

/** Resume English paper for combined mock 1 (replaces retired English-only session). */
export function buildLiveMockSessionPath(): string {
  const englishSlug = englishPaperForEvent(COMBINED_MOCK_EVENT_SLUG).slug;
  const params = new URLSearchParams({
    track: "11plus",
    subject: "english",
    topics: "Comprehension,SPaG",
    mode: "mock-exam",
    questions: String(LIVE_MOCK_QUESTIONS),
    duration: String(LIVE_MOCK_DURATION),
    liveMockSlug: englishSlug,
  });
  return `/live-mock-exams/session?${params.toString()}`;
}

/** Default analytics URL for live mock results (mock 1 combined). */
export function defaultLiveMockAnalyticsPath(): string {
  return combinedMockAnalyticsUrl(COMBINED_MOCK_EVENT_SLUG, "english");
}

/** Summary JSON from `get_my_live_mock_attempt_summary` - extend as you add fields in SQL. */
export type LiveMockMyAttemptSummary = {
  attempt_id?: string;
  paper_id?: string;
  status?: string;
  submitted_at?: string | null;
  duration_seconds?: number | null;
  question_count?: number;
  answered_count?: number;
  correct_count?: number;
  wrong_count?: number;
  unanswered_count?: number;
  score_percent?: number | null;
  /** Present after migration folds cohort stats into summary RPC. */
  cohort_submitted_count?: number | null;
  cohort_mean_score_percent?: number | null;
  cohort_rank?: number | null;
  cohort_rank_total?: number | null;
  has_submitted_rank?: boolean;
};

export type LiveMockItemAnalysisRow = {
  question_id: string;
  question_number: number | null;
  section_key: string | null;
  question_type: string | null;
  n_responses: number;
  n_correct: number;
  n_wrong: number;
  n_blank: number;
  pct_correct: number | null;
};

export type LiveMockAdminPaperAnalytics = {
  paper_id: string;
  submitted_attempts: number;
  item_analysis: LiveMockItemAnalysisRow[];
};

export type LiveMockPublicCohortSummary = {
  submitted_count: number | null;
  mean_score_percent: number | null;
};

/** From `get_my_live_mock_score_rank` - rank 1 is highest score; total is submitted attempts. */
export type LiveMockScoreRank = {
  rank: number | null;
  total: number;
  has_submitted_rank: boolean;
};

/** Matches JSON saved at submit time via `options_snapshot` on `live_mock_answers`. */
export type LiveMockOptionSnapshot = {
  id: string;
  text: string;
  correct?: boolean;
};

export type LiveMockPassageContext = {
  sectionTitle: string;
  instructions: string | null;
  passageTitle: string | null;
  passageBlocks: { id: string; text: string }[];
};

export type LiveMockAnswerDetail = {
  id: string;
  question_id: string;
  question_number: number | null;
  section_key: string | null;
  question_type: string | null;
  stem_snapshot: string | null;
  selected_option: string | null;
  selected_option_label: string | null;
  correct_option_id: string | null;
  correct_option_label: string | null;
  is_correct: boolean | null;
  /** JSON array of `{ id, text, correct }` at submit time. */
  options_snapshot: unknown;
  /** Question bank explanation (joined in enrich); shown in analytics review modal. */
  explanation?: string | null;
};

export function parseLiveMockOptionsSnapshot(raw: unknown): LiveMockOptionSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: LiveMockOptionSnapshot[] = [];
  for (const o of raw) {
    if (!o || typeof o !== "object") continue;
    const r = o as Record<string, unknown>;
    out.push({
      id: String(r.id ?? ""),
      text: String(r.text ?? ""),
      correct: Boolean(r.correct),
    });
  }
  return out;
}

function parsePassageBlocks(raw: unknown): { id: string; text: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { id: string; text: string }[] = [];
  for (const b of raw) {
    if (!b || typeof b !== "object") continue;
    const r = b as Record<string, unknown>;
    out.push({
      id: String(r.id ?? ""),
      text: String(r.text ?? ""),
    });
  }
  return out;
}

/** Section passage / instructions for comprehension-style questions (via question → section). */
export async function getLiveMockPassageContextForQuestion(
  questionId: string,
): Promise<LiveMockPassageContext | null> {
  const { data: qRow, error: qErr } = await supabase
    .from("live_mock_questions" as never)
    .select("section_id")
    .eq("id", questionId)
    .maybeSingle();

  if (qErr || !qRow) {
    console.error("getLiveMockPassageContextForQuestion question", qErr);
    return null;
  }

  const sectionId = (qRow as { section_id: string }).section_id;

  const { data: sRow, error: sErr } = await supabase
    .from("live_mock_sections" as never)
    .select("title, instructions, passage_title, passage_blocks")
    .eq("id", sectionId)
    .maybeSingle();

  if (sErr || !sRow) {
    console.error("getLiveMockPassageContextForQuestion section", sErr);
    return null;
  }

  const s = sRow as {
    title: string;
    instructions: string | null;
    passage_title: string | null;
    passage_blocks: unknown;
  };

  return {
    sectionTitle: s.title,
    instructions: s.instructions,
    passageTitle: s.passage_title,
    passageBlocks: parsePassageBlocks(s.passage_blocks),
  };
}

/** When snapshots were missing on older rows, show bank stem/options in the review modal. */
export async function getLiveMockQuestionStemOptionsFallback(
  questionId: string,
): Promise<{ stem: string; options: LiveMockOptionSnapshot[]; explanation: string | null } | null> {
  const { data, error } = await supabase
    .from("live_mock_questions" as never)
    .select("stem, options, explanation")
    .eq("id", questionId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { stem: string; options: unknown; explanation?: string | null };
  const exp = row.explanation != null ? String(row.explanation).trim() : "";
  return {
    stem: row.stem,
    options: parseLiveMockOptionsSnapshot(row.options),
    explanation: exp || null,
  };
}

type LiveMockPaperRow = { id: string; title: string; question_count: number };

const liveMockPaperBySlugCache = new Map<string, LiveMockPaperRow>();
const liveMockPaperBySlugInflight = new Map<string, Promise<LiveMockPaperRow | null>>();
const liveMockPaperBySlugFailed = new Set<string>();

export async function getLiveMockPaperBySlug(
  slug: string,
): Promise<LiveMockPaperRow | null> {
  const key = slug.trim();
  if (!key) return null;

  const cached = liveMockPaperBySlugCache.get(key);
  if (cached) return cached;

  const inflight = liveMockPaperBySlugInflight.get(key);
  if (inflight) return inflight;

  const promise = (async (): Promise<LiveMockPaperRow | null> => {
    const { data, error } = await supabase
      .from("live_mock_papers" as never)
      .select("id, title, question_count")
      .eq("slug", key)
      .maybeSingle();

    if (error || !data) {
      if (!liveMockPaperBySlugFailed.has(key)) {
        liveMockPaperBySlugFailed.add(key);
        console.error("getLiveMockPaperBySlug", error);
      }
      return null;
    }

    const row = data as LiveMockPaperRow;
    liveMockPaperBySlugCache.set(key, row);
    return row;
  })();

  liveMockPaperBySlugInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    liveMockPaperBySlugInflight.delete(key);
  }
}

export async function getMyLiveMockAnswerDetails(attemptId: string): Promise<LiveMockAnswerDetail[]> {
  const { data, error } = await supabase
    .from("live_mock_answers" as never)
    .select(
      "id, question_id, question_number, section_key, question_type, stem_snapshot, selected_option, selected_option_label, correct_option_id, correct_option_label, is_correct, options_snapshot",
    )
    .eq("attempt_id", attemptId)
    .order("question_number", { ascending: true });

  if (error) {
    console.error("getMyLiveMockAnswerDetails", error);
    return [];
  }

  return (data as LiveMockAnswerDetail[]) ?? [];
}

/** Fill missing display fields from `options_snapshot` + question bank (older submits lacked denormalised columns). */
function snapshotDerivedLabels(row: LiveMockAnswerDetail): Partial<LiveMockAnswerDetail> {
  const opts = parseLiveMockOptionsSnapshot(row.options_snapshot);
  const out: Partial<LiveMockAnswerDetail> = {};
  if (!row.correct_option_label?.trim()) {
    const c = opts.find((o) => o.correct) ?? opts.find((o) => o.id === row.correct_option_id);
    if (c?.text?.trim()) out.correct_option_label = c.text.trim();
  }
  if (!row.selected_option_label?.trim() && row.selected_option) {
    const s = opts.find((o) => o.id === row.selected_option);
    if (s?.text?.trim()) out.selected_option_label = s.text.trim();
  }
  return out;
}

/** When snapshot/columns omit correct flags, use authoritative `live_mock_questions.correct_answer` + bank `options`. */
function deriveLabelsFromQuestionBank(
  row: LiveMockAnswerDetail,
  bank: { correct_answer?: string | null; options?: unknown },
): Partial<LiveMockAnswerDetail> {
  const opts = parseLiveMockOptionsSnapshot(bank.options);
  if (opts.length === 0) return {};

  const out: Partial<LiveMockAnswerDetail> = {};
  const needCorrectLabel = !row.correct_option_label?.trim();
  const needCorrectId = !row.correct_option_id?.trim();

  if (needCorrectLabel || needCorrectId) {
    const letter = bank.correct_answer != null ? String(bank.correct_answer).trim() : "";
    let c = letter ? opts.find((o) => o.id === letter) : undefined;
    if (!c) c = opts.find((o) => o.correct);
    if (c) {
      if (needCorrectLabel && c.text?.trim()) out.correct_option_label = c.text.trim();
      if (needCorrectId && c.id) out.correct_option_id = c.id;
    }
  }

  if (!row.selected_option_label?.trim() && row.selected_option) {
    const s = opts.find((o) => o.id === row.selected_option);
    if (s?.text?.trim()) out.selected_option_label = s.text.trim();
  }

  return out;
}

export async function enrichLiveMockAnswerDetails(
  rows: LiveMockAnswerDetail[],
): Promise<LiveMockAnswerDetail[]> {
  if (rows.length === 0) return rows;

  const ids = [...new Set(rows.map((r) => r.question_id).filter(Boolean))];
  type QRow = {
    id: string;
    question_number: number | null;
    question_type: string | null;
    section_id: string;
    stem: string | null;
    explanation: string | null;
    correct_answer: string | null;
    options: unknown;
  };
  let qMeta: QRow[] = [];
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("live_mock_questions" as never)
      .select("id, question_number, question_type, section_id, stem, explanation, correct_answer, options")
      .in("id", ids);
    if (error) console.error("enrichLiveMockAnswerDetails questions", error);
    else qMeta = (data as QRow[]) ?? [];
  }

  const qMap = new Map(qMeta.map((q) => [q.id, q]));
  const sectionIds = [...new Set(qMeta.map((q) => q.section_id).filter(Boolean))];
  type SRow = { id: string; section_key: string };
  let sections: SRow[] = [];
  if (sectionIds.length > 0) {
    const { data, error } = await supabase
      .from("live_mock_sections" as never)
      .select("id, section_key")
      .in("id", sectionIds);
    if (error) console.error("enrichLiveMockAnswerDetails sections", error);
    else sections = (data as SRow[]) ?? [];
  }
  const secMap = new Map(sections.map((s) => [s.id, s.section_key]));

  const enriched = rows.map((row) => {
    const snap = snapshotDerivedLabels(row);
    let next: LiveMockAnswerDetail = { ...row, ...snap };
    const q = qMap.get(row.question_id);
    if (q) {
      if (next.question_number == null && q.question_number != null) {
        next = { ...next, question_number: q.question_number };
      }
      if (!(next.question_type || "").trim() && q.question_type) {
        next = { ...next, question_type: q.question_type };
      }
      if (!(next.section_key || "").trim() && q.section_id) {
        const sk = secMap.get(q.section_id);
        if (sk) next = { ...next, section_key: sk };
      }
      const stem = q.stem?.trim();
      if (stem && !(next.stem_snapshot || "").trim()) {
        next = { ...next, stem_snapshot: stem };
      }
      const exp = q.explanation?.trim();
      if (exp && !(next.explanation || "").trim()) {
        next = { ...next, explanation: exp };
      }
      const bankPatch = deriveLabelsFromQuestionBank(next, q);
      next = { ...next, ...bankPatch };
    }

    if (next.is_correct == null && next.selected_option) {
      if (next.correct_option_id) {
        next = { ...next, is_correct: next.selected_option === next.correct_option_id };
      } else {
        const opts = parseLiveMockOptionsSnapshot(next.options_snapshot);
        const correctFromSnap = opts.find((o) => o.correct);
        if (correctFromSnap) {
          next = {
            ...next,
            is_correct: next.selected_option === correctFromSnap.id,
            correct_option_id: next.correct_option_id || correctFromSnap.id,
            correct_option_label: next.correct_option_label || correctFromSnap.text,
          };
        }
      }
    }

    return next;
  });

  return enriched.sort((a, b) => {
    const an = a.question_number ?? 999999;
    const bn = b.question_number ?? 999999;
    return an - bn;
  });
}

export async function getLiveMockPublicCohortSummary(
  paperId: string,
): Promise<LiveMockPublicCohortSummary | null> {
  const { data, error } = await supabase.rpc("get_live_mock_public_cohort_summary", {
    p_paper_id: paperId,
  });

  if (error) {
    console.error("get_live_mock_public_cohort_summary", error);
    return null;
  }

  const row = data as LiveMockPublicCohortSummary | null;
  return row ?? null;
}

/** Build cohort tile data from extended attempt summary (fallback when cohort RPC fails). */
export function cohortSummaryFromAttemptSummary(
  sum: LiveMockMyAttemptSummary | null,
): LiveMockPublicCohortSummary | null {
  if (!sum) return null;
  const embedded =
    sum.cohort_submitted_count !== undefined || sum.cohort_mean_score_percent !== undefined;
  if (!embedded) return null;
  return {
    submitted_count: sum.cohort_submitted_count ?? null,
    mean_score_percent: sum.cohort_mean_score_percent ?? null,
  };
}

/** Build placement from extended attempt summary (fallback when rank RPC fails). */
export function scoreRankFromAttemptSummary(sum: LiveMockMyAttemptSummary | null): LiveMockScoreRank | null {
  if (!sum) return null;
  const embedded =
    sum.cohort_rank_total !== undefined ||
    sum.has_submitted_rank !== undefined ||
    sum.cohort_rank !== undefined;
  if (!embedded) return null;
  return {
    rank: sum.cohort_rank ?? null,
    total: sum.cohort_rank_total ?? 0,
    has_submitted_rank: Boolean(sum.has_submitted_rank),
  };
}

/** Placement among submitted attempts (rank 1 = top); refreshes with cohort data. */
export async function getMyLiveMockScoreRank(paperId: string): Promise<LiveMockScoreRank | null> {
  const { data, error } = await supabase.rpc("get_my_live_mock_score_rank", {
    p_paper_id: paperId,
  });

  if (error) {
    console.error("get_my_live_mock_score_rank", error);
    return null;
  }

  if (data == null) return null;
  const row = data as LiveMockScoreRank;
  return row;
}

/** Caller’s own attempt rollup for a paper (RLS enforces ownership). */
export async function getMyLiveMockAttemptSummary(
  paperId: string,
): Promise<LiveMockMyAttemptSummary | null> {
  const { data, error } = await supabase.rpc("get_my_live_mock_attempt_summary", {
    p_paper_id: paperId,
  });

  if (error) {
    console.error("get_my_live_mock_attempt_summary", error);
    return null;
  }

  return (data as LiveMockMyAttemptSummary | null) ?? null;
}

/** Admin-only cohort + item stats; throws `Forbidden` from Postgres if not admin. */
export async function getAdminLiveMockPaperAnalytics(
  paperId: string,
): Promise<LiveMockAdminPaperAnalytics | null> {
  const { data, error } = await supabase.rpc("admin_live_mock_paper_analytics", {
    p_paper_id: paperId,
  });

  if (error) {
    console.error("admin_live_mock_paper_analytics", error);
    return null;
  }

  return data as LiveMockAdminPaperAnalytics | null;
}
