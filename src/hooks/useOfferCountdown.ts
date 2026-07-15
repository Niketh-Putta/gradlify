import { useEffect, useMemo, useState } from "react";

const OFFER_COUNTDOWN_KEY = "gradlify-limited-offer-expires-at";
const DAY_MS = 24 * 60 * 60 * 1000;

function getFreshExpiry() {
  return Date.now() + DAY_MS;
}

function storeExpiry(expiresAt: number) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(OFFER_COUNTDOWN_KEY, String(expiresAt));
  }
  return expiresAt;
}

function getStoredExpiry() {
  if (typeof window === "undefined") return Date.now() + DAY_MS;

  const stored = window.localStorage.getItem(OFFER_COUNTDOWN_KEY);
  const parsed = stored ? Number(stored) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > Date.now() + 1000) {
    return parsed;
  }

  return storeExpiry(getFreshExpiry());
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
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
    /** e.g. "16:45:37 left" */
    label: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)} left`,
  };
}

export function useOfferCountdown() {
  const initialExpiresAt = useMemo(getStoredExpiry, []);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [remainingMs, setRemainingMs] = useState(() => expiresAt - Date.now());

  useEffect(() => {
    const tick = () => {
      const nextRemainingMs = expiresAt - Date.now();
      if (nextRemainingMs <= 0) {
        const nextExpiresAt = storeExpiry(getFreshExpiry());
        setExpiresAt(nextExpiresAt);
        setRemainingMs(nextExpiresAt - Date.now());
        return;
      }
      setRemainingMs(nextRemainingMs);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return formatRemaining(remainingMs);
}
