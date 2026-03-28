const buildAllowedSet = (value: string | undefined | null): Set<string> => {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
};

const forcedStarterUserIds = buildAllowedSet(import.meta.env.VITE_FORCE_STARTER_USER_IDS);

export const isForcedStarterUser = (userId?: string | null): boolean => {
  if (!userId) return false;
  return forcedStarterUserIds.has(userId);
};

export const getForcedStarterUserIds = () => Array.from(forcedStarterUserIds);
