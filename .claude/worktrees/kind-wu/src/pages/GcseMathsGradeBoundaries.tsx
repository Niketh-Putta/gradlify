import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import gradeBoundariesData from "@/data/grade_boundaries.json";
import { ToolsNav } from "@/components/ToolsNav";
import { ForceTheme } from "@/components/ForceTheme";

type Qualification = "GCSE" | "IGCSE";
type Tier = "Higher" | "Foundation";

type Thresholds = Record<number, number>;
const EMPTY_THRESHOLDS: Thresholds = {};

type YearOption = {
  id: string;
  label: string;
  year: number;
  series?: string;
  thresholds: Thresholds;
};

type RawBoundaries = Record<string, unknown>;

type ResultState = {
  grade: string;
  marks: number;
  maxMarks: number;
  nextGrade: number | null;
  marksNeeded: number | null;
};

const RAW_BOUNDARIES = gradeBoundariesData as RawBoundaries;

const BOARD_LABELS: Record<string, string> = {
  "Edexcel A": "Edexcel IGCSE",
};

const BOARD_ORDER: Record<Qualification, string[]> = {
  GCSE: ["AQA", "Edexcel", "OCR"],
  IGCSE: ["Edexcel A", "Cambridge IGCSE"],
};

const SERIES_PRIORITY: Record<string, number> = {
  January: 1,
  June: 2,
  November: 3,
};

const FAQ_ITEMS = [
  {
    question: "What are GCSE Maths grade boundaries?",
    answer:
      "Grade boundaries are the minimum marks needed to achieve each grade for a specific exam board and year.",
  },
  {
    question: "Do grade boundaries change every year?",
    answer:
      "Yes. Boundaries change each year based on paper difficulty and national performance.",
  },
  {
    question: "Are AQA and Edexcel grade boundaries different?",
    answer:
      "Yes. Each exam board sets its own boundaries, so the marks needed can differ by board.",
  },
  {
    question: "How do I convert marks to a GCSE grade?",
    answer:
      "Select your board, tier and year, then match your marks to the published thresholds for that year.",
  },
  {
    question: "What is the difference between Higher and Foundation?",
    answer:
      "Higher tier targets grades 4–9, Foundation targets grades 1–5. Each tier has separate boundaries.",
  },
  {
    question: "What marks do I need for a Grade 7 in GCSE Maths?",
    answer:
      "It depends on your board and year. Use the calculator to see the Grade 7 threshold for your selection.",
  },
  {
    question: "What marks do I need for a Grade 4 in GCSE Maths?",
    answer:
      "The Grade 4 threshold varies by board and year. Check the table after selecting your details.",
  },
  {
    question: "Do IGCSE grade boundaries work the same way?",
    answer:
      "They are set similarly but are specific to IGCSE boards and papers. Use the IGCSE option in the tool.",
  },
  {
    question: "Can I use predicted papers to estimate my grade?",
    answer:
      "Predicted papers can give a rough idea, but published past boundaries are more reliable.",
  },
  {
    question: "Why do boundaries vary between papers?",
    answer:
      "Differences in difficulty and cohort performance mean each paper can have different boundaries.",
  },
];

const SHARE_URL = "https://gradlify.com/gcse-maths-grade-boundaries";
const TOOL_URL = SHARE_URL;
const TOOL_TITLE = "GCSE Maths Grade Boundaries Calculator – Convert Marks to Grade";
const TOOL_DESCRIPTION =
  "Convert GCSE Maths marks to a grade using real AQA, Edexcel, and OCR grade boundaries. Fast, free, and exam-board specific.";
const OG_IMAGE_URL = "https://gradlify.com/og-logo-v2.png";

const TOOL_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "GCSE Maths Grade Boundaries Calculator",
  url: TOOL_URL,
  applicationCategory: "EducationApplication",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
  },
  description: TOOL_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "Gradlify",
    url: "https://gradlify.com",
  },
};

function trackEvent(name: string, props: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  type PosthogLike = { capture: (event: string, properties?: Record<string, unknown>) => void };
  const windowWithPosthog = window as Window & { posthog?: PosthogLike };
  windowWithPosthog.posthog?.capture(name, props);
}

function getGradeFromMarks(marks: number, thresholds: Thresholds) {
  const grades = Object.keys(thresholds)
    .map(Number)
    .sort((a, b) => b - a);
  for (const grade of grades) {
    if (marks >= thresholds[grade]) return grade.toString();
  }
  return "U";
}

function getNextGrade(marks: number, thresholds: Thresholds) {
  const grades = Object.keys(thresholds)
    .map(Number)
    .sort((a, b) => a - b);
  for (const grade of grades) {
    if (marks < thresholds[grade]) {
      return { marksNeeded: thresholds[grade] - marks, nextGrade: grade };
    }
  }
  return null;
}

function makeShareMessage(grade: string, competitive: boolean) {
  if (!grade) return "";
  if (competitive) {
    return `I got Grade ${grade} in GCSE Maths. Can you beat me? ${SHARE_URL}`;
  }
  return `I'm on Grade ${grade} in GCSE Maths. Try it: ${SHARE_URL}`;
}

function isThresholdsObject(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value as Record<string, unknown>).some((key) => /^\d+$/.test(key));
}

function normalizeThresholds(value: Record<string, unknown>): Thresholds {
  const thresholds: Thresholds = {};
  Object.entries(value).forEach(([grade, marks]) => {
    if (!/^\d+$/.test(grade)) return;
    const numeric = Number(marks);
    if (Number.isFinite(numeric)) {
      thresholds[Number(grade)] = numeric;
    }
  });
  return thresholds;
}

function buildYearOptions(data: unknown): YearOption[] {
  if (!data || typeof data !== "object") return [];
  const options: YearOption[] = [];

  Object.entries(data as Record<string, unknown>).forEach(([yearKey, yearValue]) => {
    if (isThresholdsObject(yearValue)) {
      options.push({
        id: yearKey,
        label: yearKey,
        year: Number(yearKey),
        thresholds: normalizeThresholds(yearValue),
      });
      return;
    }

    if (!yearValue || typeof yearValue !== "object") return;

    Object.entries(yearValue as Record<string, unknown>).forEach(([seriesKey, seriesValue]) => {
      if (!isThresholdsObject(seriesValue)) return;
      options.push({
        id: `${yearKey}|${seriesKey}`,
        label: `${yearKey} (${seriesKey})`,
        year: Number(yearKey),
        series: seriesKey,
        thresholds: normalizeThresholds(seriesValue),
      });
    });
  });

  return options.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const aSeries = a.series ? SERIES_PRIORITY[a.series] ?? 0 : 0;
    const bSeries = b.series ? SERIES_PRIORITY[b.series] ?? 0 : 0;
    return bSeries - aSeries;
  });
}

function getLatestYearOption(options: YearOption[]): YearOption | null {
  if (options.length === 0) return null;
  const sorted = [...options].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const aSeries = a.series ? SERIES_PRIORITY[a.series] ?? 0 : 0;
    const bSeries = b.series ? SERIES_PRIORITY[b.series] ?? 0 : 0;
    return bSeries - aSeries;
  });
  return sorted[0] ?? null;
}

function inferMaxMarks(thresholds: Thresholds): number {
  const values = Object.values(thresholds);
  if (values.length === 0) return 240;
  const maxThreshold = Math.max(...values);
  const totals = [160, 180, 200, 240, 300];
  return totals.find((total) => total >= maxThreshold) ?? maxThreshold;
}

function getBoardOptions(qualification: Qualification) {
  const boards = (RAW_BOUNDARIES?.[qualification] ?? {}) as Record<string, unknown>;
  const boardKeys = Object.keys(boards);

  const ordered = BOARD_ORDER[qualification]
    ? [
        ...BOARD_ORDER[qualification].filter((key) => boardKeys.includes(key)),
        ...boardKeys.filter((key) => !BOARD_ORDER[qualification].includes(key)),
      ]
    : boardKeys;

  const options = ordered.map((key) => ({
    value: key,
    label: BOARD_LABELS[key] ?? key,
    available: true,
  }));

  if (qualification === "IGCSE" && !boardKeys.includes("Cambridge IGCSE")) {
    options.push({
      value: "Cambridge IGCSE",
      label: "Cambridge IGCSE",
      available: false,
    });
  }

  return options;
}

const GcseMathsGradeBoundaries = () => {
  const [qualification, setQualification] = useState<Qualification>("GCSE");
  const [board, setBoard] = useState<string>("AQA");
  const [tier, setTier] = useState<Tier>("Higher");
  const [yearSelection, setYearSelection] = useState<string>("latest");
  const [marksInput, setMarksInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<ResultState | null>(null);
  const [shareStyle, setShareStyle] = useState<"standard" | "competitive">("standard");
  const [copyMessageLabel, setCopyMessageLabel] = useState("Copy message");
  const [copyLinkLabel, setCopyLinkLabel] = useState("Copy link");

  const boardOptions = useMemo(() => getBoardOptions(qualification), [qualification]);

  useEffect(() => {
    const nextBoard = boardOptions.find((option) => option.available)?.value;
    const boardIsValid = boardOptions.some((option) => option.available && option.value === board);
    if (nextBoard && (!boardIsValid || nextBoard !== board)) {
      setBoard(nextBoard);
    }
    setTier("Higher");
    setYearSelection("latest");
    setResult(null);
    setMarksInput("");
    setError("");
  }, [board, boardOptions, qualification]);

  const boardLabel = BOARD_LABELS[board] ?? board;
  const boardData = useMemo(() => {
    return (RAW_BOUNDARIES?.[qualification] as Record<string, unknown> | undefined)?.[board] ?? null;
  }, [qualification, board]);
  const hasTier = useMemo(
    () => Boolean(boardData && typeof boardData === "object" && ("Higher" in boardData || "Foundation" in boardData)),
    [boardData],
  );
  const tierData = useMemo(() => {
    if (!boardData || typeof boardData !== "object") return null;
    return hasTier ? (boardData as Record<string, unknown>)[tier] : boardData;
  }, [boardData, hasTier, tier]);

  const yearOptions = useMemo(() => buildYearOptions(tierData), [tierData]);
  const latestYearOption = useMemo(() => getLatestYearOption(yearOptions), [yearOptions]);
  const selectedYearOption = useMemo(() => {
    if (yearSelection === "latest") return latestYearOption;
    return yearOptions.find((option) => option.id === yearSelection) ?? null;
  }, [yearOptions, yearSelection, latestYearOption]);

  const yearWarning = yearSelection !== "latest" && !selectedYearOption;
  const thresholds = useMemo(
    () => selectedYearOption?.thresholds ?? EMPTY_THRESHOLDS,
    [selectedYearOption],
  );
  const maxMarks = Math.max(240, inferMaxMarks(thresholds));
  const selectedYearLabel = selectedYearOption ? selectedYearOption.label : "Most recent year";

  useEffect(() => {
    setYearSelection("latest");
    setResult(null);
    setError("");
  }, [board, tier, hasTier]);

  const gradeLabel = result?.grade ? `Grade ${result.grade}` : "";
  const shareMessage = useMemo(() => makeShareMessage(result?.grade ?? "", shareStyle === "competitive"), [result?.grade, shareStyle]);

  const targetGrades = useMemo(() => {
    return [9, 8, 7].filter((grade) => thresholds[grade]);
  }, [thresholds]);

  const handleCalculate = () => {
    if (!selectedYearOption) {
      setError("We don’t have boundaries for this selection yet.");
      return;
    }

    const trimmed = marksInput.trim();
    if (!trimmed) {
      setError("Enter your total marks");
      return;
    }

    const marks = Number(trimmed);
    if (!Number.isFinite(marks) || marks < 0 || marks > maxMarks) {
      setError(`Enter a number between 0 and ${maxMarks}`);
      return;
    }

    setError("");
    const grade = getGradeFromMarks(marks, thresholds);
    const nextInfo = getNextGrade(marks, thresholds);

    const nextGrade = nextInfo?.nextGrade ?? null;
    const marksNeeded = nextInfo?.marksNeeded ?? null;

    const nextResult: ResultState = {
      grade,
      marks,
      maxMarks,
      nextGrade,
      marksNeeded,
    };

    setResult(nextResult);

    trackEvent("grade_tool_calculate", {
      qualification,
      board,
      tier,
      year: selectedYearLabel,
      marks,
      grade,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleCalculate();
  };

  const handleAdjust = (delta: number) => {
    if (!result) return;
    const nextMarks = Math.min(maxMarks, Math.max(0, result.marks + delta));
    setMarksInput(String(nextMarks));
    const grade = getGradeFromMarks(nextMarks, thresholds);
    const nextInfo = getNextGrade(nextMarks, thresholds);
    setResult({
      grade,
      marks: nextMarks,
      maxMarks,
      nextGrade: nextInfo?.nextGrade ?? null,
      marksNeeded: nextInfo?.marksNeeded ?? null,
    });
  };

  const handleReset = () => {
    setMarksInput("");
    setResult(null);
    setError("");
  };

  const handleCopy = async (text: string, setter: (value: string) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter("Copied");
    } catch {
      setter("Copied");
    } finally {
      window.setTimeout(() => setter("Copy" + (setter === setCopyLinkLabel ? " link" : " message")), 1400);
    }
  };

  const nextTargetLabel = result?.nextGrade ? `Next target (Grade ${result.nextGrade})` : "";
  const nextTargetValue = result?.nextGrade ? `${thresholds[result.nextGrade]} / ${maxMarks}` : "";
  const marksNeeded = result?.marksNeeded ?? null;
  const nextGrade = result?.nextGrade ?? null;
  const selectedSummary = [
    qualification === "GCSE" ? "GCSE (9–1)" : "IGCSE",
    boardLabel,
    hasTier ? tier : null,
    selectedYearLabel,
  ]
    .filter(Boolean)
    .join(" • ");
  const proximityMessage =
    result && marksNeeded !== null && nextGrade !== null
      ? `You're close — about ${marksNeeded} marks from Grade ${nextGrade}.`
      : result
        ? "You're at the top grade."
        : "";

  return (
    <ForceTheme theme="light">
      <div className="min-h-screen bg-slate-50 text-slate-900" style={{ colorScheme: "light" }}>
        <Helmet>
          <title>{TOOL_TITLE}</title>
          <meta name="description" content={TOOL_DESCRIPTION} />
          <meta name="robots" content="index, follow, max-image-preview:large" />
          <link rel="canonical" href={TOOL_URL} />

          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Gradlify" />
          <meta property="og:title" content={TOOL_TITLE} />
          <meta property="og:description" content={TOOL_DESCRIPTION} />
          <meta property="og:url" content={TOOL_URL} />
          <meta property="og:image" content={OG_IMAGE_URL} />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={TOOL_TITLE} />
          <meta name="twitter:description" content={TOOL_DESCRIPTION} />
          <meta name="twitter:image" content={OG_IMAGE_URL} />

          <script type="application/ld+json">{JSON.stringify(TOOL_STRUCTURED_DATA)}</script>
        </Helmet>
        <ToolsNav lockTheme="light" />

        <div className="relative">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(900px_360px_at_15%_-10%,rgba(99,102,241,0.12),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(700px_360px_at_85%_10%,rgba(56,189,248,0.10),transparent_70%)]" />
          </div>

          <main className="relative mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <header className="mb-6 sm:mb-8">
          <Link
            to="/free-tools"
            className="inline-flex items-center gap-2 text-xs font-medium text-stone-500 transition hover:text-stone-900"
          >
            ← Back to Free Tools
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-stone-900 sm:text-3xl">
            GCSE Maths Grade Boundaries Calculator
          </h1>
          <span className="mt-2 inline-flex w-fit rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Free tool by Gradlify
          </span>
          <p className="mt-3 text-sm text-stone-500 sm:text-base">
            Enter your marks to estimate your grade using official past boundaries.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
            <li>• Works for AQA, Edexcel, OCR</li>
            <li>• Higher + Foundation tiers</li>
            <li>• Updated yearly</li>
            <li>• Free marks → grade calculator</li>
          </ul>
          <p className="mt-3 text-xs text-stone-400">
            Grade boundaries vary by exam board and year. This tool estimates grades using published boundaries where available.
          </p>
        </header>

        <section className="rounded-lg border border-stone-100 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-xs text-stone-400">
            How to use: Choose board → pick year → enter marks → get grade
          </p>

          <form className="mt-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
                Qualification
                <select
                  className="rounded-md border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900"
                  value={qualification}
                  onChange={(event) => setQualification(event.target.value as Qualification)}
                >
                  <option value="GCSE">GCSE (9–1)</option>
                  <option value="IGCSE">IGCSE</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
                Exam board
                <select
                  className="rounded-md border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900"
                  value={board}
                  onChange={(event) => {
                    setBoard(event.target.value);
                    setResult(null);
                    setError("");
                  }}
                >
                  {boardOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={!option.available}>
                      {option.available ? option.label : `${option.label} (coming soon)`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
                Year
                <select
                  className="rounded-md border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900"
                  value={yearSelection}
                  onChange={(event) => {
                    setYearSelection(event.target.value);
                    setResult(null);
                    setError("");
                  }}
                >
                  <option value="latest">Most recent year</option>
                  {yearOptions.length === 0 && (
                    <option value="none" disabled>
                      No years available
                    </option>
                  )}
                  {yearOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {yearWarning && (
                <p className="mt-2 text-xs text-amber-600">
                  We don’t have boundaries for this selection yet.
                </p>
              )}
            </div>

            {hasTier && (
              <div className="mt-4">
                <p className="text-sm font-medium text-stone-700">Tier</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["Higher", "Foundation"] as Tier[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={tier === option}
                      onClick={() => {
                        setTier(option);
                        setResult(null);
                        setError("");
                      }}
                      className={`rounded-md px-3 py-2.5 text-sm font-medium transition ${
                        tier === option
                          ? "bg-stone-900 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
                Enter your total marks
                <input
                  type="number"
                  min={0}
                  max={maxMarks}
                  inputMode="numeric"
                  value={marksInput}
                  onChange={(event) => setMarksInput(event.target.value)}
                  placeholder={`e.g. ${Math.round(maxMarks * 0.65)} out of ${maxMarks}`}
                  className={`rounded-md border bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900 dark:bg-white dark:text-stone-900 dark:placeholder:text-stone-400 ${
                    error ? "border-red-500" : "border-stone-200"
                  }`}
                />
              </label>
              <p className="mt-1 text-xs text-stone-400">Out of 240 marks (Paper 1 + Paper 2 + Paper 3)</p>
              <p className="mt-0.5 text-xs text-stone-500">
                Maximum: <span className="font-medium text-stone-700">{maxMarks}</span> marks
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {[50, 100, 150, 200].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMarksInput(String(Math.min(value, maxMarks)))}
                    className="rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-500 transition hover:bg-stone-200"
                  >
                    {value}
                  </button>
                ))}
              </div>

              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                onClick={handleCalculate}
                className="w-full rounded-md bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-105"
              >
                Get my grade
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-md border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
              >
                Reset
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-xs text-stone-400">
            Based on published past grade boundaries. Boundaries change each year.
          </p>
          <p className="mt-1 text-center text-xs text-stone-400">
            Always check your exam board for the final confirmed boundaries.
          </p>
        </section>

          <section className="mt-4 rounded-lg border border-stone-100 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-stone-900">
              What are GCSE Maths grade boundaries?
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-600">
              <p>
                Grade boundaries are the minimum marks needed for each grade in a
                given exam series. They’re published by each exam board after
                papers are marked, and they can change from year to year depending
                on paper difficulty and national performance.
              </p>
              <p>
                Boundaries also differ by tier. Higher tier targets grades 4–9,
                while Foundation tier targets grades 1–5, so the thresholds are
                not interchangeable. That’s why it’s important to match your board,
                tier, and year when you estimate your grade.
              </p>
              <p>
                Use this calculator to convert your total marks into an estimated
                grade using published past boundaries where available. It’s a
                helpful way to set realistic targets (for example, seeing how many
                marks you need to move up a grade) — but always check your exam
                board’s final confirmed boundaries for the official result.
              </p>
            </div>
          </section>

          {result && (
          <section className="mt-4 rounded-lg border border-stone-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Estimated grade</p>
              <p className="mt-2 text-4xl font-bold text-stone-900 sm:text-5xl">{gradeLabel}</p>
              <p className="mt-2 text-xl font-semibold text-stone-900 sm:text-2xl">
                {marksNeeded !== null && nextGrade !== null
                  ? `+${marksNeeded} marks to Grade ${nextGrade}`
                  : "You're at the top grade"}
              </p>
              {proximityMessage && (
                <p className="mt-2 text-sm text-stone-500">{proximityMessage}</p>
              )}
              <p className="mt-2 text-xs text-stone-500">Selected: {selectedSummary}</p>
              <p className="mt-1 text-xs text-stone-500">
                Your marks: {result.marks}/{result.maxMarks}
              </p>
            </div>

            <div className="mt-4 rounded-md bg-stone-50 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Your marks</span>
                <span className="font-medium text-stone-900">
                  {result.marks} / {result.maxMarks}
                </span>
              </div>
              {result.nextGrade !== null && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-stone-500">{nextTargetLabel}</span>
                  <span className="font-medium text-stone-900">{nextTargetValue}</span>
                </div>
              )}
              <div className="mt-3 h-2 w-full rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-stone-900 transition-all"
                  style={{ width: `${Math.min(100, Math.round((result.marks / result.maxMarks) * 100))}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-stone-400">
                Based on published past grade boundaries. Boundaries change each year.
              </p>
            </div>

            {targetGrades.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Targets (Grades 7–9)</p>
                <div className="mt-2 divide-y divide-stone-100 rounded-md border border-stone-100 text-sm">
                  {targetGrades.map((grade) => {
                    const isCurrent = result.grade !== "U" && Number(result.grade) === grade;
                    return (
                      <div
                        key={grade}
                        className={`flex items-center justify-between px-3 py-2 ${
                          isCurrent ? "bg-stone-100 text-stone-900" : "text-stone-600"
                        }`}
                      >
                        <span>Grade {grade}</span>
                        <span className="font-medium">
                          {thresholds[grade]} / {maxMarks}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => handleAdjust(-5)}
                className="h-9 w-12 rounded-md bg-stone-100 text-sm font-medium text-stone-600 transition hover:bg-stone-200"
              >
                −5
              </button>
              <span className="text-xs text-stone-400">Adjust marks</span>
              <button
                type="button"
                onClick={() => handleAdjust(5)}
                className="h-9 w-12 rounded-md bg-stone-100 text-sm font-medium text-stone-600 transition hover:bg-stone-200"
              >
                +5
              </button>
            </div>

            <div className="mt-4 text-center">
              <a
                href="https://gradlify.com/gcse?auth=signup&utm_source=free_tool&utm_medium=inline&utm_campaign=grade_boundaries"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-stone-700 underline transition hover:text-stone-900"
              >
                Improve to the next grade →
              </a>
            </div>
          </section>
        )}

          {result && (
          <section className="mt-4 rounded-lg border border-stone-100 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-stone-900">Want to jump a grade faster?</h2>
            <p className="mt-1 text-sm text-stone-500">
              Get a free personalised revision plan + targeted practice on Gradlify.
            </p>
            <div className="mt-4 flex flex-col items-start gap-2">
              <a
                href="https://gradlify.com/gcse?auth=signup&utm_source=free_tool&utm_medium=cta&utm_campaign=grade_boundaries"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("grade_tool_cta_click", { location: "results_cta" })}
                className="inline-flex rounded-md bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-105"
              >
                Get my free plan on Gradlify
              </a>
              <a
                href="https://gradlify.com/gcse?auth=signup&utm_source=free_tool&utm_medium=inline&utm_campaign=grade_boundaries"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-stone-600 underline transition hover:text-stone-900"
              >
                Try Gradlify practice →
              </a>
            </div>
          </section>
          )}

          {result && (
          <section className="mt-4 rounded-lg border border-stone-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-medium text-stone-900">Share your result</h2>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span>Style:</span>
                <button
                  type="button"
                  onClick={() => setShareStyle("standard")}
                  className={`rounded-md px-2 py-1 ${
                    shareStyle === "standard" ? "bg-stone-100 text-stone-900" : "text-stone-400"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setShareStyle("competitive")}
                  className={`rounded-md px-2 py-1 ${
                    shareStyle === "competitive" ? "bg-stone-100 text-stone-900" : "text-stone-400"
                  }`}
                >
                  Competitive
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-md bg-stone-50 p-3 text-sm text-stone-700">
              {shareMessage}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleCopy(shareMessage, setCopyMessageLabel)}
                className="rounded-md bg-stone-100 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
              >
                {copyMessageLabel}
              </button>
              <button
                type="button"
                onClick={() => handleCopy(SHARE_URL, setCopyLinkLabel)}
                className="rounded-md bg-stone-100 px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
              >
                {copyLinkLabel}
              </button>
            </div>
          </section>
          )}

          <section className="mt-4 rounded-lg border border-stone-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-stone-900">Grade boundaries</h2>
              <p className="mt-1 text-xs text-stone-500">
                Showing {qualification} boundaries for {boardLabel}
                {hasTier ? ` (${tier})` : ""}, year {selectedYearLabel}.
              </p>
              <p className="mt-1 text-xs text-amber-600">
                Boundaries change each year. Showing {selectedYearLabel} published boundaries.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <table className="w-full table-fixed text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <th className="w-1/3 py-2 pr-2 text-left font-medium">Grade</th>
                  <th className="w-1/3 py-2 pr-2 text-right font-medium">Min.</th>
                  <th className="w-1/3 py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(thresholds)
                  .map(Number)
                  .sort((a, b) => b - a)
                  .map((grade) => {
                    const marks = thresholds[grade];
                    const percentage = Math.round((marks / maxMarks) * 100);
                    const isCurrent = result?.grade !== "U" && Number(result?.grade) === grade;
                    const isNext = result?.nextGrade !== null && result?.nextGrade === grade;
                    return (
                      <tr
                        key={grade}
                        className={`border-b border-stone-50 ${
                          isCurrent ? "bg-stone-50" : isNext ? "bg-amber-50/50" : ""
                        }`}
                      >
                        <td className={`py-2 pr-2 ${isCurrent ? "font-semibold text-stone-900" : "text-stone-700"}`}>
                          Grade {grade}
                        </td>
                        <td className="py-2 pr-2 text-right text-stone-500 tabular-nums">
                          {marks}/{maxMarks}
                        </td>
                        <td className="py-2 text-right text-stone-400 tabular-nums">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-400">We update this when new boundaries are released.</p>
          </section>

          <section className="mt-4 rounded-lg border border-stone-100 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-medium text-stone-900">Common questions</h2>
          <div className="mt-4 divide-y divide-stone-100">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-stone-700">
                  {item.question}
                  <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="mt-2 pr-6 text-sm text-stone-500">{item.answer}</p>
              </details>
            ))}
          </div>
          </section>

          <section className="mt-4 rounded-lg border border-stone-100 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-sm font-medium text-stone-900">Continue with related tools</h2>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <a
                href="/free-tools/gcse-maths-grade-target-planner"
                className="block rounded-lg border border-stone-100 bg-stone-50 px-3 py-3 transition hover:border-stone-200"
              >
                <span className="font-semibold text-stone-900">
                  Want to plan your next grade? Use the Grade Target Planner
                </span>
                <span className="mt-1 block text-stone-500">
                  See the marks gap between your current grade and your target grade.
                </span>
              </a>
              <a
                href="/free-tools/gcse-maths-topic-weakness-test"
                className="block rounded-lg border border-stone-100 bg-stone-50 px-3 py-3 transition hover:border-stone-200"
              >
                <span className="font-semibold text-stone-900">
                  Not sure what to revise? Take the Topic Weakness Test
                </span>
                <span className="mt-1 block text-stone-500">
                  Get a quick topic-by-topic breakdown in 10 questions.
                </span>
              </a>
              <a
                href="/free-tools"
                className="block rounded-lg border border-stone-100 bg-stone-50 px-3 py-3 transition hover:border-stone-200"
              >
                <span className="font-semibold text-stone-900">
                  Explore all free GCSE Maths tools
                </span>
                <span className="mt-1 block text-stone-500">
                  Grade planning, diagnostics, and boundaries in one place.
                </span>
              </a>
            </div>
          </section>

          <footer className="mt-6 text-center text-xs text-stone-400">
          ©{" "}
          <a
            href="https://gradlify.com/?utm_source=grade_boundaries_tool&utm_medium=footer&utm_campaign=gcse_maths"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-stone-600"
          >
            Gradlify
          </a>
          </footer>
        </main>
      </div>
      </div>
    </ForceTheme>
  );
};

export default GcseMathsGradeBoundaries;
