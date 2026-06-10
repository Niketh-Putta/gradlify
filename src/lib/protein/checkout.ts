import { supabase } from "@/integrations/supabase/client";

const sanitizeReturnPath = (value: string) => {
  if (!value) return "/protein";
  if (!value.startsWith("/")) return "/protein";
  if (value.startsWith("/pay/")) return "/protein";
  return value;
};

export async function startProteinCheckout() {
  if (typeof window === "undefined") {
    throw new Error("Protein checkout must be initiated from a browser context.");
  }

  const sessionResponse = await supabase.auth.getSession();
  if (!sessionResponse?.data?.session) {
    throw new Error("Please log in first");
  }

  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  localStorage.setItem("gradlify:checkout:returnTo", returnTo);

  const { data, error } = await supabase.functions.invoke("create-protein-checkout", {
    body: {
      returnTo: sanitizeReturnPath(returnTo),
      baseUrl: window.location.origin,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const checkoutUrl = data?.url ?? data?.checkoutUrl;
  if (!checkoutUrl || typeof checkoutUrl !== "string") {
    throw new Error("Checkout session missing redirect URL.");
  }

  window.location.assign(checkoutUrl);
}
