import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const readEnv = (name: string) => Deno.env.get(name)?.trim() || "";
const BOTH_SUBJECTS_LIVE_MOCK_SLUG = "both_subjects_live_mock";
const DEFAULT_LIVE_MOCK_PRICE_ID_LIVE = "price_1TfEfVQYWoowhxMZGWQpCGmO";

const inlineLiveMockLineItem = {
  quantity: 1,
  price_data: {
    currency: "gbp",
    unit_amount: 999,
    product_data: {
      name: "Gradlify 11+ Maths and English Mock",
      description: "Guided and built alongside real GL exam creators. Exclusive mock for top schools.",
    },
  },
};

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

    const body = await req.json().catch(() => ({}));
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
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const liveMockPriceId =
      (useLive ? readEnv("LIVE_MOCK_PRICE_ID_LIVE") || DEFAULT_LIVE_MOCK_PRICE_ID_LIVE : readEnv("LIVE_MOCK_PRICE_ID_TEST"));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [liveMockPriceId ? { price: liveMockPriceId, quantity: 1 } : inlineLiveMockLineItem],
      metadata: {
        user_id: user.id,
        mock_type: BOTH_SUBJECTS_LIVE_MOCK_SLUG,
        mock_slug: BOTH_SUBJECTS_LIVE_MOCK_SLUG,
        mock_starts_at: new Date().toISOString(),
        amount_gbp: "9.99",
      },
      success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}&returnTo=${encodeURIComponent(returnTo)}`,
      cancel_url: `${baseUrl}/pay/cancelled?returnTo=${encodeURIComponent(returnTo)}`,
    });

    if (!session.url) {
      throw new Error("Stripe Checkout session URL was not returned.");
    }

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
