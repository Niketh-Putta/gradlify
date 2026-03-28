const MISSING_PROFILE_COLUMNS_KEY = "gradlify:missing_profile_columns";
const MISSING_LEADERBOARD_RPC_KEY = "gradlify:missing_leaderboard_rpc";
const COMPAT_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

const readStoredMissingProfileColumns = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(MISSING_PROFILE_COLUMNS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(
        parsed.filter((value): value is string => typeof value === "string" && value.length > 0),
      );
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.columns) &&
      typeof parsed.observedAt === "number"
    ) {
      if (Date.now() - parsed.observedAt > COMPAT_CACHE_TTL_MS) return new Set();
      return new Set(
        parsed.columns.filter((value: unknown): value is string => typeof value === "string" && value.length > 0),
      );
    }
    return new Set();
  } catch {
    return new Set();
  }
};

const writeStoredMissingProfileColumns = (columns: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      MISSING_PROFILE_COLUMNS_KEY,
      JSON.stringify({ columns: Array.from(columns), observedAt: Date.now() }),
    );
  } catch {
    // Ignore storage write failures.
  }
};

const readStoredMissingLeaderboardRpc = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(MISSING_LEADERBOARD_RPC_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    if (parsed.missing !== true) return false;
    if (typeof parsed.observedAt !== "number") return false;
    if (Date.now() - parsed.observedAt > COMPAT_CACHE_TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
};

const writeStoredMissingLeaderboardRpc = (missing: boolean) => {
  if (typeof window === "undefined") return;
  try {
    if (missing) {
      localStorage.setItem(
        MISSING_LEADERBOARD_RPC_KEY,
        JSON.stringify({ missing: true, observedAt: Date.now() }),
      );
    } else {
      localStorage.removeItem(MISSING_LEADERBOARD_RPC_KEY);
    }
  } catch {
    // Ignore storage write failures.
  }
};

const missingProfileColumns = readStoredMissingProfileColumns();
let leaderboardRpcMissing = readStoredMissingLeaderboardRpc();

export const getMissingColumnFromError = (error: unknown): string | null => {
  const message = (error as { message?: string })?.message ?? "";
  const quotedMatch = message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const plainMatch = message.match(/column ([a-zA-Z0-9_]+) does not exist/i);
  return plainMatch?.[1] ?? null;
};

export const isFunctionMissingError = (error: unknown) => {
  const err = (error ?? {}) as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    status?: number;
    statusCode?: number;
  };
  const errorText = [err.message, err.details, err.hint].filter(Boolean).join(" ");
  return (
    err.code === "PGRST202" ||
    err.code === "404" ||
    err.status === 404 ||
    err.statusCode === 404 ||
    /could not find the function/i.test(errorText) ||
    /function .* does not exist/i.test(errorText) ||
    /not found/i.test(errorText)
  );
};

export const isKnownMissingProfileColumn = (column: string) => missingProfileColumns.has(column);

export const markProfileColumnMissing = (column: string) => {
  if (!column || missingProfileColumns.has(column)) return;
  missingProfileColumns.add(column);
  writeStoredMissingProfileColumns(missingProfileColumns);
};

export const profileSelect = (required: readonly string[], optional: readonly string[]) => {
  const filteredOptional = optional.filter((column) => !missingProfileColumns.has(column));
  return [...required, ...filteredOptional].join(", ");
};

export const isLeaderboardRpcKnownMissing = () => leaderboardRpcMissing;

export const markLeaderboardRpcMissing = () => {
  if (leaderboardRpcMissing) return;
  leaderboardRpcMissing = true;
  writeStoredMissingLeaderboardRpc(true);
};

export const clearLeaderboardRpcMissing = () => {
  leaderboardRpcMissing = false;
  writeStoredMissingLeaderboardRpc(false);
};
