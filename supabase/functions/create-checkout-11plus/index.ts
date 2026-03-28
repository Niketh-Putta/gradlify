import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizePremiumTrack } from "../shared/stripeConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const sanitizeReturnPath = (raw?: string) => {
  if (!raw) return "/home";
  if (!raw.startsWith("/")) return "/home";
  if (raw.startsWith("/pay/")) return "/home";
  return raw;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeTrim = (value: string | undefined) => value?.trim() ?? "";
const readEnv = (name: string) => safeTrim(Deno.env.get(name));

const keyPrefix = (value: string, livePrefix: string, testPrefix: string) => {
  if (value.startsWith(livePrefix)) return livePrefix.replace("_", "");
  if (value.startsWith(testPrefix)) return testPrefix.replace("_", "");
  return "unknown";
};

const pricePrefix = (value: string) => (value.startsWith("price_") ? "price_" : "missing");

const normalizeEnv = (raw: string) => {
  const value = raw.toLowerCase();
  if (value === "live" || value === "production") return "live";
  if (value === "test" || value === "development" || value === "preview") return "test";
  return "test";
};

const getStripeConfig = () => {
  const envRaw = readEnv("ENVIRONMENT") || "test";
  const preferred = normalizeEnv(envRaw);

  const live = {
    stripeSecretKey: readEnv("STRIPE_SECRET_KEY_LIVE"),
    priceMonthly: readEnv("STRIPE_PRICE_MONTHLY_LIVE") || readEnv("PRICE_ID_LIVE"),
    priceAnnual: readEnv("STRIPE_PRICE_ANNUAL_LIVE") || readEnv("STRIPE_PRICE_YEARLY_LIVE"),
    price11PlusMonthly: readEnv("STRIPE_PRICE_11PLUS_MONTHLY_LIVE") || readEnv("STRIPE_PRICE_11PLUS_MONTHLY") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_MONTHLY_LIVE") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_MONTHLY"),
    price11PlusAnnual: readEnv("STRIPE_PRICE_11PLUS_ANNUAL_LIVE") || readEnv("STRIPE_PRICE_11PLUS_ANNUAL") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ANNUAL_LIVE") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ANNUAL"),
  };
  const test = {
    stripeSecretKey: readEnv("STRIPE_SECRET_KEY_TEST") || readEnv("STRIPE_SECRET_KEY"),
    priceMonthly: readEnv("STRIPE_PRICE_MONTHLY_TEST") || readEnv("PRICE_ID_TEST"),
    priceAnnual: readEnv("STRIPE_PRICE_ANNUAL_TEST") || readEnv("STRIPE_PRICE_YEARLY_TEST"),
    price11PlusMonthly: readEnv("STRIPE_PRICE_11PLUS_MONTHLY_TEST") || readEnv("STRIPE_PRICE_11PLUS_MONTHLY") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_MONTHLY_TEST") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_MONTHLY"),
    price11PlusAnnual: readEnv("STRIPE_PRICE_11PLUS_ANNUAL_TEST") || readEnv("STRIPE_PRICE_11PLUS_ANNUAL") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ANNUAL_TEST") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ANNUAL"),
  };

  const hasLive = Boolean(live.stripeSecretKey);
  const hasTest = Boolean(test.stripeSecretKey);

  let environment: "live" | "test" = preferred;
  if (preferred === "live" && !hasLive && hasTest) environment = "test";
  if (preferred === "test" && !hasTest && hasLive) environment = "live";
  if (!hasLive && hasTest) environment = "test";
  if (!hasTest && hasLive) environment = "live";

  const isLive = environment === "live";
  const config = isLive ? live : test;

  const stripeSecretKey = config.stripeSecretKey;
  const priceGcseMonthly = config.priceMonthly;
  const priceGcseAnnual = config.priceAnnual;
  const price11PlusMonthly = config.price11PlusMonthly;
  const price11PlusAnnual = config.price11PlusAnnual;

  const stripeKeyPrefix = keyPrefix(stripeSecretKey, "sk_live_", "sk_test_");
  logStep("Stripe config loaded", {
    environment,
    isLive,
    stripeKeyPrefix,
    preferredEnvironment: preferred,
    hasLiveKey: hasLive,
    hasTestKey: hasTest,
    priceGcseMonthlyPresent: Boolean(priceGcseMonthly),
    priceGcseAnnualPresent: Boolean(priceGcseAnnual),
    price11PlusMonthlyPresent: Boolean(price11PlusMonthly),
    price11PlusAnnualPresent: Boolean(price11PlusAnnual),
    priceGcseMonthlyPrefix: pricePrefix(priceGcseMonthly),
    priceGcseAnnualPrefix: pricePrefix(priceGcseAnnual),
    price11PlusMonthlyPrefix: pricePrefix(price11PlusMonthly),
    price11PlusAnnualPrefix: pricePrefix(price11PlusAnnual),
  });

  if (stripeSecretKey) {
    const expectedPrefix = isLive ? "sk_live_" : "sk_test_";
    if (!stripeSecretKey.startsWith(expectedPrefix)) {
      throw new Error("Stripe keys mismatched");
    }
  }

  if (!stripeSecretKey) {
    throw new Error("Missing Stripe secret key");
  }

  if (!priceGcseMonthly || !priceGcseAnnual) {
    throw new Error("Missing Stripe GCSE price IDs");
  }

  if (!price11PlusMonthly || !price11PlusAnnual) {
    throw new Error("Missing Stripe 11+ price IDs");
  }

  return {
    environment,
    isLive,
    stripeSecretKey,
    prices: {
      gcse: {
        monthly: priceGcseMonthly,
        annual: priceGcseAnnual,
      },
      eleven_plus: {
        monthly: price11PlusMonthly,
        annual: price11PlusAnnual,
      },
    },
  };
};

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
      : null;

    logStep("Function started");
    const config = getStripeConfig();
    logStep("Stripe config validated", { environment: config.environment, isLive: config.isLive });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(config.stripeSecretKey, { apiVersion: "2023-10-16" });
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("track, premium_track")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) {
      throw new Error(`Failed to read profile track: ${profileError.message}`);
    }
    const activeTrack = normalizePremiumTrack(profile?.track ?? 'eleven_plus') ?? 'eleven_plus';
    const isLive = config.environment === "live";
    const customerColumn = isLive ? "stripe_customer_id_live" : "stripe_customer_id_test";

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      const existingCustomer = customers.data[0];
      customerId = existingCustomer.id;
      const existingMetadata = existingCustomer.metadata ?? {};
      if (existingMetadata.supabase_user_id !== user.id) {
        await stripe.customers.update(customerId, {
          metadata: {
            ...existingMetadata,
            supabase_user_id: user.id,
            user_id: existingMetadata.user_id ?? user.id,
            userId: existingMetadata.userId ?? user.id,
          },
        });
      }
      logStep("Found existing customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          user_id: user.id,
          userId: user.id,
        },
      });
      customerId = customer.id;
      logStep("Created new customer", { customerId });

    }

    if (supabaseAdmin) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ [customerColumn]: customerId })
        .eq("user_id", user.id);

      if (updateError) {
        logStep("Warning: Failed to update profile with customer ID", updateError);
      }
    } else {
      logStep("Warning: SUPABASE_SERVICE_ROLE_KEY missing, skipping profile update");
    }

    const {
      plan_interval: planInterval,
      plan = "monthly",
      returnTo: rawReturnTo,
      premiumTrack: requestedPremiumTrackRaw,
      baseUrl: clientBaseUrl,
    } = await req.json();
    const requestedPremiumTrack = normalizePremiumTrack(requestedPremiumTrackRaw);
    if (requestedPremiumTrack && requestedPremiumTrack !== activeTrack) {
      return jsonResponse(
        {
          error: `Track mismatch: you are on ${activeTrack}. Switch track before subscribing to ${requestedPremiumTrack}.`,
        },
        400,
      );
    }
    const normalizedPlan = planInterval === "annual"
      ? "annual"
      : planInterval === "yearly"
      ? "annual"
      : plan === "annual"
      ? "annual"
      : plan === "yearly"
      ? "annual"
      : "monthly";
    const checkoutTrack = requestedPremiumTrack ?? activeTrack;
    const trackPrices = config.prices[checkoutTrack];
    const priceId = normalizedPlan === "annual"
      ? trackPrices.annual
      : trackPrices.monthly;
    if (normalizedPlan === "annual" && !priceId) {
      throw new Error("Missing Stripe price ID for annual plan");
    }
    logStep("Creating checkout with plan", { plan: normalizedPlan, track: checkoutTrack, priceId: priceId.slice(0, 8) });

    const baseUrl =
      clientBaseUrl ||
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      readEnv("APP_BASE_URL") ||
      "";
    if (!baseUrl) {
      throw new Error("Missing APP_BASE_URL");
    }
    const returnTo = sanitizeReturnPath(rawReturnTo);
    const encodedReturnTo = encodeURIComponent(returnTo);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      payment_method_collection: "always",
      custom_text: {
        submit: {
          message: "Start Your 3 Day Free Trial",
        },
      },
      client_reference_id: user.id,
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          userId: user.id,
          user_id: user.id,
          supabase_user_id: user.id,
          plan_interval: normalizedPlan,
          premium_track: checkoutTrack,
          client_reference_id: user.id,
        },
      },
      metadata: {
        userId: user.id,
        user_id: user.id,
        supabase_user_id: user.id,
        plan_interval: normalizedPlan,
        premium_track: checkoutTrack,
      },
      success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}&returnTo=${encodedReturnTo}`,
      cancel_url: `${baseUrl}/pay/cancelled?returnTo=${encodedReturnTo}`,
    });

    if (!session.url) {
      throw new Error("Stripe Checkout session.url missing");
    }

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return jsonResponse({ url: session.url, sessionId: session.id }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorType = typeof error;
    let errorJson = "";
    try {
      errorJson = JSON.stringify(error);
    } catch {
      errorJson = '"[unserializable]"';
    }

    console.error("[CREATE-CHECKOUT] ERROR", {
      message: errorMessage,
      stack: errorStack,
      type: errorType,
      json: errorJson,
    });

    return jsonResponse(
      {
        error: errorMessage,
        errorStack,
        errorType,
        errorJson,
      },
      500,
    );
  }
});
