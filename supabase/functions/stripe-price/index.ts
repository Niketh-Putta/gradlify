import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getStripeConfig } from "../shared/stripeConfig.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PRICE] ${step}${detailsStr}`);
};

type PlanKey = 'weekly' | 'yearly';

type PriceResponse = {
  unit_amount: number | null;
  currency: string;
  interval: string;
};

// Simple in-memory cache (10 minute TTL)
const priceCache: Record<PlanKey, { data: PriceResponse; timestamp: number } | null> = {
  weekly: null,
  yearly: null,
};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const planParam = new URL(req.url).searchParams.get('plan');
  const plan: PlanKey =
    planParam === 'yearly' || planParam === 'annual' ? 'yearly' : 'weekly';

  try {
    logStep("Function started");

    const { stripeKey, weeklyPriceId, annualPriceId } = getStripeConfig();
    const priceId = plan === 'yearly' ? annualPriceId : weeklyPriceId;

    logStep("Stripe price selected", { plan, priceId: priceId.slice(0, 8) });

    const cached = priceCache[plan];
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      logStep("Returning cached price data", { plan });
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const price = await stripe.prices.retrieve(priceId);
    logStep("Retrieved price from Stripe", {
      plan,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
    });

    const responseData: PriceResponse = {
      unit_amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval || (plan === 'yearly' ? 'year' : 'week'),
    };

    // Cache the result
    priceCache[plan] = {
      data: responseData,
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Return fallback price data based on the requested plan
    const fallbackData = {
      unit_amount: plan === 'yearly' ? 19999 : 899, // GBP pence fallback (£8.99/wk, £199.99/yr offer)
      currency: 'gbp',
      interval: plan === 'yearly' ? 'year' : 'week',
    };
    
    return new Response(JSON.stringify(fallbackData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
