import { supabase } from "@/integrations/supabase/client";
import { isProteinLensHost, PROTEIN_CHECKOUT_KEY } from "@/lib/protein/host";

const defaultReturnPath = () => (isProteinLensHost() ? "/" : "/protein");

const sanitizeReturnPath = (value: string) => {
  const fallback = defaultReturnPath();
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("/pay/")) return fallback;
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
  localStorage.setItem(PROTEIN_CHECKOUT_KEY, returnTo);

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
