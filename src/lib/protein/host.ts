const PROTEIN_LENS_HOSTS = new Set([
  "proteinlens.vercel.app",
  "proteinlens-niketh-puttas-projects.vercel.app",
]);

export const PROTEIN_GUEST_KEY = "proteinlens:guest";
export const PROTEIN_STORAGE_PREFIX = "proteinlens";
export const PROTEIN_CHECKOUT_KEY = "proteinlens:checkout:returnTo";

/** MVP: skip auth/onboarding gate and land straight on the tracker. Set false to restore setup flow. */
export const PROTEIN_MVP_SKIP_SETUP = true;

export function isProteinLensHost(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  const host = hostname.toLowerCase();
  if (PROTEIN_LENS_HOSTS.has(host)) return true;
  return host.startsWith("proteinlens-") && host.endsWith(".vercel.app");
}

export function isProteinGuestMode() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PROTEIN_GUEST_KEY) === "1";
}

export function enableProteinGuestMode() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROTEIN_GUEST_KEY, "1");
}

export function clearProteinGuestMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROTEIN_GUEST_KEY);
}
