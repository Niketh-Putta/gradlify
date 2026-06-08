import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MOCK_SLUG = "both_subjects_live_mock";
const readEnv = (name: string) => Deno.env.get(name)?.trim() ?? "";

const SIGNUP_DISPLAY_OFFSET = Number(readEnv("LIVE_MOCK_SIGNUP_DISPLAY_OFFSET") || "55");
const MIN_DISPLAYED_SIGNUPS = Number(readEnv("LIVE_MOCK_MIN_DISPLAYED_SIGNUPS") || "76");
// Hardcoded so the displayed price can't be overridden by a stale secret.
const STANDARD_PRICE_GBP = 14.99;
const PROMO_CODE = readEnv("LIVE_MOCK_PROMO_CODE") || "LEVELFIELD";
// Authoritative discount-spot cap. Hardcoded (not env-driven) so the displayed
// scarcity stays controllable from code and isn't overridden by stale secrets.
const PROMO_MAX_REDEMPTIONS = 3;

const getDisplayedSignupCount = (count: number) =>
  Math.max(MIN_DISPLAYED_SIGNUPS, count + SIGNUP_DISPLAY_OFFSET);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mockSlug =
      typeof body?.mockSlug === "string" && body.mockSlug.trim().length > 0
        ? body.mockSlug.trim()
        : DEFAULT_MOCK_SLUG;

    const supabaseUrl = readEnv("SUPABASE_URL");
    const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase count service is not configured.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { count, error } = await supabase
      .from("live_mock_exam_signups")
      .select("id", { count: "exact", head: true })
      .eq("mock_slug", mockSlug);

    if (error) throw error;

    const realCount = count ?? 0;
    const displayedCount = getDisplayedSignupCount(realCount);
    let promoSpotsRemaining = PROMO_MAX_REDEMPTIONS;
    const stripeKey = readEnv("STRIPE_SECRET_KEY_LIVE") || readEnv("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      const promotionCodes = await stripe.promotionCodes.list({
        code: PROMO_CODE,
        active: true,
        limit: 1,
      });
      const promotionCode = promotionCodes.data[0];
      const coupon = promotionCode?.coupon;
      const timesRedeemed = promotionCode?.times_redeemed ?? coupon?.times_redeemed ?? 0;
      // Use the configured cap as the source of truth so the displayed scarcity
      // is controllable, while still decrementing with real Stripe redemptions.
      promoSpotsRemaining = Math.max(0, PROMO_MAX_REDEMPTIONS - timesRedeemed);
    }

    return new Response(
      JSON.stringify({
        count: realCount,
        displayedCount,
        currentPriceGbp: STANDARD_PRICE_GBP,
        promoCode: PROMO_CODE,
        promoSpotsRemaining,
        standardPriceGbp: STANDARD_PRICE_GBP,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load signup count.";
    return new Response(JSON.stringify({ count: 0, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
