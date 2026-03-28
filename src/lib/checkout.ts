import { supabase } from "@/integrations/supabase/client";
import { resolveUserTrack } from "@/lib/track";

type PremiumTrack = "gcse" | "eleven_plus";

const sanitizeReturnPath = (value: string) => {
  if (!value) return "/home";
  if (!value.startsWith("/")) return "/home";
  if (value.startsWith("/pay/")) return "/home";
  return value;
};

export async function startPremiumCheckout(
  plan: "monthly" | "annual" | "ultra" | "ultra_annual" = "monthly",
  premiumTrack?: PremiumTrack,
) {
  if (typeof window === "undefined") {
    throw new Error("Premium checkout must be initiated from a browser context.");
  }

  const sessionResponse = await supabase.auth.getSession();
  if (!sessionResponse?.data?.session) {
    throw new Error("Please log in first");
  }

  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  localStorage.setItem("gradlify:checkout:returnTo", returnTo);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("Please log in first");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("track")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error(`Failed to load user track: ${profileError.message}`);
  }

  const activeTrack = resolveUserTrack((profile as any)?.track ?? null) === "11plus" ? "eleven_plus" : "gcse";
  const requestedTrack = premiumTrack ?? activeTrack;
  if (requestedTrack !== activeTrack) {
    throw new Error(
      `You are currently on ${activeTrack}. Switch to ${requestedTrack} track before subscribing.`,
    );
  }

  try {
    console.log("Starting checkout function call for plan:", plan);
    const payload = {
      plan,
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
