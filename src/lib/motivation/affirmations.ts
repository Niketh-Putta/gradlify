export const mindsetAffirmations: string[] = [
  "I am capable of achieving greatness through dedication and focus.",
  "Every challenge I face is an opportunity to grow stronger and wiser.",
  "My potential is limitless, and I'm unlocking it one day at a time.",
  "I embrace difficulty as a teacher and use setbacks as stepping stones.",
  "Consistent effort today builds the extraordinary success of tomorrow.",
  "I am committed to excellence, and my work reflects my highest standards.",
  "My mind is a powerful tool, and I sharpen it daily with practice.",
  "I trust the process and believe in my ability to overcome obstacles.",
  "Each study session brings me closer to mastery and confidence.",
  "I am resilient, focused, and unstoppable in pursuit of my goals.",
  "I learn from every mistake and transform it into wisdom.",
  "My dedication today creates the opportunities of tomorrow.",
  "I am in control of my success, and I choose to take action now.",
  "Progress, not perfection, is my measure of success.",
  "I am building a foundation of knowledge that will serve me for life.",
  "My hard work is paying off, and I celebrate every small victory.",
  "I am worthy of success and prepared to claim it.",
  "Challenges don't define me - my response to them does.",
  "I am focused, energized, and ready to excel.",
  "Every question I answer correctly is proof of my growing mastery."
];

export const getRandomAffirmation = (): string => {
  return mindsetAffirmations[Math.floor(Math.random() * mindsetAffirmations.length)];
};
