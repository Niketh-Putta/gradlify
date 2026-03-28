export type ReadinessGradeInputs = {
  overallReadiness: number;
  lowestTopicReadiness: number;
  onboardingCurrentGrade?: string;
  onboardingTargetGrade?: string;
};

export type ReadinessGradeOutputs = {
  numericCurrent: number;
  numericPotential: number;
  displayCurrentGrade: string;
  displayPotentialGrade: string;
  gradeGain: number;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const parseNumericGrade = (value?: string): number | undefined => {
  if (!value) return undefined;
  const v = value.trim();
  if (/^[1-9]$/.test(v)) return Number(v);
  return undefined;
};

// Grade calculation based on overall readiness
export const gradeFromReadiness = (readiness: number): number => {
  const r = clamp(readiness, 0, 100);
  if (r >= 90) return 9;
  if (r >= 80) return 8;
  if (r >= 70) return 7;
  if (r >= 60) return 6;
  if (r >= 50) return 5;
  if (r >= 40) return 4;
  if (r >= 30) return 3;
  if (r >= 20) return 2;
  return 1;
};

// Potential grade (what they could achieve with focus)
export const potentialGradeFromWeakestTopic = (currentGrade: number, lowestTopicReadiness: number): number => {
  const potentialGain = lowestTopicReadiness < 50 ? 2 : 1;
  return Math.min(9, currentGrade + potentialGain);
};

export const computeReadinessGrades = (inputs: ReadinessGradeInputs): ReadinessGradeOutputs => {
  const computedCurrentGrade = gradeFromReadiness(inputs.overallReadiness);
  const computedPotentialGrade = potentialGradeFromWeakestTopic(computedCurrentGrade, inputs.lowestTopicReadiness);

  const numericCurrent = parseNumericGrade(inputs.onboardingCurrentGrade) ?? computedCurrentGrade;
  const userTarget = parseNumericGrade(inputs.onboardingTargetGrade);

  const numericPotentialBase = userTarget ?? computedPotentialGrade;
  const numericPotential = numericCurrent >= 9
    ? 9
    : Math.min(9, Math.max(numericPotentialBase, numericCurrent + 1));

  return {
    numericCurrent,
    numericPotential,
    displayCurrentGrade: String(numericCurrent),
    displayPotentialGrade: String(numericPotential),
    gradeGain: Math.max(0, numericPotential - numericCurrent),
  };
};
