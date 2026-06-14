import { supabase } from "@/integrations/supabase/client";
import { getDataFastIds } from "@/lib/datafast";
import { COMBINED_MOCK_EVENT_SLUG, SECOND_MOCK_EVENT_SLUG } from "@/lib/liveMockCombinedConfig";

export const BOTH_SUBJECTS_MOCK_SLUG = COMBINED_MOCK_EVENT_SLUG;

/**
 * Registration is keyed entirely on the mock slug, so the same helpers serve
 * every combined live mock. Mock 1 callers keep their original (slug-less)
 * signatures by defaulting to BOTH_SUBJECTS_MOCK_SLUG; mock 2 passes its own
 * slug. The slug is always one of the known combined-mock slugs.
 */
export async function recordCombinedMockSignup(
  userId: string,
  email: string,
  mockSlug: string = BOTH_SUBJECTS_MOCK_SLUG,
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Please sign in before registering.");
  }

  const { data, error } = await supabase
    .from("live_mock_exam_signups" as never)
    .upsert(
      {
        user_id: userId,
        email: normalizedEmail,
        mock_slug: mockSlug,
        mock_starts_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mock_slug,user_id" },
    )
    .select("id, registered_at")
    .single();

  if (error) {
    throw new Error("Could not record your registration. Please try again.");
  }

  return data as { id: string; registered_at: string };
}

export async function startCombinedMockCheckout(
  returnTo: string,
  mockSlug: string = BOTH_SUBJECTS_MOCK_SLUG,
) {
  const { data, error } = await supabase.functions.invoke("create-live-mock-payment", {
    body: {
      returnTo,
      baseUrl: window.location.origin,
      mockSlug,
      ...getDataFastIds(),
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Registration checkout URL was not returned.");

  window.location.href = data.url;
}

export async function registerForCombinedMock(options: {
  userId: string;
  email: string;
  isPremium: boolean;
  returnTo?: string;
  mockSlug?: string;
}) {
  const mockSlug = options.mockSlug ?? BOTH_SUBJECTS_MOCK_SLUG;
  if (options.isPremium) {
    await recordCombinedMockSignup(options.userId, options.email, mockSlug);
    return "registered" as const;
  }

  const returnTo =
    options.returnTo ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;
  await startCombinedMockCheckout(returnTo, mockSlug);
  return "checkout" as const;
}

export async function fetchCombinedMockSignup(
  userId: string,
  mockSlug: string = BOTH_SUBJECTS_MOCK_SLUG,
) {
  const { data, error } = await supabase
    .from("live_mock_exam_signups" as never)
    .select("id, registered_at")
    .eq("mock_slug", mockSlug)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; registered_at: string } | null;
}

/* ───────────────────────────────────────────────────────────────────────────
 * Second combined mock ("mock 2") — thin wrappers around the generalised
 * helpers above, bound to SECOND_MOCK_EVENT_SLUG so callers never risk passing
 * the wrong slug and touching mock 1.
 * ─────────────────────────────────────────────────────────────────────────── */

export async function recordSecondMockSignup(userId: string, email: string) {
  return recordCombinedMockSignup(userId, email, SECOND_MOCK_EVENT_SLUG);
}

export async function startSecondMockCheckout(returnTo: string) {
  return startCombinedMockCheckout(returnTo, SECOND_MOCK_EVENT_SLUG);
}

export async function registerForSecondMock(options: {
  userId: string;
  email: string;
  isPremium: boolean;
  returnTo?: string;
}) {
  return registerForCombinedMock({ ...options, mockSlug: SECOND_MOCK_EVENT_SLUG });
}

export async function fetchSecondMockSignup(userId: string) {
  return fetchCombinedMockSignup(userId, SECOND_MOCK_EVENT_SLUG);
}
