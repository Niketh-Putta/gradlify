import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  BOTH_SUBJECTS_LIVE_MOCK_SLUG,
  getDisplayedLiveMockSignupCount,
  LIVE_MOCK_STANDARD_PRICE_GBP,
} from "../shared/liveMockPromoConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const readEnv = (name: string) => Deno.env.get(name)?.trim() ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mockSlug =
      typeof body?.mockSlug === "string" && body.mockSlug.trim().length > 0
        ? body.mockSlug.trim()
        : BOTH_SUBJECTS_LIVE_MOCK_SLUG;

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
    const displayedCount = getDisplayedLiveMockSignupCount(realCount, mockSlug);

    return new Response(
      JSON.stringify({
        mockSlug,
        count: realCount,
        displayedCount,
        currentPriceGbp: LIVE_MOCK_STANDARD_PRICE_GBP,
        promoCode: null,
        promoSpotsRemaining: 0,
        standardPriceGbp: LIVE_MOCK_STANDARD_PRICE_GBP,
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
