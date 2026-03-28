import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin || 'https://gradlify.com';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Content-Type': 'application/json',
  };
};

const readEnv = (name: string) => Deno.env.get(name)?.trim() ?? '';
const resolveEnvironment = () => {
  const raw = readEnv('ENVIRONMENT').toLowerCase();
  if (raw === 'live' || raw === 'production') return 'live';
  return 'test';
};

const stripeKeyPrefix = (key: string) =>
  key.startsWith('sk_live_') ? 'sk_live' : key.startsWith('sk_test_') ? 'sk_test' : 'unknown';

type PortalRequestBody = {
  return_url?: string | null;
  [key: string]: unknown;
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'method_not_allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const environment = resolveEnvironment();
    const isLive = environment === 'live';
    const stripeKey = isLive
      ? readEnv('STRIPE_SECRET_KEY_LIVE')
      : (readEnv('STRIPE_SECRET_KEY_TEST') || readEnv('STRIPE_SECRET_KEY'));
    const keyPrefix = stripeKeyPrefix(stripeKey);

    console.log('[CUSTOMER-PORTAL] mode resolved', { environment, isLive, keyPrefix });

    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'stripe_key_missing' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const supabaseUrl = readEnv('SUPABASE_URL');
    const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY');
    const supabaseServiceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'supabase_not_configured' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'not_authenticated' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const customerColumn = isLive ? 'stripe_customer_id_live' : 'stripe_customer_id_test';

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('stripe_customer_id_live, stripe_customer_id_test')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: 'profile_fetch_failed' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const customerId = isLive ? profile?.stripe_customer_id_live : profile?.stripe_customer_id_test;

    console.log('[CUSTOMER-PORTAL] profile customer ids', {
      hasLiveCustomerId: Boolean(profile?.stripe_customer_id_live),
      hasTestCustomerId: Boolean(profile?.stripe_customer_id_test),
      customerColumn,
    });

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      resolvedCustomerId = customer.id;

      const { error: updateError } = await admin
        .from('profiles')
        .update({
          [customerColumn]: resolvedCustomerId,
        })
        .eq('user_id', user.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'profile_update_failed' }), {
          status: 500,
          headers: corsHeaders
        });
      }

      console.log('[CUSTOMER-PORTAL] created customer', {
        customerId: resolvedCustomerId,
        customerColumn,
        environment,
      });
    }

    console.log('[CUSTOMER-PORTAL] using customer', {
      customerId: resolvedCustomerId,
      customerColumn,
      environment
    });

    let body: PortalRequestBody = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text) as PortalRequestBody;
      }
    } catch {
      // ignore
    }

    const return_url = body?.return_url ?? 'https://gradlify.com/home';

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const portal = await stripe.billingPortal.sessions.create({
      customer: resolvedCustomerId,
      return_url
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: 'internal_error',
      message: errorMessage
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
