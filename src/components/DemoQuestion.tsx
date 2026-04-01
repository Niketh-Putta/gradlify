import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import MathText from "@/components/MathText";
import RichQuestionContent from "@/components/RichQuestionContent";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

interface DemoQuestionProps {
  onStartPracticeClick: () => void;
  embedded?: boolean;
  tone?: "dark" | "light";
  questions?: Question[];
  className?: string;
}

interface Question {
  id: number;
  topic: string;
  difficulty: string;
  marks: number;
  text: string;
  hasDiagram?: boolean;
  diagramType?: 'triangle' | 'quadratic' | 'circle';
  hasPassage?: boolean;
  passageTitle?: string;
  passageLines?: { text: string; highlight?: boolean }[];
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
    topic: "English Comprehension",
    difficulty: "Standard",
    marks: 1,
    hasPassage: true,
    passageTitle: "The Watcher in the Woods",
    passageLines: [
      { text: "The old oak tree stood like a silent sentinel over the sleeping village. Its gnarled roots, thick and unforgiving, broke through the cobbled path that led to the abandoned Hawthorne Estate. For years, the villagers had spoken of the estate in hushed tones, trading stories of unnatural shadows and cold drafts that never seemed to dissipate.", highlight: true },
      { text: "Eleanor pulled her coat tighter, shivering despite the mild autumn air. She had not come here to chase ghost stories. She was here because of the letter - a crumpled, wax-sealed envelope that had arrived unceremoniously on her doorstep that morning. It bore no return address, only a single instruction: 'Return to the beginning.'", highlight: false },
      { text: "As she approached the towering iron gates, a sudden gust of wind swept through the courtyard. The hinges let out a prolonged, metallic groan as the gates swung open, as if welcoming her home.", highlight: false }
    ],
    text: "Read the highlighted paragraph. The phrase 'like a silent sentinel' is an example of which literary device?",
    options: [
      { id: "A", text: "Onomatopoeia" },
      { id: "B", text: "Simile" },
      { id: "C", text: "Personification" },
      { id: "D", text: "Hyperbole" }
    ],
    correctAnswer: "B",
    explanation: "A simile compares two things using words such as 'like' or 'as'. Here, the tree is compared to a 'sentinel' using 'like'."
  },
  {
    id: 2,
    topic: "English Comprehension",
    difficulty: "Standard",
    marks: 1,
    hasPassage: true,
    passageTitle: "The Watcher in the Woods",
    passageLines: [
      { text: "The old oak tree stood like a silent sentinel over the sleeping village. Its gnarled roots, thick and unforgiving, broke through the cobbled path that led to the abandoned Hawthorne Estate. For years, the villagers had spoken of the estate in hushed tones, trading stories of unnatural shadows and cold drafts that never seemed to dissipate.", highlight: false },
      { text: "Eleanor pulled her coat tighter, shivering despite the mild autumn air. She had not come here to chase ghost stories. She was here because of the letter - a crumpled, wax-sealed envelope that had arrived unceremoniously on her doorstep that morning. It bore no return address, only a single instruction: 'Return to the beginning.'", highlight: true },
      { text: "As she approached the towering iron gates, a sudden gust of wind swept through the courtyard. The hinges let out a prolonged, metallic groan as the gates swung open, as if welcoming her home.", highlight: false }
    ],
    text: "What does the word 'unceremoniously' in the highlighted paragraph suggest about how the letter arrived?",
    options: [
      { id: "A", text: "It was delivered with great care and respect." },
      { id: "B", text: "It arrived abruptly and without any special attention." },
      { id: "C", text: "It was presented during an official ceremony." },
      { id: "D", text: "It was carefully handed to her by a postman." }
    ],
    correctAnswer: "B",
    explanation: "'Unceremoniously' means done in a rough, abrupt, or informal way. This strongly contrasts with a formal or careful delivery."
  },
  {
    id: 3,
    topic: "English Comprehension",
    difficulty: "Advanced",
    marks: 2,
    hasPassage: true,
    passageTitle: "The Watcher in the Woods",
    passageLines: [
      { text: "The old oak tree stood like a silent sentinel over the sleeping village. Its gnarled roots, thick and unforgiving, broke through the cobbled path that led to the abandoned Hawthorne Estate. For years, the villagers had spoken of the estate in hushed tones, trading stories of unnatural shadows and cold drafts that never seemed to dissipate.", highlight: false },
      { text: "Eleanor pulled her coat tighter, shivering despite the mild autumn air. She had not come here to chase ghost stories. She was here because of the letter - a crumpled, wax-sealed envelope that had arrived unceremoniously on her doorstep that morning. It bore no return address, only a single instruction: 'Return to the beginning.'", highlight: false },
      { text: "As she approached the towering iron gates, a sudden gust of wind swept through the courtyard. The hinges let out a prolonged, metallic groan as the gates swung open, as if welcoming her home.", highlight: true }
    ],
    text: "Based on the final highlighted paragraph, the 'metallic groan' of the hinges contributes primarily to a mood of:",
    options: [
      { id: "A", text: "Joyful anticipation" },
      { id: "B", text: "Eerie suspense" },
      { id: "C", text: "Peaceful calm" },
      { id: "D", text: "Melancholic sadness" }
    ],
    correctAnswer: "B",
    explanation: "The 'prolonged, metallic groan' combined with the sudden wind and looming gates builds an ominous and suspenseful atmosphere typical of gothic textual settings."
  },
  {
    id: 4,
    topic: "English Comprehension",
    difficulty: "Advanced",
    marks: 1,
    hasPassage: true,
    passageTitle: "The Watcher in the Woods",
    passageLines: [
      { text: "The old oak tree stood like a silent sentinel over the sleeping village. Its gnarled roots, thick and unforgiving, broke through the cobbled path that led to the abandoned Hawthorne Estate. For years, the villagers had spoken of the estate in hushed tones, trading stories of unnatural shadows and cold drafts that never seemed to dissipate.", highlight: true },
      { text: "Eleanor pulled her coat tighter, shivering despite the mild autumn air. She had not come here to chase ghost stories. She was here because of the letter - a crumpled, wax-sealed envelope that had arrived unceremoniously on her doorstep that morning. It bore no return address, only a single instruction: 'Return to the beginning.'", highlight: false },
      { text: "As she approached the towering iron gates, a sudden gust of wind swept through the courtyard. The hinges let out a prolonged, metallic groan as the gates swung open, as if welcoming her home.", highlight: false }
    ],
    text: "Read the first highlighted paragraph. Which of the following is the closest synonym for the word 'dissipate' as it is used here?",
    options: [
      { id: "A", text: "Materialize" },
      { id: "B", text: "Disperse" },
      { id: "C", text: "Intensify" },
      { id: "D", text: "Accumulate" }
    ],
    correctAnswer: "B",
    explanation: "In this context, the cold drafts 'never seemed to dissipate' implies they never faded away or dispersed. 'Disperse' captures the meaning of fading or scattering."
  },
  {
    id: 5,
    topic: "English Comprehension",
    difficulty: "Foundation",
    marks: 1,
    hasPassage: true,
    passageTitle: "The Watcher in the Woods",
    passageLines: [
      { text: "The old oak tree stood like a silent sentinel over the sleeping village. Its gnarled roots, thick and unforgiving, broke through the cobbled path that led to the abandoned Hawthorne Estate. For years, the villagers had spoken of the estate in hushed tones, trading stories of unnatural shadows and cold drafts that never seemed to dissipate.", highlight: false },
      { text: "Eleanor pulled her coat tighter, shivering despite the mild autumn air. She had not come here to chase ghost stories. She was here because of the letter - a crumpled, wax-sealed envelope that had arrived unceremoniously on her doorstep that morning. It bore no return address, only a single instruction: 'Return to the beginning.'", highlight: true },
      { text: "As she approached the towering iron gates, a sudden gust of wind swept through the courtyard. The hinges let out a prolonged, metallic groan as the gates swung open, as if welcoming her home.", highlight: false }
    ],
    text: "Based on the middle highlighted paragraph, what can we explicitly infer was Eleanor's primary reason for visiting the Hawthorne Estate?",
    options: [
      { id: "A", text: "She wanted to investigate the ghost stories." },
      { id: "B", text: "She felt drawn by the strange cold drafts." },
      { id: "C", text: "She was following the instructions within an anonymous letter." },
      { id: "D", text: "She used to live there and was welcoming herself home." }
    ],
    correctAnswer: "C",
    explanation: "The text explicitly states: 'She was here because of the letter... It bore no return address, only a single instruction...'"
  }
];

export const elevenPlusMathsDemoQuestions: Question[] = [
  {
    id: 1,
    topic: "Mathematical Reasoning",
    difficulty: "Advanced",
    marks: 2,
    hasPassage: false,
    text: "If 6 pens cost £18, how much does a single pen cost? Select the correct logical step format.",
    options: [
      { id: "A", text: "£3" },
      { id: "B", text: "£3.00" },
      { id: "C", text: "£2.00" },
      { id: "D", text: "£4.00" }
    ],
    correctAnswer: "A",
    explanation: "Although mathematically equivalent, 18 ÷ 6 = 3. Standard formatting asks for exact integer evaluation without leading zero-point formats unless requested: £3."
  },
  {
    id: 2,
    topic: "Spatial Reasoning",
    difficulty: "Advanced",
    marks: 2,
    hasPassage: false,
    text: "A train departs London at 08:45 and arrives in Edinburgh at 13:20. How long did the journey take?",
    options: [
      { id: "A", text: "4 hours 25 minutes" },
      { id: "B", text: "4 hours 35 minutes" },
      { id: "C", text: "5 hours 25 minutes" },
      { id: "D", text: "5 hours 35 minutes" }
    ],
    correctAnswer: "B",
    explanation: "From 08:45 to 12:45 is exactly 4 hours. From 12:45 to 13:00 is 15 minutes. From 13:00 to 13:20 is 20 minutes. Therefore, total time = 4 hours + 15 mins + 20 mins = 4 hours 35 minutes."
  },
  {
    id: 3,
    topic: "Number Properties",
    difficulty: "Standard",
    marks: 2,
    hasPassage: false,
    text: "Which of these numbers is both a square number and a cube number?",
    options: [
      { id: "A", text: "16" },
      { id: "B", text: "27" },
      { id: "C", text: "64" },
      { id: "D", text: "81" }
    ],
    correctAnswer: "C",
    explanation: "64 is a square number (8 × 8 = 64) and also a cube number (4 × 4 × 4 = 64)."
  },
  {
    id: 4,
    topic: "Algebraic Sequences",
    difficulty: "Advanced",
    marks: 2,
    hasPassage: false,
    text: "Find the next number in this sequence: 2, 5, 11, 23, 47, ...",
    options: [
      { id: "A", text: "71" },
      { id: "B", text: "85" },
      { id: "C", text: "95" },
      { id: "D", text: "101" }
    ],
    correctAnswer: "C",
    explanation: "The rule is 'multiply by 2 and add 1'. 47 × 2 = 94. 94 + 1 = 95."
  },
  {
    id: 5,
    topic: "Geometry",
    difficulty: "Advanced",
    marks: 3,
    hasPassage: false,
    text: "A rectangular garden is 12m long and 8m wide. A path of width 1m is built entirely around the inside edge. What is the area of the path?",
    options: [
      { id: "A", text: "20 m²" },
      { id: "B", text: "36 m²" },
      { id: "C", text: "40 m²" },
      { id: "D", text: "56 m²" }
    ],
    correctAnswer: "B",
    explanation: "The total area is 12 × 8 = 96 m². The inner rectangle (subtracting 1m from ALL sides means subtracting 2m from total length and width) is 10 × 6 = 60 m². Therefore, path area = 96 - 60 = 36 m²."
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

export function DemoQuestion({ onStartPracticeClick, embedded = false, tone = "light", questions, className }: DemoQuestionProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string | null>>({});
  const [hasSubmitted, setHasSubmitted] = useState<Record<number, boolean>>({});
  const [questionResults, setQuestionResults] = useState<Map<number, boolean>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDark = tone === "dark";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-400" : "text-gray-600";
  const textSubtle = isDark ? "text-slate-500" : "text-gray-500";
  const questionCounterText = isDark ? "text-slate-200" : "text-slate-900";

  const questionSet = questions ?? demoQuestions;
  const currentQuestion = questionSet[currentQuestionIndex] || questionSet[0];

  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
             const idx = Number(entry.target.getAttribute("data-index"));
             if (!isNaN(idx)) setCurrentQuestionIndex(idx);
          }
        });
      },
      { root: scrollRef.current, threshold: 0.5 }
    );
    const elements = document.querySelectorAll('.demo-question-card');
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [questionSet]);

  const handleSubmit = (index: number) => {
    const answer = selectedAnswers[index];
    if (answer) {
      setHasSubmitted(prev => ({ ...prev, [index]: true }));
      const isCorrect = answer === questionSet[index].correctAnswer;
      setQuestionResults(prev => new Map(prev).set(index, isCorrect));
    }
  };

  const handleNext = (index: number) => {
    if (index < questionSet.length - 1) {
      document.querySelector(`[data-index="${index + 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrevious = (index: number) => {
    if (index > 0) {
      document.querySelector(`[data-index="${index - 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setHasSubmitted({});
    setQuestionResults(new Map());
    document.querySelector(`[data-index="0"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderDiagram = (q: Question) => {
    if (!q.hasDiagram) return null;
    
    if (q.diagramType === 'triangle') {
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
    
    if (q.diagramType === 'circle') {
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
        "w-full mx-auto max-w-[min(360px,calc(100vw_-_3rem))] sm:max-w-[calc(100vw_-_1.5rem)]",
        className || "lg:max-w-2xl",
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
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={cn("text-base font-bold tracking-tight", questionCounterText)}>
            {currentQuestion.hasPassage ? "English" : "Maths"}
          </span>
          <span className="text-muted-foreground/40 font-black">•</span>
          <span className={cn("text-base font-medium tracking-tight", questionCounterText)}>
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

      {/* Container for Split View if passage exists */}
      <div className={cn(
        currentQuestion.hasPassage 
          ? "grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-4 sm:gap-6 items-stretch" 
          : "block"
      )}>
        
        {/* Left Passage Pane */}
        {currentQuestion.hasPassage && currentQuestion.passageLines && (
          <div className={cn(
            "rounded-3xl p-5 sm:p-7 md:p-8 flex flex-col border max-h-[500px] sm:max-h-[600px] overflow-y-auto lg:sticky lg:top-4 lg:self-start",
            isDark ? "bg-[#0f172a] border-white/10 shadow-[0_22px_45px_rgba(15,23,42,0.6)]" : "bg-white border-gray-200 shadow-xl"
          )}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <span className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]", isDark ? "text-slate-500" : "text-slate-400")}>The Passage • Vol. 12</span>
              <span className="text-[9px] sm:text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 px-2 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Zap className="w-3 h-3 fill-orange-500 text-orange-500" /> Active Focus</span>
            </div>
            {currentQuestion.passageTitle && (
              <h3 className={cn("text-xl md:text-2xl font-bold mb-4 sm:mb-6", textPrimary)}>{currentQuestion.passageTitle}</h3>
            )}
            <div className="space-y-1 sm:space-y-2 p-2 sm:p-4">
              {currentQuestion.passageLines.map((line, idx) => (
                <div key={idx} className="relative group/line">
                  <div
                    className={cn(
                      "p-4 -mx-4 rounded-xl cursor-text relative border-l-4",
                      line.highlight 
                        ? "bg-amber-50/80 dark:bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-200/50 z-10" 
                        : "border-transparent opacity-60 group-hover/line:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    {line.highlight && (
                      <div className="absolute -left-1 flex items-center justify-center h-full top-0">
                        <div className="h-1/3 w-1 bg-amber-500 rounded-full animate-pulse" />
                      </div>
                    )}
                    <p className={cn(
                      "text-[15px] sm:text-base leading-relaxed tracking-tight font-medium",
                      line.highlight 
                        ? (isDark ? "text-amber-100" : "text-amber-950")
                        : (isDark ? "text-slate-100" : "text-slate-900")
                    )}>
                      {line.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right Pane (Scrollable Questions Container) */}
        <div 
          ref={scrollRef}
          className={cn(
            "flex flex-col flex-1 max-h-[500px] sm:max-h-[600px] overflow-y-auto scroll-smooth snap-y snap-mandatory pr-1 sm:pr-3 pb-[10vh]",
            !currentQuestion.hasPassage && "max-w-4xl mx-auto w-full pt-4"
          )}
        >
          {questionSet.map((q, index) => {
            const isSelectedAnswer = selectedAnswers[index] || null;
            const isSubmitted = hasSubmitted[index] || false;
            const isCorrect = isSelectedAnswer === q.correctAnswer;
            const isLastQuestion = index === questionSet.length - 1;

            return (
              <div
                key={q.id}
                data-index={index}
                className={cn(
                  "demo-question-card shrink-0 snap-start rounded-[28px] sm:rounded-3xl p-4 sm:p-5 md:p-6 border relative flex flex-col mb-4 sm:mb-6",
                  !currentQuestion.hasPassage && "max-w-3xl mx-auto w-full shadow-lg",
                  isDark
                    ? "bg-slate-950/70 border-white/10 shadow-[0_22px_45px_rgba(15,23,42,0.4)] backdrop-blur-sm"
                    : "bg-white border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
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
                <div className="flex items-center justify-between mb-3 sm:mb-4 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-orange-500/20">
                      Q{index + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md",
                      isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"
                    )}>
                      {q.hasPassage ? "English Comprehension" : "11+ Mathematics"}
                    </span>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold",
                    q.difficulty === "Foundation" 
                      ? isDark
                        ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : isDark
                        ? "bg-red-500/15 text-red-200 border border-red-500/30"
                        : "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    {q.difficulty}
                  </span>
                </div>

                {/* Question Text */}
                <div className="mb-3 sm:mb-4 relative">
                  <div className={cn("text-sm sm:text-lg font-medium leading-relaxed", textPrimary)}>
                    <MathText text={q.text} className="exam-math" />
                  </div>
                </div>

                {/* Diagram */}
                {renderDiagram(q)}

                {/* Answer Options */}
                <div className="space-y-1 sm:space-y-1.5 mb-2.5 sm:mb-3">
                  {q.options.map(option => {
                    const isSelected = isSelectedAnswer === option.id;
                    const showCorrect = isSubmitted && option.id === q.correctAnswer;
                    const showWrong = isSubmitted && isSelected && !isCorrect;
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (!isSubmitted) setSelectedAnswers(prev => ({ ...prev, [index]: option.id }));
                        }}
                        disabled={isSubmitted}
                        className={cn(
                          "w-full text-left px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border-2 transition-all duration-200 relative z-10",
                          isDark
                            ? "hover:border-orange-400/60 hover:bg-orange-500/10"
                            : "hover:border-orange-300 hover:bg-orange-50/50",
                          !isSubmitted && !isSelected && (isDark ? "border-white/10 bg-slate-950/60" : "border-gray-200 bg-white"),
                          isSelected && !isSubmitted && (isDark ? "border-orange-400 bg-orange-500/15 shadow-sm" : "border-orange-500 bg-orange-50 shadow-sm"),
                          showCorrect && (isDark ? "border-emerald-400/60 bg-emerald-500/15" : "border-emerald-500 bg-emerald-50"),
                          showWrong && (isDark ? "border-rose-400/60 bg-rose-500/15" : "border-red-400 bg-red-50"),
                          isSubmitted && "cursor-default"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[11px] sm:text-sm font-semibold transition-colors",
                              isSelected && !isSubmitted && "bg-orange-500 text-white",
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
                {!isSubmitted ? (
                  <Button
                    onClick={() => handleSubmit(index)}
                    disabled={!isSelectedAnswer}
                    className="w-full relative z-10 bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 text-xs sm:text-sm disabled:opacity-50 disabled:shadow-none"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <div className={cn(
                    "p-4 sm:p-5 rounded-2xl border mt-2",
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
                          {isCorrect ? "Correct! Well done!" : `Not quite - the answer is ${q.correctAnswer}.`}
                        </p>
                        <div className={cn("text-sm leading-relaxed", isDark ? "text-slate-300" : "text-gray-600")}>
                          <RichQuestionContent text={q.explanation} className="space-y-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation (Next Question / CTA) */}
                <div className={cn("flex items-center justify-between mt-5 sm:mt-6 pt-5 sm:pt-6 border-t", isDark ? "border-white/10" : "border-gray-100")}>
                  <Button 
                    variant="ghost" 
                    onClick={() => handlePrevious(index)} 
                    disabled={index === 0}
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
                  <div className="flex gap-1.5 sm:gap-2 relative z-10">
                    {questionSet.map((_, dotIndex) => {
                      const result = questionResults.get(dotIndex);
                      const isCompleted = result !== undefined;
                      const wasCorrect = result === true;
                      
                      return (
                        <button
                          key={dotIndex}
                          onClick={() => {
                            document.querySelector(`[data-index="${dotIndex}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            dotIndex === currentQuestionIndex 
                              ? "w-6 sm:w-8 bg-gradient-to-r from-red-600 to-orange-500" 
                              : isCompleted && wasCorrect 
                                ? "w-2 bg-emerald-500" 
                                : isCompleted && !wasCorrect 
                                  ? "w-2 bg-rose-400" 
                                  : isDark
                                    ? "w-2 bg-white/10 hover:bg-white/20"
                                    : "w-2 bg-gray-200 hover:bg-gray-300"
                          )}
                          aria-label={`Go to question ${dotIndex + 1}`}
                        />
                      );
                    })}
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={() => handleNext(index)} 
                    disabled={index === questionSet.length - 1}
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
                {isLastQuestion && isSubmitted && (
                  <div
                    className={cn(
                      "mt-6 p-5 sm:p-6 rounded-2xl border",
                      isDark
                        ? "bg-gradient-to-br from-orange-500/20 via-red-500/15 to-cyan-400/10 border-orange-400/30"
                        : "bg-gradient-to-br from-orange-50 via-red-50 to-cyan-50 border-orange-100"
                    )}
                  >
                    <p className={cn("text-center font-semibold mb-4 text-base sm:text-lg", textPrimary)}>
                      Ready to practice with 4,200+ more questions?
                    </p>
                    <Button 
                      onClick={onStartPracticeClick}
                      className="w-full relative z-10 bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300"
                    >
                      Start exam-style 11+ practice (free)
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
    </div>
  </div>
  );
}
