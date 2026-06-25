import { supabase } from "@/integrations/supabase/client";
import {
  COMBINED_MOCK_EVENT_SLUG,
  SECOND_MOCK_EVENT_SLUG,
} from "@/lib/liveMockCombinedConfig";
import { fetchCombinedMockSignup } from "@/lib/liveMockRegistration";

const PENDING_CHECKOUT_KEY = "gradlify:live-mock-checkout-pending";
const PENDING_TTL_MS = 20 * 60 * 1000;

export class LiveMockAlreadyRegisteredError extends Error {
  constructor(message = "You are already registered for this mock.") {
    super(message);
    this.name = "LiveMockAlreadyRegisteredError";
  }
}

export function isLiveMockAlreadyRegisteredError(error: unknown): boolean {
  return error instanceof LiveMockAlreadyRegisteredError;
}

export function mockEventSlugFromReturnPath(path: string): string | null {
  if (path.includes("/live-mock-exams/local-preview2")) return SECOND_MOCK_EVENT_SLUG;
  if (path.includes("/live-mock-exams/local-preview")) return COMBINED_MOCK_EVENT_SLUG;
  return null;
}

export function markLiveMockCheckoutPending(mockSlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PENDING_CHECKOUT_KEY,
    JSON.stringify({ mockSlug, at: Date.now() }),
  );
}

export function clearLiveMockCheckoutPending(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
}

export function isLiveMockCheckoutPending(mockSlug: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(PENDING_CHECKOUT_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { mockSlug?: string; at?: number };
    if (parsed.mockSlug !== mockSlug) return false;
    if (Date.now() - (parsed.at ?? 0) > PENDING_TTL_MS) {
      clearLiveMockCheckoutPending();
      return false;
    }
    return true;
  } catch {
    clearLiveMockCheckoutPending();
    return false;
  }
}

export async function pollLiveMockSignupUntilReady(
  userId: string,
  mockSlug: string,
  maxAttempts = 45,
  intervalMs = 1000,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const row = await fetchCombinedMockSignup(userId, mockSlug);
    if (row) {
      clearLiveMockCheckoutPending();
      return true;
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
  }
  return false;
}

/** After Stripe success, wait for the webhook signup row before showing the lobby. */
export async function confirmLiveMockRegistrationAfterPayment(
  returnPath: string,
): Promise<{ mockSlug: string | null; registered: boolean }> {
  const mockSlug = mockEventSlugFromReturnPath(returnPath);
  if (!mockSlug) {
    clearLiveMockCheckoutPending();
    return { mockSlug: null, registered: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { mockSlug, registered: false };
  }

  const registered = await pollLiveMockSignupUntilReady(user.id, mockSlug);
  if (registered) clearLiveMockCheckoutPending();
  return { mockSlug, registered };
}
