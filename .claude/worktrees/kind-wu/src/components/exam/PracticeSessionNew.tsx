import { useRef, useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Calculator, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppContext } from "@/hooks/useAppContext";
import { usePremium } from "@/hooks/usePremium";
import MathText from "@/components/MathText";
import RichQuestionContent, { normalizeNewlines } from "@/components/RichQuestionContent";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { cn } from "@/lib/utils";
import { areMathEquivalent, uniqueMathAnswers } from "@/lib/areMathEquivalent";
import { sanitizeAnswerSet } from "@/lib/answerSanitizer";
import { resolveQuestionImageUrl } from "@/lib/resolveQuestionImageUrl";
import { expandQuestionTypesForDb, expandSubtopicIdsForDb } from "@/lib/subtopicIdUtils";
import { getTopicAndSubtopicLabels } from "@/lib/subtopicDisplay";
import { parseMultipartQuestion, MultipartQuestion } from "@/lib/multipart";
import { ChallengeLimitModal } from "@/components/ChallengeLimitModal";
import { PracticeLimitModal } from "@/components/PracticeLimitModal";
import { resolveUserTrack } from "@/lib/track";

// Topic mapping
const TOPIC_MAPPING: Record<string, string> = {
  number: "Number",
  "number & arithmetic": "Number",
  "number and arithmetic": "Number",
  algebra: "Algebra",
  "algebra & ratio": "Algebra",
  "algebra and ratio": "Algebra",
  "problem solving": "Problem Solving",
  "problem solving & strategies": "Problem Solving",
  "problem solving and strategies": "Problem Solving",
  "problem-solving": "Problem Solving",
  strategies: "Problem Solving",
  "problem-solving & strategies": "Problem Solving",
  "problem-solving and strategies": "Problem Solving",
  "ratio and proportion": "Ratio & Proportion",
  "ratio & proportion": "Ratio & Proportion",
  ratio: "Ratio & Proportion",
  geometry: "Geometry & Measures",
  "geometry & measures": "Geometry & Measures",
  "geometry and measures": "Geometry & Measures",
  "statistics & data": "Statistics",
  "statistics and data": "Statistics",
  probability: "Probability",
  statistics: "Statistics",
  "word problems (rucsac)": "Problem Solving",
  "word-problems (rucsac)": "Problem Solving",
  "logic & reasoning": "Problem Solving",
  "estimation & checking": "Problem Solving",
  "logic & reasoning (level 3)": "Problem Solving",
  "word problems": "Problem Solving",
};

const MAX_OPTIONS = 5;
const EXTREME_SEEN_STORAGE_PREFIX = "extreme_seen_ids_v1";
const MAX_PERSISTED_EXTREME_IDS = 4000;
const ELEVEN_PLUS_DIFFICULTY_LABELS: Record<number, string> = {
  1: "Fluency (Level 1)",
  2: "Application (Level 2)",
  3: "Reasoning (Level 3)",
};

function normalizeTopicName(topic: string): string {
  const normalized = TOPIC_MAPPING[topic.toLowerCase()];
  return normalized || topic;
}

interface PracticeQuestion {
  id: string;
  question: string;
  correct_answer: string;
  all_answers: string[];
  question_type?: string;
  subtopic?: string;
  tier?: string;
  calculator?: string;
  difficulty?: number;
  marks?: number;
  estimated_time_sec?: number;
  image_url?: string;
  image_alt?: string;
  explanation?: string;
  multipart?: MultipartQuestion | null;
  wasWrongBefore?: boolean;
}

interface QuestionHistory {
  question: PracticeQuestion;
  selectedAnswer: string;
  isCorrect: boolean;
}

type DbTier = "Foundation Tier" | "Higher Tier" | "11+ Standard";
type DbCalculator = "Calculator" | "Non-Calculator";

function parseChoiceList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

function parseTierParam(raw: string): DbTier[] {
  const parts = parseChoiceList(raw);
  const normalized = parts.map((p) => p.replace(/\s+/g, "-"));
  if (normalized.includes("11plus-standard") || normalized.includes("11+-standard")) {
    return ["11+ Standard"];
  }
  const isBoth =
    parts.includes("both") ||
    parts.includes("mixed") ||
    parts.includes("adaptive") ||
    (parts.includes("foundation") && parts.includes("higher"));

  if (isBoth) return ["Foundation Tier", "Higher Tier"];
  if (parts.includes("higher") || parts.includes("higher tier")) return ["Higher Tier"];
  if (parts.includes("foundation") || parts.includes("foundation tier")) return ["Foundation Tier"];

  // Fallback: treat unknown values as mixed rather than accidentally narrowing.
  return ["Foundation Tier", "Higher Tier"];
}

function parseCalculatorParam(raw: string): DbCalculator[] {
  const parts = parseChoiceList(raw);
  const normalized = parts.map((p) => p.replace(/\s+/g, "-"));
  const isBoth =
    normalized.includes("both") ||
    normalized.includes("mixed") ||
    normalized.includes("adaptive") ||
    (normalized.includes("calculator") &&
      (normalized.includes("non-calculator") || normalized.includes("noncalc") || normalized.includes("non-calc")));

  if (isBoth) return ["Calculator", "Non-Calculator"];
  if (normalized.includes("calculator") || normalized.includes("with")) return ["Calculator"];
  if (normalized.includes("non-calculator") || normalized.includes("noncalc") || normalized.includes("non-calc") || normalized.includes("without")) {
    return ["Non-Calculator"];
  }

  // Fallback: treat unknown values as mixed rather than accidentally narrowing.
  return ["Calculator", "Non-Calculator"];
}

type ChallengeExplanationLine =
  | { kind: "step"; text: string }
  | { kind: "text"; text: string };

function normalizeChallengeLine(line: string): string {
  return line
    .replace(/\/n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\\,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatChallengeExplanation(text?: string): { lines: ChallengeExplanationLine[]; finalAnswer: string | null } {
  if (!text) return { lines: [], finalAnswer: null };
  const normalized = normalizeNewlines(text);
  const rawLines = normalized.split(/\n+/).map(normalizeChallengeLine).filter(Boolean);
  const scaffoldLines = new Set([
    "identify what is known and what must be found.",
    "identify the key method and formula:",
    "apply the method carefully with the given values:",
    "simplify step by step:",
    "check your result against the conditions to confirm it is valid.",
    "state the answer clearly, with units or exact form if required.",
  ]);
  const lines: ChallengeExplanationLine[] = [];
  let finalAnswer: string | null = null;
  let expectFinalValue = false;
  const seenText = new Set<string>();

  const pushText = (candidate: string) => {
    const clean = candidate.trim();
    if (!clean) return;
    if (/^final$/i.test(clean)) return;
    const lower = clean.toLowerCase();
    if (scaffoldLines.has(lower)) return;
    if (seenText.has(lower)) return;
    seenText.add(lower);
    lines.push({ kind: "text", text: clean });
  };

  for (const raw of rawLines) {
    const finalMatch = raw.match(/^(Final answer|Answer)\s*[:).–—-]?\s*(.*)$/i);
    if (finalMatch) {
      const remainder = String(finalMatch[2] ?? "").trim();
      if (remainder) {
        finalAnswer = remainder;
        expectFinalValue = false;
      } else {
        expectFinalValue = true;
      }
      continue;
    }

    if (expectFinalValue) {
      finalAnswer = raw;
      expectFinalValue = false;
      continue;
    }

    const stepMatch = raw.match(/^Step\s*\d+\s*(?:\([^)]*\))?\s*[:).–—-]?\s*(.*)$/i);
    if (stepMatch) {
      const stepText = String(stepMatch[1] ?? "").trim();
      lines.push({ kind: "step", text: stepText });
      continue;
    }

    pushText(raw);
  }

  return { lines, finalAnswer };
}

function labelTierFromParam(raw: string): string {
  const db = parseTierParam(raw);
  if (db.length === 2) return "Mixed Tier";
  if (db[0] === "11+ Standard") return "11+ Standard";
  return db[0];
}

export default function PracticeSessionNew() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  let user = null;
  let userTrack: 'gcse' | '11plus' = 'gcse';
  try {
    const context = useAppContext();
    user = context.user;
    const overrideTrack = searchParams.get('track');
    userTrack = overrideTrack === '11plus' ? '11plus' : resolveUserTrack(context.profile?.track ?? null);
  } catch {
    // Not authenticated
  }
  const { isPremium, incrementUsage, incrementChallengeUsage, dailyUses, dailyLimit, dailyChallengeUses, dailyChallengeLimit } = usePremium(userTrack === '11plus' ? '11plus' : 'gcse');
  const activeTrack: "gcse" | "11plus" = userTrack === "11plus" ? "11plus" : "gcse";
  const [showChallengeLimitModal, setShowChallengeLimitModal] = useState(false);
  const [showPracticeLimitModal, setShowPracticeLimitModal] = useState(false);
  const [practiceUsageCounted, setPracticeUsageCounted] = useState(false);
  const practiceLimitReached = !isPremium && Number.isFinite(dailyLimit) && dailyUses >= dailyLimit;

  const getExtremeSeenStorageKey = () => {
    const userKey = user?.id || "guest";
    return `${EXTREME_SEEN_STORAGE_PREFIX}:${activeTrack}:${userKey}`;
  };

  // URL parameters
  const tierParam = searchParams.get("tier") || "higher";
  const paperTypeParam = searchParams.get("paperType") || "calculator";
  const topics = searchParams.get("topics") || "Number";
  const mode = searchParams.get("mode") || "practice";
  const subtopicParam = searchParams.get("subtopic") || "";
  const difficultyMinParam = searchParams.get("difficultyMin") || "";
  const difficultyMaxParam = searchParams.get("difficultyMax") || "";
  const questionIdsParam = searchParams.get("questionIds") || "";
  const fixedQuestionIds = questionIdsParam
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const selectedTopics = topics
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((t) => normalizeTopicName(t));

  const headerTopicsLabel =
    selectedTopics.length <= 1 ? (selectedTopics[0] ?? "Topics") : `${selectedTopics.length} topics`;

  const headerTierLabel = labelTierFromParam(tierParam);

  const headerCalculatorLabel = (() => {
    const db = parseCalculatorParam(paperTypeParam);
    if (db.length === 2) return "Mixed";
    return db[0] === "Calculator" ? "Calculator" : "Non-Calculator";
  })();

  const maxDifficulty = activeTrack === "11plus" ? 3 : 4;
  const clampDifficulty = (n: number) => Math.max(1, Math.min(maxDifficulty, n));
  const getDifficultyBounds = (): { min: number; max: number } => {
    const minParsed = Number.parseInt(difficultyMinParam, 10);
    const maxParsed = Number.parseInt(difficultyMaxParam, 10);
    const min = Number.isFinite(minParsed) ? clampDifficulty(minParsed) : 1;
    const max = Number.isFinite(maxParsed) ? clampDifficulty(maxParsed) : maxDifficulty;
    return { min: Math.min(min, max), max: Math.max(min, max) };
  };

  const headerDifficultyLabel = (() => {
    const { min, max } = getDifficultyBounds();
    if (min === 1 && max === maxDifficulty) return null;
    if (min === max) return `Difficulty ${min}`;
    return `Difficulty ${min}-${max}`;
  })();

  // State
  const [ignoreFixedQuestionIds, setIgnoreFixedQuestionIds] = useState(false);
  const [subtopicFallbackActive, setSubtopicFallbackActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<QuestionHistory[]>([]);
  const [shownQuestionIds, setShownQuestionIds] = useState<string[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [questionNumber, setQuestionNumber] = useState(1);
  const [showSolution, setShowSolution] = useState(false);
  const [confidence, setConfidence] = useState<string | null>(null);
  const recordedExtremeQuestionIdsRef = useRef<Set<string>>(new Set());
  const extremeAttemptedIdsRef = useRef<Set<string>>(new Set());
  const extremeAttemptedLoadedRef = useRef(false);
  const extremeAttemptedLoadingRef = useRef<Promise<void> | null>(null);
  const questionBufferRef = useRef<any[]>([]);
  const fetchSignatureRef = useRef<string>('');
  const [partIndex, setPartIndex] = useState(0);
  const [partAnswers, setPartAnswers] = useState<string[]>([]);
  const [partResults, setPartResults] = useState<boolean[]>([]);

  const explanationForDisplay = useMemo(() => {
    if (!currentQuestion?.explanation) return "";
    return currentQuestion.explanation;
  }, [currentQuestion?.explanation, mode]);

  const challengeExplanation = useMemo(
    () => (mode === "extreme" ? formatChallengeExplanation(currentQuestion?.explanation) : null),
    [currentQuestion?.explanation, mode]
  );

  const effectiveSubtopicParam = subtopicFallbackActive ? "" : subtopicParam;
  const effectiveQuestionIds = ignoreFixedQuestionIds ? [] : fixedQuestionIds;
  const hasFixedQuestionIds = effectiveQuestionIds.length > 0;
  const selectedSubtopicIds = effectiveSubtopicParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.toLowerCase() !== "all");

  const selectedSubtopicLabels = selectedSubtopicIds
    .map((id) => getTopicAndSubtopicLabels({ questionType: null, subtopicId: id, fallbackTopic: null }).subtopicLabel)
    .filter((s): s is string => Boolean(s));

  const headerSubtopicsLabel =
    selectedSubtopicLabels.length === 0
      ? null
      : selectedSubtopicLabels.length === 1
        ? selectedSubtopicLabels[0]
        : `${selectedSubtopicLabels.length} subtopics`;

  useEffect(() => {
    setIgnoreFixedQuestionIds(false);
    setSubtopicFallbackActive(false);
  }, [questionIdsParam, subtopicParam, topics, tierParam, paperTypeParam, difficultyMinParam, difficultyMaxParam, mode]);

  useEffect(() => {
    if (mode !== "practice") return;
    if (practiceLimitReached) {
      setShowPracticeLimitModal(true);
      return;
    }
    if (practiceUsageCounted) return;

    void (async () => {
      await incrementUsage();
      setPracticeUsageCounted(true);
    })();
  }, [mode, practiceLimitReached, practiceUsageCounted, incrementUsage]);

  const mixedCountsRef = useRef({
    tier: { "Foundation Tier": 0, "Higher Tier": 0 } satisfies Record<DbTier, number>,
    calculator: { Calculator: 0, "Non-Calculator": 0 } satisfies Record<DbCalculator, number>,
  });
  const difficultyMixCountsRef = useRef<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const topicMixCountsRef = useRef<Record<string, number>>({});
  const subtopicMixCountsRef = useRef<Record<string, number>>({});
  const recentMixRef = useRef<{ tier: DbTier[]; calculator: DbCalculator[] }>({ tier: [], calculator: [] });
  const recentOutcomesRef = useRef<number[]>([]);
  const correctStreakRef = useRef(0);
  const priorWrongQuestionIdsRef = useRef<Set<string>>(new Set());
  const priorHistoryCheckedIdsRef = useRef<Set<string>>(new Set());

  const getAdaptivePerformance = () => {
    const history = recentOutcomesRef.current;
    if (history.length === 0) return 0.5;
    const avg = history.reduce((sum, value) => sum + value, 0) / history.length;
    const reliability = Math.min(1, history.length / 12);
    return 0.5 * (1 - reliability) + avg * reliability;
  };
  const recordOutcome = (correct: boolean) => {
    recentOutcomesRef.current = [...recentOutcomesRef.current, correct ? 1 : 0].slice(-20);
  };

  const initialTargetDifficulty = (() => {
    const { min, max } = getDifficultyBounds();
    const dbTiers = parseTierParam(tierParam);
    const seed = dbTiers.length === 1 && dbTiers[0] === "Higher Tier" ? 3 : 2;
    return Math.max(min, Math.min(max, seed));
  })();
  const targetDifficultyRef = useRef<number>(initialTargetDifficulty);
  const BUFFER_MAX = 60;
  const FETCH_BATCH = 36;


  const buildInFilter = (ids: string[]) =>
    ids.length > 0 ? `(${ids.map((id) => `"${id}"`).join(",")})` : "()";

  const persistExtremeSeenIds = () => {
    try {
      if (typeof window === "undefined") return;
      const key = getExtremeSeenStorageKey();
      const ids = Array.from(extremeAttemptedIdsRef.current).slice(-MAX_PERSISTED_EXTREME_IDS);
      window.localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // Best-effort cache only.
    }
  };

  const loadExtremeSeenIdsFromStorage = () => {
    try {
      if (typeof window === "undefined") return;
      const key = getExtremeSeenStorageKey();
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const id of parsed) {
        const value = String(id || "").trim();
        if (value) extremeAttemptedIdsRef.current.add(value);
      }
    } catch {
      // Ignore corrupted cache.
    }
  };

  const loadExtremeAttemptedIds = async () => {
    if (extremeAttemptedLoadedRef.current) return;
    if (extremeAttemptedLoadingRef.current) {
      await extremeAttemptedLoadingRef.current;
      return;
    }

    const loadPromise = (async () => {
      try {
        loadExtremeSeenIdsFromStorage();
        const { data: authData } = await supabase.auth.getUser();
        const sessionUser = authData?.user;
        if (!sessionUser) {
          extremeAttemptedLoadedRef.current = true;
          return;
        }

        const { data, error } = await supabase
          .from("extreme_results")
          .select("question_id")
          .eq("user_id", sessionUser.id);

        if (error) {
          console.error("Failed to load extreme history:", error);
          extremeAttemptedLoadedRef.current = true;
          return;
        }

        data?.forEach((row) => {
          if (row?.question_id) {
            extremeAttemptedIdsRef.current.add(row.question_id);
          }
        });
        persistExtremeSeenIds();
        extremeAttemptedLoadedRef.current = true;
      } catch (err) {
        console.error("Failed to load extreme history:", err);
        extremeAttemptedLoadedRef.current = true;
      }
    })();

    extremeAttemptedLoadingRef.current = loadPromise;
    await loadPromise;
    extremeAttemptedLoadingRef.current = null;
  };

  // Parse arrays from database
  const parseArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        // Support Postgres text[] literals like {"A","B","C"} (including commas inside quoted entries).
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const body = trimmed.slice(1, -1);
          if (!body) return [];
          const values: string[] = [];
          const regex = /"((?:[^"\\]|\\.)*)"|([^,]+)/g;
          let match: RegExpExecArray | null;
          while ((match = regex.exec(body)) !== null) {
            const part = (match[1] ?? match[2] ?? "").trim();
            if (!part) continue;
            values.push(part.replace(/\\"/g, '"'));
          }
          return values;
        }
        return [];
      }
    }
    return [];
  };

  const normalizeAnswerOptions = (options: string[], correct: string): string[] => {
    let unique = uniqueMathAnswers(options);
    if (!unique.some((option) => areMathEquivalent(option, correct))) {
      unique = uniqueMathAnswers([correct, ...unique]);
    }
    if (unique.length > MAX_OPTIONS) {
      const trimmed = unique
        .filter((option) => !areMathEquivalent(option, correct))
        .slice(0, MAX_OPTIONS - 1);
      unique = uniqueMathAnswers([correct, ...trimmed]);
    }
    return unique;
  };

  const buildAnswerOptions = (row: any): { options: string[]; correct: string } => {
    const correct = String(row?.correct_answer || "").trim();
    if (!correct) return { options: [], correct: "" };
    const wrong = parseArray(row?.wrong_answers).map((v) => String(v).trim()).filter(Boolean);
    const allProvided = parseArray(row?.all_answers);
    const initial = [correct, ...wrong, ...allProvided];
    const sanitized = sanitizeAnswerSet({
      options: initial,
      correct,
      questionType: row?.question_type,
      subtopic: row?.subtopic,
    });

    const distinctWrong: string[] = [];
    const tryAddWrong = (candidate: string) => {
      if (!candidate) return;
      if (areMathEquivalent(candidate, sanitized.correct)) return;
      if (distinctWrong.some((opt) => areMathEquivalent(opt, candidate))) return;
      distinctWrong.push(candidate);
    };

    // Primary source: wrong_answers, then top up from all_answers/sanitized options.
    for (const option of wrong) tryAddWrong(option);
    for (const option of allProvided) tryAddWrong(String(option).trim());
    for (const option of sanitized.options) tryAddWrong(String(option).trim());

    const seeded = [sanitized.correct, ...distinctWrong.slice(0, MAX_OPTIONS - 1)];
    const normalized = normalizeAnswerOptions(seeded, sanitized.correct);

    return {
      options: normalized,
      correct: sanitized.correct,
    };
  };

  const fetchQuestion = async (
    opts?: {
      difficultyExact?: number;
      silentNoResults?: boolean;
      ignoreFixed?: boolean;
      ignoreSubtopic?: boolean;
      includeSeen?: boolean;
      includeSeenRetryDone?: boolean;
    }
  ): Promise<boolean> => {
    if (mode === "practice" && practiceLimitReached) {
      setShowPracticeLimitModal(true);
      return false;
    }
    setLoading(true);
    try {
      const ignoreFixed = opts?.ignoreFixed ?? ignoreFixedQuestionIds;
      const ignoreSubtopic = opts?.ignoreSubtopic ?? subtopicFallbackActive;
      const currentQuestionIds = ignoreFixed ? [] : fixedQuestionIds;
      const subtopicFilterParam = ignoreSubtopic ? "" : subtopicParam;
      const { min: difficultyFloor, max: difficultyCeil } = getDifficultyBounds();
      const difficultyExact = typeof opts?.difficultyExact === "number" && Number.isFinite(opts.difficultyExact)
        ? clampDifficulty(opts.difficultyExact)
        : null;
      let topicCandidates: string[] | null = null;
      let subtopicCandidates: string[] | null = null;
      const allowedDifficulties = Array.from(
        { length: difficultyCeil - difficultyFloor + 1 },
        (_, idx) => difficultyFloor + idx
      );

      // Build query based on mode
      let data: any[] | null = null;
      let error: any = null;
      const bufferEnabled = currentQuestionIds.length === 0;
      const fetchSignature = JSON.stringify({
        mode,
        tierParam,
        paperTypeParam,
        topics,
        subtopicFilterParam,
        difficultyMinParam,
        difficultyMaxParam,
        questionIdsParam,
        ignoreFixed,
        ignoreSubtopic,
      });

      if (fetchSignatureRef.current !== fetchSignature) {
        fetchSignatureRef.current = fetchSignature;
        questionBufferRef.current = [];
        topicMixCountsRef.current = {};
        subtopicMixCountsRef.current = {};
        mixedCountsRef.current = {
          tier: { "Foundation Tier": 0, "Higher Tier": 0 },
          calculator: { Calculator: 0, "Non-Calculator": 0 },
        };
        difficultyMixCountsRef.current = { 1: 0, 2: 0, 3: 0, 4: 0 };
        recentMixRef.current = { tier: [], calculator: [] };
        targetDifficultyRef.current = initialTargetDifficulty;
        recentOutcomesRef.current = [];
        priorWrongQuestionIdsRef.current = new Set();
        priorHistoryCheckedIdsRef.current = new Set();
        correctStreakRef.current = 0;
      }

      if (bufferEnabled && !opts?.includeSeen) {
        const shown = new Set(shownQuestionIds);
        questionBufferRef.current = questionBufferRef.current.filter((q: any) => !shown.has(q.id));
      }

      // Consume already-fetched buffered questions first; only exclude questions already shown.
      const excludeIds = opts?.includeSeen ? [] : shownQuestionIds;
      const bufferedCandidates = bufferEnabled
        ? (difficultyExact == null
            ? questionBufferRef.current
            : questionBufferRef.current.filter((q: any) => {
                const qDiff = clampDifficulty(typeof q?.difficulty === "number" ? q.difficulty : 2);
                return qDiff === difficultyExact;
              }))
        : [];
      const useBufferOnly =
        bufferEnabled &&
        bufferedCandidates.length > 0 &&
        !opts?.includeSeen;

      // Pre-parse selection so mixed/adaptive values never collapse to a single tier/paper type.
      const dbTier = parseTierParam(tierParam);
      const dbCalculator = parseCalculatorParam(paperTypeParam);
      const isTierMixed = dbTier.length === 2;
      const isCalculatorMixed = dbCalculator.length === 2;

      // If an explicit pack is provided, load those exact questions in order.
      if (currentQuestionIds.length > 0) {
        const nextId = currentQuestionIds[shownQuestionIds.length];
        if (!nextId) {
          toast.success("Practice pack complete");
          setLoading(false);
          return;
        }

        const result = await supabase
          .from("exam_questions")
          .select("id, question, correct_answer, wrong_answers, all_answers, question_type, subtopic, difficulty, marks, estimated_time_sec, tier, calculator, image_url, image_alt, explanation")
          .eq("id", nextId)
          .single();

        data = result.data ? [result.data] : [];
        error = result.error;
      } else if (useBufferOnly) {
        data = bufferedCandidates;
      } else if (mode === "extreme") {
        const { data: sessionData } = await supabase.auth.getSession();
        const isAuthed = !!sessionData.session?.user;
        await loadExtremeAttemptedIds();

        const fetchExtremeBatch = async (idsToExclude: string[], allowRpc: boolean) => {
          let batchData: any[] | null = null;
          let batchError: any = null;

          if (allowRpc) {
            const result = await supabase.rpc("fetch_extreme_questions_v1" as any, {
              p_exclude_ids: idsToExclude.length > 0 ? idsToExclude : null,
              p_limit: FETCH_BATCH,
            });
            batchData = result.data as any[] | null;
            batchError = result.error;
          }

          if (batchError || !batchData || batchData.length === 0) {
            batchError = null;
            let query = supabase
              .from("extreme_questions")
              .select("id, question, correct_answer, wrong_answers, all_answers, image_url, image_alt, explanation");

            if (idsToExclude.length > 0) {
              query = query.not("id", "in", buildInFilter(idsToExclude));
            }
            query = query.eq("track", userTrack);

            const result = await query.limit(FETCH_BATCH);
            batchData = result.data;
            batchError = result.error;

            if (batchData && batchData.length > 1) {
              batchData = [...batchData].sort(() => Math.random() - 0.5);
            }
          }

          return { data: batchData, error: batchError };
        };

        if (isAuthed) {
          if (extremeAttemptedIdsRef.current.size > 0 && bufferEnabled) {
            questionBufferRef.current = questionBufferRef.current.filter(
              (q: any) => !extremeAttemptedIdsRef.current.has(q.id)
            );
          }

          const attemptedIds = Array.from(extremeAttemptedIdsRef.current);
          const excludeAll = Array.from(new Set([...excludeIds, ...attemptedIds]));
          let result = await fetchExtremeBatch(excludeAll, true);
          data = result.data as any[] | null;
          error = result.error;

          if (!error && (!data || data.length === 0) && attemptedIds.length > 0) {
            result = await fetchExtremeBatch(excludeIds, true);
            data = result.data as any[] | null;
            error = result.error;
          }
        } else {
          const result = await fetchExtremeBatch(excludeIds, false);
          data = result.data as any[] | null;
          error = result.error;
        }
      } else {
        // Apply filters for exam_questions
        const topicList = topics && topics.toLowerCase() !== "all"
          ? Array.from(
              new Set(
                topics
                  .split(",")
                  .map((t) => normalizeTopicName(t.trim()))
                  .filter(Boolean)
                  .flatMap((t) => expandQuestionTypesForDb(t))
              )
            )
          : null;

        const union = subtopicFilterParam && subtopicFilterParam !== "all"
          ? Array.from(
              new Set(
                subtopicFilterParam
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .flatMap((s) => expandSubtopicIdsForDb(s))
              )
            )
          : null;

        const difficultyMin = difficultyExact != null ? difficultyExact : (difficultyMinParam ? difficultyFloor : null);
        const difficultyMax = difficultyExact != null ? difficultyExact : (difficultyMaxParam ? difficultyCeil : null);
        topicCandidates = topicList && topicList.length > 0 ? topicList : null;
        subtopicCandidates = union && union.length > 0 ? union : null;

        // Logged-in users: use RPC (unseen-first across practice + mocks).
        // Guests: fall back to direct reads (still avoids repeats within this session).
        const { data: sessionData } = await supabase.auth.getSession();
        const isAuthed = !!sessionData.session?.user;

        if (isAuthed) {
          const result = await supabase.rpc('fetch_exam_questions_v3' as any, {
            p_tiers: dbTier,
            p_calculators: dbCalculator,
            p_question_types: topicList,
            p_subtopics: union,
            p_difficulty_min: difficultyMin,
            p_difficulty_max: difficultyMax,
            p_exclude_ids: excludeIds,
            p_limit: FETCH_BATCH,
          });

          data = result.data as any[] | null;
          error = result.error;

          // Safety net: if RPC is missing/misconfigured,
          // fall back to a direct query so the user doesn't see a blank session.
          if (error) {
            error = null;
            let query = supabase
              .from("exam_questions")
              .select("id, question, correct_answer, wrong_answers, all_answers, question_type, subtopic, difficulty, marks, estimated_time_sec, tier, calculator, image_url, image_alt, explanation");

            query = dbTier.length === 1 ? query.eq("tier", dbTier[0]) : query.in("tier", dbTier);
            query = dbCalculator.length === 1 ? query.eq("calculator", dbCalculator[0]) : query.in("calculator", dbCalculator);

            if (topicList && topicList.length === 1) query = query.eq("question_type", topicList[0]);
            else if (topicList && topicList.length > 1) query = query.in("question_type", topicList);

            if (union && union.length === 1) query = query.eq("subtopic", union[0]);
            else if (union && union.length > 1) query = query.in("subtopic", union);

            if (difficultyMin != null) query = query.gte("difficulty", difficultyMin);
            if (difficultyMax != null) query = query.lte("difficulty", difficultyMax);
            query = query.eq("track", activeTrack);

            if (excludeIds.length > 0) {
              const quotedIds = excludeIds.map((id) => `"${id}"`).join(',');
              query = query.not("id", "in", `(${quotedIds})`);
            }

            const fallback = await query.limit(FETCH_BATCH);
            data = fallback.data;
            error = fallback.error;
          }
        } else {
          let query = supabase
            .from("exam_questions")
            .select("id, question, correct_answer, wrong_answers, all_answers, question_type, subtopic, difficulty, marks, estimated_time_sec, tier, calculator, image_url, image_alt, explanation");

          if (dbTier.length === 1) query = query.eq("tier", dbTier[0]);
          else query = query.in("tier", dbTier);

          if (dbCalculator.length === 1) query = query.eq("calculator", dbCalculator[0]);
          else query = query.in("calculator", dbCalculator);

          if (topicList && topicList.length === 1) query = query.eq("question_type", topicList[0]);
          else if (topicList && topicList.length > 1) query = query.in("question_type", topicList);

          if (union && union.length === 1) query = query.eq("subtopic", union[0]);
          else if (union && union.length > 1) query = query.in("subtopic", union);

          if (difficultyMin != null) query = query.gte("difficulty", difficultyMin);
          if (difficultyMax != null) query = query.lte("difficulty", difficultyMax);
          query = query.eq("track", activeTrack);

          if (excludeIds.length > 0) {
            const quotedIds = excludeIds.map((id) => `"${id}"`).join(',');
            query = query.not("id", "in", `(${quotedIds})`);
          }

          const result = await query.limit(FETCH_BATCH);
          data = result.data;
          error = result.error;
        }
      }

      if (error) throw error;

      if (!data || data.length === 0) {
        // If we've exhausted unseen questions for this exact filter, retry INCLUDING seen
        // questions (same filter), so we can recycle and prioritize previously wrong ones.
        if (!opts?.includeSeenRetryDone && shownQuestionIds.length > 0) {
          return fetchQuestion({ ...opts, silentNoResults: true, includeSeen: true, includeSeenRetryDone: true });
        }
        if (!ignoreFixed && fixedQuestionIds.length > 0) {
          setIgnoreFixedQuestionIds(true);
          return fetchQuestion({ ...opts, silentNoResults: true, ignoreFixed: true });
        }
        if (!opts?.silentNoResults) {
          toast.error("No more questions available");
        }
        return false;
      }

      // Hard reject: never serve questions with <3 wrong answers (i.e., <4 total options).
      // This protects users from legacy/invalid bank rows.
      const validData = (data || []).filter((q: any) => {
        const multipartCandidate = parseMultipartQuestion(String(q?.question || ""));
        if (multipartCandidate) return true;
        const options = buildAnswerOptions(q);
        return options.options.length >= 4;
      });

      if (validData.length === 0) {
        if (!opts?.includeSeenRetryDone && shownQuestionIds.length > 0) {
          return fetchQuestion({ ...opts, silentNoResults: true, includeSeen: true, includeSeenRetryDone: true });
        }
        if (!ignoreFixed && fixedQuestionIds.length > 0) {
          setIgnoreFixedQuestionIds(true);
          return fetchQuestion({ ...opts, silentNoResults: true, ignoreFixed: true });
        }
        if (!opts?.silentNoResults) {
          toast.error("No more questions available");
        }
        return false;
      }

      const priorWrongQuestionIds = new Set<string>();
      if (mode !== "extreme") {
        try {
          const batchQuestionIds = Array.from(new Set(validData.map((q: any) => String(q?.id || "")).filter(Boolean)));
          const unknownHistoryIds = batchQuestionIds.filter((id) => !priorHistoryCheckedIdsRef.current.has(id));
          const sessionUserId = user?.id || null;

          if (sessionUserId && unknownHistoryIds.length > 0) {
            const { data: priorResults, error: priorError } = await supabase
              .from("practice_results")
              .select("question_id,correct,attempts")
              .eq("user_id", sessionUserId)
              .in("question_id", unknownHistoryIds);

            if (!priorError && priorResults) {
              for (const row of priorResults as Array<{ question_id: string | null; correct: number; attempts: number }>) {
                if (!row?.question_id) continue;
                if (Number(row.correct) < Number(row.attempts)) {
                  priorWrongQuestionIdsRef.current.add(row.question_id);
                }
              }
            }

            for (const id of unknownHistoryIds) {
              priorHistoryCheckedIdsRef.current.add(id);
            }
          }

          for (const id of batchQuestionIds) {
            if (priorWrongQuestionIdsRef.current.has(id)) {
              priorWrongQuestionIds.add(id);
            }
          }
        } catch (historyError) {
          console.error("Failed to load prior practice history:", historyError);
        }
      }

      const annotatedData = validData.map((q: any) => ({
        ...q,
        __wasWrongBefore: priorWrongQuestionIds.has(String(q.id)),
      }));

      if (bufferEnabled) {
        if (!useBufferOnly) {
          const merged = [...questionBufferRef.current, ...annotatedData];
          const unique = Array.from(new Map(merged.map((q: any) => [q.id, q])).values());
          questionBufferRef.current = unique
            .filter((q: any) => !excludeIds.includes(q.id))
            .slice(0, BUFFER_MAX);
        }
      }

      const pickQuestion = (rows: any[]): any => {
        if (currentQuestionIds.length > 0) return rows[0];

        // If tier/calculator are mixed/adaptive, pick an *intelligent mix* rather than pure random.
        // - Keep calc/non-calc roughly 50/50 (and avoid long streaks).
        // - Ensure both tiers appear (avoid long streaks), and adapt tier preference to target difficulty.
        // - Adapt difficulty: wrong => easier; correct on easy => harder; otherwise build up gradually.
        const target = clampDifficulty(Number(targetDifficultyRef.current) || 2);

        const counts = mixedCountsRef.current;
        const recent = recentMixRef.current;
        const last2Calc = recent.calculator.slice(-2);
        const last2Tier = recent.tier.slice(-2);

        const desiredCalc: DbCalculator | null = (() => {
          if (!isCalculatorMixed) return (dbCalculator[0] as DbCalculator) ?? null;
          const diff = counts.calculator.Calculator - counts.calculator["Non-Calculator"];
          if (Math.abs(diff) >= 1) return diff > 0 ? "Non-Calculator" : "Calculator";
          if (last2Calc.length === 2 && last2Calc[0] === last2Calc[1]) {
            return last2Calc[0] === "Calculator" ? "Non-Calculator" : "Calculator";
          }
          return "Calculator";
        })();

        const desiredTier: DbTier | null = (() => {
          if (!isTierMixed) return (dbTier[0] as DbTier) ?? null;
          const diff = counts.tier["Foundation Tier"] - counts.tier["Higher Tier"];
          if (Math.abs(diff) >= 1) return diff > 0 ? "Higher Tier" : "Foundation Tier";
          if (last2Tier.length === 2 && last2Tier[0] === last2Tier[1]) {
            return last2Tier[0] === "Higher Tier" ? "Foundation Tier" : "Higher Tier";
          }
          return target >= 3 ? "Higher Tier" : "Foundation Tier";
        })();

        const desiredDifficulty: number | null = (() => {
          if (difficultyExact != null) return difficultyExact;
          if (allowedDifficulties.length <= 1) return allowedDifficulties[0] ?? null;
          const sorted = [...allowedDifficulties].sort((a, b) => a - b);
          const totalAsked = sorted.reduce((sum, d) => sum + (difficultyMixCountsRef.current[d] || 0), 0);
          const horizon = totalAsked + 1;
          const adaptivePerf = getAdaptivePerformance();
          const adaptiveShift = (adaptivePerf - 0.5) * 1.2;

          let weightSum = 0;
          const weights = sorted.map((_, idx) => {
            const rank = sorted.length <= 1 ? 0 : idx / (sorted.length - 1);
            const centeredRank = (rank * 2) - 1;
            const weight = Math.max(0.2, 1 + (adaptiveShift * centeredRank));
            weightSum += weight;
            return weight;
          });

          let best = sorted[0];
          let bestDeficit = Number.NEGATIVE_INFINITY;
          for (let idx = 0; idx < sorted.length; idx += 1) {
            const d = sorted[idx];
            const count = difficultyMixCountsRef.current[d] || 0;
            const expected = horizon * (weights[idx] / weightSum);
            const deficit = expected - count;
            if (deficit > bestDeficit) {
              best = d;
              bestDeficit = deficit;
            }
          }
          return best;
        })();

        const desiredTopic: string | null = (() => {
          if (!topicCandidates || topicCandidates.length <= 1) return null;
          let best = topicCandidates[0];
          let bestCount = Number.POSITIVE_INFINITY;
          for (const t of topicCandidates) {
            const count = topicMixCountsRef.current[t] || 0;
            if (count < bestCount) {
              best = t;
              bestCount = count;
            }
          }
          return best;
        })();

        const desiredSubtopic: string | null = (() => {
          if (!subtopicCandidates || subtopicCandidates.length <= 1) return null;
          let best = subtopicCandidates[0];
          let bestCount = Number.POSITIVE_INFINITY;
          for (const s of subtopicCandidates) {
            const count = subtopicMixCountsRef.current[s] || 0;
            if (count < bestCount) {
              best = s;
              bestCount = count;
            }
          }
          return best;
        })();

        let best = rows[0];
        let bestScore = -Infinity;

        for (const q of rows) {
          const qTier = q?.tier as DbTier | undefined;
          const qCalc = q?.calculator as DbCalculator | undefined;
          const qDiff = clampDifficulty(typeof q?.difficulty === "number" ? q.difficulty : 2);
          const qTopic = String(q?.question_type || "Mixed");
          const qSub = String(q?.subtopic || "Unknown");

          let score = 0;
          if (desiredCalc && qCalc === desiredCalc) score += 6;
          if (desiredTier && qTier === desiredTier) score += 6;

          // Prefer questions near the target difficulty and keep difficulty even.
          score += 4 - Math.abs(qDiff - target);
          if (desiredDifficulty != null) {
            score += 3 - Math.abs(qDiff - desiredDifficulty);
          }

          // Keep topics/subtopics balanced when multiple are in play.
          if (desiredTopic && qTopic === desiredTopic) score += 4;
          if (desiredSubtopic && qSub === desiredSubtopic) score += 6;
          score -= (topicMixCountsRef.current[qTopic] || 0) * 1.4;
          if (qSub !== "Unknown") {
            score -= (subtopicMixCountsRef.current[qSub] || 0) * 1.1;
          }

          // Very small jitter to prevent repeated ties.
          score += Math.random() * 0.01;

          if (score > bestScore) {
            bestScore = score;
            best = q;
          }
        }

        return best;
      };

      const candidatePool = bufferEnabled && questionBufferRef.current.length > 0
        ? questionBufferRef.current
        : annotatedData;
      const randomQuestion = pickQuestion(candidatePool);
      if (bufferEnabled) {
        questionBufferRef.current = questionBufferRef.current.filter((q: any) => q.id !== randomQuestion.id);
      }
      const rawMultipart = parseMultipartQuestion(String(randomQuestion.question || ""));
      const multipart = rawMultipart
        ? {
            stem: rawMultipart.stem,
            parts: rawMultipart.parts.map((part) => {
              const hasAllAnswers = Array.isArray(part.all_answers) && part.all_answers.length >= 4;
              const options = hasAllAnswers
                ? normalizeAnswerOptions(part.all_answers, part.correct_answer)
                : normalizeAnswerOptions([part.correct_answer, ...part.wrong_answers], part.correct_answer);
              const sanitized = sanitizeAnswerSet({
                options,
                correct: String(part.correct_answer || ""),
                questionType: randomQuestion.question_type,
                subtopic: randomQuestion.subtopic,
              });
              return {
                ...part,
                correct_answer: sanitized.correct,
                all_answers: sanitized.options.sort(() => Math.random() - 0.5),
              };
            })
          }
        : null;
      const baseAnswers = multipart ? { options: [], correct: String(randomQuestion.correct_answer || "") } : buildAnswerOptions(randomQuestion);
      const allAnswers = multipart ? [] : [...baseAnswers.options].sort(() => Math.random() - 0.5);

      if (!multipart && allAnswers.length < 4) {
        // Shouldn't happen due to validData filter, but keep a final guard.
        if (!opts?.silentNoResults) {
          toast.error("No more questions available");
        }
        return false;
      }

      const processedQuestion: PracticeQuestion = {
        id: randomQuestion.id,
        question: multipart ? (multipart.stem ?? "") : (randomQuestion.question || ""),
        correct_answer: baseAnswers.correct || String(randomQuestion.correct_answer || ""),
        all_answers: allAnswers,
        question_type: randomQuestion.question_type || undefined,
        subtopic: randomQuestion.subtopic || undefined,
        tier: randomQuestion.tier || undefined,
        calculator: randomQuestion.calculator || undefined,
        difficulty: typeof randomQuestion.difficulty === "number" ? randomQuestion.difficulty : undefined,
        marks: typeof randomQuestion.marks === "number" ? randomQuestion.marks : undefined,
        estimated_time_sec: typeof randomQuestion.estimated_time_sec === "number" ? randomQuestion.estimated_time_sec : undefined,
        image_url: resolveQuestionImageUrl(randomQuestion.image_url),
        image_alt: randomQuestion.image_alt || undefined,
        explanation: randomQuestion.explanation || "",
        multipart,
        wasWrongBefore: Boolean(randomQuestion.__wasWrongBefore),
      };

      // Challenge usage gating removed: all users can access extreme questions

      // Track mix stats for mixed/adaptive selection.
      const qTier = processedQuestion.tier as DbTier | undefined;
      const qCalc = processedQuestion.calculator as DbCalculator | undefined;
      if (qTier === "Foundation Tier" || qTier === "Higher Tier") {
        mixedCountsRef.current.tier[qTier] += 1;
        recentMixRef.current.tier = [...recentMixRef.current.tier, qTier].slice(-6);
      }
      if (qCalc === "Calculator" || qCalc === "Non-Calculator") {
        mixedCountsRef.current.calculator[qCalc] += 1;
        recentMixRef.current.calculator = [...recentMixRef.current.calculator, qCalc].slice(-6);
      }
      const topicKey = processedQuestion.question_type || "Mixed";
      topicMixCountsRef.current[topicKey] = (topicMixCountsRef.current[topicKey] || 0) + 1;
      if (processedQuestion.subtopic) {
        const subKey = String(processedQuestion.subtopic);
        subtopicMixCountsRef.current[subKey] = (subtopicMixCountsRef.current[subKey] || 0) + 1;
      }
      if (typeof processedQuestion.difficulty === "number") {
        const diff = clampDifficulty(processedQuestion.difficulty);
        difficultyMixCountsRef.current[diff] = (difficultyMixCountsRef.current[diff] || 0) + 1;
      }

      // Only increment challenge usage if this challenge question hasn't been shown in this session
      if (mode === "extreme" && !shownQuestionIds.includes(randomQuestion.id)) {
        incrementChallengeUsage();
      }
      if (mode === "extreme" && randomQuestion.id) {
        extremeAttemptedIdsRef.current.add(String(randomQuestion.id));
        persistExtremeSeenIds();
      }
      setCurrentQuestion(processedQuestion);
      setShownQuestionIds(prev => [...prev, randomQuestion.id]);
      setHasSubmitted(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowSolution(false);
      setConfidence(null);
      setPartIndex(0);
      setPartAnswers([]);
      setPartResults([]);
      return true;
    } catch (error) {
      console.error("Error fetching question:", error);
      toast.error("Failed to fetch question");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionRef = useRef(fetchQuestion);
  fetchQuestionRef.current = fetchQuestion;

  useEffect(() => {
    void fetchQuestionRef.current();
  }, []);

  const handleSelectAnswer = (answer: string) => {
    if (hasSubmitted) return;
    setSelectedAnswer(answer);
    const multipart = currentQuestion?.multipart;
    if (multipart && multipart.parts.length > 0) {
      setPartAnswers((prev) => {
        const next = [...prev];
        next[partIndex] = answer;
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion) return;
    if (hasSubmitted) return;

    const multipart = currentQuestion.multipart;
    const activePart = multipart?.parts?.[partIndex];
    const correctAnswer = activePart?.correct_answer || currentQuestion.correct_answer;
    const correct = areMathEquivalent(selectedAnswer, correctAnswer);

    setIsCorrect(correct);
    setHasSubmitted(true);

    if (multipart && multipart.parts.length > 0) {
      const nextResults = [...partResults];
      nextResults[partIndex] = correct;
      setPartResults(nextResults);

      if (partIndex < multipart.parts.length - 1) {
        return;
      }

      const overallCorrect = nextResults.every(Boolean);
      recordOutcome(overallCorrect);

      {
        const { min, max } = getDifficultyBounds();
        const cur = clampDifficulty(typeof currentQuestion.difficulty === "number" ? currentQuestion.difficulty : 2);
        const curTarget = clampDifficulty(Number(targetDifficultyRef.current) || 2);

        if (overallCorrect) {
          correctStreakRef.current += 1;
          const shouldIncrease = cur <= 2 || correctStreakRef.current >= 2;
          if (shouldIncrease) {
            targetDifficultyRef.current = Math.max(min, Math.min(max, curTarget + 1));
            correctStreakRef.current = 0;
          }
        } else {
          correctStreakRef.current = 0;
          targetDifficultyRef.current = Math.max(min, Math.min(max, curTarget - 1));
        }
      }

      setQuestionHistory(prev => [...prev, {
        question: currentQuestion,
        selectedAnswer,
        isCorrect: overallCorrect
      }]);

      if (mode === 'extreme') {
        const { data: authData } = await supabase.auth.getUser();
        const sessionUser = authData?.user;
        if (!sessionUser) return;

        try {
          if (!recordedExtremeQuestionIdsRef.current.has(currentQuestion.id)) {
          const { error: insertError } = await supabase.from('extreme_results').insert({
            user_id: sessionUser.id,
            question_id: currentQuestion.id,
            attempts: 1,
            correct: overallCorrect ? 1 : 0,
            track: activeTrack,
          } as any);
            if (!insertError) {
              recordedExtremeQuestionIdsRef.current.add(currentQuestion.id);
              extremeAttemptedIdsRef.current.add(currentQuestion.id);
            }
          }
        } catch (error) {
          console.error('Error saving extreme result:', error);
        }
      } else if (currentQuestion.question_type) {
        const { data: authData } = await supabase.auth.getUser();
        const sessionUser = authData?.user;
        if (!sessionUser) return;

        const topic = normalizeTopicName(currentQuestion.question_type);
        const timestamp = new Date().toISOString();

        try {
          const baseRow = {
            user_id: sessionUser.id,
            topic,
            correct: overallCorrect ? 1 : 0,
            attempts: 1,
          };

          const preferredRows = [
            {
              ...baseRow,
              question_id: currentQuestion.id,
              session_id: sessionId,
              started_at: timestamp,
              finished_at: timestamp,
              difficulty: currentQuestion.difficulty != null ? String(currentQuestion.difficulty) : null,
              meta: {
                question_id: currentQuestion.id,
                mode,
                tier: currentQuestion.tier ?? null,
                calculator: currentQuestion.calculator ?? null,
                subtopic: currentQuestion.subtopic ?? null,
                user_answer: partAnswers.length > 0 ? partAnswers : selectedAnswer,
              },
            },
            { ...baseRow, question_id: currentQuestion.id, session_id: sessionId },
            baseRow,
          ];

          let lastError: any = null;
          for (const row of preferredRows) {
            const { error } = await supabase.from("practice_results").insert(row as any);
            if (!error) {
              lastError = null;
              break;
            }
            lastError = error;
          }

          if (lastError) {
            console.error(
              "Error saving practice result:",
              lastError,
              JSON.stringify(
                {
                  message: (lastError as any)?.message,
                  details: (lastError as any)?.details,
                  hint: (lastError as any)?.hint,
                  code: (lastError as any)?.code,
                },
                null,
                2,
              ),
            );
            toast.error("Couldn't update leaderboard score. Please retry.");
            return;
          }

          const difficultyForReadiness = (() => {
            const raw = typeof currentQuestion.difficulty === 'number' ? currentQuestion.difficulty : NaN;
            if (!Number.isFinite(raw)) return 3;
            return clampDifficulty(Math.round(raw));
          })();

          await supabase.functions.invoke('update-readiness', {
            body: {
              user_id: sessionUser.id,
              topic,
              difficulty: difficultyForReadiness,
              correct: overallCorrect,
              timestamp
            }
          });

          await supabase.from("mindprint_events").insert({
            user_id: sessionUser.id,
            topic,
            correct: overallCorrect,
            mode: mode,
            question_id: currentQuestion.id,
            confidence: confidence || null,
          });
        } catch (error) {
          console.error("Error saving result:", error);
        }
      }

      return;
    }

    {
      recordOutcome(correct);
      const { min, max } = getDifficultyBounds();
      const cur = clampDifficulty(typeof currentQuestion.difficulty === "number" ? currentQuestion.difficulty : 2);
      const curTarget = clampDifficulty(Number(targetDifficultyRef.current) || 2);

      if (correct) {
        correctStreakRef.current += 1;
        const shouldIncrease = cur <= 2 || correctStreakRef.current >= 2;
        if (shouldIncrease) {
          targetDifficultyRef.current = Math.max(min, Math.min(max, curTarget + 1));
          correctStreakRef.current = 0;
        }
      } else {
        correctStreakRef.current = 0;
        targetDifficultyRef.current = Math.max(min, Math.min(max, curTarget - 1));
      }
    }

    setQuestionHistory(prev => [...prev, {
      question: currentQuestion,
      selectedAnswer,
      isCorrect: correct
    }]);

    if (mode === 'extreme') {
      const { data: authData } = await supabase.auth.getUser();
      const sessionUser = authData?.user;
      if (!sessionUser) return;

      try {
        if (!recordedExtremeQuestionIdsRef.current.has(currentQuestion.id)) {
          const { error: insertError } = await supabase.from('extreme_results').insert({
            user_id: sessionUser.id,
            question_id: currentQuestion.id,
            attempts: 1,
            correct: correct ? 1 : 0,
            track: activeTrack,
          } as any);
          if (!insertError) {
            recordedExtremeQuestionIdsRef.current.add(currentQuestion.id);
            extremeAttemptedIdsRef.current.add(currentQuestion.id);
          }
        }
      } catch (error) {
        console.error('Error saving extreme result:', error);
      }
    } else if (currentQuestion.question_type) {
      const { data: authData } = await supabase.auth.getUser();
      const sessionUser = authData?.user;
      if (!sessionUser) return;

      const topic = normalizeTopicName(currentQuestion.question_type);
      const timestamp = new Date().toISOString();

      try {
        const baseRow = {
          user_id: sessionUser.id,
          topic,
          correct: correct ? 1 : 0,
          attempts: 1,
        };

        const preferredRows = [
          {
            ...baseRow,
            question_id: currentQuestion.id,
            session_id: sessionId,
            started_at: timestamp,
            finished_at: timestamp,
            difficulty: currentQuestion.difficulty != null ? String(currentQuestion.difficulty) : null,
            meta: {
              question_id: currentQuestion.id,
              mode,
              tier: currentQuestion.tier ?? null,
              calculator: currentQuestion.calculator ?? null,
              subtopic: currentQuestion.subtopic ?? null,
              user_answer: selectedAnswer,
            },
          },
          { ...baseRow, question_id: currentQuestion.id, session_id: sessionId },
          baseRow,
        ];

        let lastError: any = null;
        for (const row of preferredRows) {
          const { error } = await supabase.from("practice_results").insert(row as any);
          if (!error) {
            lastError = null;
            break;
          }
          lastError = error;
        }

        if (lastError) {
          console.error(
            "Error saving practice result:",
            lastError,
            JSON.stringify(
              {
                message: (lastError as any)?.message,
                details: (lastError as any)?.details,
                hint: (lastError as any)?.hint,
                code: (lastError as any)?.code,
              },
              null,
              2,
            ),
          );
          toast.error("Couldn't update leaderboard score. Please retry.");
          return;
        }

        const difficultyForReadiness = (() => {
          const raw = typeof currentQuestion.difficulty === 'number' ? currentQuestion.difficulty : NaN;
          if (!Number.isFinite(raw)) return 3;
          return clampDifficulty(Math.round(raw));
        })();

        await supabase.functions.invoke('update-readiness', {
          body: {
            user_id: sessionUser.id,
            topic,
            difficulty: difficultyForReadiness,
            correct,
            timestamp
          }
        });

        await supabase.from("mindprint_events").insert({
          user_id: sessionUser.id,
          topic,
          correct,
          mode: mode,
          question_id: currentQuestion.id,
          confidence: confidence || null,
        });
      } catch (error) {
        console.error("Error saving result:", error);
      }
    }
  };

  const handleNext = async () => {
    // If in extreme mode and at or above limit, show modal and block
    if (mode === "extreme" && !isPremium && dailyChallengeUses >= dailyChallengeLimit) {
      setShowChallengeLimitModal(true);
      return;
    }
    const multipart = currentQuestion?.multipart;
    if (multipart && multipart.parts.length > 0 && partIndex < multipart.parts.length - 1) {
      const nextIndex = partIndex + 1;
      setPartIndex(nextIndex);
      setSelectedAnswer(partAnswers[nextIndex] ?? null);
      setHasSubmitted(false);
      setIsCorrect(null);
      setShowSolution(false);
      return;
    }
    const currentDifficulty = typeof currentQuestion?.difficulty === "number"
      ? clampDifficulty(currentQuestion.difficulty)
      : null;
    if (currentDifficulty != null) {
      targetDifficultyRef.current = currentDifficulty;
    }
    const ok = await fetchQuestion(
      currentDifficulty != null
        ? { difficultyExact: currentDifficulty, silentNoResults: true }
        : undefined
    );
    if (ok) setQuestionNumber(prev => prev + 1);
  };

  const handleDifficultyRequest = async (kind: "easier" | "similar" | "harder") => {
    if (loading) return;
    if (!currentQuestion) return;
    const multipart = currentQuestion.multipart;
    if (multipart && multipart.parts.length > 0 && partIndex < multipart.parts.length - 1) {
      toast.message("Finish all parts before requesting difficulty changes.");
      return;
    }

    // If we're in a fixed pack or extreme mode, difficulty-based navigation isn't supported.
    if (hasFixedQuestionIds || mode === "extreme") {
      toast.message("Difficulty buttons aren't available for this session.");
      return;
    }

    const cur = typeof currentQuestion.difficulty === "number" ? currentQuestion.difficulty : NaN;
    if (!Number.isFinite(cur)) {
      toast.message("This question has no difficulty rating.");
      return;
    }

    const clampDifficulty = (n: number) => Math.max(1, Math.min(maxDifficulty, n));
    const currentClamped = clampDifficulty(cur);

    if (kind === "harder" && currentClamped >= maxDifficulty) {
      toast.message("You're already on the hardest setting.");
      return;
    }

    if (kind === "easier" && currentClamped <= 1) {
      toast.message("You're already on the easiest setting.");
      return;
    }

    const desired = kind === "harder" ? clampDifficulty(currentClamped + 1) : clampDifficulty(currentClamped - 1);
    targetDifficultyRef.current = desired;
    const ok = await fetchQuestion({ difficultyExact: desired, silentNoResults: true });
    if (ok) {
      setQuestionNumber(prev => prev + 1);
    } else {
      toast.message("Couldn't find a matching question at that difficulty.");
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleChallengePaywallReturn = () => {
    setShowChallengeLimitModal(false);
    handleBack();
  };
  const handlePracticePaywallReturn = () => {
    setShowPracticeLimitModal(false);
    handleBack();
  };

  const multipart = currentQuestion?.multipart;
  const activePart = multipart?.parts?.[partIndex];
  const activeAnswers = activePart?.all_answers ?? currentQuestion?.all_answers ?? [];
  const activeCorrectAnswer = activePart?.correct_answer ?? currentQuestion?.correct_answer ?? "";
  const activePartLabel = activePart?.label ?? (multipart ? `Part ${String.fromCharCode(65 + partIndex)}` : null);
  const isQuestionComplete = !multipart || (partIndex >= multipart.parts.length - 1 && hasSubmitted);
  const showDifficultyButtons = isQuestionComplete && mode !== "extreme";
  const canShowSolution = Boolean(currentQuestion?.explanation && (!multipart || isQuestionComplete));

  const getOptionClass = (answer: string) => {
    if (!hasSubmitted) {
      return selectedAnswer === answer ? "selected" : "";
    }
    if (answer === activeCorrectAnswer) return "correct";
    if (answer === selectedAnswer && !isCorrect) return "incorrect";
    return "";
  };

  const getLetterClass = (answer: string) => {
    if (!hasSubmitted) {
      return selectedAnswer === answer ? "selected" : "";
    }
    if (answer === activeCorrectAnswer) return "correct";
    if (answer === selectedAnswer && !isCorrect) return "incorrect";
    return "";
  };

  const letters = ["A", "B", "C", "D", "E", "F"];

  const { subtopicLabel } = getTopicAndSubtopicLabels({
    questionType: currentQuestion?.question_type ?? null,
    subtopicId: currentQuestion?.subtopic ?? null,
    fallbackTopic: topics,
  });

  const questionTierLabel = (() => {
    const raw = String(currentQuestion?.tier ?? '').trim();
    if (!raw) return null;
    if (raw === "11+ Standard") return "11+ Standard";
    if (raw.toLowerCase().includes('foundation')) return 'Foundation';
    if (raw.toLowerCase().includes('higher')) return 'Higher';
    return raw;
  })();

  const questionCalculatorLabel = (() => {
    const raw = String(currentQuestion?.calculator ?? '').trim();
    if (!raw) return null;
    if (raw.toLowerCase().includes('non')) return 'Non-calc';
    if (raw.toLowerCase().includes('calc')) return 'Calc';
    return raw;
  })();
  const questionDifficultyLabel = (() => {
    const value = Number(currentQuestion?.difficulty);
    if (!Number.isFinite(value)) return null;
    const normalized = Math.round(value);
    if (userTrack === "11plus") {
      return ELEVEN_PLUS_DIFFICULTY_LABELS[normalized] || `Level ${normalized}`;
    }
    return `Difficulty ${normalized}`;
  })();

  const tagBaseClass =
    'inline-flex items-center rounded-md px-1.5 py-0 text-[8px] sm:text-[11px] leading-none font-semibold border practice-tag-pill';
  const tagStyles = {
    subtopic: 'bg-sky-500/15 text-sky-700 border-sky-500/20 dark:text-sky-200',
    calculator: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-200',
    tier: 'bg-violet-500/15 text-violet-700 border-violet-500/20 dark:text-violet-200',
    difficulty: 'bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-200',
    retry: 'bg-rose-500/15 text-rose-700 border-rose-500/20 dark:text-rose-200',
  };

  if (loading && !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loading && !currentQuestion) {
    if (showChallengeLimitModal) {
      return (
        <>
          <ChallengeLimitModal
            open
            onOpenChange={setShowChallengeLimitModal}
            onComeBack={handleChallengePaywallReturn}
          />
        </>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="card-exam-glow">
          <div className="p-5 sm:p-6">
            <div className="text-lg font-semibold text-foreground mb-1">No questions found</div>
            <div className="text-sm text-muted-foreground mb-6">
              Try again, or broaden filters (tier/calculator/subtopic).
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => fetchQuestion()} className="btn-exam-primary py-3">
                Retry
              </button>
              <button onClick={handleBack} className="btn-exam-secondary py-3">
                Back
              </button>
            </div>
          </div>
        </div>
        <ChallengeLimitModal
          open={showChallengeLimitModal}
          onComeBack={handleChallengePaywallReturn}
          onOpenChange={setShowChallengeLimitModal}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 pb-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between py-3 sm:py-4 fade-up-exam fade-up-exam-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-lg transition-all duration-200 hover:bg-muted hover:scale-105 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="badge-exam gradient-bg-subtle-exam text-primary">
            {headerTopicsLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {currentQuestion?.calculator === "Calculator" && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calculator</span>
            </div>
          )}
        </div>
      </div>

      {/* Question Card */}
      <div className="card-exam-glow mb-4 fade-up-exam fade-up-exam-2 practice-question-card">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-sm font-semibold text-foreground">
                <span className="sm:hidden">Q{questionNumber}</span>
                <span className="hidden sm:inline">Question {questionNumber}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {subtopicLabel && (
                <span className={`${tagBaseClass} ${tagStyles.subtopic} max-w-[140px] sm:max-w-[200px] truncate`}>
                  {subtopicLabel}
                </span>
              )}
              {questionCalculatorLabel && questionCalculatorLabel !== 'Non-calc' && (
                <span className={`${tagBaseClass} ${tagStyles.calculator} whitespace-nowrap`}>
                  {questionCalculatorLabel}
                </span>
              )}
              {questionTierLabel && questionTierLabel !== '11+ Standard' && (
                <span className={`${tagBaseClass} ${tagStyles.tier} whitespace-nowrap`}>
                  {questionTierLabel}
                </span>
              )}
              {questionDifficultyLabel && (
                <span className={`${tagBaseClass} ${tagStyles.difficulty} whitespace-nowrap`}>
                  {questionDifficultyLabel}
                </span>
              )}
              {currentQuestion?.wasWrongBefore && (
                <span className={`${tagBaseClass} ${tagStyles.retry} whitespace-nowrap`}>
                  Wrong before
                </span>
              )}
            </div>
          </div>

          <div className="text-base sm:text-lg font-medium leading-relaxed mb-5 text-foreground space-y-3">
            {currentQuestion?.question && (
              <RichQuestionContent text={currentQuestion.question} className="space-y-2" />
            )}
            {activePart && (
              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                {activePartLabel && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {activePartLabel}
                  </div>
                )}
                <RichQuestionContent text={activePart.prompt} className="space-y-2" />
              </div>
            )}
          </div>

          {currentQuestion?.image_url && (
            <div className="mb-6">
              <div className="question-image-shell">
                <ImageWithFallback
                  src={currentQuestion.image_url}
                  alt={currentQuestion.image_alt || "Question diagram"}
                  className="question-image-media"
                />
              </div>
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-2.5">
            {activeAnswers.map((answer, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(answer)}
                disabled={hasSubmitted}
                className={cn("option-card-exam", getOptionClass(answer))}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("option-letter-exam", getLetterClass(answer))}>
                    {letters[idx]}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    <MathText text={answer} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        {!hasSubmitted && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className="btn-exam-primary w-full"
            >
              Submit Answer
            </button>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      {hasSubmitted && (
        <div className="space-y-4 animate-slide-up-exam">
          <div className="card-exam-glow overflow-hidden">
            {/* Feedback Header */}
            <div className={cn(
              "px-4 sm:px-5 py-4 border-b border-border",
              isCorrect ? "feedback-header-correct" : "feedback-header-incorrect"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                  isCorrect ? "feedback-icon-correct" : "feedback-icon-incorrect"
                )}>
                  {isCorrect ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div>
                  <h3 className={cn("text-sm font-semibold", isCorrect ? "text-green-500" : "text-red-500")}>
                    {activePartLabel ? `${activePartLabel}: ` : ""}{isCorrect ? "Correct!" : "Incorrect"}
                  </h3>
                  <p className="text-xs mt-0.5 text-muted-foreground">
                    {isCorrect 
                      ? "Well done! You got this one right." 
                      : (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          <span>The correct answer is:</span>
                          {activeCorrectAnswer ? (
                            <MathText text={activeCorrectAnswer} />
                          ) : null}
                        </span>
                      )}
                  </p>
                </div>
              </div>
            </div>

            {/* Expandable Explanation */}
            {canShowSolution && (
              <div className="divide-y divide-border/50">
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="expand-trigger-exam"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-bg-subtle-exam flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Full Solution</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-300",
                    showSolution && "rotate-180"
                  )} />
                </button>
                <div className={cn("expandable-content", showSolution && "open")}>
                  <div className="px-4 sm:px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                    {mode === "extreme" && challengeExplanation ? (
                      <div className="space-y-3 text-foreground">
                        {(() => {
                          let stepNumber = 0;
                          return challengeExplanation.lines.map((line, idx) => {
                            if (line.kind === "step") {
                              stepNumber += 1;
                              return (
                                <div key={`challenge-step-${idx}`} className="space-y-1">
                                  <p className="font-semibold">{`Step ${stepNumber}:`}</p>
                                  {line.text ? <RichQuestionContent text={line.text} className="space-y-1" /> : null}
                                </div>
                              );
                            }
                            return (
                              <div key={`challenge-text-${idx}`}>
                                <RichQuestionContent text={line.text} className="space-y-1" />
                              </div>
                            );
                          });
                        })()}
                        {challengeExplanation.finalAnswer && (
                          <div className="pt-2">
                            <p className="font-semibold">Final answer:</p>
                            <p className="font-semibold underline decoration-2 underline-offset-2">
                              <MathText text={challengeExplanation.finalAnswer} />
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <RichQuestionContent text={explanationForDisplay} className="space-y-2" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confidence Check */}
          {isQuestionComplete && !confidence && (
            <div className="card-exam-glow p-4 sm:p-5">
              <p className="text-sm font-medium mb-3 text-foreground">How confident were you?</p>
              <div className="grid grid-cols-3 gap-2">
                {["Guessed", "Unsure", "Confident"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfidence(level.toLowerCase())}
                    className={cn("confidence-btn-exam", confidence === level.toLowerCase() && "selected")}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isQuestionComplete && confidence && (
            <div className="card-exam-glow p-4 sm:p-5">
              <div className="flex items-center justify-center gap-2 py-2">
                <Check className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Confidence recorded: <span className="text-primary font-semibold capitalize">{confidence}</span>
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-full flex justify-center gap-2">
              {showDifficultyButtons && (
                <button
                  onClick={() => handleDifficultyRequest("easier")}
                  className="btn-exam-secondary py-2.5 text-[11px] sm:text-sm min-w-[72px]"
                >
                  Easier
                </button>
              )}
              <button
                onClick={handleNext}
                className="btn-exam-primary py-3 flex-grow max-w-xl text-center"
              >
                {multipart && partIndex < (multipart.parts.length - 1) ? "Next Part" : "Next Question"}
              </button>
              {showDifficultyButtons && (
                <button
                  onClick={() => handleDifficultyRequest("harder")}
                  className="btn-exam-secondary py-2.5 text-[11px] sm:text-sm min-w-[72px]"
                >
                  Harder
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <PracticeLimitModal
        open={showPracticeLimitModal}
        onOpenChange={setShowPracticeLimitModal}
        onComeBack={handlePracticePaywallReturn}
      />
      <ChallengeLimitModal
        open={showChallengeLimitModal}
        onOpenChange={setShowChallengeLimitModal}
        onComeBack={handleChallengePaywallReturn}
      />
    </div>
  );
}
