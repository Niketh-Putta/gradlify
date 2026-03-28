import { supabase } from "@/integrations/supabase/client";

export async function syncBillingStatus() {
  const { data, error } = await supabase.functions.invoke("billing-sync", {
    method: "POST",
  });

  if (error) {
    throw error;
  }

  return data;
}
