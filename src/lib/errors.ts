export function isAbortLikeError(error: unknown): boolean {
  if (!error) return false;

  const candidates: string[] = [];

  if (error instanceof Error) {
    candidates.push(error.name, error.message);
  }

  if (typeof error === 'object' && error !== null) {
    const maybe = error as Record<string, unknown>;
    for (const key of ['name', 'message', 'details', 'hint', 'code']) {
      const value = maybe[key];
      if (typeof value === 'string') {
        candidates.push(value);
      }
    }
  }

  candidates.push(String(error));
  const text = candidates.join(' | ');

  return /AbortError|signal is aborted|Request was aborted|timeout|aborted \(timeout or manual cancellation\)/i.test(text);
}
