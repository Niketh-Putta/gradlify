import gradeBoundariesData from "@/data/grade_boundaries.json";

export type PlannerTier = "Foundation" | "Higher";
export type PlannerBoard = "AQA" | "Edexcel" | "OCR";
export type PlannerGradeLabel = "U" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export const PLANNER_BOARDS: PlannerBoard[] = ["AQA", "Edexcel", "OCR"];
export const PLANNER_TIERS: PlannerTier[] = ["Foundation", "Higher"];

export const FOUNDATION_GRADES: PlannerGradeLabel[] = ["U", "1", "2", "3", "4", "5"];
export const HIGHER_GRADES: PlannerGradeLabel[] = ["4", "5", "6", "7", "8", "9"];

export const DEFAULT_BOARD: PlannerBoard = "AQA";
export const DEFAULT_TIER: PlannerTier = "Higher";

export const PAPERS_PER_SERIES = 3;

type Thresholds = Record<number, number>;
type RawBoundaries = Record<string, unknown>;

type GradeStats = {
  grade: number;
  min: number;
  max: number;
  median: number;
  average: number;
  sampleCount: number;
};

export type PlannerGradeBoundaryStats = {
  board: PlannerBoard;
  tier: PlannerTier;
  papers: number;
  representativeMaxMarks: number;
  sampleSetCount: number;
  gradeStats: Record<number, GradeStats>;
};

export type PlannerDifficulty =
  | "Very achievable"
  | "Achievable with focused practice"
  | "Challenging but possible with consistent work";

export type PlannerResult = {
  board: PlannerBoard;
  tier: PlannerTier;
  currentGrade: PlannerGradeLabel;
  targetGrade: PlannerGradeLabel;
  estimatedGapMarks: number;
  marksPerPaper: number;
  difficulty: PlannerDifficulty;
  guidance: string;
  boundaryStats: PlannerGradeBoundaryStats;
};

const RAW_BOUNDARIES = gradeBoundariesData as RawBoundaries;

const SERIES_PRIORITY: Record<string, number> = {
  January: 1,
  June: 2,
  November: 3,
};

function isThresholdsObject(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value as Record<string, unknown>).some((key) => /^\d+$/.test(key));
}

function normalizeThresholds(value: Record<string, unknown>): Thresholds {
  const thresholds: Thresholds = {};

  Object.entries(value).forEach(([grade, marks]) => {
    if (!/^\d+$/.test(grade)) return;
    const numericMarks = Number(marks);
    if (!Number.isFinite(numericMarks)) return;
    thresholds[Number(grade)] = numericMarks;
  });

  return thresholds;
}

type YearOption = {
  year: number;
  series?: string;
  thresholds: Thresholds;
};

function buildYearOptions(data: unknown): YearOption[] {
  if (!data || typeof data !== "object") return [];

  const options: YearOption[] = [];

  Object.entries(data as Record<string, unknown>).forEach(([yearKey, yearValue]) => {
    if (isThresholdsObject(yearValue)) {
      options.push({
        year: Number(yearKey),
        thresholds: normalizeThresholds(yearValue),
      });
      return;
    }

    if (!yearValue || typeof yearValue !== "object") return;

    Object.entries(yearValue as Record<string, unknown>).forEach(([seriesKey, seriesValue]) => {
      if (!isThresholdsObject(seriesValue)) return;
      options.push({
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

function inferMaxMarks(thresholds: Thresholds): number {
  const values = Object.values(thresholds);
  if (values.length === 0) return 240;
  const maxThreshold = Math.max(...values);
  const totals = [160, 180, 200, 240, 300];
  return totals.find((total) => total >= maxThreshold) ?? maxThreshold;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function getTierData(board: PlannerBoard, tier: PlannerTier) {
  const gcse = (RAW_BOUNDARIES?.GCSE ?? {}) as Record<string, unknown>;
  const boardData = (gcse?.[board] ?? {}) as Record<string, unknown>;
  return boardData?.[tier] ?? {};
}

function buildGradeStats(options: YearOption[]) {
  const gradeSamples: Record<number, number[]> = {};

  options.forEach(({ thresholds }) => {
    Object.entries(thresholds).forEach(([gradeKey, markValue]) => {
      const grade = Number(gradeKey);
      if (!Number.isFinite(grade)) return;
      if (!gradeSamples[grade]) gradeSamples[grade] = [];
      gradeSamples[grade].push(markValue);
    });
  });

  const gradeStats: Record<number, GradeStats> = {};

  Object.entries(gradeSamples).forEach(([gradeKey, samples]) => {
    const grade = Number(gradeKey);
    if (!Number.isFinite(grade) || samples.length === 0) return;

    const minValue = Math.min(...samples);
    const maxValue = Math.max(...samples);
    const medianValue = median(samples);
    const averageValue = average(samples);

    gradeStats[grade] = {
      grade,
      min: minValue,
      max: maxValue,
      median: medianValue,
      average: averageValue,
      sampleCount: samples.length,
    };
  });

  return gradeStats;
}

function buildRepresentativeMaxMarks(options: YearOption[]) {
  const maxMarksSamples = options.map((option) => inferMaxMarks(option.thresholds));
  const representativeMaxMarks = Math.max(240, Math.round(median(maxMarksSamples)));
  return representativeMaxMarks;
}

export function getPlannerStats(board: PlannerBoard, tier: PlannerTier): PlannerGradeBoundaryStats {
  const tierData = getTierData(board, tier);
  const options = buildYearOptions(tierData);
  const gradeStats = buildGradeStats(options);
  const representativeMaxMarks = buildRepresentativeMaxMarks(options);

  return {
    board,
    tier,
    papers: PAPERS_PER_SERIES,
    representativeMaxMarks,
    sampleSetCount: options.length,
    gradeStats,
  };
}

function gradeLabelToNumber(grade: PlannerGradeLabel): number {
  if (grade === "U") return 0;
  return Number(grade);
}

function getEstimatedThreshold(stats: PlannerGradeBoundaryStats, grade: PlannerGradeLabel): number {
  if (grade === "U") return 0;
  const gradeNumber = gradeLabelToNumber(grade);
  const gradeStat = stats.gradeStats[gradeNumber];
  if (!gradeStat) return 0;
  return Math.round(gradeStat.median);
}

function getDifficulty(gapMarks: number): PlannerDifficulty {
  if (gapMarks <= 15) return "Very achievable";
  if (gapMarks <= 35) return "Achievable with focused practice";
  return "Challenging but possible with consistent work";
}

function getGuidance(difficulty: PlannerDifficulty): string {
  if (difficulty === "Very achievable") {
    return "This is a small gap. Tighten up accuracy on core topics and focus on avoiding drop marks.";
  }
  if (difficulty === "Achievable with focused practice") {
    return "This gap is realistic with structure. Prioritise weak topics, practise full papers, and review every mistake.";
  }
  return "This is a bigger jump, but still possible. You will need consistent paper practice, deliberate topic repair, and weekly review.";
}

export function getGradeOptionsForTier(tier: PlannerTier): PlannerGradeLabel[] {
  return tier === "Foundation" ? FOUNDATION_GRADES : HIGHER_GRADES;
}

export function getTargetGradeOptions(
  tier: PlannerTier,
  currentGrade: PlannerGradeLabel,
): PlannerGradeLabel[] {
  const options = getGradeOptionsForTier(tier);
  const currentNumeric = gradeLabelToNumber(currentGrade);
  return options.filter((grade) => gradeLabelToNumber(grade) > currentNumeric);
}

export function computePlannerResult(args: {
  board: PlannerBoard;
  tier: PlannerTier;
  currentGrade: PlannerGradeLabel;
  targetGrade: PlannerGradeLabel;
}): PlannerResult {
  const { board, tier, currentGrade, targetGrade } = args;
  const stats = getPlannerStats(board, tier);

  const currentThreshold = getEstimatedThreshold(stats, currentGrade);
  const targetThreshold = getEstimatedThreshold(stats, targetGrade);
  const rawGap = Math.max(targetThreshold - currentThreshold, 0);
  const estimatedGapMarks = Math.round(rawGap);
  const marksPerPaper = Math.max(0, Math.ceil(estimatedGapMarks / stats.papers));
  const difficulty = getDifficulty(estimatedGapMarks);
  const guidance = getGuidance(difficulty);

  return {
    board,
    tier,
    currentGrade,
    targetGrade,
    estimatedGapMarks,
    marksPerPaper,
    difficulty,
    guidance,
    boundaryStats: stats,
  };
}
