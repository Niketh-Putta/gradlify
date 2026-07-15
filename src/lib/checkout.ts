import { supabase } from "@/integrations/supabase/client";
import { ULTRA_PLAN_ENABLED } from "@/lib/featureFlags";
import { setPostAuthRedirect } from "@/lib/postAuthRedirect";
import { resolveUserTrack } from "@/lib/track";

type PremiumTrack = "gcse" | "eleven_plus";

export type PremiumCheckoutPlan =
  | "lifetime"
  | "weekly"
  | "annual"
  | "ultra"
  | "ultra_annual";

const CHECKOUT_AFTER_AUTH = "/select-subject?intent=checkout";

const sanitizeReturnPath = (value: string) => {
  if (!value) return "/home";
  if (!value.startsWith("/")) return "/home";
  if (value.startsWith("/pay/")) return "/home";
  return value;
};

const redirectToAuthForCheckout = () => {
  setPostAuthRedirect({
    path: CHECKOUT_AFTER_AUTH,
    message: "Sign in to continue to Lifetime Premium checkout.",
  });
  const authUrl = `/auth?mode=signin&redirect=${encodeURIComponent(CHECKOUT_AFTER_AUTH)}&message=${encodeURIComponent("Sign in to continue to Lifetime Premium checkout.")}`;
  window.location.assign(authUrl);
};

/** Public checkout is lifetime-only. Legacy plan names are coerced server-side too. */
export async function startPremiumCheckout(
  plan: PremiumCheckoutPlan = "lifetime",
  premiumTrack?: PremiumTrack,
) {
  if (!ULTRA_PLAN_ENABLED && (plan === "ultra" || plan === "ultra_annual")) {
    throw new Error("This plan is not currently available.");
  }

  if (typeof window === "undefined") {
    throw new Error("Premium checkout must be initiated from a browser context.");
  }

  const sessionResponse = await supabase.auth.getSession();
  if (!sessionResponse?.data?.session) {
    redirectToAuthForCheckout();
    return;
  }

  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  localStorage.setItem("gradlify:checkout:returnTo", returnTo);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    redirectToAuthForCheckout();
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("track")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error(`Failed to load user track: ${profileError.message}`);
  }

  const activeTrack = resolveUserTrack(profile?.track ?? null) === "11plus" ? "eleven_plus" : "gcse";
  const requestedTrack = premiumTrack ?? activeTrack;
  if (requestedTrack !== activeTrack) {
    throw new Error(
      `You are currently on ${activeTrack}. Switch to ${requestedTrack} track before subscribing.`,
    );
  }

  const checkoutPlan: PremiumCheckoutPlan =
    plan === "ultra" || plan === "ultra_annual" ? plan : "lifetime";

  try {
    console.log("Starting checkout function call for plan:", checkoutPlan);
    const payload = {
      plan: checkoutPlan,
      returnTo: sanitizeReturnPath(returnTo),
      premiumTrack: requestedTrack,
      baseUrl: window.location.origin,
    };
    console.log("Supabase edge function payload:", payload);

    const { data, error } = await supabase.functions.invoke("create-checkout-11plus", {
      body: payload,
    });

    console.log("Edge function response:", { data, error });

    if (error) {
      console.error("Supabase function invocation error:", error);
      throw error;
    }
    if (data?.error) {
      console.error("Function returned explicit error:", data.error);
      throw new Error(data.error);
    }

    if (!data?.url) {
      console.error("No checkout URL in the response payload data");
      throw new Error("Checkout URL was not returned");
    }

    console.log("Redirecting to:", data.url);
    window.location.href = data.url;
  } catch (error) {
    console.error("Checkout process completely failed:", error);
    const message = error instanceof Error ? error.message : "Failed to start checkout";
    throw new Error(message);
  }
}
