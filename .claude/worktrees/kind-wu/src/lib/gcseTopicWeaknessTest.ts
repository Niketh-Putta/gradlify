import {
  GCSE_TOPIC_WEAKNESS_QUESTIONS,
  GCSE_WEAKNESS_TOPICS,
  QUESTIONS_PER_ATTEMPT,
  type NumericWeaknessQuestion,
  type WeaknessQuestion,
  type WeaknessTier,
  type WeaknessTopic,
} from "@/data/gcseTopicWeaknessTest";

export type WeaknessAnswerMap = Record<string, string>;

export type TopicStat = {
  topic: WeaknessTopic;
  correct: number;
  total: number;
  accuracy: number;
};

export type WeaknessResults = {
  tier: WeaknessTier;
  totalCorrect: number;
  totalQuestions: number;
  overallAccuracy: number;
  topicStats: TopicStat[];
  ranking: TopicStat[];
  weakestTopics: TopicStat[];
};

export const TOPIC_FEEDBACK: Record<
  WeaknessTopic,
  { weak: string; steady: string; strong: string }
> = {
  Number: {
    weak: "You answered fewer questions correctly in Number. Focus on fractions, percentages, and place value.",
    steady: "Number is developing. Keep practising percentages and calculations under time pressure.",
    strong: "Number is a relative strength. Maintain this with regular mixed-number practice.",
  },
  Algebra: {
    weak: "You answered fewer questions correctly in Algebra. Focus on equations, expanding, and rearranging.",
    steady: "Algebra is steady. Build speed with solving, expanding, and substitution questions.",
    strong: "Algebra is a relative strength. Keep it sharp with regular equation practice.",
  },
  Geometry: {
    weak: "You answered fewer questions correctly in Geometry. Focus on angles, area, and key circle facts.",
    steady: "Geometry is steady. Strengthen accuracy with angles, perimeter, and area questions.",
    strong: "Geometry is a relative strength. Maintain this with regular exam-style diagrams.",
  },
  "Ratio & Proportion": {
    weak: "You answered fewer questions correctly in Ratio & Proportion. Focus on sharing, scaling, and direct proportion.",
    steady: "Ratio & Proportion is steady. Keep practising sharing ratios and proportional reasoning.",
    strong: "Ratio & Proportion is a relative strength. Maintain this with multi-step scaling practice.",
  },
  Probability: {
    weak: "You answered fewer questions correctly in Probability. Focus on basic probabilities and listing outcomes clearly.",
    steady: "Probability is steady. Keep practising simple events and combined outcomes.",
    strong: "Probability is a relative strength. Maintain this with regular tree and table questions.",
  },
  Statistics: {
    weak: "You answered fewer questions correctly in Statistics. Focus on mean, median, and reading data carefully.",
    steady: "Statistics is steady. Build confidence with averages and interpreting graphs.",
    strong: "Statistics is a relative strength. Maintain this with regular averages and data questions.",
  },
};

export function getQuestionsForTier(tier: WeaknessTier): WeaknessQuestion[] {
  const questions = GCSE_TOPIC_WEAKNESS_QUESTIONS[tier] ?? [];
  return questions.slice(0, QUESTIONS_PER_ATTEMPT);
}

function parseFraction(value: string): number | null {
  const parts = value.split("/").map((part) => part.trim());
  if (parts.length !== 2) return null;
  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

function parseNumericAnswer(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("/")) {
    return parseFraction(trimmed);
  }
  const normalized = trimmed.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isNumericCorrect(question: NumericWeaknessQuestion, rawAnswer: string | undefined) {
  if (!rawAnswer) return false;
  const parsed = parseNumericAnswer(rawAnswer);
  if (parsed === null) return false;
  const acceptable = [question.correctAnswer, ...(question.acceptableAnswers ?? [])];
  return acceptable.some((candidate) => Math.abs(candidate - parsed) < 1e-6);
}

function isQuestionCorrect(question: WeaknessQuestion, answers: WeaknessAnswerMap) {
  const answer = answers[question.id];
  if (!answer) return false;

  if (question.type === "multiple-choice") {
    return answer === question.correctOptionId;
  }

  return isNumericCorrect(question, answer);
}

function buildEmptyTopicStats() {
  const stats: Record<WeaknessTopic, { correct: number; total: number }> = {} as Record<
    WeaknessTopic,
    { correct: number; total: number }
  >;

  GCSE_WEAKNESS_TOPICS.forEach((topic) => {
    stats[topic] = { correct: 0, total: 0 };
  });

  return stats;
}

function toTopicStat(
  topic: WeaknessTopic,
  values: { correct: number; total: number },
): TopicStat {
  const accuracy = values.total > 0 ? values.correct / values.total : 0;
  return {
    topic,
    correct: values.correct,
    total: values.total,
    accuracy,
  };
}

function sortByWeakness(a: TopicStat, b: TopicStat) {
  if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
  if (a.correct !== b.correct) return a.correct - b.correct;
  return a.topic.localeCompare(b.topic);
}

export function getTopicFeedback(topic: WeaknessTopic, accuracy: number) {
  const feedback = TOPIC_FEEDBACK[topic];
  if (accuracy < 0.5) return feedback.weak;
  if (accuracy >= 0.8) return feedback.strong;
  return feedback.steady;
}

export function scoreWeaknessTest(
  tier: WeaknessTier,
  questions: WeaknessQuestion[],
  answers: WeaknessAnswerMap,
): WeaknessResults {
  const topicStatsMap = buildEmptyTopicStats();
  let totalCorrect = 0;

  questions.forEach((question) => {
    const isCorrect = isQuestionCorrect(question, answers);
    const topicStats = topicStatsMap[question.topic];
    topicStats.total += 1;
    if (isCorrect) {
      topicStats.correct += 1;
      totalCorrect += 1;
    }
  });

  const topicStats = GCSE_WEAKNESS_TOPICS.map((topic) =>
    toTopicStat(topic, topicStatsMap[topic]),
  );

  const ranking = topicStats
    .filter((stat) => stat.total > 0)
    .sort(sortByWeakness);

  const weakestTopics = ranking.slice(0, 3);
  const totalQuestions = questions.length;
  const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  return {
    tier,
    totalCorrect,
    totalQuestions,
    overallAccuracy,
    topicStats,
    ranking,
    weakestTopics,
  };
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
