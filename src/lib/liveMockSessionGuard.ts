/**
 * Live mock sitting — localStorage hydrate/persist guards.
 *
 * Pattern: hydrate once per storage key (prefer useLayoutEffect), block persist
 * until hydrated, never show blocking loaders on silent re-checks mid-exam.
 *
 * Incident: docs/LIVE-MOCK-ENGINEERING.md#2026-06-21-mid-exam-lobby-flicker
 */

export function readLiveMockLocalState<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function isHydratedForKey(hydratedKeyRef: { current: string | null }, storageKey: string): boolean {
  return hydratedKeyRef.current === storageKey;
}

/** Returns true when it is safe to write session snapshot to localStorage. */
export function shouldPersistLiveMockSession(
  skipPersistRef: { current: boolean },
  hydratedKeyRef: { current: string | null },
  storageKey: string,
  blockPersist: boolean,
): boolean {
  if (skipPersistRef.current) return false;
  if (hydratedKeyRef.current !== storageKey) return false;
  if (blockPersist) return false;
  return true;
}

/** Apply partial state only when values differ (avoids React re-render loops). */
export function applyPartialState<T extends Record<string, unknown>>(
  saved: Partial<T>,
  current: T,
  setters: { [K in keyof T]?: (value: T[K]) => void },
): void {
  for (const key of Object.keys(setters) as (keyof T)[]) {
    const setter = setters[key];
    if (!setter) continue;
    const next = saved[key];
    if (next === undefined) continue;
    if (JSON.stringify(next) !== JSON.stringify(current[key])) {
      setter(next as T[typeof key]);
    }
  }
}
