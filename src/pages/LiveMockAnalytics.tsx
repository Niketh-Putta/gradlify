import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  ListChecks,
  Loader2,
  Medal,
  Timer,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { PostMockParentReport } from "@/components/PostMockParentReport";
import StandardisedScorePanel from "@/components/live-mock/StandardisedScorePanel";
import RichQuestionContent from "@/components/RichQuestionContent";
import { formatExplanation } from "@/lib/formatExplanation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppContext } from "@/hooks/useAppContext";
import {
  buildLiveMockSessionPath,
  defaultLiveMockAnalyticsPath,
  getLiveMockPaperBySlug,
  getLiveMockPassageContextForQuestion,
  getLiveMockPublicCohortSummary,
  getLiveMockQuestionStemOptionsFallback,
  cohortSummaryFromAttemptSummary,
  enrichLiveMockAnswerDetails,
  getMyLiveMockAnswerDetails,
  getMyLiveMockAttemptSummary,
  getMyLiveMockScoreRank,
  LIVE_MOCK_PAPER_SLUG,
  scoreRankFromAttemptSummary,
  parseLiveMockOptionsSnapshot,
  type LiveMockAnswerDetail,
  type LiveMockMyAttemptSummary,
  type LiveMockOptionSnapshot,
  type LiveMockPassageContext,
  type LiveMockPublicCohortSummary,
  type LiveMockScoreRank,
} from "@/lib/liveMockAnalytics";
import {
  COMBINED_MOCK_EVENT_SLUG,
  combinedMockDisplayTitleForEvent,
  combinedMockLobbyPathForEvent,
  combinedMockSitPathForEvent,
  combinedPaperSlugsForEvent,
  SECOND_MOCK_EVENT_SLUG,
} from "@/lib/liveMockCombinedConfig";

const POLL_MS = 15_000;

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatSubmittedAt(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function displayNameFromProfile(
  profile: { onboarding?: Record<string, unknown> } | null | undefined,
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
): string {
  const onboarding = profile?.onboarding;
  const preferred =
    onboarding && typeof onboarding.preferredName === "string"
      ? onboarding.preferredName.trim()
      : "";
  const metaName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    "";
  const fromEmail = user?.email?.split("@")[0]?.trim() || "";
  return preferred || metaName || fromEmail || "Student";
}

/** Rank box: always surfaces the participant count as the denominator (rank out of everyone doing it). */
function buildRankDisplay(scoreRank: LiveMockScoreRank | null): { value: string; hint: string } {
  if (!scoreRank || scoreRank.total === 0) {
    return { value: "-", hint: "No one has submitted this mock yet." };
  }
  const total = scoreRank.total;
  if (!scoreRank.has_submitted_rank || scoreRank.rank == null) {
    return {
      value: `- / ${total}`,
      hint: `Submit your completed mock to see your rank among the ${total} ${total === 1 ? "student" : "students"} who have finished.`,
    };
  }
  return {
    value: `${scoreRank.rank} / ${total}`,
    hint: "1 = highest score so far. Tied scores share a rank, and this climbs live as more people finish.",
  };
}

type SubjectPaperStats = {
  summary: LiveMockMyAttemptSummary | null;
  cohort: LiveMockPublicCohortSummary | null;
  scoreRank: LiveMockScoreRank | null;
};

async function loadSubjectPaperStats(paperId: string): Promise<SubjectPaperStats> {
  const [sum, cohortRow, rankRow] = await Promise.all([
    getMyLiveMockAttemptSummary(paperId),
    getLiveMockPublicCohortSummary(paperId),
    getMyLiveMockScoreRank(paperId),
  ]);
  return {
    summary: sum,
    cohort: cohortRow ?? cohortSummaryFromAttemptSummary(sum),
    scoreRank: rankRow ?? scoreRankFromAttemptSummary(sum),
  };
}

const COMBINED_SUBJECT_TITLES: Record<"maths" | "english", string> = {
  maths: "11+ Maths",
  english: "11+ English",
};

export default function LiveMockAnalytics() {
  const { user, profile } = useAppContext();
  const displayName = useMemo(() => displayNameFromProfile(profile, user), [profile, user]);

  const [searchParams, setSearchParams] = useSearchParams();
  const isCombined = searchParams.get("combined") === "1";
  const combinedSubject: "maths" | "english" =
    searchParams.get("subject") === "maths" ? "maths" : "english";
  const mockEventSlug =
    searchParams.get("mock") === SECOND_MOCK_EVENT_SLUG ? SECOND_MOCK_EVENT_SLUG : COMBINED_MOCK_EVENT_SLUG;
  const combinedEventTitle = combinedMockDisplayTitleForEvent(mockEventSlug);
  const combinedLobbyPath = combinedMockLobbyPathForEvent(mockEventSlug);
  const combinedSitPath = combinedMockSitPathForEvent(mockEventSlug);
  const combinedSubjectSlugs = useMemo(
    () => combinedPaperSlugsForEvent(mockEventSlug),
    [mockEventSlug],
  );
  const activeSlug = isCombined ? combinedSubjectSlugs[combinedSubject] : LIVE_MOCK_PAPER_SLUG;
  const fallbackTitle = isCombined
    ? COMBINED_SUBJECT_TITLES[combinedSubject]
    : "11+ English complete mock exam";
  /** Stable key for fetch effects - avoids reload loops from unstable object deps. */
  const analyticsScopeKey = useMemo(
    () =>
      [
        user?.id ?? "",
        isCombined ? "1" : "0",
        mockEventSlug,
        combinedSubject,
        activeSlug,
        combinedSubjectSlugs.maths,
        combinedSubjectSlugs.english,
      ].join("|"),
    [
      user?.id,
      isCombined,
      mockEventSlug,
      combinedSubject,
      activeSlug,
      combinedSubjectSlugs.maths,
      combinedSubjectSlugs.english,
    ],
  );

  const selectCombinedSubject = useCallback(
    (subject: "maths" | "english") => {
      const next = new URLSearchParams(searchParams);
      next.set("combined", "1");
      next.set("subject", subject);
      next.set("mock", mockEventSlug);
      setSearchParams(next, { replace: true });
    },
    [mockEventSlug, searchParams, setSearchParams],
  );

  const [paperTitle, setPaperTitle] = useState<string>("11+ English complete mock exam");
  const [summary, setSummary] = useState<LiveMockMyAttemptSummary | null>(null);
  const [answers, setAnswers] = useState<LiveMockAnswerDetail[]>([]);
  const [cohort, setCohort] = useState<LiveMockPublicCohortSummary | null>(null);
  const [scoreRank, setScoreRank] = useState<LiveMockScoreRank | null>(null);
  const [combinedBoth, setCombinedBoth] = useState<Record<"maths" | "english", SubjectPaperStats> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // A submitted attempt's per-question answers never change, so on background
  // polls we only refresh the live cohort numbers and skip re-fetching the
  // (static) answer review. This keeps DB load low when many people are viewing.
  const loadedAnswersAttemptRef = useRef<string | null>(null);
  const loadInFlightRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const analyticsScopeKeyRef = useRef<string | null>(null);
  const loadAllRef = useRef<(isPoll: boolean) => Promise<void>>(async () => {});

  const loadAll = useCallback(async (isPoll: boolean) => {
    if (!user?.id) {
      setLoading(false);
      setError(null);
      return;
    }

    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    const showFullScreenLoader = !isPoll && !hasLoadedOnceRef.current;
    if (isPoll || hasLoadedOnceRef.current) setRefreshing(true);
    else setLoading(true);

    try {
      setError(null);

      if (isCombined) {
        const [mathsPaper, englishPaper] = await Promise.all([
          getLiveMockPaperBySlug(combinedSubjectSlugs.maths),
          getLiveMockPaperBySlug(combinedSubjectSlugs.english),
        ]);

        if (!mathsPaper || !englishPaper) {
          setSummary(null);
          setAnswers([]);
          setCohort(null);
          setScoreRank(null);
          setCombinedBoth(null);
          setError("This mock paper could not be loaded.");
          return;
        }

        const [mathsStats, englishStats] = await Promise.all([
          loadSubjectPaperStats(mathsPaper.id),
          loadSubjectPaperStats(englishPaper.id),
        ]);

        setCombinedBoth({ maths: mathsStats, english: englishStats });

        const activePaper = combinedSubject === "maths" ? mathsPaper : englishPaper;
        const activeStats = combinedSubject === "maths" ? mathsStats : englishStats;

        setPaperTitle(activePaper.title?.trim() || COMBINED_SUBJECT_TITLES[combinedSubject]);
        setSummary(activeStats.summary);
        setCohort(activeStats.cohort);
        setScoreRank(activeStats.scoreRank);

        const attemptId = activeStats.summary?.attempt_id ?? null;
        if (attemptId) {
          if (!isPoll || loadedAnswersAttemptRef.current !== attemptId) {
            const raw = await getMyLiveMockAnswerDetails(attemptId);
            setAnswers(await enrichLiveMockAnswerDetails(raw));
            loadedAnswersAttemptRef.current = attemptId;
          }
        } else {
          setAnswers([]);
          loadedAnswersAttemptRef.current = null;
        }
      } else {
        setCombinedBoth(null);

        const paper = await getLiveMockPaperBySlug(activeSlug);
        if (!paper) {
          setSummary(null);
          setAnswers([]);
          setCohort(null);
          setScoreRank(null);
          setError("This mock paper could not be loaded.");
          return;
        }

        setPaperTitle(paper.title?.trim() || fallbackTitle);

        const activeStats = await loadSubjectPaperStats(paper.id);
        setSummary(activeStats.summary);
        setCohort(activeStats.cohort);
        setScoreRank(activeStats.scoreRank);

        const attemptId = activeStats.summary?.attempt_id ?? null;
        if (attemptId) {
          if (!isPoll || loadedAnswersAttemptRef.current !== attemptId) {
            const raw = await getMyLiveMockAnswerDetails(attemptId);
            setAnswers(await enrichLiveMockAnswerDetails(raw));
            loadedAnswersAttemptRef.current = attemptId;
          }
        } else {
          setAnswers([]);
          loadedAnswersAttemptRef.current = null;
        }
      }

      setUpdatedAt(new Date());
      hasLoadedOnceRef.current = true;
    } catch (e) {
      console.error(e);
      setError("Something went wrong loading your results.");
    } finally {
      loadInFlightRef.current = false;
      if (showFullScreenLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, activeSlug, combinedSubjectSlugs.maths, combinedSubjectSlugs.english, isCombined, combinedSubject]);

  loadAllRef.current = loadAll;

  useEffect(() => {
    if (analyticsScopeKeyRef.current === analyticsScopeKey) return;
    analyticsScopeKeyRef.current = analyticsScopeKey;
    hasLoadedOnceRef.current = false;
    loadedAnswersAttemptRef.current = null;
    void loadAllRef.current(false);
  }, [analyticsScopeKey]);

  useEffect(() => {
    if (!user?.id) return;
    const id = window.setInterval(() => void loadAllRef.current(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [analyticsScopeKey, user?.id]);

  useEffect(() => {
    const onFocus = () => void loadAllRef.current(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const sectionStats = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    for (const row of answers) {
      const label = row.section_key?.trim() || "Other";
      const cur = map.get(label) || { correct: 0, total: 0 };
      cur.total += 1;
      if (row.is_correct === true) cur.correct += 1;
      map.set(label, cur);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [answers]);

  const parentReportTopicBreakdown = useMemo(() => {
    const breakdown: Record<string, { earned: number; total: number }> = {};
    for (const [label, { correct: c, total: t }] of sectionStats) {
      breakdown[label.replace(/_/g, " ")] = { earned: c, total: t };
    }
    return breakdown;
  }, [sectionStats]);

  /** Every question in the attempt (all 60), ordered by question number. */
  const reviewQuestions = useMemo(() => {
    return [...answers].sort((a, b) => (a.question_number ?? 0) - (b.question_number ?? 0));
  }, [answers]);

  const [reviewDetail, setReviewDetail] = useState<LiveMockAnswerDetail | null>(null);
  const [passageCtx, setPassageCtx] = useState<LiveMockPassageContext | null>(null);
  const [fallbackEnrich, setFallbackEnrich] = useState<{
    stem: string;
    options: LiveMockOptionSnapshot[];
    explanation?: string | null;
  } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!reviewDetail?.question_id) {
      setPassageCtx(null);
      setFallbackEnrich(null);
      setReviewLoading(false);
      return;
    }

    let cancelled = false;
    setReviewLoading(true);
    setPassageCtx(null);
    setFallbackEnrich(null);

    const qid = reviewDetail.question_id;
    const snapOpts = parseLiveMockOptionsSnapshot(reviewDetail.options_snapshot);
    const wantsPassage = /comprehension/i.test(reviewDetail.section_key || "");

    void (async () => {
      const [passage, fb] = await Promise.all([
        wantsPassage ? getLiveMockPassageContextForQuestion(qid) : Promise.resolve(null),
        snapOpts.length === 0 ? getLiveMockQuestionStemOptionsFallback(qid) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setPassageCtx(passage);
      setFallbackEnrich(fb);
      setReviewLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reviewDetail]);

  const reviewStem = useMemo(() => {
    if (!reviewDetail) return "";
    return (
      reviewDetail.stem_snapshot?.trim() ||
      fallbackEnrich?.stem?.trim() ||
      ""
    );
  }, [reviewDetail, fallbackEnrich]);

  const reviewOptions = useMemo(() => {
    if (!reviewDetail) return [];
    const snap = parseLiveMockOptionsSnapshot(reviewDetail.options_snapshot);
    if (snap.length > 0) return snap;
    return fallbackEnrich?.options ?? [];
  }, [reviewDetail, fallbackEnrich]);

  const reviewExplanation = useMemo(() => {
    if (!reviewDetail) return "";
    const fromAnswer = reviewDetail.explanation?.trim();
    if (fromAnswer) return fromAnswer;
    return fallbackEnrich?.explanation?.trim() || "";
  }, [reviewDetail, fallbackEnrich]);

  const rankDisplay = useMemo(() => buildRankDisplay(scoreRank), [scoreRank]);

  const qc = summary?.question_count ?? 0;
  const correct = summary?.correct_count ?? 0;
  const wrong = summary?.wrong_count ?? 0;
  const blank = summary?.unanswered_count ?? 0;
  const pct = summary?.score_percent;

  if (!isCombined) {
    return <Navigate to={defaultLiveMockAnalyticsPath()} replace />;
  }

  if (!user?.id) {
    return (
      <main className="min-h-screen bg-[#faf9f4] px-3 py-8 text-slate-950 sm:px-4">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">Sign in to see your mock results.</p>
          <Link to="/live-mock-exams" className="mt-4 inline-block">
            <Button variant="outline" className="rounded-xl">
              Back to live mock
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (loading && !summary && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f4] px-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-hidden />
      </main>
    );
  }

  const status = summary?.status;
  const submitted = status === "submitted";
  const inProgress = status === "in_progress";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#faf9f4] px-3 py-3 text-slate-950 sm:px-4 sm:py-4">
      <section className="mx-auto w-full min-w-0 max-w-6xl rounded-[16px] border border-slate-200/80 bg-white px-3 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:px-4">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-700">
              {isCombined ? `${combinedEventTitle} results` : "Live mock results"}
            </p>
            <h1 className="mt-1 break-words font-serif text-xl font-bold tracking-tight text-slate-950 sm:text-2xl md:text-[30px]">
              Hi, {displayName}
            </h1>
            <p className="mt-1 break-words text-base font-semibold leading-snug text-slate-800">{paperTitle}</p>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
              {mockEventSlug === SECOND_MOCK_EVENT_SLUG ? (
                <>
                  Mock 2 only. Separate questions, registration, rank and saved answers from mock 1.
                </>
              ) : (
                <>
                  Mock 1 only. Separate questions, registration, rank and saved answers from mock 2.
                </>
              )}{" "}
              Numbers refresh automatically every few seconds so they stay aligned with your saved attempt.
              {updatedAt ? (
                <span className="ml-1 text-slate-400">
                  Last updated {updatedAt.toLocaleTimeString()}
                </span>
              ) : null}
              {refreshing ? (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Updating…
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {submitted ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Submitted
              </span>
            ) : null}
            {inProgress ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
                <Clock3 className="h-3.5 w-3.5" />
                In progress
              </span>
            ) : null}
            {!summary ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                No attempt yet
              </span>
            ) : null}
          </div>
        </div>

        {isCombined ? (
          <div className="mt-3 inline-flex w-full gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
            {(["maths", "english"] as const).map((subject) => {
              const active = combinedSubject === subject;
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => selectCombinedSubject(subject)}
                  className={[
                    "flex-1 rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors sm:flex-none sm:px-6",
                    active
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  ].join(" ")}
                >
                  {subject}
                </button>
              );
            })}
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
        ) : null}

        {/* Cohort stats - always visible (submissions, mean, your placement) */}
        {isCombined && combinedBoth ? (
          <div className="mt-3 pt-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight text-slate-950">
                  <BarChart3 className="h-4 w-4 shrink-0 text-blue-600" />
                  Cohort snapshot · both papers
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Live aggregates for everyone who submitted. Updates as new attempts arrive.
                </p>
              </div>
              <Users className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["maths", "english"] as const).map((subject) => {
                const stats = combinedBoth[subject];
                const rank = buildRankDisplay(stats.scoreRank);
                const active = combinedSubject === subject;
                return (
                  <div
                    key={subject}
                    className={[
                      "min-w-0 rounded-xl border bg-[linear-gradient(135deg,#fbfdff_0%,#ffffff_62%,#f8fbff_100%)] p-3",
                      active ? "border-blue-300 ring-1 ring-blue-200/80" : "border-slate-200",
                    ].join(" ")}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
                      {COMBINED_SUBJECT_TITLES[subject]}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="min-w-0 rounded-lg border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white px-3 py-3 shadow-sm">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800/90">
                          <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          Your rank
                        </div>
                        <div className="mt-1 font-mono text-2xl font-black tracking-tight text-slate-950">
                          {rank.value}
                        </div>
                        <p className="mt-1 text-[10px] leading-snug text-slate-500">{rank.hint}</p>
                      </div>
                      <div className="min-w-0 rounded-lg border border-slate-100 bg-white px-3 py-3 shadow-sm">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cohort mean</div>
                        <div className="mt-1 text-2xl font-black text-slate-950">
                          {stats.cohort?.mean_score_percent != null ? `${stats.cohort.mean_score_percent}%` : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3">
            <div className="min-w-0 rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#fbfdff_0%,#ffffff_62%,#f8fbff_100%)] p-3">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight text-slate-950">
                    <BarChart3 className="h-4 w-4 shrink-0 text-blue-600" />
                    Cohort snapshot
                  </h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    Live aggregates across everyone who submitted this paper (updates as submissions arrive).
                  </p>
                </div>
                <Users className="h-5 w-5 shrink-0 text-blue-400 sm:mt-0.5" aria-hidden />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white px-3 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800/90">
                    <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Your rank
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black tracking-tight text-slate-950">
                    {rankDisplay.value}
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">{rankDisplay.hint}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-100 bg-white px-3 py-3 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cohort mean %</div>
                  <div className="mt-1 text-2xl font-black text-slate-950">
                    {cohort?.mean_score_percent != null ? `${cohort.mean_score_percent}%` : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!summary ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
            <p className="text-sm text-slate-600">
              You don&apos;t have a personal attempt on file for{" "}
              <strong className="font-semibold text-slate-800">{paperTitle}</strong> yet. Submit the mock to see your
              score, section breakdown, and question review below.
            </p>
            <Link to={combinedLobbyPath} className="mt-3 inline-block">
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
                Go to {combinedEventTitle}
              </Button>
            </Link>
          </div>
        ) : inProgress && answers.length === 0 ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4 sm:px-5">
            <p className="text-sm font-medium text-amber-950">
              Your attempt is in progress. Finish and submit the exam to see full question-by-question breakdown here.
            </p>
            <Link
              to={
                isCombined
                  ? combinedSubject === "english"
                    ? `/live-mock-exams/session?track=11plus&subject=english&topics=Comprehension,SPaG&mode=mock-exam&questions=60&duration=50&liveMockSlug=${encodeURIComponent(combinedSubjectSlugs.english)}`
                    : combinedSitPath
                  : buildLiveMockSessionPath()
              }
            >
              <Button className="mt-3 rounded-xl bg-amber-600 text-white hover:bg-amber-700">
                Continue mock exam
              </Button>
            </Link>
          </div>
        ) : null}

        {summary && !(inProgress && answers.length === 0) ? (
          <>
            {pct != null && qc > 0 && sectionStats.length > 0 ? (
              <div className="pt-3">
                <PostMockParentReport
                  topicBreakdown={parentReportTopicBreakdown}
                  correctCount={correct}
                  totalCount={qc}
                  percentage={pct}
                />
              </div>
            ) : null}

            <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Medal className="h-4 w-4 text-amber-600" />
                </div>
                <div className="mt-3 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">Your score</div>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold tracking-tight text-slate-950">
                  <span>
                    {correct}/{qc || "-"}
                  </span>
                  {pct != null ? (
                    <span className="text-lg font-semibold text-blue-700">({pct}%)</span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">Correct out of total questions</div>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <ListChecks className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-3 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">Breakdown</div>
                <div className="mt-0.5 text-lg font-bold text-slate-950">
                  <span className="text-emerald-700">{correct}</span>
                  <span className="mx-1 text-slate-300">/</span>
                  <span className="text-rose-700">{wrong}</span>
                  <span className="mx-1 text-slate-300">/</span>
                  <span className="text-slate-500">{blank}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">Correct / Wrong / Unanswered</div>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Timer className="h-4 w-4 text-violet-600" />
                </div>
                <div className="mt-3 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">Time used</div>
                <div className="mt-0.5 text-lg font-bold tracking-tight text-slate-950">
                  {formatDuration(summary.duration_seconds)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Answered {summary.answered_count ?? "-"} / {qc || "-"}
                </div>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                </div>
                <div className="mt-3 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">Submitted</div>
                <div className="mt-0.5 break-words text-sm font-semibold leading-snug text-slate-950">
                  {formatSubmittedAt(summary.submitted_at)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">When your attempt was saved</div>
              </div>
            </div>

            {pct != null && qc > 0 ? (
              <div className="pt-3">
                <StandardisedScorePanel
                  subject={isCombined ? combinedSubject : "combined"}
                  percentage={pct}
                  correct={correct}
                  total={qc}
                />
              </div>
            ) : null}

            <div className="pt-3">
              <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-3">
                  <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-950">
                    <TrendingUp className="h-4 w-4 shrink-0 text-amber-600" />
                    By section
                  </h2>
                  <p className="text-xs text-slate-500">Accuracy within each paper section (from your saved answers).</p>
                </div>

                <div className="space-y-2">
                  {sectionStats.length === 0 ? (
                    <p className="text-xs text-slate-500">No section breakdown yet.</p>
                  ) : (
                    sectionStats.map(([label, { correct: c, total: t }]) => {
                      const pctSec = t > 0 ? Math.round((100 * c) / t) : 0;
                      return (
                        <div key={label} className="rounded-lg bg-slate-50/80 px-3 py-2">
                          <div className="mb-1.5 flex items-start justify-between gap-2 text-xs">
                            <span className="min-w-0 flex-1 break-words font-semibold capitalize text-slate-700">
                              {label.replace(/_/g, " ")}
                            </span>
                            <span className="shrink-0 tabular-nums text-slate-600">
                              {c}/{t} ({pctSec}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-blue-500/80 transition-all duration-300"
                              style={{ width: `${pctSec}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-950">
                <ListChecks className="h-4 w-4 shrink-0 text-blue-600" />
                Question-level review
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Every question in this paper, with your answer and the correct answer. Tap a row to see the full passage
                (if any), question text, and every answer option.
              </p>

              {reviewQuestions.length === 0 ? (
                <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/80 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-emerald-900">
                    No saved answers yet. Submit the mock to populate this list.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-[11px] text-slate-400 md:hidden">
                    On small screens, use the cards below. On wider screens, scroll the table sideways if needed.
                  </p>
                  <div className="mt-3 space-y-2 md:hidden">
                    {reviewQuestions.map((row) => {
                      const unanswered =
                        row.is_correct !== true &&
                        !row.selected_option?.trim() &&
                        !row.selected_option_label?.trim();
                      const yourAnswerDisplay = unanswered
                        ? "Not answered"
                        : (
                            row.selected_option_label?.trim() ||
                            row.selected_option?.trim() ||
                            "-"
                          );
                      const correctDisplay = row.correct_option_label?.trim() || "-";
                      const rowAccent =
                        row.is_correct === true
                          ? "border-emerald-200/80 bg-white hover:bg-emerald-50/50"
                          : row.is_correct === false
                            ? "border-rose-200/80 bg-white hover:bg-rose-50/50"
                            : "border-amber-200/80 bg-white hover:bg-amber-50/40";
                      return (
                        <button
                          key={row.id}
                          type="button"
                          className={[
                            "w-full rounded-xl border px-3 py-3 text-left text-xs shadow-sm transition-colors",
                            rowAccent,
                          ].join(" ")}
                          onClick={() => setReviewDetail(row)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-900">
                              Q{row.question_number ?? "-"}
                            </span>
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          </div>
                          <div className="mt-2 space-y-1.5 break-words text-[13px] leading-snug">
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-500">Section:</span>{" "}
                              {(row.section_key || "-").replace(/_/g, " ")}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-500">Type:</span>{" "}
                              {row.question_type || "-"}
                            </p>
                            <p className={unanswered ? "text-slate-500" : row.is_correct === true ? "text-emerald-800" : "text-rose-800"}>
                              <span className="font-semibold text-slate-500">Your answer:</span>{" "}
                              {unanswered ? "Not answered" : yourAnswerDisplay}
                            </p>
                            <p className="text-emerald-900">
                              <span className="font-semibold text-slate-500">Correct:</span> {correctDisplay}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 hidden max-h-[min(480px,70vh)] overflow-auto overscroll-x-contain rounded-lg border border-slate-200 [-webkit-overflow-scrolling:touch] md:block">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="sticky top-0 z-[1] bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-[0_1px_0_rgba(226,232,240,0.9)]">
                        <tr>
                          <th className="whitespace-nowrap px-2 py-2">Q</th>
                          <th className="px-2 py-2">Section</th>
                          <th className="px-2 py-2">Type</th>
                          <th className="min-w-[120px] px-2 py-2">Your answer</th>
                          <th className="min-w-[120px] px-2 py-2">Correct</th>
                          <th className="w-8 px-2 py-2" aria-hidden />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reviewQuestions.map((row) => {
                          const unanswered =
                            row.is_correct !== true &&
                            !row.selected_option?.trim() &&
                            !row.selected_option_label?.trim();
                          const yourAnswerDisplay = unanswered
                            ? "Not answered"
                            : (
                                row.selected_option_label?.trim() ||
                                row.selected_option?.trim() ||
                                "-"
                              );
                          const correctDisplay =
                            row.correct_option_label?.trim() || "-";
                          return (
                            <tr
                              key={row.id}
                              role="button"
                              tabIndex={0}
                              className={
                                row.is_correct === true
                                  ? "cursor-pointer bg-white hover:bg-emerald-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                                  : row.is_correct === false
                                    ? "cursor-pointer bg-white hover:bg-rose-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                                    : "cursor-pointer bg-white hover:bg-amber-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                              }
                              onClick={() => setReviewDetail(row)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setReviewDetail(row);
                                }
                              }}
                            >
                              <td className="whitespace-nowrap px-2 py-2 font-mono font-semibold text-slate-800">
                                {row.question_number ?? "-"}
                              </td>
                              <td className="max-w-[140px] break-words px-2 py-2 text-slate-700">
                                {(row.section_key || "-").replace(/_/g, " ")}
                              </td>
                              <td className="max-w-[120px] break-words px-2 py-2 text-slate-600">
                                {row.question_type || "-"}
                              </td>
                              <td className="max-w-[200px] break-words px-2 py-2 font-medium">
                                {unanswered ? (
                                  <span className="text-slate-500">Not answered</span>
                                ) : (
                                  <span className={row.is_correct === true ? "text-emerald-800" : "text-rose-800"}>{yourAnswerDisplay}</span>
                                )}
                              </td>
                              <td className="max-w-[200px] break-words px-2 py-2 font-medium text-emerald-800">
                                {correctDisplay}
                              </td>
                              <td className="px-1 py-2 text-slate-400">
                                <ChevronRight className="h-4 w-4" aria-hidden />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <Dialog
              open={reviewDetail !== null}
              onOpenChange={(open) => {
                if (!open) setReviewDetail(null);
              }}
            >
              <DialogContent className="max-h-[88vh] w-[min(100vw-1.25rem,36rem)] gap-0 overflow-hidden border-slate-200 p-0 sm:max-w-lg">
                {reviewDetail ? (
                  <>
                    <DialogHeader className="border-b border-slate-100 px-4 pb-3 pt-4 text-left sm:px-5">
                      <DialogTitle className="pr-8 text-base font-bold text-slate-950">
                        Question {reviewDetail.question_number ?? "-"}
                        <span className="mt-1 block text-xs font-normal capitalize text-slate-500">
                          {(reviewDetail.section_key || "").replace(/_/g, " ") || "Section"}
                          {reviewDetail.question_type ? ` · ${reviewDetail.question_type}` : ""}
                        </span>
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Full question text, comprehension passage if applicable, and answer options for this item.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[calc(88vh-7rem)] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                      {reviewLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Loading passage context…
                        </div>
                      ) : null}

                      {passageCtx && passageCtx.passageBlocks.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-xs leading-relaxed text-slate-800">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Reading passage
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">{passageCtx.sectionTitle}</p>
                          {passageCtx.instructions ? (
                            <p className="mt-2 text-slate-600">{passageCtx.instructions}</p>
                          ) : null}
                          {passageCtx.passageTitle ? (
                            <p className="mt-3 font-serif text-sm font-semibold text-slate-950">{passageCtx.passageTitle}</p>
                          ) : null}
                          <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
                            {passageCtx.passageBlocks.map((block, bi) => (
                              <p key={block.id || `p-${bi}`} className="text-[13px] leading-relaxed">
                                {block.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Question</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-950">
                          {reviewStem || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Answer options</p>
                        <ul className="mt-2 space-y-2">
                          {reviewOptions.map((opt) => {
                            const selected = reviewDetail.selected_option === opt.id;
                            const correct =
                              opt.correct ||
                              (!!reviewDetail.correct_option_id && reviewDetail.correct_option_id === opt.id);
                            return (
                              <li
                                key={opt.id}
                                className={[
                                  "rounded-lg border px-3 py-2.5 text-sm leading-snug",
                                  correct && selected
                                    ? "border-amber-300 bg-amber-50"
                                    : correct
                                      ? "border-emerald-300 bg-emerald-50"
                                      : selected
                                        ? "border-rose-300 bg-rose-50"
                                        : "border-slate-200 bg-white",
                                ].join(" ")}
                              >
                                <span className="font-mono text-xs font-bold text-slate-500">{opt.id}</span>
                                <span className="ml-2 break-words text-slate-900">{opt.text}</span>
                                <span className="mt-1 flex flex-wrap gap-2">
                                  {selected ? (
                                    <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                                      Your answer
                                    </span>
                                  ) : null}
                                  {correct ? (
                                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                                      Correct
                                    </span>
                                  ) : null}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        {reviewOptions.length === 0 && !reviewLoading ? (
                          <p className="mt-2 text-xs text-slate-500">Option text could not be loaded for this row.</p>
                        ) : null}
                      </div>

                      {reviewExplanation ? (
                        <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 p-3 dark:border-amber-900/50 dark:bg-amber-950/35">
                          <p className="text-[10px] font-black uppercase tracking-wide text-amber-900 dark:text-amber-100">
                            Explanation
                          </p>
                          <div className="mt-2 text-[13px] leading-relaxed text-slate-900 dark:text-slate-100">
                            <RichQuestionContent
                              text={formatExplanation(reviewExplanation)}
                              className="space-y-2"
                            />
                          </div>
                        </div>
                      ) : reviewDetail.is_correct !== true ? (
                        <p className="text-xs text-slate-500">
                          No explanation has been added for this question in the bank yet.
                        </p>
                      ) : null}
                    </div>

                    <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-xl"
                        onClick={() => setReviewDetail(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </>
                ) : null}
              </DialogContent>
            </Dialog>
          </>
        ) : null}

        <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={combinedLobbyPath}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-700 hover:underline sm:justify-start"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to {combinedEventTitle}
          </Link>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full shrink-0 rounded-xl sm:w-auto"
            onClick={() => void loadAll(true)}
            disabled={refreshing}
          >
            Refresh now
          </Button>
        </div>
      </section>
    </main>
  );
}
