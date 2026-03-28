export const GCSE_WEAKNESS_TOPICS = [
  "Number",
  "Algebra",
  "Geometry",
  "Ratio & Proportion",
  "Probability",
  "Statistics",
] as const;

export type WeaknessTopic = (typeof GCSE_WEAKNESS_TOPICS)[number];
export type WeaknessTier = "Foundation" | "Higher";
export type WeaknessQuestionType = "multiple-choice" | "numeric";

export type MultipleChoiceOption = {
  id: string;
  label: string;
};

type WeaknessQuestionBase = {
  id: string;
  tier: WeaknessTier;
  topic: WeaknessTopic;
  prompt: string;
  type: WeaknessQuestionType;
};

export type MultipleChoiceWeaknessQuestion = WeaknessQuestionBase & {
  type: "multiple-choice";
  options: MultipleChoiceOption[];
  correctOptionId: string;
};

export type NumericWeaknessQuestion = WeaknessQuestionBase & {
  type: "numeric";
  correctAnswer: number;
  acceptableAnswers?: number[];
  answerLabel?: string;
  answerPlaceholder?: string;
};

export type WeaknessQuestion =
  | MultipleChoiceWeaknessQuestion
  | NumericWeaknessQuestion;

export const GCSE_TOPIC_WEAKNESS_QUESTIONS: Record<WeaknessTier, WeaknessQuestion[]> = {
  Foundation: [
    {
      id: "foundation-number-1",
      tier: "Foundation",
      topic: "Number",
      type: "numeric",
      prompt: "Calculate 3/5 of 45.",
      correctAnswer: 27,
      answerLabel: "Your answer",
      answerPlaceholder: "e.g. 27",
    },
    {
      id: "foundation-algebra-1",
      tier: "Foundation",
      topic: "Algebra",
      type: "numeric",
      prompt: "Solve 5x - 7 = 18.",
      correctAnswer: 5,
      answerLabel: "Value of x",
      answerPlaceholder: "e.g. 5",
    },
    {
      id: "foundation-geometry-1",
      tier: "Foundation",
      topic: "Geometry",
      type: "numeric",
      prompt:
        "Two angles in a triangle are 48\u00b0 and 67\u00b0. Find the third angle in degrees.",
      correctAnswer: 65,
      answerLabel: "Angle (degrees)",
      answerPlaceholder: "e.g. 65",
    },
    {
      id: "foundation-ratio-1",
      tier: "Foundation",
      topic: "Ratio & Proportion",
      type: "numeric",
      prompt: "Share \u00a360 in the ratio 2:3. How much is the smaller share?",
      correctAnswer: 24,
      answerLabel: "Smaller share (\u00a3)",
      answerPlaceholder: "e.g. 24",
    },
    {
      id: "foundation-probability-1",
      tier: "Foundation",
      topic: "Probability",
      type: "multiple-choice",
      prompt:
        "A fair dice is rolled once. What is the probability of getting an even number?",
      options: [
        { id: "a", label: "1/6" },
        { id: "b", label: "1/3" },
        { id: "c", label: "1/2" },
        { id: "d", label: "2/3" },
      ],
      correctOptionId: "c",
    },
    {
      id: "foundation-statistics-1",
      tier: "Foundation",
      topic: "Statistics",
      type: "numeric",
      prompt: "Find the median of: 2, 5, 7, 9, 12.",
      correctAnswer: 7,
      answerLabel: "Median",
      answerPlaceholder: "e.g. 7",
    },
    {
      id: "foundation-number-2",
      tier: "Foundation",
      topic: "Number",
      type: "multiple-choice",
      prompt: "Round 6.784 to 1 decimal place.",
      options: [
        { id: "a", label: "6.7" },
        { id: "b", label: "6.8" },
        { id: "c", label: "6.78" },
        { id: "d", label: "6.79" },
      ],
      correctOptionId: "b",
    },
    {
      id: "foundation-algebra-2",
      tier: "Foundation",
      topic: "Algebra",
      type: "multiple-choice",
      prompt: "Expand 3(x + 4).",
      options: [
        { id: "a", label: "3x + 4" },
        { id: "b", label: "3x + 7" },
        { id: "c", label: "3x + 12" },
        { id: "d", label: "12x" },
      ],
      correctOptionId: "c",
    },
    {
      id: "foundation-geometry-2",
      tier: "Foundation",
      topic: "Geometry",
      type: "numeric",
      prompt: "Find the area of a rectangle with length 9 cm and width 4 cm.",
      correctAnswer: 36,
      answerLabel: "Area (cm\u00b2)",
      answerPlaceholder: "e.g. 36",
    },
    {
      id: "foundation-ratio-2",
      tier: "Foundation",
      topic: "Ratio & Proportion",
      type: "numeric",
      prompt:
        "4 pens cost \u00a36. Assuming direct proportion, how much do 10 pens cost in pounds?",
      correctAnswer: 15,
      answerLabel: "Cost (\u00a3)",
      answerPlaceholder: "e.g. 15",
    },
  ],
  Higher: [
    {
      id: "higher-number-1",
      tier: "Higher",
      topic: "Number",
      type: "numeric",
      prompt: "Calculate 15% of 240.",
      correctAnswer: 36,
      answerLabel: "Your answer",
      answerPlaceholder: "e.g. 36",
    },
    {
      id: "higher-algebra-1",
      tier: "Higher",
      topic: "Algebra",
      type: "numeric",
      prompt: "Solve x\u00b2 - 5x + 6 = 0. Give the smaller root.",
      correctAnswer: 2,
      answerLabel: "Smaller root",
      answerPlaceholder: "e.g. 2",
    },
    {
      id: "higher-geometry-1",
      tier: "Higher",
      topic: "Geometry",
      type: "numeric",
      prompt:
        "A circle has radius 7 cm. Using \u03c0 = 22/7, find the circumference in cm.",
      correctAnswer: 44,
      answerLabel: "Circumference (cm)",
      answerPlaceholder: "e.g. 44",
    },
    {
      id: "higher-ratio-1",
      tier: "Higher",
      topic: "Ratio & Proportion",
      type: "numeric",
      prompt:
        "y is directly proportional to x. When x = 4, y = 10. Find y when x = 12.",
      correctAnswer: 30,
      answerLabel: "Value of y",
      answerPlaceholder: "e.g. 30",
    },
    {
      id: "higher-probability-1",
      tier: "Higher",
      topic: "Probability",
      type: "multiple-choice",
      prompt:
        "Two fair coins are tossed. What is the probability of getting exactly one head?",
      options: [
        { id: "a", label: "1/4" },
        { id: "b", label: "1/2" },
        { id: "c", label: "3/4" },
        { id: "d", label: "1" },
      ],
      correctOptionId: "b",
    },
    {
      id: "higher-statistics-1",
      tier: "Higher",
      topic: "Statistics",
      type: "numeric",
      prompt: "Find the mean of: 12, 15, 18, 21, 24.",
      correctAnswer: 18,
      answerLabel: "Mean",
      answerPlaceholder: "e.g. 18",
    },
    {
      id: "higher-number-2",
      tier: "Higher",
      topic: "Number",
      type: "multiple-choice",
      prompt: "Write 3.6 \u00d7 10\u2074 as an ordinary number.",
      options: [
        { id: "a", label: "3,600" },
        { id: "b", label: "36,000" },
        { id: "c", label: "360,000" },
        { id: "d", label: "3,600,000" },
      ],
      correctOptionId: "b",
    },
    {
      id: "higher-algebra-2",
      tier: "Higher",
      topic: "Algebra",
      type: "multiple-choice",
      prompt: "Rearrange v = u + at to make t the subject.",
      options: [
        { id: "a", label: "t = v - u / a" },
        { id: "b", label: "t = (v - u) / a" },
        { id: "c", label: "t = (u - v) / a" },
        { id: "d", label: "t = a / (v - u)" },
      ],
      correctOptionId: "b",
    },
    {
      id: "higher-geometry-2",
      tier: "Higher",
      topic: "Geometry",
      type: "numeric",
      prompt:
        "A right-angled triangle has sides 9 cm and 12 cm. Find the hypotenuse in cm.",
      correctAnswer: 15,
      answerLabel: "Hypotenuse (cm)",
      answerPlaceholder: "e.g. 15",
    },
    {
      id: "higher-ratio-2",
      tier: "Higher",
      topic: "Ratio & Proportion",
      type: "numeric",
      prompt:
        "Sugar and flour are mixed in the ratio 2:5. If there are 250 g of flour, how much sugar is needed in grams?",
      correctAnswer: 100,
      answerLabel: "Sugar (g)",
      answerPlaceholder: "e.g. 100",
    },
  ],
};

export const QUESTIONS_PER_ATTEMPT = 10;
