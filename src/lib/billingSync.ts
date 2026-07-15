import { supabase } from "@/integrations/supabase/client";

export async function syncBillingStatus(options?: { sessionId?: string | null }) {
  const sessionId =
    typeof options?.sessionId === "string" && options.sessionId.startsWith("cs_")
      ? options.sessionId
      : undefined;

  const { data, error } = await supabase.functions.invoke("billing-sync", {
    method: "POST",
    body: sessionId ? { session_id: sessionId } : {},
  });

  if (error) {
    throw error;
  }

  return data;
}
