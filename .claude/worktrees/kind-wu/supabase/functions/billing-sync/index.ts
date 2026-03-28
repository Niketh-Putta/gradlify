import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const readEnv = (name: string) => Deno.env.get(name)?.trim() ?? "";

const stripeKeyPrefix = (key: string) =>
  key.startsWith("sk_live_") ? "sk_live" : key.startsWith("sk_test_") ? "sk_test" : "unknown";

const resolveEnvironment = () => {
  const raw = readEnv("ENVIRONMENT").toLowerCase();
  if (raw === "live" || raw === "production") return "live";
  if (raw === "test" || raw === "development" || raw === "preview") return "test";
  return "unknown";
};

const getStripeKey = (environment: string) => {
  if (environment === "live") return readEnv("STRIPE_SECRET_KEY_LIVE");
  if (environment === "test") return readEnv("STRIPE_SECRET_KEY_TEST") || readEnv("STRIPE_SECRET_KEY");
  return readEnv("STRIPE_SECRET_KEY") || readEnv("STRIPE_SECRET_KEY_LIVE") || readEnv("STRIPE_SECRET_KEY_TEST");
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const toIso = (value?: number | null) => (value ? new Date(value * 1000).toISOString() : null);
const mapInterval = (interval?: string | null) => {
  if (!interval) return null;
  if (interval === "year") return "annual";
  if (interval === "month") return "monthly";
  return interval;
};

const normalizePremiumTrack = (value: string | null | undefined): 'gcse' | 'eleven_plus' | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'gcse') return 'gcse';
  if (normalized === '11plus' || normalized === 'eleven_plus') return 'eleven_plus';
  return null;
};

const getTrackPriceIds = (environment: string) => {
  const suffix = environment === 'live' ? 'LIVE' : environment === 'test' ? 'TEST' : '';
  const read = (base: string) =>
    suffix ? readEnv(`${base}_${suffix}`) || readEnv(base) : readEnv(base);

  return {
    gcse: {
      monthly: read('STRIPE_PRICE_MONTHLY'),
      annual: read('STRIPE_PRICE_ANNUAL'),
    },
    eleven_plus: {
      monthly: read('STRIPE_PRICE_11PLUS_MONTHLY') || read('STRIPE_PRICE_ELEVEN_PLUS_MONTHLY'),
      annual: read('STRIPE_PRICE_11PLUS_ANNUAL') || read('STRIPE_PRICE_ELEVEN_PLUS_ANNUAL'),
    },
  };
};

const resolvePremiumTrackFromPriceId = (
  environment: string,
  priceId: string | null | undefined,
): 'gcse' | 'eleven_plus' | null => {
  if (!priceId) return null;
  const ids = getTrackPriceIds(environment);
  if (priceId === ids.gcse.monthly || priceId === ids.gcse.annual) return 'gcse';
  if (priceId === ids.eleven_plus.monthly || priceId === ids.eleven_plus.annual) return 'eleven_plus';
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const environment = resolveEnvironment();
    const stripeKey = getStripeKey(environment);
    if (!stripeKey) {
      return jsonResponse({ error: "stripe_key_missing" }, 500);
    }

    const supabaseUrl = readEnv("SUPABASE_URL");
    const supabaseAnonKey = readEnv("SUPABASE_ANON_KEY");
    const supabaseServiceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse({ error: "supabase_not_configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const adminOverrideUserId =
      typeof body?.user_id === "string" ? body.user_id : null;

    let user = null as { id: string; email?: string | null } | null;

    if (adminOverrideUserId && token === supabaseServiceKey) {
      const { data: userData, error: adminUserError } =
        await admin.auth.admin.getUserById(adminOverrideUserId);
      if (adminUserError || !userData?.user) {
        return jsonResponse({ error: "user_not_found" }, 404);
      }
      user = { id: userData.user.id, email: userData.user.email };
    } else {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        return jsonResponse({ error: "not_authenticated" }, 401);
      }
      user = authUser;
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id_test, stripe_customer_id_live, stripe_subscription_id_test, stripe_subscription_id_live, stripe_subscription_status, is_premium, premium_track")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse({ error: "profile_fetch_failed" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customerColumn = environment === "live" ? "stripe_customer_id_live" : "stripe_customer_id_test";
    const subscriptionColumn = environment === "live" ? "stripe_subscription_id_live" : "stripe_subscription_id_test";

    let stripeCustomerId = profile?.[customerColumn as keyof typeof profile] as string | null ?? null;
    let stripeSubscriptionId = profile?.[subscriptionColumn as keyof typeof profile] as string | null ?? null;

    if (!stripeCustomerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      }
    }

    if (!stripeSubscriptionId && stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 10,
      });
      if (subscriptions.data.length > 0) {
        const preferred = subscriptions.data.find((sub) =>
          ACTIVE_STATUSES.has(sub.status?.toLowerCase() ?? "")
        );
        const sorted = [...subscriptions.data].sort(
          (a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0)
        );
        stripeSubscriptionId = (preferred ?? sorted[0]).id;
      }
    }

    if (!stripeSubscriptionId) {
      return jsonResponse({
        updated: false,
        reason: "no_subscription",
        db_is_premium: Boolean(profile?.is_premium),
        db_stripe_subscription_status: profile?.stripe_subscription_status ?? null,
        stripe_key_prefix: stripeKeyPrefix(stripeKey),
        environment,
      });
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["items.data.price"],
    });
    const stripeStatus = subscription.status?.toLowerCase() ?? null;
    const isPremium = stripeStatus ? ACTIVE_STATUSES.has(stripeStatus) : false;
    const currentPeriodEnd = toIso(subscription.current_period_end);
    const subscriptionInterval = mapInterval(subscription.items.data[0]?.price?.recurring?.interval ?? null);
    const currentPriceId = subscription.items.data[0]?.price?.id ?? null;
    const premiumTrack =
      resolvePremiumTrackFromPriceId(environment, currentPriceId) ??
      normalizePremiumTrack((profile as { premium_track?: string | null } | null)?.premium_track ?? null) ??
      'gcse';

    const billingPlan =
      isPremium && subscriptionInterval
        ? subscriptionInterval === "annual"
          ? "premium_annual"
          : "premium_monthly"
        : "free";

    const updatePayload: Record<string, unknown> = {
      stripe_subscription_status: stripeStatus,
      subscription_status: stripeStatus,
      is_premium: isPremium,
      plan: billingPlan,
      current_period_end: currentPeriodEnd,
      premium_until: currentPeriodEnd,
      subscription_interval: isPremium ? subscriptionInterval : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      premium_track: premiumTrack,
    };

    if (!stripeCustomerId && user.email) {
      // if still missing, attempt to create a customer in this environment
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;
    }

    if (stripeCustomerId) {
      updatePayload[customerColumn] = stripeCustomerId;
    }

    if (stripeSubscriptionId) {
      updatePayload[subscriptionColumn] = stripeSubscriptionId;
    }

    const { data: updatedProfile, error: updateError } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", user.id)
      .select("stripe_customer_id_test, stripe_customer_id_live, stripe_subscription_id_test, stripe_subscription_id_live, stripe_subscription_status, is_premium")
      .maybeSingle();

    if (updateError) {
      return jsonResponse({ error: "profile_update_failed" }, 500);
    }

    return jsonResponse({
      updated: true,
      stripe_subscription_status: stripeStatus,
      is_premium: isPremium,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_key_prefix: stripeKeyPrefix(stripeKey),
      environment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: "internal_error", message }, 500);
  }
});
