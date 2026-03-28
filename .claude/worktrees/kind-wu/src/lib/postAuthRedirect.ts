export type PostAuthRedirect = {
  path: string;
  message?: string;
};

const REDIRECT_KEY = "gradlify:post-auth-redirect";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function setPostAuthRedirect(payload: PostAuthRedirect) {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(REDIRECT_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors (private mode, quota issues).
  }
}

export function getPostAuthRedirect(): PostAuthRedirect | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(REDIRECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PostAuthRedirect>;
    if (!parsed.path || typeof parsed.path !== "string") return null;
    return {
      path: parsed.path,
      message: typeof parsed.message === "string" ? parsed.message : undefined,
    };
  } catch {
    return null;
  }
}

export function consumePostAuthRedirect(): PostAuthRedirect | null {
  const redirect = getPostAuthRedirect();
  if (!redirect || !canUseSessionStorage()) return redirect;
  try {
    window.sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    // Ignore storage errors.
  }
  return redirect;
}

