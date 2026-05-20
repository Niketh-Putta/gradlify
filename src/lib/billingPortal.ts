import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";

export async function openBillingPortal(
  returnUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "Not authenticated" };
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/customer-portal`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      return_url: returnUrl ?? window.location.href,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text || "Could not open billing portal" };
  }

  const data = (await response.json()) as { url?: string };
  if (!data?.url) {
    return { ok: false, error: "No portal URL returned" };
  }

  window.location.assign(data.url);
  return { ok: true };
}
