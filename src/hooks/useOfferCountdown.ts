import { useEffect, useMemo, useState } from "react";

const OFFER_COUNTDOWN_KEY = "gradlify-limited-offer-expires-at";
const DAY_MS = 24 * 60 * 60 * 1000;

function getStoredExpiry() {
  if (typeof window === "undefined") return Date.now() + DAY_MS;

  const stored = window.localStorage.getItem(OFFER_COUNTDOWN_KEY);
  const parsed = stored ? Number(stored) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  const randomDuration = Math.max(60 * 1000, Math.floor(Math.random() * DAY_MS));
  const expiresAt = Date.now() + randomDuration;
  window.localStorage.setItem(OFFER_COUNTDOWN_KEY, String(expiresAt));
  return expiresAt;
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    remainingMs: Math.max(0, ms),
    progressPercent: Math.max(0, Math.min(100, (ms / DAY_MS) * 100)),
    label: `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s left`,
  };
}

export function useOfferCountdown() {
  const expiresAt = useMemo(getStoredExpiry, []);
  const [remainingMs, setRemainingMs] = useState(() => expiresAt - Date.now());

  useEffect(() => {
    const tick = () => setRemainingMs(expiresAt - Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return formatRemaining(remainingMs);
}
