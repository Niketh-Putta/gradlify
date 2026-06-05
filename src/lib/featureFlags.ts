const normalizeFlag = (value?: string) => (value ?? "").toLowerCase().trim();

export const AI_FEATURE_ENABLED = false;
export const ULTRA_PLAN_ENABLED = false;
export const EXAM_READINESS_ENABLED =
  import.meta.env.VITE_EXAM_READINESS_ENABLED === 'true' ||
  import.meta.env.VITE_APP_TRACK === '11PLUS';
