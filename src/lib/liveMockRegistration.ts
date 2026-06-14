import { supabase } from "@/integrations/supabase/client";
import { getDataFastIds } from "@/lib/datafast";
import { COMBINED_MOCK_EVENT_SLUG } from "@/lib/liveMockCombinedConfig";

export const BOTH_SUBJECTS_MOCK_SLUG = COMBINED_MOCK_EVENT_SLUG;

export async function recordCombinedMockSignup(userId: string, email: string) {
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
        mock_slug: BOTH_SUBJECTS_MOCK_SLUG,
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

export async function startCombinedMockCheckout(returnTo: string) {
  const { data, error } = await supabase.functions.invoke("create-live-mock-payment", {
    body: {
      returnTo,
      baseUrl: window.location.origin,
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
}) {
  if (options.isPremium) {
    await recordCombinedMockSignup(options.userId, options.email);
    return "registered" as const;
  }

  const returnTo =
    options.returnTo ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;
  await startCombinedMockCheckout(returnTo);
  return "checkout" as const;
}

export async function fetchCombinedMockSignup(userId: string) {
  const { data, error } = await supabase
    .from("live_mock_exam_signups" as never)
    .select("id, registered_at")
    .eq("mock_slug", BOTH_SUBJECTS_MOCK_SLUG)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; registered_at: string } | null;
}
