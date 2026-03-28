import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ForceTheme } from "@/components/ForceTheme";
import MathText from "@/components/MathText";
import { ToolsNav } from "@/components/ToolsNav";
import { FreeToolSEO } from "@/components/FreeToolSEO";
import {
  QUESTIONS_PER_ATTEMPT,
  type WeaknessQuestion,
  type WeaknessTier,
} from "@/data/gcseTopicWeaknessTest";
import {
  formatPercent,
  getQuestionsForTier,
  getTopicFeedback,
  scoreWeaknessTest,
  type TopicStat,
  type WeaknessAnswerMap,
  type WeaknessResults,
} from "@/lib/gcseTopicWeaknessTest";

const TOOL_PATH = "/free-tools/gcse-maths-topic-weakness-test";
const TOOL_TITLE = "GCSE Maths Topic Weakness Test | Free 10-Question Diagnostic";
const TOOL_DESCRIPTION =
  "Take a free 10-question GCSE Maths diagnostic test by topic. Get a clear weakness ranking across Number, Algebra, Geometry, Ratio, Probability, and Statistics.";
const OG_IMAGE_URL = "https://gradlify.com/og-logo-v2.png";

const FAQ_ITEMS = [
  {
    question: "What is the GCSE Maths Topic Weakness Test?",
    answer:
      "It is a short diagnostic that checks your accuracy across the six GCSE Maths topics and ranks them from strongest to weakest.",
  },
  {
    question: "How many questions are in the test?",
    answer:
      "The diagnostic uses 10 questions in total so you can see a quick topic breakdown without taking a full paper.",
  },
  {
    question: "Who should use the Topic Weakness Test?",
    answer:
      "Students who want to prioritise revision topics or check which areas need the most attention before practice.",
  },
];

const INTRO_COPY =
  "Answer 10 exam-style questions to see which GCSE Maths topics are strongest and weakest. The test covers Number, Algebra, Geometry, Ratio, Probability, and Statistics so you can focus your revision.";
const HELP_COPY =
  "It gives a quick accuracy snapshot by topic, making it easier to decide what to practise next or what to revisit after a revision cycle.";

function clsx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TopicBadge({ topic }: { topic: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
      {topic}
    </span>
  );
}

function ResultRow({ stat }: { stat: TopicStat }) {
  const feedback = getTopicFeedback(stat.topic, stat.accuracy);
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 text-sm font-medium text-slate-900">{stat.topic}</td>
      <td className="px-4 py-3 text-sm text-slate-700">
        {stat.correct}/{stat.total}
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">{formatPercent(stat.accuracy)}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{feedback}</td>
    </tr>
  );
}

function MultipleChoiceQuestionCard({
  question,
  index,
  answer,
  onAnswer,
}: {
  question: Extract<WeaknessQuestion, { type: "multiple-choice" }>;
  index: number;
  answer: string | undefined;
  onAnswer: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">Question {index + 1}</div>
        <TopicBadge topic={question.topic} />
      </div>

      <div className="mt-3 text-sm leading-6 text-slate-800">
        <MathText text={question.prompt} />
      </div>

      <fieldset className="mt-4 grid gap-3">
        {question.options.map((option) => {
          const isSelected = answer === option.id;
          return (
            <label
              key={option.id}
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition",
                isSelected
                  ? "border-indigo-500 bg-indigo-50 text-slate-900 shadow-sm"
                  : "border-slate-200 text-slate-800 hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name={question.id}
                value={option.id}
                checked={isSelected}
                onChange={() => onAnswer(option.id)}
                className="mt-0.5 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <MathText text={option.label} />
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}

function NumericQuestionCard({
  question,
  index,
  answer,
  onAnswer,
}: {
  question: Extract<WeaknessQuestion, { type: "numeric" }>;
  index: number;
  answer: string | undefined;
  onAnswer: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">Question {index + 1}</div>
        <TopicBadge topic={question.topic} />
      </div>

      <div className="mt-3 text-sm leading-6 text-slate-800">
        <MathText text={question.prompt} />
      </div>

      <div className="mt-4 max-w-xs">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {question.answerLabel ?? "Your answer"}
        </label>
        <input
          inputMode="decimal"
          type="text"
          value={answer ?? ""}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder={question.answerPlaceholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    </section>
  );
}

function WeakestTopics({ weakestTopics }: { weakestTopics: TopicStat[] }) {
  if (weakestTopics.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Weakest topics</h2>
          <p className="mt-1 text-sm text-slate-600">
            Focus here first to unlock the quickest improvement.
          </p>
        </div>
        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Top {weakestTopics.length}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {weakestTopics.map((stat, index) => (
          <div
            key={stat.topic}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Weakness {index + 1}
            </div>
            <div className="mt-2 text-base font-semibold text-slate-900">{stat.topic}</div>
            <div className="mt-1 text-sm text-slate-600">
              Score: {stat.correct}/{stat.total} ({formatPercent(stat.accuracy)})
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {getTopicFeedback(stat.topic, stat.accuracy)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function GcseMathsTopicWeaknessTest() {
  const [tier, setTier] = useState<WeaknessTier | null>(null);
  const [step, setStep] = useState<"tier" | "questions" | "results">("tier");
  const [answers, setAnswers] = useState<WeaknessAnswerMap>({});
  const [results, setResults] = useState<WeaknessResults | null>(null);

  const questions = useMemo(() => (tier ? getQuestionsForTier(tier) : []), [tier]);

  const answeredCount = useMemo(() => {
    if (!tier) return 0;
    return questions.reduce((count, question) => {
      const value = answers[question.id];
      if (!value) return count;
      if (question.type === "numeric") {
        return value.trim() ? count + 1 : count;
      }
      return count + 1;
    }, 0);
  }, [answers, questions, tier]);

  const tierQuestionCount = questions.length;

  const handleSelectTier = (nextTier: WeaknessTier) => {
    setTier(nextTier);
    setAnswers({});
    setResults(null);
    setStep("questions");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleChangeTier = () => {
    setTier(null);
    setAnswers({});
    setResults(null);
    setStep("tier");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tier) return;

    const nextResults = scoreWeaknessTest(tier, questions, answers);
    setResults(nextResults);
    setStep("results");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleRetake = () => {
    if (!tier) return;
    setAnswers({});
    setResults(null);
    setStep("questions");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isConfiguredCorrectly =
    !tier || tierQuestionCount === QUESTIONS_PER_ATTEMPT;

  return (
    <ForceTheme theme="light">
      <div className="min-h-screen bg-white text-slate-900" style={{ colorScheme: "light" }}>
        <ToolsNav label="Free Tools by Gradlify" lockTheme="light" />
        <FreeToolSEO
          title={TOOL_TITLE}
          description={TOOL_DESCRIPTION}
          canonicalPath={TOOL_PATH}
          toolName="GCSE Maths Topic Weakness Test"
          intro={INTRO_COPY}
          helpTitle="How the Topic Weakness Test helps GCSE students"
          helpText={HELP_COPY}
          faqItems={FAQ_ITEMS}
          ogImageUrl={OG_IMAGE_URL}
        >
          <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">

          {!isConfiguredCorrectly && tier && (
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This test expects exactly {QUESTIONS_PER_ATTEMPT} questions for the {tier} tier.
            </div>
          )}

          {step === "tier" && (
            <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Choose your tier</h2>
                <p className="text-sm text-slate-600">
                  Pick the tier that matches the paper you are currently preparing for.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(["Foundation", "Higher"] as const).map((tierOption) => (
                  <button
                    key={tierOption}
                    type="button"
                    onClick={() => handleSelectTier(tierOption)}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <div className="text-base font-semibold text-slate-900">{tierOption}</div>
                    <p className="mt-1 text-sm text-slate-600">
                      {tierOption === "Foundation"
                        ? "Grades 1-5 focus with essential GCSE topics."
                        : "Grades 4-9 focus with more algebra and multi-step reasoning."}
                    </p>
                    <div className="mt-4 text-sm font-semibold text-indigo-600">Start {tierOption} test</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === "questions" && tier && (
            <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-4xl">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {tier} tier
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {QUESTIONS_PER_ATTEMPT} questions. One clean diagnostic.
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Unanswered questions are marked incorrect.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                      Answered {answeredCount}/{tierQuestionCount}
                    </div>
                    <button
                      type="button"
                      onClick={handleChangeTier}
                      className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Change tier
                    </button>
                  </div>
                </div>
              </section>

              <div className="mt-6 grid gap-4">
                {questions.map((question, index) => {
                  const answer = answers[question.id];
                  if (question.type === "multiple-choice") {
                    return (
                      <MultipleChoiceQuestionCard
                        key={question.id}
                        question={question}
                        index={index}
                        answer={answer}
                        onAnswer={(value) => handleAnswer(question.id, value)}
                      />
                    );
                  }

                  return (
                    <NumericQuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      answer={answer}
                      onAnswer={(value) => handleAnswer(question.id, value)}
                    />
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  You will get a topic ranking from weakest to strongest.
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105"
                >
                  See my results
                </button>
              </div>
            </form>
          )}

          {step === "results" && tier && results && (
            <div className="mx-auto mt-10 flex w-full max-w-4xl flex-col gap-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Overall summary
                    </div>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Your diagnostic</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      A simple topic signal based on {results.totalQuestions} fixed questions.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:min-w-[220px]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Score
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {results.totalCorrect}/{results.totalQuestions}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                        Accuracy
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-indigo-700">
                        {formatPercent(results.overallAccuracy)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Tier: {results.tier}
                  </span>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Retake test
                  </button>
                  <button
                    type="button"
                    onClick={handleChangeTier}
                    className="rounded-full border border-indigo-200 px-4 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    Switch tier
                  </button>
                </div>
              </section>

              <WeakestTopics weakestTopics={results.weakestTopics} />

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Full topic breakdown
                  </div>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">Topic accuracy table</h3>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3">Topic</th>
                          <th className="px-4 py-3">Score</th>
                          <th className="px-4 py-3">Accuracy</th>
                          <th className="px-4 py-3">Guidance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.topicStats.map((stat) => (
                          <ResultRow key={stat.topic} stat={stat} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-6 text-center shadow-sm sm:p-8">
                <h3 className="text-xl font-semibold text-slate-900">
                  Practise these topics properly on Gradlify
                </h3>
                <p className="mt-2 text-sm text-slate-700">
                  Turn this signal into marks with focused exam-style practice.
                </p>
                <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
                  <Link
                    to="/gcse?auth=signup"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105"
                  >
                    Start practising
                  </Link>
                  <Link
                    to="/free-tools"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Back to free tools
                  </Link>
                </div>
              </section>
            </div>
          )}
        </main>
        </FreeToolSEO>
      </div>
    </ForceTheme>
  );
}
