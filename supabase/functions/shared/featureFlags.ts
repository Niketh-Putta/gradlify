const normalizeFlag = (value?: string | null) => (value ?? "").toLowerCase().trim();

export const AI_FEATURE_ENABLED = ["1", "true", "yes", "on"].includes(
  normalizeFlag(Deno.env.get("VITE_AI_FEATURE_ENABLED"))
);
