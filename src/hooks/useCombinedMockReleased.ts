import { useEffect, useState } from "react";
import { COMBINED_MOCK_RELEASE_AT, isCombinedMockReleased } from "@/lib/liveMockCombinedConfig";

/** setTimeout uses a 32-bit signed delay; cap longer waits and re-arm. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Returns whether the combined live mock has gone live, and flips to `true`
 * automatically the moment the release time passes - no page reload required.
 */
export function useCombinedMockReleased(): boolean {
  const [released, setReleased] = useState<boolean>(() => isCombinedMockReleased());

  useEffect(() => {
    if (released) return;

    let timeoutId: number | undefined;

    const arm = () => {
      const remaining = COMBINED_MOCK_RELEASE_AT.getTime() - Date.now();
      if (remaining <= 0) {
        setReleased(true);
        return;
      }
      timeoutId = window.setTimeout(arm, Math.min(remaining, MAX_TIMEOUT_MS));
    };

    arm();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [released]);

  return released;
}
