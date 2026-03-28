const normalizeFlag = (value?: string) => (value ?? "").toLowerCase().trim();

export const AI_FEATURE_ENABLED = ["1", "true", "yes", "on"].includes(
  normalizeFlag(import.meta.env.VITE_AI_FEATURE_ENABLED)
);
