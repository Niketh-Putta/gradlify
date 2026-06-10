const PROTEIN_LENS_HOSTS = new Set([
  "proteinlens.vercel.app",
  "proteinlens-niketh-puttas-projects.vercel.app",
]);

export function isProteinLensHost(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  const host = hostname.toLowerCase();
  if (PROTEIN_LENS_HOSTS.has(host)) return true;
  return host.startsWith("proteinlens-") && host.endsWith(".vercel.app");
}
