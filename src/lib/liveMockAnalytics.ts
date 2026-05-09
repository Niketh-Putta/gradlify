import { supabase } from "@/integrations/supabase/client";

/** Summary JSON from `get_my_live_mock_attempt_summary` — extend as you add fields in SQL. */
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
