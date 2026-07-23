/**
 * English practice/mock session lock helpers.
 * Prevents mid-exam passage reshuffle (Dylan flicker) across remounts/refetches.
 */

const STORAGE_PREFIX = 'gradlify_english_session_v2:';

export function hashSessionSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export type EnglishSessionLockRecord = {
  key: string;
  uniqueIds: string[];
  lockedAt: number;
};

export function readEnglishSessionLock(key: string): EnglishSessionLockRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EnglishSessionLockRecord;
    if (!parsed || parsed.key !== key || !Array.isArray(parsed.uniqueIds) || parsed.uniqueIds.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeEnglishSessionLock(key: string, uniqueIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: EnglishSessionLockRecord = {
      key,
      uniqueIds: uniqueIds.filter(Boolean),
      lockedAt: Date.now(),
    };
    if (payload.uniqueIds.length === 0) return;
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearEnglishSessionLock(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
}
