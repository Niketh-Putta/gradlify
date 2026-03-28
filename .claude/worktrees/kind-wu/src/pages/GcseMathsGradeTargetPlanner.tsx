import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ForceTheme } from "@/components/ForceTheme";
import { ToolsNav } from "@/components/ToolsNav";
import { FreeToolSEO } from "@/components/FreeToolSEO";
import {
  DEFAULT_BOARD,
  DEFAULT_TIER,
  PLANNER_BOARDS,
  computePlannerResult,
  getGradeOptionsForTier,
  getPlannerStats,
  getTargetGradeOptions,
  type PlannerBoard,
  type PlannerGradeLabel,
  type PlannerResult,
  type PlannerTier,
} from "@/lib/gcseGradeTargetPlanner";

const TOOL_PATH = "/free-tools/gcse-maths-grade-target-planner";
const TOOL_TITLE = "GCSE Maths Grade Target Planner – Marks Needed to Improve Your Grade";
const TOOL_DESCRIPTION =
  "Use the GCSE maths grade planner to see how many marks you need to reach a higher grade. Compare typical grade boundaries and plan revision targets fast.";
const OG_IMAGE_URL = "https://gradlify.com/og-logo-v2.png";

const FAQ_ITEMS = [
  {
    question: "What is the GCSE Maths Grade Target Planner?",
    answer:
      "It estimates the marks gap between a current grade and a target grade using typical recent grade boundaries.",
  },
  {
    question: "How should I use the planner results?",
    answer:
      "Use the marks gap and per-paper target as a revision benchmark so you know how many extra marks to aim for.",
  },
  {
    question: "Does the planner use exact exam board boundaries?",
    answer:
      "It uses typical recent boundaries to give a practical estimate. Exact thresholds vary by board and year.",
  },
];

const INTRO_COPY =
  "See how many marks you likely need to move from your current grade to a higher target grade. The planner compares typical boundaries and shows an estimated marks gap per paper.";
const HELP_COPY =
  "It provides a clear marks target so GCSE students can plan revision goals and track progress without guessing what improvement looks like.";

const DEFAULT_CURRENT_BY_TIER: Record<PlannerTier, PlannerGradeLabel> = {
  Foundation: "3",
  Higher: "5",
};

const DEFAULT_TARGET_BY_TIER: Record<PlannerTier, PlannerGradeLabel> = {
  Foundation: "5",
  Higher: "7",
};

function formatMarks(value: number) {
  return `${value} marks`;
}

function getPerPaperContext(result: PlannerResult) {
  if (result.marksPerPaper <= 6) {
    return "An extra few marks per paper is best achieved by fixing recurring mistakes rather than learning lots of new content.";
  }
  if (result.marksPerPaper <= 12) {
    return "This is best achieved by improving accuracy on familiar topics and completing more questions fully.";
  }
  return "This level of improvement is best achieved with consistent paper practice, careful error review, and tightening method marks.";
}

const FOUNDATION_GRADE_ROWS = [1, 2, 3, 4, 5];
const HIGHER_GRADE_ROWS = [4, 5, 6, 7, 8, 9];

function formatBoundary(value: number | undefined) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)} marks`;
}

function getInsightLine(result: PlannerResult) {
  return `This gap equals ${result.marksPerPaper} extra marks per paper. The safest gains come from method marks, accuracy, and finishing questions.`; 
}

function getMeaningText(difficulty: PlannerResult["difficulty"]) {
  if (difficulty === "Very achievable") {
    return "This gap is realistic for most students with focused practice.";
  }
  if (difficulty === "Achievable with focused practice") {
    return "This improvement usually requires consistent revision across weak topics.";
  }
  return "This is achievable, but will require regular practice and targeted revision.";
}

function getTierTips(tier: PlannerTier) {
  if (tier === "Foundation") {
    return [
      "Prioritise the core skills that appear on every paper: fractions, percentages, ratio, and basic algebra.",
      "Secure method marks by showing every step clearly.",
      "Practise common question types until the method feels automatic.",
    ];
  }
  return [
    "Focus on multi-step algebra, non-routine geometry, and problem-solving.",
    "Work on accuracy and method marks in longer questions.",
    "Build exam stamina by completing full papers under timed conditions.",
  ];
}

function getNextSteps(tier: PlannerTier, difficulty: PlannerResult["difficulty"]) {
  if (tier === "Foundation") {
    if (difficulty === "Very achievable") {
      return [
        "Revisit your weakest topics from notes and complete short practice sets.",
        "Focus on accuracy with fractions, percentages, and ratio.",
        "Do one mixed practice paper and review every method mark.",
      ];
    }
    if (difficulty === "Achievable with focused practice") {
      return [
        "Prioritise 3–4 weak topics and practise until the methods feel secure.",
        "Work through common exam formats like word problems and basic algebra.",
        "Complete two mixed papers and correct every error using the mark scheme.",
      ];
    }
    return [
      "Relearn core methods for number, ratio, and algebra with short daily practice.",
      "Build consistency with structured topic practice before full papers.",
      "Complete three mixed papers over your next revision cycle and review mistakes in detail.",
    ];
  }

  if (difficulty === "Very achievable") {
    return [
      "Tighten accuracy in algebra and geometry with short, timed practice.",
      "Identify recurring slips and fix them with targeted questions.",
      "Complete one full paper and review method marks.",
    ];
  }
  if (difficulty === "Achievable with focused practice") {
    return [
      "Focus on multi-step algebra, problem solving, and non-routine geometry.",
      "Mix topic practice with timed exam questions to build speed.",
      "Complete two full papers and review every dropped mark.",
    ];
  }
  return [
    "Rebuild key methods in algebra and geometry before attempting full papers.",
    "Use mixed question sets to improve problem-solving confidence.",
    "Complete three timed papers over the next revision cycle and review mistakes carefully.",
  ];
}

export default function GcseMathsGradeTargetPlanner() {
  const [tier, setTier] = useState<PlannerTier>(DEFAULT_TIER);
  const [board, setBoard] = useState<PlannerBoard>(DEFAULT_BOARD);
  const [currentGrade, setCurrentGrade] = useState<PlannerGradeLabel>(
    DEFAULT_CURRENT_BY_TIER[DEFAULT_TIER],
  );
  const [targetGrade, setTargetGrade] = useState<PlannerGradeLabel>(
    DEFAULT_TARGET_BY_TIER[DEFAULT_TIER],
  );
  const [result, setResult] = useState<PlannerResult | null>(null);

  const plannerStats = useMemo(() => getPlannerStats(board, tier), [board, tier]);
  const boardStats = useMemo(
    () => ({
      AQA: {
        Foundation: getPlannerStats("AQA", "Foundation"),
        Higher: getPlannerStats("AQA", "Higher"),
      },
      Edexcel: {
        Foundation: getPlannerStats("Edexcel", "Foundation"),
        Higher: getPlannerStats("Edexcel", "Higher"),
      },
      OCR: {
        Foundation: getPlannerStats("OCR", "Foundation"),
        Higher: getPlannerStats("OCR", "Higher"),
      },
    }),
    [],
  );
  const gradeOptions = useMemo(() => getGradeOptionsForTier(tier), [tier]);
  const targetOptions = useMemo(
    () => getTargetGradeOptions(tier, currentGrade),
    [tier, currentGrade],
  );

  const canSubmit = targetOptions.some((grade) => grade === targetGrade);

  const handleTierChange = (nextTier: PlannerTier) => {
    const nextCurrent = DEFAULT_CURRENT_BY_TIER[nextTier];
    const nextTargets = getTargetGradeOptions(nextTier, nextCurrent);
    const preferredTarget = DEFAULT_TARGET_BY_TIER[nextTier];
    const nextTarget = nextTargets.includes(preferredTarget)
      ? preferredTarget
      : nextTargets[0] ?? nextCurrent;

    setTier(nextTier);
    setCurrentGrade(nextCurrent);
    setTargetGrade(nextTarget);
    setResult(null);
  };

  const handleCurrentGradeChange = (nextCurrent: PlannerGradeLabel) => {
    const nextTargets = getTargetGradeOptions(tier, nextCurrent);
    const nextTarget = nextTargets.includes(targetGrade)
      ? targetGrade
      : nextTargets[0] ?? nextCurrent;

    setCurrentGrade(nextCurrent);
    setTargetGrade(nextTarget);
    setResult(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const nextResult = computePlannerResult({
      board,
      tier,
      currentGrade,
      targetGrade,
    });

    setResult(nextResult);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <ForceTheme theme="light">
      <div className="min-h-screen bg-white text-slate-900" style={{ colorScheme: "light" }}>
        <ToolsNav label="Free Tools by Gradlify" lockTheme="light" />
        <FreeToolSEO
          title={TOOL_TITLE}
          description={TOOL_DESCRIPTION}
          canonicalPath={TOOL_PATH}
          toolName="GCSE Maths Grade Target Planner"
          intro={INTRO_COPY}
          helpTitle="How the Grade Target Planner helps GCSE students"
          helpText={HELP_COPY}
          faqItems={FAQ_ITEMS}
          ogImageUrl={OG_IMAGE_URL}
        >
          <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">

          <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">Tier</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["Foundation", "Higher"] as const).map((tierOption) => {
                    const isActive = tier === tierOption;
                    return (
                      <button
                        key={tierOption}
                        type="button"
                        onClick={() => handleTierChange(tierOption)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          isActive
                            ? "border-indigo-500 bg-indigo-50 text-slate-900"
                            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300"
                        }`}
                        aria-pressed={isActive}
                      >
                        {tierOption}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-900">Exam board</span>
                  <select
                    value={board}
                    onChange={(event) => {
                      setBoard(event.target.value as PlannerBoard);
                      setResult(null);
                    }}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    {PLANNER_BOARDS.map((boardOption) => (
                      <option key={boardOption} value={boardOption}>
                        {boardOption}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-900">Current grade</span>
                  <select
                    value={currentGrade}
                    onChange={(event) => handleCurrentGradeChange(event.target.value as PlannerGradeLabel)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    {gradeOptions.map((gradeOption) => (
                      <option key={gradeOption} value={gradeOption}>
                        {gradeOption}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-900">Target grade</span>
                  <select
                    value={targetGrade}
                    onChange={(event) => {
                      setTargetGrade(event.target.value as PlannerGradeLabel);
                      setResult(null);
                    }}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    disabled={targetOptions.length === 0}
                  >
                    {targetOptions.map((gradeOption) => (
                      <option key={gradeOption} value={gradeOption}>
                        {gradeOption}
                      </option>
                    ))}
                  </select>
                  {targetOptions.length === 0 && (
                    <p className="text-xs font-medium text-amber-700">
                      You are already at the top grade for this tier.
                    </p>
                  )}
                </label>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Plan my grade gap
              </button>
            </form>
          </section>

          {result && (
            <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Planner results
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Marks needed to reach Grade {result.targetGrade}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Estimated from recent boundary patterns for {result.board} {result.tier}.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700 sm:grid sm:grid-cols-3 sm:gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current grade
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      Grade {result.currentGrade}
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Target grade
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      Grade {result.targetGrade}
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Board & tier
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {result.board} {result.tier}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Estimated grade gap
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-indigo-700">
                    {formatMarks(result.estimatedGapMarks)}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Approximate marks per paper
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatMarks(result.marksPerPaper)}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {getPerPaperContext(result)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Difficulty assessment
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{result.difficulty}</div>
                    <div className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-600">
                      Based on historical boundaries for {result.board} {result.tier}.
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Interpretation
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-800">
                    {getMeaningText(result.difficulty)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {getInsightLine(result)}
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
                    <li>Fewer method errors</li>
                    <li>Better accuracy on familiar topics</li>
                    <li>Avoiding common exam mistakes</li>
                    <li>Completing questions fully</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What to do next
                  </div>
                  <ol className="mt-3 space-y-2 text-sm text-slate-700">
                    {getNextSteps(result.tier, result.difficulty).map((step, index) => (
                      <li
                        key={step}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                      >
                        {index + 1}. {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    Focus your revision where it counts — start targeted practice.
                  </p>
                  <Link
                    to="/mocks"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Start targeted practice
                  </Link>
                </div>
              </div>
            </section>
          )}

          <details className="mx-auto mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <summary className="cursor-pointer list-none">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Typical GCSE grade boundaries
              </div>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                Approximate marks by board (total across 3 papers)
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Expand for a reference table based on recent patterns.
              </p>
            </summary>

            <div className="mt-6 space-y-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full bg-white text-sm">
                  <caption className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Foundation tier (Grades 1–5)
                  </caption>
                  <thead className="bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Grade</th>
                      <th scope="col" className="px-4 py-3">AQA</th>
                      <th scope="col" className="px-4 py-3">Edexcel</th>
                      <th scope="col" className="px-4 py-3">OCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FOUNDATION_GRADE_ROWS.map((grade) => (
                      <tr key={`foundation-${grade}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-900">Grade {grade}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatBoundary(boardStats.AQA.Foundation.gradeStats[grade]?.median)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatBoundary(boardStats.Edexcel.Foundation.gradeStats[grade]?.median)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatBoundary(boardStats.OCR.Foundation.gradeStats[grade]?.median)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full bg-white text-sm">
                  <caption className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Higher tier (Grades 4–9)
                  </caption>
                  <thead className="bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Grade</th>
                      <th scope="col" className="px-4 py-3">AQA</th>
                      <th scope="col" className="px-4 py-3">Edexcel</th>
                      <th scope="col" className="px-4 py-3">OCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HIGHER_GRADE_ROWS.map((grade) => (
                      <tr key={`higher-${grade}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-900">Grade {grade}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatBoundary(boardStats.AQA.Higher.gradeStats[grade]?.median)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatBoundary(boardStats.Edexcel.Higher.gradeStats[grade]?.median)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatBoundary(boardStats.OCR.Higher.gradeStats[grade]?.median)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-700">
              Grade boundaries are the minimum marks needed for each grade. They shift each year,
              so use these as a guide and plan revision around consistent methods and accuracy.
            </p>
          </details>

          <details className="mx-auto mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <summary className="cursor-pointer list-none">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Revision guidance
              </div>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                Tier focus and how to interpret results
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Expand for tier priorities and short explanations.
              </p>
            </summary>

            <div className="mt-6 space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Tier-specific revision tips
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900">
                  What to prioritise for {tier} tier
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {getTierTips(tier).map((item) => (
                    <li key={item} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Highest-value topics for quick gains
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      Foundation Tier Revision Focus
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      <li>Fractions, decimals, and percentages with calculator accuracy.</li>
                      <li>Ratio, proportion, and simple algebra methods.</li>
                      <li>Angles, area, and basic geometry facts.</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      Higher Tier Revision Focus
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      <li>Algebra manipulation, rearranging, and quadratic methods.</li>
                      <li>Geometry and trigonometry with multi-step reasoning.</li>
                      <li>Problem-solving questions that combine topics.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What GCSE grade boundaries are
                  </div>
                  <p className="mt-2 leading-6">
                    Grade boundaries are the minimum marks needed for each grade and vary by exam
                    board and year depending on paper difficulty and national performance.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Why marks gaps matter
                  </div>
                  <p className="mt-2 leading-6">
                    The marks gap shows the approximate difference between your current grade and
                    your target grade, helping you plan realistic revision goals and paper targets.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    How to interpret the planner results
                  </div>
                  <p className="mt-2 leading-6">
                    Use the per-paper target to guide practice, then focus on method marks and
                    accuracy in the topics you drop most often.
                  </p>
                </div>
              </div>
            </div>
          </details>

          <section className="mx-auto mt-12 max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900">How this GCSE Maths grade target planner works</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              This tool estimates how many marks you may need to improve your GCSE Maths grade
              based on historical grade boundaries from AQA, Edexcel, and OCR. It compares typical
              boundary marks for your current grade and your target grade, then calculates the
              approximate gap.
            </p>

            <h3 className="mt-6 text-base font-semibold text-slate-900">
              Who this is for
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              It is designed for GCSE Maths students who want a clear, realistic answer to questions
              like "how many marks do I need for a 7 in maths" or "what grade am I on in GCSE maths"
              without guesswork.
            </p>

            <h3 className="mt-6 text-base font-semibold text-slate-900">
              Why the estimates are trustworthy
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              The planner uses published historical boundaries and takes a middle-ground estimate
              rather than one extreme year. For GCSE Maths, it assumes three papers and spreads the
              required marks evenly per paper so you can plan revision clearly.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-medium text-slate-600">
              Based on {plannerStats.sampleSetCount} past grade boundary sets for {board} {tier}.
            </div>
          </section>

          <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Explore related tools
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <a href="/gcse-maths-grade-boundaries" className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300">
                <span className="font-semibold text-slate-900">
                  Want exact grade thresholds? Try the Grade Boundaries Calculator
                </span>
                <span className="mt-1 block text-slate-600">
                  See the published marks needed for each grade by board and year.
                </span>
              </a>
              <a href="/free-tools/gcse-maths-topic-weakness-test" className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300">
                <span className="font-semibold text-slate-900">
                  Unsure which topics to fix? Take the Topic Weakness Test
                </span>
                <span className="mt-1 block text-slate-600">
                  Get a clear topic-by-topic breakdown in 10 questions.
                </span>
              </a>
              <a href="/free-tools" className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300">
                <span className="font-semibold text-slate-900">
                  Explore all free GCSE Maths tools
                </span>
                <span className="mt-1 block text-slate-600">
                  Grade planning, diagnostics, and boundaries in one place.
                </span>
              </a>
            </div>
          </section>

          <p className="mx-auto mt-6 max-w-3xl text-xs font-medium text-slate-500">
            Estimates are based on previous GCSE grade boundaries and paper structures.
          </p>
        </main>
        </FreeToolSEO>
      </div>
    </ForceTheme>
  );
}
