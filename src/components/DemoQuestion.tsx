import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import MathText from "@/components/MathText";
import RichQuestionContent from "@/components/RichQuestionContent";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

interface DemoQuestionProps {
  onStartPracticeClick: () => void;
  embedded?: boolean;
  tone?: "dark" | "light";
  questions?: Question[];
}

interface Question {
  id: number;
  topic: string;
  difficulty: string;
  marks: number;
  text: string;
  hasDiagram?: boolean;
  diagramType?: 'triangle' | 'quadratic' | 'circle';
  options: {
    id: string;
    text: string;
  }[];
  correctAnswer: string;
  explanation: string;
}

export const demoQuestions: Question[] = [
  {
    id: 1,
    topic: "Foundation Geometry",
    difficulty: "Foundation",
    marks: 1,
    text: "The diagram shows a triangle ABC. Work out the size of angle ABC.",
    hasDiagram: true,
    diagramType: 'triangle',
    options: [
      { id: "A", text: "35°" },
      { id: "B", text: "55°" },
      { id: "C", text: "70°" },
      { id: "D", text: "90°" }
    ],
    correctAnswer: "B",
    explanation: "The angles in a triangle add up to 180°. Since angle BAC = 55° and angle ACB = 70°, angle ABC = 180° - 55° - 70° = 55°."
  },
  {
    id: 2,
    topic: "Foundation Fractions",
    difficulty: "Foundation",
    marks: 2,
    text: "Calculate \\(\\frac{2}{5} + \\frac{1}{3}\\). Give your answer as a fraction in its simplest form.",
    options: [
      { id: "A", text: "\\(\\frac{3}{8}\\)" },
      { id: "B", text: "\\(\\frac{11}{15}\\)" },
      { id: "C", text: "\\(\\frac{3}{15}\\)" },
      { id: "D", text: "\\(\\frac{5}{8}\\)" }
    ],
    correctAnswer: "B",
    explanation: "To add fractions, find a common denominator. \\(\\frac{2}{5} = \\frac{6}{15}\\) and \\(\\frac{1}{3} = \\frac{5}{15}\\). Therefore \\(\\frac{6}{15} + \\frac{5}{15} = \\frac{11}{15}\\)."
  },
  {
    id: 3,
    topic: "Higher Algebra",
    difficulty: "Higher",
    marks: 2,
    text: "Solve the equation \\(3x^2 - 12x + 9 = 0\\)",
    options: [
      { id: "A", text: "\\(x = 1\\) or \\(x = 3\\)" },
      { id: "B", text: "\\(x = -1\\) or \\(x = -3\\)" },
      { id: "C", text: "\\(x = 2\\) or \\(x = 6\\)" },
      { id: "D", text: "\\(x = 1\\) or \\(x = -3\\)" }
    ],
    correctAnswer: "A",
    explanation: "Factoring: \\(3(x^2 - 4x + 3) = 0\\), then \\(3(x - 1)(x - 3) = 0\\). Therefore \\(x = 1\\) or \\(x = 3\\)."
  },
  {
    id: 4,
    topic: "Higher Probability",
    difficulty: "Higher",
    marks: 3,
    text: "A bag contains 5 red balls and 3 blue balls. Two balls are picked at random without replacement. What is the probability that both balls are red?",
    options: [
      { id: "A", text: "\\(\\frac{5}{14}\\)" },
      { id: "B", text: "\\(\\frac{25}{64}\\)" },
      { id: "C", text: "\\(\\frac{5}{16}\\)" },
      { id: "D", text: "\\(\\frac{10}{28}\\)" }
    ],
    correctAnswer: "A",
    explanation: "First ball: \\(P(\\text{red}) = \\frac{5}{8}\\). Second ball (given first was red): \\(P(\\text{red}) = \\frac{4}{7}\\). Combined: \\(\\frac{5}{8} \\times \\frac{4}{7} = \\frac{20}{56} = \\frac{5}{14}\\)."
  },
  {
    id: 5,
    topic: "Higher Surds",
    difficulty: "Higher",
    marks: 2,
    text: "Simplify \\((3 + \\sqrt{2})(3 - \\sqrt{2})\\)",
    options: [
      { id: "A", text: "7" },
      { id: "B", text: "9" },
      { id: "C", text: "11" },
      { id: "D", text: "\\(9 - 2\\sqrt{2}\\)" }
    ],
    correctAnswer: "A",
    explanation: "Using the difference of two squares: \\((a + b)(a - b) = a^2 - b^2\\). So \\((3 + \\sqrt{2})(3 - \\sqrt{2}) = 3^2 - (\\sqrt{2})^2 = 9 - 2 = 7\\)."
  },
  {
    id: 6,
    topic: "Higher Circle Theorems",
    difficulty: "Higher",
    marks: 3,
    text: "A circle has center O. Points A and B lie on the circumference. If angle AOB = 140°, what is the size of angle ACB where C is another point on the circumference?",
    hasDiagram: true,
    diagramType: 'circle',
    options: [
      { id: "A", text: "70°" },
      { id: "B", text: "110°" },
      { id: "C", text: "140°" },
      { id: "D", text: "220°" }
    ],
    correctAnswer: "A",
    explanation: "The angle at the circumference is half the angle at the center when subtended by the same arc. Therefore, angle ACB = 140° ÷ 2 = 70°."
  }
];

export const elevenPlusDemoQuestions: Question[] = [
  {
    id: 1,
    topic: "Foundation Geometry",
    difficulty: "Foundation",
    marks: 1,
    text: "The diagram shows a triangle ABC. Work out the size of angle ABC.",
    hasDiagram: true,
    diagramType: 'triangle',
    options: [
      { id: "A", text: "35°" },
      { id: "B", text: "55°" },
      { id: "C", text: "70°" },
      { id: "D", text: "90°" }
    ],
    correctAnswer: "B",
    explanation: "The angles in a triangle add up to 180°. Since angle BAC = 55° and angle ACB = 70°, angle ABC = 180° - 55° - 70° = 55°."
  },
  {
    id: 2,
    topic: "Proportional Reasoning",
    difficulty: "Foundation",
    marks: 2,
    text: "A bowl contains 64 melon cubes. 3/8 of them are red and the rest are yellow. How many yellow cubes are there?",
    options: [
      { id: "A", text: "24" },
      { id: "B", text: "32" },
      { id: "C", text: "40" },
      { id: "D", text: "48" }
    ],
    correctAnswer: "C",
    explanation: "3/8 of 64 is 24 red cubes, so the remaining 40 are yellow."
  },
  {
    id: 3,
    topic: "Number Sequences",
    difficulty: "Higher",
    marks: 2,
    text: "Three consecutive even numbers add to 246. What is the smallest number?",
    options: [
      { id: "A", text: "78" },
      { id: "B", text: "80" },
      { id: "C", text: "82" },
      { id: "D", text: "84" }
    ],
    correctAnswer: "B",
    explanation: "Let the numbers be n, n+2, n+4. Then 3n + 6 = 246, so n = 80."
  },
  {
    id: 4,
    topic: "Ratio and Area",
    difficulty: "Higher",
    marks: 3,
    text: "A rectangle has width to height in the ratio 5:9. If the area is 720 cm², what is the length of the longer side?",
    options: [
      { id: "A", text: "24 cm" },
      { id: "B", text: "30 cm" },
      { id: "C", text: "36 cm" },
      { id: "D", text: "40 cm" }
    ],
    correctAnswer: "C",
    explanation: "Let width = 5x and height = 9x, then area = 45x² = 720. Solve x² = 16 so x = 4, and the longer side (9x) is 36 cm."
  },
  {
    id: 5,
    topic: "Speed and Time",
    difficulty: "Higher",
    marks: 2,
    text: "Emma cycles 45 km at an average speed of 15 km/h. How long does the journey take?",
    options: [
      { id: "A", text: "2 hours" },
      { id: "B", text: "2 hours 30 minutes" },
      { id: "C", text: "3 hours" },
      { id: "D", text: "3 hours 15 minutes" }
    ],
    correctAnswer: "C",
    explanation: "Time = distance ÷ speed = 45 ÷ 15 = 3 hours."
  },
  {
    id: 6,
    topic: "Higher Circle Theorems",
    difficulty: "Higher",
    marks: 3,
    text: "A circle has center O. Points A and B lie on the circumference. If angle AOB = 140°, what is the size of angle ACB where C is another point on the circumference?",
    hasDiagram: true,
    diagramType: 'circle',
    options: [
      { id: "A", text: "70°" },
      { id: "B", text: "110°" },
      { id: "C", text: "140°" },
      { id: "D", text: "220°" }
    ],
    correctAnswer: "A",
    explanation: "The angle at the circumference is half the angle at the center when subtended by the same arc. Therefore, angle ACB = 140° ÷ 2 = 70°."
  }
];

export const mobileDemoQuestions: Question[] = [
  {
    id: 1,
    topic: "Foundation Geometry",
    difficulty: "Foundation",
    marks: 1,
    text: "The diagram shows a triangle. Find the missing angle.",
    hasDiagram: true,
    diagramType: 'triangle',
    options: [
      { id: "A", text: "35°" },
      { id: "B", text: "55°" },
      { id: "C", text: "70°" },
      { id: "D", text: "90°" }
    ],
    correctAnswer: "B",
    explanation: "Angles in a triangle sum to 180°, so the missing angle is 55°."
  },
  {
    id: 2,
    topic: "Foundation Fractions",
    difficulty: "Foundation",
    marks: 2,
    text: "Calculate \\frac{2}{5} + \\frac{1}{3}. Give your answer in its simplest form.",
    options: [
      { id: "A", text: "\\frac{3}{8}" },
      { id: "B", text: "\\frac{11}{15}" },
      { id: "C", text: "\\frac{3}{15}" },
      { id: "D", text: "\\frac{5}{8}" }
    ],
    correctAnswer: "B",
    explanation: "Use a common denominator: 2/5 = 6/15 and 1/3 = 5/15, so the sum is 11/15."
  },
  {
    id: 3,
    topic: "Higher Algebra",
    difficulty: "Higher",
    marks: 2,
    text: "Solve the equation 3x^2 - 12x + 9 = 0.",
    options: [
      { id: "A", text: "x = 1 or x = 3" },
      { id: "B", text: "x = -1 or x = -3" },
      { id: "C", text: "x = 2 or x = 6" },
      { id: "D", text: "x = 1 or x = -3" }
    ],
    correctAnswer: "A",
    explanation: "Factor: 3(x^2 - 4x + 3) = 3(x - 1)(x - 3), so x = 1 or x = 3."
  },
  {
    id: 4,
    topic: "Higher Circle Theorems",
    difficulty: "Higher",
    marks: 3,
    text: "A circle has center O. If angle AOB = 140°, what is angle ACB?",
    hasDiagram: true,
    diagramType: 'circle',
    options: [
      { id: "A", text: "70°" },
      { id: "B", text: "110°" },
      { id: "C", text: "140°" },
      { id: "D", text: "220°" }
    ],
    correctAnswer: "A",
    explanation: "The angle at the circumference is half the angle at the center, so 140° ÷ 2 = 70°."
  }
];

export function DemoQuestion({ onStartPracticeClick, embedded = false, tone = "light", questions }: DemoQuestionProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [questionResults, setQuestionResults] = useState<Map<number, boolean>>(new Map());
  const isDark = tone === "dark";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-400" : "text-gray-600";
  const textSubtle = isDark ? "text-slate-500" : "text-gray-500";
  const questionCounterText = isDark ? "text-slate-200" : "text-slate-900";

  const questionSet = questions ?? demoQuestions;
  const currentQuestion = questionSet[currentQuestionIndex];

  const handleSubmit = () => {
    if (selectedAnswer) {
      setHasSubmitted(true);
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      setQuestionResults(prev => new Map(prev).set(currentQuestionIndex, isCorrect));
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questionSet.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setHasSubmitted(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setHasSubmitted(false);
    }
  };

  const handleReset = () => {
    setSelectedAnswer(null);
    setHasSubmitted(false);
  };

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
  const isLastQuestion = currentQuestionIndex === questionSet.length - 1;

  const renderDiagram = () => {
    if (!currentQuestion.hasDiagram) return null;
    
    if (currentQuestion.diagramType === 'triangle') {
      return (
        <div
          className={cn(
            "rounded-2xl p-4 sm:p-8 flex items-center justify-center mb-4 sm:mb-6 border",
            isDark ? "bg-gradient-to-br from-slate-900 to-slate-800 border-white/10" : "bg-gradient-to-br from-orange-50 to-red-50 border-orange-100"
          )}
        >
          <svg width="300" height="200" viewBox="0 0 300 200" className="max-w-full w-[140px] h-[90px] sm:w-[280px] sm:h-[186px]">
            <polygon points="150,30 250,170 50,170" fill="none" stroke={isDark ? "#fdba74" : "#f97316"} strokeWidth="2.5" />
            <text x="150" y="20" textAnchor="middle" className={cn("font-semibold", isDark ? "fill-slate-100" : "fill-gray-900")} fontSize="15">A</text>
            <text x="260" y="180" textAnchor="start" className={cn("font-semibold", isDark ? "fill-slate-100" : "fill-gray-900")} fontSize="15">C</text>
            <text x="35" y="180" textAnchor="end" className={cn("font-semibold", isDark ? "fill-slate-100" : "fill-gray-900")} fontSize="15">B</text>
            <text x="150" y="55" textAnchor="middle" className={cn("font-semibold", isDark ? "fill-orange-200" : "fill-orange-600")} fontSize="13">55°</text>
            <text x="230" y="162" textAnchor="middle" className={cn("font-semibold", isDark ? "fill-orange-200" : "fill-orange-600")} fontSize="13">70°</text>
            <text x="70" y="162" textAnchor="middle" className={cn("font-bold", isDark ? "fill-amber-300" : "fill-red-600")} fontSize="14">?</text>
          </svg>
        </div>
      );
    }
    
    if (currentQuestion.diagramType === 'circle') {
      return (
        <div
          className={cn(
            "rounded-2xl p-4 sm:p-8 flex items-center justify-center mb-4 sm:mb-6 border",
            isDark ? "bg-gradient-to-br from-slate-900 to-slate-800 border-white/10" : "bg-gradient-to-br from-orange-50 to-red-50 border-orange-100"
          )}
        >
          <svg width="280" height="280" viewBox="0 0 280 280" className="max-w-full w-[160px] h-[160px] sm:w-[260px] sm:h-[260px]">
            <circle cx="140" cy="140" r="95" fill="none" stroke={isDark ? "#fdba74" : "#f97316"} strokeWidth="2.5" />
            <circle cx="140" cy="140" r="4" fill={isDark ? "#fdba74" : "#f97316"} />
            <text x="140" y="132" textAnchor="middle" className={cn("font-semibold", isDark ? "fill-slate-100" : "fill-gray-900")} fontSize="14">O</text>
            <line x1="140" y1="140" x2="140" y2="45" stroke={isDark ? "#fdba74" : "#f97316"} strokeWidth="2" />
            <line x1="140" y1="140" x2="218" y2="178" stroke={isDark ? "#fdba74" : "#f97316"} strokeWidth="2" />
            <line x1="140" y1="45" x2="218" y2="178" stroke={isDark ? "#fca5a5" : "#ef4444"} strokeWidth="2" />
            <line x1="140" y1="45" x2="62" y2="178" stroke={isDark ? "#fca5a5" : "#ef4444"} strokeWidth="2" />
            <line x1="218" y1="178" x2="62" y2="178" stroke={isDark ? "#fca5a5" : "#ef4444"} strokeWidth="2" />
            <text x="140" y="38" textAnchor="middle" className={cn("font-semibold", isDark ? "fill-slate-100" : "fill-gray-900")} fontSize="14">A</text>
            <text x="228" y="188" textAnchor="start" className={cn("font-semibold", isDark ? "fill-slate-100" : "fill-gray-900")} fontSize="14">B</text>
            <text x="52" y="188" textAnchor="end" className={cn("font-semibold", isDark ? "fill-slate-100" : "fill-gray-900")} fontSize="14">C</text>
            <text x="158" y="105" textAnchor="middle" className={cn("font-semibold", isDark ? "fill-orange-200" : "fill-orange-600")} fontSize="12">140°</text>
            <text x="140" y="168" textAnchor="middle" className={cn("font-bold", isDark ? "fill-amber-300" : "fill-red-600")} fontSize="13">?</text>
          </svg>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div
      className={cn(
        "w-full mx-auto max-w-[min(360px,calc(100vw_-_3rem))] sm:max-w-[calc(100vw_-_1.5rem)] lg:max-w-2xl",
        embedded ? "py-0 px-0" : "py-4 sm:py-8 px-4 sm:px-6",
        isDark ? "text-slate-100" : "text-gray-900"
      )}
    >
      {!embedded && (
        <div className="text-center mb-5 sm:mb-8">
          <span
            className={cn(
              "inline-block max-w-[260px] rounded-full px-2.5 py-1 text-center text-[10px] font-medium sm:max-w-none sm:text-xs mb-3",
              isDark ? "bg-white/10 text-orange-200" : "bg-orange-50 text-orange-700"
            )}
          >
            Sample Gradlify exam-style practice • Free preview
          </span>
          <h2 className={cn("text-lg sm:text-3xl font-bold mb-2", textPrimary)}>
            Sample{" "}
            <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">Questions</span>
          </h2>
          <p className={cn("text-xs sm:text-base max-w-lg mx-auto tracking-tight", textMuted)}>
            {AI_FEATURE_ENABLED
              ? "Experience Gradlify&apos;s interactive practice with instant AI feedback"
              : "Experience Gradlify&apos;s interactive practice with instant feedback"}
          </p>
        </div>
      )}

      {/* Question Progress Bar */}
        <div className="flex items-center justify-between mb-3 sm:mb-5">
        <div className="flex items-center gap-3">
          <span className={cn("text-base font-semibold tracking-tight", questionCounterText)}>
            Question {currentQuestionIndex + 1} of {questionSet.length}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReset}
          className={cn(
            "gap-1.5",
            isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>

      {/* Question Card */}
        <div
          className={cn(
            "rounded-3xl p-3 sm:p-5 border relative overflow-hidden",
            isDark
              ? "bg-slate-950/70 border-white/10 shadow-[0_22px_45px_rgba(15,23,42,0.6)]"
              : "bg-white border-gray-100 shadow-xl"
          )}
        >
        {/* Subtle gradient decoration */}
        <div
          className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-bl-full pointer-events-none",
            isDark ? "bg-gradient-to-bl from-orange-500/20 to-transparent" : "bg-gradient-to-bl from-orange-50 to-transparent"
          )}
        />
        
        {/* Question Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 relative">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25">
            Q{currentQuestion.id}
          </div>
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold",
            currentQuestion.difficulty === "Foundation" 
              ? isDark
                ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : isDark
                ? "bg-red-500/15 text-red-200 border border-red-500/30"
                : "bg-red-50 text-red-700 border border-red-200"
          )}>
            {currentQuestion.difficulty}
          </span>
        </div>

        {/* Question Text */}
        <div className="mb-3 sm:mb-4 relative">
          <div className={cn("text-sm sm:text-lg font-medium leading-relaxed", textPrimary)}>
            <MathText text={currentQuestion.text} className="exam-math" />
          </div>
        </div>

        {/* Diagram */}
        {renderDiagram()}

        {/* Answer Options */}
        <div className="space-y-1 sm:space-y-1.5 mb-2.5 sm:mb-3">
          {currentQuestion.options.map(option => {
            const isSelected = selectedAnswer === option.id;
            const showCorrect = hasSubmitted && option.id === currentQuestion.correctAnswer;
            const showWrong = hasSubmitted && isSelected && !isCorrect;
            
            return (
              <button
                key={option.id}
                onClick={() => !hasSubmitted && setSelectedAnswer(option.id)}
                disabled={hasSubmitted}
              className={cn(
                "w-full text-left px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border-2 transition-all duration-200",
                  isDark
                    ? "hover:border-orange-400/60 hover:bg-orange-500/10"
                    : "hover:border-orange-300 hover:bg-orange-50/50",
                  !hasSubmitted && !isSelected && (isDark ? "border-white/10 bg-slate-950/60" : "border-gray-200 bg-white"),
                  isSelected && !hasSubmitted && (isDark ? "border-orange-400 bg-orange-500/15 shadow-sm" : "border-orange-500 bg-orange-50 shadow-sm"),
                  showCorrect && (isDark ? "border-emerald-400/60 bg-emerald-500/15" : "border-emerald-500 bg-emerald-50"),
                  showWrong && (isDark ? "border-rose-400/60 bg-rose-500/15" : "border-red-400 bg-red-50"),
                  hasSubmitted && "cursor-default"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[11px] sm:text-sm font-semibold transition-colors",
                      isSelected && !hasSubmitted && "bg-orange-500 text-white",
                      showCorrect && "bg-emerald-500 text-white",
                      showWrong && "bg-rose-500 text-white",
                      !isSelected && !showCorrect && !showWrong && (isDark ? "bg-white/10 text-slate-300" : "bg-gray-100 text-gray-600")
                    )}>
                      {option.id}
                    </span>
                    <span className={cn("font-medium text-sm sm:text-base", textPrimary)}>
                      <MathText text={option.text} className="exam-math-inline" />
                    </span>
                  </div>
                  {showCorrect && <CheckCircle className={cn("w-5 h-5 flex-shrink-0", isDark ? "text-emerald-300" : "text-emerald-600")} />}
                  {showWrong && <XCircle className={cn("w-5 h-5 flex-shrink-0", isDark ? "text-rose-300" : "text-red-500")} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit Button or Feedback */}
        {!hasSubmitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 text-xs sm:text-sm disabled:opacity-50 disabled:shadow-none"
          >
          Submit Answer
        </Button>
        ) : (
          <div className={cn(
            "p-4 sm:p-5 rounded-2xl border",
            isCorrect 
              ? isDark
                ? "bg-emerald-500/15 border-emerald-400/40"
                : "bg-emerald-50 border-emerald-200"
              : isDark
                ? "bg-rose-500/15 border-rose-400/40"
                : "bg-red-50 border-red-200"
          )}>
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", isDark ? "bg-emerald-500/20" : "bg-emerald-100")}>
                  <CheckCircle className={cn("w-5 h-5", isDark ? "text-emerald-300" : "text-emerald-600")} />
                </div>
              ) : (
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", isDark ? "bg-rose-500/20" : "bg-red-100")}>
                  <XCircle className={cn("w-5 h-5", isDark ? "text-rose-300" : "text-red-500")} />
                </div>
              )}
              <div>
                <p className={cn(
                  "font-semibold mb-1.5 text-sm sm:text-base",
                  isCorrect ? (isDark ? "text-emerald-200" : "text-emerald-800") : (isDark ? "text-rose-200" : "text-red-800")
                )}>
                  {isCorrect ? "Correct! Well done!" : `Not quite – the answer is ${currentQuestion.correctAnswer}.`}
                </p>
                <div className={cn("text-sm leading-relaxed", isDark ? "text-slate-300" : "text-gray-600")}>
                  <RichQuestionContent text={currentQuestion.explanation} className="space-y-2" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className={cn("flex items-center justify-between mt-5 sm:mt-6 pt-5 sm:pt-6 border-t", isDark ? "border-white/10" : "border-gray-100")}>
          <Button 
            variant="ghost" 
            onClick={handlePrevious} 
            disabled={currentQuestionIndex === 0}
            className={cn(
              "disabled:opacity-40 gap-1",
              isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          {/* Progress Dots */}
          <div className="flex gap-1.5 sm:gap-2">
            {questionSet.map((_, index) => {
              const result = questionResults.get(index);
              const isCompleted = result !== undefined;
              const wasCorrect = result === true;
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentQuestionIndex(index);
                    setSelectedAnswer(null);
                    setHasSubmitted(false);
                  }}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentQuestionIndex 
                      ? "w-6 sm:w-8 bg-gradient-to-r from-red-600 to-orange-500" 
                      : isCompleted && wasCorrect 
                        ? "w-2 bg-emerald-500" 
                        : isCompleted && !wasCorrect 
                          ? "w-2 bg-rose-400" 
                          : isDark
                            ? "w-2 bg-white/10 hover:bg-white/20"
                            : "w-2 bg-gray-200 hover:bg-gray-300"
                  )}
                  aria-label={`Go to question ${index + 1}`}
                />
              );
            })}
          </div>

          <Button 
            variant="ghost" 
            onClick={handleNext} 
            disabled={currentQuestionIndex === questionSet.length - 1}
            className={cn(
              "disabled:opacity-40 gap-1",
              isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Final CTA */}
        {isLastQuestion && hasSubmitted && (
          <div
            className={cn(
              "mt-6 p-5 sm:p-6 rounded-2xl border",
              isDark
                ? "bg-gradient-to-br from-orange-500/20 via-red-500/15 to-cyan-400/10 border-orange-400/30"
                : "bg-gradient-to-br from-orange-50 via-red-50 to-cyan-50 border-orange-100"
            )}
          >
            <p className={cn("text-center font-semibold mb-4 text-base sm:text-lg", textPrimary)}>
              Ready to practice with 1,300+ more questions?
            </p>
            <Button 
              onClick={onStartPracticeClick}
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300"
            >
              Start exam-style GCSE Maths practice (free)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
