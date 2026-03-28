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

const toIso = (value?: number | null) => (value ? new Date(value * 1000).toISOString() : null);

const toDisplayDate = (value?: number | null) =>
  value ? new Date(value * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : null;

const hasDefaultPaymentMethod = (subscription: Stripe.Subscription) => {
  if (subscription.default_payment_method) return true;
  const customer = subscription.customer as Stripe.Customer | string | null;
  if (customer && typeof customer !== "string") {
    return Boolean(customer.invoice_settings?.default_payment_method);
  }
  return false;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_subscription_id_test, stripe_subscription_id_live, stripe_subscription_status, is_premium")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse({ error: "profile_fetch_failed" }, 500);
    }

    const stripeSubscriptionId =
      environment === "live"
        ? profile?.stripe_subscription_id_live ?? null
        : environment === "test"
        ? profile?.stripe_subscription_id_test ?? null
        : null;
    const dbStatus = profile?.stripe_subscription_status ?? null;
    const dbPremium = Boolean(profile?.is_premium);

    if (!stripeSubscriptionId) {
      return jsonResponse({
        stripe_subscription_status: null,
        trial_end: null,
        trial_end_iso: null,
        current_period_end: null,
        current_period_end_iso: null,
        has_default_payment_method: false,
        will_auto_charge_after_trial: false,
        cancel_at_period_end: null,
        db_stripe_subscription_status: dbStatus,
        db_is_premium: dbPremium,
        status_matches_db: false,
        stripe_key_prefix: stripeKeyPrefix(stripeKey),
        environment,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["customer", "default_payment_method"],
    });

    const stripeStatus = subscription.status ?? null;
    const trialEnd = subscription.trial_end ?? null;
    const currentPeriodEnd = subscription.current_period_end ?? null;
    const hasPaymentMethod = hasDefaultPaymentMethod(subscription);
    const willAutoCharge =
      stripeStatus === "trialing" && hasPaymentMethod && !subscription.cancel_at_period_end;

    const normalizedStripeStatus = stripeStatus ? stripeStatus.toLowerCase() : null;
    const normalizedDbStatus = dbStatus ? dbStatus.toLowerCase() : null;

    return jsonResponse({
      stripe_subscription_status: normalizedStripeStatus,
      trial_end: trialEnd,
      trial_end_iso: toIso(trialEnd),
      trial_end_display: toDisplayDate(trialEnd),
      current_period_end: currentPeriodEnd,
      current_period_end_iso: toIso(currentPeriodEnd),
      current_period_end_display: toDisplayDate(currentPeriodEnd),
      has_default_payment_method: hasPaymentMethod,
      will_auto_charge_after_trial: willAutoCharge,
      cancel_at_period_end: subscription.cancel_at_period_end,
      db_stripe_subscription_status: normalizedDbStatus,
      db_is_premium: dbPremium,
      status_matches_db: normalizedStripeStatus === normalizedDbStatus,
      stripe_key_prefix: stripeKeyPrefix(stripeKey),
      environment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: "internal_error", message }, 500);
  }
});
