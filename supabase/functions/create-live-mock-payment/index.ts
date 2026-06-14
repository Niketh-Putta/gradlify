import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const readEnv = (name: string) => Deno.env.get(name)?.trim() || "";
const BOTH_SUBJECTS_LIVE_MOCK_SLUG = "both_subjects_live_mock";
const SECOND_LIVE_MOCK_SLUG = "both_subjects_live_mock_2";

// Only these two known live-mock slugs may be charged for; anything else falls
// back to mock 1. This keeps Stripe metadata (and the signup it later creates)
// locked to a tight allowlist instead of an arbitrary caller-supplied slug.
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

// Hardcoded so the charged price can't be overridden by a stale secret or Stripe price ID.
const STANDARD_PRICE_GBP = 14.99;

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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

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

    const amountGbp = STANDARD_PRICE_GBP;

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

    // Always charge the inline £14.99 amount so a stale Stripe price ID secret
    // can't keep charging the old price.
    const lineItem = buildInlineLiveMockLineItem(amountGbp, productName);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [lineItem],
      metadata: {
        user_id: user.id,
        mock_type: mockSlug,
        mock_slug: mockSlug,
        mock_starts_at: new Date().toISOString(),
        amount_gbp: String(amountGbp),
        promo_code_enabled: "true",
        ...datafastMetadata,
      },
      success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}&returnTo=${encodeURIComponent(returnTo)}`,
      cancel_url: `${baseUrl}/pay/cancelled?returnTo=${encodeURIComponent(returnTo)}`,
    });

    if (!session.url) {
      throw new Error("Stripe Checkout session URL was not returned.");
    }

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id, amountGbp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start registration.";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
