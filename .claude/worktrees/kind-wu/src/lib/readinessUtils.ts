const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const computeOverallReadinessFromTopics = (topics: Array<{ readiness: number }>) => {
  if (!topics.length) return 0;

  const sanitized = topics.map((topic) => clamp(Number(topic.readiness) || 0, 0, 100));
  if (!sanitized.length) return 0;

  const average = sanitized.reduce((sum, value) => sum + value, 0) / sanitized.length;
  return Math.round(clamp(average, 0, 100));
};
