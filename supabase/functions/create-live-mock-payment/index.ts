import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  BOTH_SUBJECTS_LIVE_MOCK_SLUG,
  getDisplayedLiveMockSignupCount,
  getLiveMockPromoConfig,
  getPromoSpotsRemaining,
  getPromoSpotsRemainingFromDisplay,
  LIVE_MOCK_STANDARD_PRICE_GBP,
  SECOND_LIVE_MOCK_SLUG,
} from "../shared/liveMockPromoConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const readEnv = (name: string) => Deno.env.get(name)?.trim() || "";

const LIVE_MOCK_PRODUCTS: Record<string, string> = {
  [BOTH_SUBJECTS_LIVE_MOCK_SLUG]: "Gradlify 11+ maths and english mock 1",
  [SECOND_LIVE_MOCK_SLUG]: "Gradlify 11+ maths and english mock 2",
};

const resolveMockSlug = (value: unknown): string => {
  const candidate = typeof value === "string" ? value.trim() : "";
  return candidate in LIVE_MOCK_PRODUCTS ? candidate : BOTH_SUBJECTS_LIVE_MOCK_SLUG;
};

const metadataValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const buildInlineLiveMockLineItem = (amountGbp: number, productName: string) => ({
  quantity: 1,
  price_data: {
    currency: "gbp",
    unit_amount: Math.round(amountGbp * 100),
    product_data: {
      name: productName,
      description: "Guided and built alongside real GL exam creators. Exclusive mock for top schools.",
    },
  },
});

const sanitizeReturnPath = (value: string) => {
  if (!value) return "/live-mock-exams";
  if (!value.startsWith("/")) return "/live-mock-exams";
  if (value.startsWith("/pay/")) return "/live-mock-exams";
  return value;
};

const isLocalBaseUrl = (value: string) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
};

async function getPromoCheckoutState(
  stripe: Stripe,
  mockSlug: string,
  supabaseService: ReturnType<typeof createClient> | null,
): Promise<{ allowPromotionCodes: boolean; allowedPromoCode: string | null; promoSpotsRemaining: number }> {
  const promoConfig = getLiveMockPromoConfig(mockSlug);
  if (!promoConfig) {
    return { allowPromotionCodes: false, allowedPromoCode: null, promoSpotsRemaining: 0 };
  }

  if (promoConfig.promoDisplayCap && supabaseService) {
    const { count, error } = await supabaseService
      .from("live_mock_exam_signups")
      .select("id", { count: "exact", head: true })
      .eq("mock_slug", mockSlug);
    if (error) throw error;
    const displayedCount = getDisplayedLiveMockSignupCount(count ?? 0, mockSlug);
    const promoSpotsRemaining = getPromoSpotsRemainingFromDisplay(displayedCount, mockSlug);
    return {
      allowPromotionCodes: promoSpotsRemaining > 0,
      allowedPromoCode: promoConfig.promoCode,
      promoSpotsRemaining,
    };
  }

  const promotionCodes = await stripe.promotionCodes.list({
    code: promoConfig.promoCode,
    active: true,
    limit: 1,
  });
  const promotionCode = promotionCodes.data[0];
  if (!promotionCode) {
    return {
      allowPromotionCodes: false,
      allowedPromoCode: promoConfig.promoCode,
      promoSpotsRemaining: 0,
    };
  }

  const promoSpotsRemaining = getPromoSpotsRemaining(promotionCode.times_redeemed ?? 0, mockSlug);
  return {
    allowPromotionCodes: promoSpotsRemaining > 0,
    allowedPromoCode: promoConfig.promoCode,
    promoSpotsRemaining,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = readEnv("SUPABASE_URL");
    const supabaseAnonKey = readEnv("SUPABASE_ANON_KEY");
    const supabaseServiceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const supabaseService =
      supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
        : null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      throw new Error("Please sign in before registering.");
    }

    const environment = readEnv("ENVIRONMENT").toLowerCase();
    const useLive = environment === "production" || environment === "live";
    const stripeKey =
      (useLive ? readEnv("STRIPE_SECRET_KEY_LIVE") : readEnv("STRIPE_SECRET_KEY_TEST")) ||
      readEnv("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe is not configured.");
    }

    const amountGbp = LIVE_MOCK_STANDARD_PRICE_GBP;

    const body = await req.json().catch(() => ({}));
    const datafastMetadata = {
      ...(metadataValue(body.datafast_visitor_id) ? { datafast_visitor_id: metadataValue(body.datafast_visitor_id) } : {}),
      ...(metadataValue(body.datafast_session_id) ? { datafast_session_id: metadataValue(body.datafast_session_id) } : {}),
    };
    const candidateBaseUrl =
      body.baseUrl ||
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      readEnv("APP_BASE_URL");
    const appBaseUrl = readEnv("APP_BASE_URL");
    const baseUrl = useLive && isLocalBaseUrl(String(candidateBaseUrl)) ? appBaseUrl : candidateBaseUrl;
    if (!baseUrl) {
      throw new Error("Missing application base URL.");
    }

    const returnTo = sanitizeReturnPath(String(body.returnTo ?? "/live-mock-exams"));
    const mockSlug = resolveMockSlug(body.mockSlug);
    const productName = LIVE_MOCK_PRODUCTS[mockSlug];
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const promoCheckout = await getPromoCheckoutState(stripe, mockSlug, supabaseService);

    const lineItem = buildInlineLiveMockLineItem(amountGbp, productName);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: promoCheckout.allowPromotionCodes,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [lineItem],
      metadata: {
        user_id: user.id,
        mock_type: mockSlug,
        mock_slug: mockSlug,
        mock_starts_at: new Date().toISOString(),
        amount_gbp: String(amountGbp),
        promo_code_enabled: promoCheckout.allowPromotionCodes ? "true" : "false",
        allowed_promo_code: promoCheckout.allowedPromoCode ?? "",
        ...datafastMetadata,
      },
      success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}&returnTo=${encodeURIComponent(returnTo)}`,
      cancel_url: `${baseUrl}/pay/cancelled?returnTo=${encodeURIComponent(returnTo)}`,
    });

    if (!session.url) {
      throw new Error("Stripe Checkout session URL was not returned.");
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        amountGbp,
        promoCode: promoCheckout.allowedPromoCode,
        promoSpotsRemaining: promoCheckout.promoSpotsRemaining,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start registration.";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
