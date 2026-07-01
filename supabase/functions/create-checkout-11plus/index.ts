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

const isLocalBaseUrl = (value: string) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
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

const PREMIUM_WEEKLY_PRICE_IDS = {
  live: "price_1TnilZQYWoowhxMZFRVNfCv2",
  test: "price_1TnilaHZeiDDkqObfHHcBIwk",
} as const;

const PREMIUM_ANNUAL_OFFER_PRICE_IDS = {
  live: "price_1TmF6EQYWoowhxMZvthLKq6K",
  test: "price_1TmF6FHZeiDDkqObwynk4FQi",
} as const;

const WEEKLY_PROMO_CODE = "20percent";
const WEEKLY_PROMO_DISCOUNT_PENCE = 200;
const WEEKLY_PROMO_CURRENCY = "gbp";

const isMatchingWeeklyPromoCoupon = (coupon: Stripe.Coupon) =>
  coupon.duration === "once" &&
  coupon.amount_off === WEEKLY_PROMO_DISCOUNT_PENCE &&
  coupon.currency?.toLowerCase() === WEEKLY_PROMO_CURRENCY;

const ensureWeeklyPromoCode = async (stripe: Stripe) => {
  const existingCodes = await stripe.promotionCodes.list({
    code: WEEKLY_PROMO_CODE,
    limit: 20,
  });

  const activeCompatibleCode = existingCodes.data.find(
    (promotionCode) =>
      promotionCode.active &&
      promotionCode.coupon &&
      isMatchingWeeklyPromoCoupon(promotionCode.coupon),
  );
  if (activeCompatibleCode) {
    return activeCompatibleCode.code ?? WEEKLY_PROMO_CODE;
  }

  const inactiveCompatibleCode = existingCodes.data.find(
    (promotionCode) =>
      !promotionCode.active &&
      promotionCode.coupon &&
      isMatchingWeeklyPromoCoupon(promotionCode.coupon),
  );
  if (inactiveCompatibleCode) {
    const reactivated = await stripe.promotionCodes.update(inactiveCompatibleCode.id, { active: true });
    return reactivated.code ?? WEEKLY_PROMO_CODE;
  }

  const conflictingActiveCode = existingCodes.data.find((promotionCode) => promotionCode.active);
  if (conflictingActiveCode) {
    throw new Error(`Promo code "${WEEKLY_PROMO_CODE}" exists with a different Stripe setup.`);
  }

  const coupon = await stripe.coupons.create({
    amount_off: WEEKLY_PROMO_DISCOUNT_PENCE,
    currency: WEEKLY_PROMO_CURRENCY,
    duration: "once",
    name: "Weekly first week £2 off",
    metadata: { gradlify_offer: "weekly_first_week_2gbp_off" },
  });
  const promotionCode = await stripe.promotionCodes.create({
    code: WEEKLY_PROMO_CODE,
    coupon: coupon.id,
    active: true,
  });

  return promotionCode.code ?? WEEKLY_PROMO_CODE;
};

const customerHasUsedTrial = async (stripe: Stripe, customerId: string) => {
  let startingAfter: string | undefined;

  while (true) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    const usedTrial = subscriptions.data.some((subscription) => {
      const trialStart = subscription.trial_start ?? null;
      const trialEnd = subscription.trial_end ?? null;
      return trialStart !== null || trialEnd !== null;
    });

    if (usedTrial) {
      return true;
    }

    if (!subscriptions.has_more || subscriptions.data.length === 0) {
      return false;
    }

    startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
  }
};

// Checkout uses STRIPE_PRICE_11PLUS_MONTHLY_* / ANNUAL_* (and ultra variants) from edge-function secrets.
const getStripeConfig = () => {
  const envRaw = readEnv("ENVIRONMENT") || "test";
  const preferred = normalizeEnv(envRaw);

  const live = {
    stripeSecretKey: readEnv("STRIPE_SECRET_KEY_LIVE"),
    priceMonthly: readEnv("STRIPE_PRICE_MONTHLY_LIVE") || readEnv("PRICE_ID_LIVE"),
    priceAnnual: PREMIUM_ANNUAL_OFFER_PRICE_IDS.live || readEnv("STRIPE_PRICE_ANNUAL_LIVE") || readEnv("STRIPE_PRICE_YEARLY_LIVE"),
    price11PlusWeekly:
      readEnv("STRIPE_PRICE_11PLUS_WEEKLY_LIVE") ||
      readEnv("STRIPE_PRICE_11PLUS_WEEKLY") ||
      PREMIUM_WEEKLY_PRICE_IDS.live,
    price11PlusMonthly: readEnv("STRIPE_PRICE_11PLUS_MONTHLY_LIVE") || readEnv("STRIPE_PRICE_11PLUS_MONTHLY") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_MONTHLY_LIVE") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_MONTHLY"),
    price11PlusAnnual: PREMIUM_ANNUAL_OFFER_PRICE_IDS.live || readEnv("STRIPE_PRICE_11PLUS_ANNUAL_LIVE") || readEnv("STRIPE_PRICE_11PLUS_ANNUAL") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ANNUAL_LIVE") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ANNUAL"),
    price11PlusUltra: readEnv("STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_LIVE") || readEnv("STRIPE_PRICE_11PLUS_ULTRA_MONTHLY") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ULTRA_MONTHLY_LIVE"),
    price11PlusUltraAnnual: readEnv("STRIPE_PRICE_11PLUS_ULTRA_ANNUAL_LIVE") || readEnv("STRIPE_PRICE_11PLUS_ULTRA_ANNUAL") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ULTRA_ANNUAL_LIVE"),
  };
  const test = {
    stripeSecretKey: readEnv("STRIPE_SECRET_KEY_TEST") || readEnv("STRIPE_SECRET_KEY"),
    priceMonthly: readEnv("STRIPE_PRICE_MONTHLY_TEST") || readEnv("PRICE_ID_TEST"),
    priceAnnual: PREMIUM_ANNUAL_OFFER_PRICE_IDS.test || readEnv("STRIPE_PRICE_ANNUAL_TEST") || readEnv("STRIPE_PRICE_YEARLY_TEST"),
    price11PlusWeekly:
      readEnv("STRIPE_PRICE_11PLUS_WEEKLY_TEST") ||
      readEnv("STRIPE_PRICE_11PLUS_WEEKLY") ||
      PREMIUM_WEEKLY_PRICE_IDS.test,
    price11PlusMonthly: readEnv("STRIPE_PRICE_11PLUS_MONTHLY_TEST") || readEnv("STRIPE_PRICE_11PLUS_MONTHLY") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_MONTHLY_TEST") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_MONTHLY"),
    price11PlusAnnual: PREMIUM_ANNUAL_OFFER_PRICE_IDS.test || readEnv("STRIPE_PRICE_11PLUS_ANNUAL_TEST") || readEnv("STRIPE_PRICE_11PLUS_ANNUAL") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ANNUAL_TEST") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ANNUAL"),
    price11PlusUltra: readEnv("STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_TEST") || readEnv("STRIPE_PRICE_11PLUS_ULTRA_MONTHLY") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ULTRA_MONTHLY_TEST"),
    price11PlusUltraAnnual: readEnv("STRIPE_PRICE_11PLUS_ULTRA_ANNUAL_TEST") || readEnv("STRIPE_PRICE_11PLUS_ULTRA_ANNUAL") || readEnv("STRIPE_PRICE_ELEVEN_PLUS_ULTRA_ANNUAL_TEST"),
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
  const price11PlusWeekly = config.price11PlusWeekly;
  const price11PlusMonthly = config.price11PlusMonthly;
  const price11PlusAnnual = config.price11PlusAnnual;
  const price11PlusUltra = config.price11PlusUltra;
  const price11PlusUltraAnnual = config.price11PlusUltraAnnual;

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
    price11PlusWeeklyPresent: Boolean(price11PlusWeekly),
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

  if (!price11PlusWeekly || !price11PlusAnnual) {
    throw new Error("Missing Stripe 11+ price IDs");
  }

  return {
    environment,
    isLive,
    stripeSecretKey,
    prices: {
      gcse: {
        weekly: priceGcseMonthly,
        monthly: priceGcseMonthly,
        annual: priceGcseAnnual,
      },
      eleven_plus: {
        weekly: price11PlusWeekly,
        monthly: price11PlusMonthly,
        annual: price11PlusAnnual,
        ultra: price11PlusUltra,
        ultra_annual: price11PlusUltraAnnual,
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
    const supabaseAnonKey = (Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY")) ?? "";
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

    const hasUsedTrial = await customerHasUsedTrial(stripe, customerId);
    logStep("Resolved trial eligibility", { customerId, hasUsedTrial });

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
      plan = "weekly",
      returnTo: rawReturnTo,
      premiumTrack: requestedPremiumTrackRaw,
      baseUrl: clientBaseUrl,
    } = await req.json();
    const requestedPremiumTrack = normalizePremiumTrack(requestedPremiumTrackRaw);
    if (requestedPremiumTrack && requestedPremiumTrack !== activeTrack) {
      logStep("Track mismatch ignored for 11plus dedicated checkout", { requestedPremiumTrack, activeTrack });
    }
    const normalizedPlan = planInterval === "ultra_annual"
      ? "ultra_annual"
      : planInterval === "annual"
      ? "annual"
      : planInterval === "yearly"
      ? "annual"
      : planInterval === "weekly"
      ? "weekly"
      : plan === "ultra_annual"
      ? "ultra_annual"
      : plan === "annual"
      ? "annual"
      : plan === "yearly"
      ? "annual"
      : plan === "ultra"
      ? "ultra"
      : plan === "monthly"
      ? "weekly"
      : "weekly";
    if (normalizedPlan === "ultra" || normalizedPlan === "ultra_annual") {
      throw new Error("This plan is not currently available.");
    }

    const checkoutTrack = "eleven_plus";
    const trackPrices = config.prices[checkoutTrack as keyof typeof config.prices];
    let priceId = trackPrices?.weekly;
    if (normalizedPlan === "annual") {
        priceId = trackPrices?.annual;
    } else if (normalizedPlan === "ultra") {
        priceId = trackPrices?.ultra;
        if (!priceId) {
            throw new Error(`Ultra pricing not configured for track: ${checkoutTrack}`);
        }
    } else if (normalizedPlan === "ultra_annual") {
        priceId = trackPrices?.ultra_annual;
        if (!priceId) {
            throw new Error(`Ultra Annual pricing not configured for track: ${checkoutTrack}`);
        }
    }
    
    if (!priceId) {
      throw new Error(`Missing Stripe price ID for ${normalizedPlan} plan`);
    }
    logStep("Creating checkout with plan", { plan: normalizedPlan, track: checkoutTrack, priceId: priceId.slice(0, 8) });
    if (normalizedPlan === "weekly") {
      const promoCode = await ensureWeeklyPromoCode(stripe);
      logStep("Weekly promo code ready", { promoCode });
    }

    const candidateBaseUrl =
      clientBaseUrl ||
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      readEnv("APP_BASE_URL") ||
      "";
    const appBaseUrl = readEnv("APP_BASE_URL");
    const baseUrl = config.isLive && isLocalBaseUrl(candidateBaseUrl) ? appBaseUrl : candidateBaseUrl;
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
      allow_promotion_codes: normalizedPlan === "weekly",
      automatic_tax: { enabled: false },
      payment_method_collection: "always",
      custom_text: {
        submit: {
          message: hasUsedTrial ? "Continue to Premium" : "Start Your 3 Day Free Trial",
        },
      },
      client_reference_id: user.id,
      subscription_data: {
        ...(hasUsedTrial ? {} : { trial_period_days: 3 }),
        metadata: {
          userId: user.id,
          user_id: user.id,
          supabase_user_id: user.id,
          plan_interval: normalizedPlan,
          premium_track: checkoutTrack,
          client_reference_id: user.id,
          has_used_trial: hasUsedTrial ? "true" : "false",
        },
      },
      metadata: {
        userId: user.id,
        user_id: user.id,
        supabase_user_id: user.id,
        plan_interval: normalizedPlan,
        premium_track: checkoutTrack,
        has_used_trial: hasUsedTrial ? "true" : "false",
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
      200,
    );
  }
});
