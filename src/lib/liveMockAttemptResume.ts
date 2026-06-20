import { supabase } from "@/integrations/supabase/client";

export type LiveMockAttemptStatus = "none" | "in_progress" | "submitted";

export type LiveMockAttemptRow = {
  id: string;
  status: LiveMockAttemptStatus;
  answered_count: number | null;
};

export async function fetchLiveMockAttempt(
  paperId: string,
  userId: string,
): Promise<LiveMockAttemptRow | null> {
  const { data, error } = await supabase
    .from("live_mock_attempts" as never)
    .select("id, status, answered_count")
    .eq("paper_id", paperId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { id: string; status: string; answered_count: number | null };
  const status: LiveMockAttemptStatus =
    row.status === "submitted"
      ? "submitted"
      : row.status === "in_progress"
        ? "in_progress"
        : "none";

  return { id: row.id, status, answered_count: row.answered_count };
}

export type SavedLiveMockAnswerRow = {
  question_id: string;
  question_number: number | null;
  selected_option: string | null;
};

export async function loadLiveMockSavedAnswers(attemptId: string): Promise<SavedLiveMockAnswerRow[]> {
  const { data, error } = await supabase
    .from("live_mock_answers" as never)
    .select("question_id, question_number, selected_option")
    .eq("attempt_id", attemptId)
    .not("selected_option", "is", null);

  if (error) {
    console.error("loadLiveMockSavedAnswers", error);
    return [];
  }

  return (data as SavedLiveMockAnswerRow[]) ?? [];
}

type EnsureInProgressParams = {
  paperId: string;
  userId: string;
  userEmail: string | null;
  questionCount: number;
  /** Only true for the affected-cohort maths re-sit flow. */
  allowResetSubmitted?: boolean;
};

export type EnsureInProgressResult =
  | { ok: true; attemptId: string }
  | { ok: false; reason: "submitted" | "error" };

/** One attempt row per (paper_id, user_id). Never downgrade a submitted attempt unless resitting. */
export async function ensureLiveMockInProgressAttempt(
  params: EnsureInProgressParams,
): Promise<EnsureInProgressResult> {
  const existing = await fetchLiveMockAttempt(params.paperId, params.userId);

  if (existing?.status === "submitted") {
    if (!params.allowResetSubmitted) {
      return { ok: false, reason: "submitted" };
    }

    const { error: resetError } = await supabase
      .from("live_mock_attempts" as never)
      .update(
        {
          status: "in_progress",
          answered_count: 0,
          submitted_at: null,
          duration_seconds: null,
        } as never,
      )
      .eq("id", existing.id);

    if (resetError) {
      console.error("ensureLiveMockInProgressAttempt reset", resetError);
      return { ok: false, reason: "error" };
    }

    return { ok: true, attemptId: existing.id };
  }

  if (existing?.status === "in_progress") {
    return { ok: true, attemptId: existing.id };
  }

  const { data, error } = await supabase
    .from("live_mock_attempts" as never)
    .insert({
      paper_id: params.paperId,
      user_id: params.userId,
      user_email: params.userEmail,
      status: "in_progress",
      question_count: params.questionCount,
      answered_count: 0,
    } as never)
    .select("id")
    .single();

  if (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "23505") {
      const raced = await fetchLiveMockAttempt(params.paperId, params.userId);
      if (raced?.status === "submitted" && !params.allowResetSubmitted) {
        return { ok: false, reason: "submitted" };
      }
      if (raced?.status === "in_progress") {
        return { ok: true, attemptId: raced.id };
      }
    }
    console.error("ensureLiveMockInProgressAttempt insert", error);
    return { ok: false, reason: "error" };
  }

  return { ok: true, attemptId: (data as { id: string }).id };
}
