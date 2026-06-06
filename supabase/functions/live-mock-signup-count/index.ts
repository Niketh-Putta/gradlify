import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MOCK_SLUG = "both_subjects_live_mock";
const readEnv = (name: string) => Deno.env.get(name)?.trim() ?? "";

const DISCOUNT_DISPLAY_CAP = Number(readEnv("LIVE_MOCK_DISCOUNT_DISPLAY_CAP") || "60");
const SIGNUP_DISPLAY_OFFSET = Number(readEnv("LIVE_MOCK_SIGNUP_DISPLAY_OFFSET") || "48");
const MIN_DISPLAYED_SIGNUPS = Number(readEnv("LIVE_MOCK_MIN_DISPLAYED_SIGNUPS") || "48");
const DISCOUNT_REAL_CAP = DISCOUNT_DISPLAY_CAP - SIGNUP_DISPLAY_OFFSET;
const DISCOUNT_PRICE_GBP = Number(readEnv("LIVE_MOCK_DISCOUNT_PRICE_GBP") || "9.99");
const STANDARD_PRICE_GBP = Number(readEnv("LIVE_MOCK_STANDARD_PRICE_GBP") || "14.99");

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
    const discountAvailable = realCount < DISCOUNT_REAL_CAP;
    const spotsRemaining = Math.max(0, DISCOUNT_DISPLAY_CAP - displayedCount);
    const currentPriceGbp = discountAvailable ? DISCOUNT_PRICE_GBP : STANDARD_PRICE_GBP;

    return new Response(
      JSON.stringify({
        count: realCount,
        displayedCount,
        discountAvailable,
        spotsRemaining,
        discountDisplayCap: DISCOUNT_DISPLAY_CAP,
        currentPriceGbp,
        discountPriceGbp: DISCOUNT_PRICE_GBP,
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
