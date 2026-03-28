import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@^12";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getStripeModeFromLivemode,
  getStripeSecretForMode,
  getStripeWebhookSecretForMode,
  getStripeTrackPriceIdsForMode,
  getPremiumTrackFromPriceId,
  normalizePremiumTrack,
  getPlanFromPriceId,
  StripePriceIds,
  PremiumTrack,
  StripeMode
} from "../shared/stripeConfig.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const stripeKeyPrefix = (key: string) =>
  key.startsWith('sk_live_') ? 'sk_live' : key.startsWith('sk_test_') ? 'sk_test' : 'unknown';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);
const PRICE_LOG_LIMIT = 3;

type BillingInterval = 'monthly' | 'annual';

type ProfileUpdatePayload = {
  mode: StripeMode;
  stripeCustomerId: string;
  subscriptionId: string;
  status: string | null;
  plan: 'premium' | 'ultra' | 'free';
  billingInterval: BillingInterval;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  metadataUserId?: string | null;
  clientReferenceId?: string | null;
  email?: string | null;
  priceIds: string[];
  eventType: string;
  eventId: string;
  premiumTrack: PremiumTrack | null;
};

type StripeEventObject = {
  metadata?: Record<string, string | undefined>;
  client_reference_id?: string | null;
  customer_details?: { email?: string | null };
  email?: string | null;
  [key: string]: unknown;
};

const getSupabaseClient = () => createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const safeParseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const toIso = (value?: number | null) => (value ? new Date(value * 1000).toISOString() : null);

const gatherPriceIds = (subscription: Stripe.Subscription) =>
  subscription.items.data
    .map((item) => item.price?.id)
    .filter((price): price is string => !!price);

const resolveCustomerId = (
  customer: string | Stripe.Customer | null | undefined
) => (typeof customer === 'string' ? customer : customer?.id ?? null);

const determineBillingInterval = (
  subscription: Stripe.Subscription,
  priceIds: StripePriceIds
): BillingInterval => {
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId === priceIds.annual) return 'annual';
  if (priceId === priceIds.monthly) return 'monthly';
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  if (interval === 'year') return 'annual';
  return 'monthly';
};

const resolvePremiumTrackFromPriceIds = (
  mode: StripeMode,
  priceIds: string[],
): PremiumTrack | null => {
  for (const priceId of priceIds) {
    const matchedTrack = getPremiumTrackFromPriceId(mode, priceId);
    if (matchedTrack) return matchedTrack;
  }
  return null;
};

const buildUpdateData = ({
  status,
  plan,
  billingInterval,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: ProfileUpdatePayload) => {
  const normalizedStatus = status?.toLowerCase() ?? null;
  const isActive = normalizedStatus ? ACTIVE_STATUSES.has(normalizedStatus) : false;
  const tier = isActive ? 'premium' : 'free';

  return {
    tier,
    plan: isActive ? plan : 'free',
    current_period_end: currentPeriodEnd,
    premium_until: currentPeriodEnd,
    is_premium: isActive,
    cancel_at_period_end: cancelAtPeriodEnd,
    subscription_interval: isActive ? billingInterval : null,
    subscription_status: normalizedStatus,
    stripe_subscription_status: normalizedStatus,
  } as Record<string, unknown>;
};

const updateProfile = async (payload: ProfileUpdatePayload): Promise<{ success: boolean; ignored: boolean }> => {
  const supabase = getSupabaseClient();
  const customerColumn = payload.mode === 'LIVE' ? 'stripe_customer_id_live' : 'stripe_customer_id_test';
  const subscriptionColumn = payload.mode === 'LIVE' ? 'stripe_subscription_id_live' : 'stripe_subscription_id_test';
  const updateData = {
    ...buildUpdateData(payload),
    [customerColumn]: payload.stripeCustomerId,
    [subscriptionColumn]: payload.subscriptionId,
  };
  if (payload.premiumTrack) {
    updateData.premium_track = payload.premiumTrack;
  }

  const logContext: Record<string, unknown> = {
    customer: payload.stripeCustomerId,
    subscriptionId: payload.subscriptionId,
    plan: payload.plan,
    billingInterval: payload.billingInterval,
    status: payload.status,
    mode: payload.mode,
    customerColumn,
    subscriptionColumn,
    priceIds: payload.priceIds.slice(0, PRICE_LOG_LIMIT),
    userLookup: payload.metadataUserId ?? payload.clientReferenceId ?? payload.email ?? null,
    eventType: payload.eventType,
    eventId: payload.eventId,
  };

  const lookupUserId = payload.metadataUserId ?? payload.clientReferenceId ?? null;
  if (lookupUserId) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select(`${customerColumn}, ${subscriptionColumn}, premium_track`)
      .eq('user_id', lookupUserId)
      .maybeSingle();

    if (payload.premiumTrack) {
      updateData.premium_track = payload.premiumTrack;
    } else if (existingProfile && (existingProfile as { premium_track?: string | null }).premium_track) {
      updateData.premium_track = (existingProfile as { premium_track?: string | null }).premium_track;
    }

    logStep('Profile id presence', {
      ...logContext,
      lookupUserId,
      hasCustomerId: Boolean(existingProfile?.[customerColumn]),
      hasSubscriptionId: Boolean(existingProfile?.[subscriptionColumn]),
      premiumTrack: payload.premiumTrack ?? (existingProfile as { premium_track?: string | null } | null)?.premium_track ?? null,
    });
  }

  const attemptUpdate = async (column: string, value: string | null) => {
    if (!value) return null;
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq(column, value)
      .select('user_id')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.user_id) {
      logStep('Profile updated', { ...logContext, strategy: column });
      return true;
    }

    return false;
  };

  if (await attemptUpdate('user_id', payload.metadataUserId ?? payload.clientReferenceId ?? null)) {
    return { success: true, ignored: false };
  }

  if (await attemptUpdate(customerColumn, payload.stripeCustomerId)) {
    return { success: true, ignored: false };
  }

  if (payload.email) {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find((u) => u.email?.toLowerCase() === payload.email?.toLowerCase());
    if (user) {
      const updated = await attemptUpdate('user_id', user.id);
      if (updated) {
        return { success: true, ignored: false };
      }
    }
  }

  logStep('No matching profile found for subscription', logContext);
  return { success: true, ignored: true };
};

const fetchSubscription = async (stripe: Stripe, subscriptionId: string) =>
  stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });

const logEventContext = (
  event: Stripe.Event,
  context: Record<string, unknown>
) => {
  logStep('Event context', {
    type: event.type,
    id: event.id,
    livemode: event.livemode,
    ...context,
  });
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    logStep('Rejected non-POST webhook request', { method: req.method });
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    logStep('Webhook received');

    const rawBody = await req.text();
    const parsedBody = safeParseJson(rawBody);
    const livemode = Boolean(parsedBody?.livemode);
    const mode = getStripeModeFromLivemode(livemode);
    const webhooksSecret = getStripeWebhookSecretForMode(mode);
    const stripeKey = getStripeSecretForMode(mode);
    const trackPriceIds = getStripeTrackPriceIdsForMode(mode);
    const priceIds = trackPriceIds.eleven_plus;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    logStep('Stripe mode resolved', {
      mode,
      keyPrefix: stripeKeyPrefix(stripeKey),
      priceGcseMonthlyPrefix: trackPriceIds.gcse.monthly.slice(0, 8),
      priceGcseAnnualPrefix: trackPriceIds.gcse.annual.slice(0, 8),
      price11PlusMonthlyPrefix: trackPriceIds.eleven_plus.monthly.slice(0, 8),
      price11PlusAnnualPrefix: trackPriceIds.eleven_plus.annual.slice(0, 8),
    });

    const sig = req.headers.get('stripe-signature');
    if (!sig) {
      return new Response('Missing stripe-signature', { status: 400, headers: corsHeaders });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhooksSecret);
    } catch (err) {
      logStep('Webhook signature verification failed', { message: (err as Error)?.message ?? String(err) });
      return new Response(`Webhook verify failed: ${String((err as Error).message)}`, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const payloadObject = event.data.object as StripeEventObject;
    const userLookup =
      payloadObject?.metadata?.userId ??
      payloadObject?.metadata?.user_id ??
      payloadObject?.metadata?.supabase_user_id ??
      payloadObject?.client_reference_id ??
      payloadObject?.customer_details?.email ??
      payloadObject?.email ??
      null;

    logEventContext(event, {
      strategy: mode,
      userLookup,
      priceIds: {
        gcseMonthly: trackPriceIds.gcse.monthly.slice(0, 8),
        gcseAnnual: trackPriceIds.gcse.annual.slice(0, 8),
        elevenPlusMonthly: trackPriceIds.eleven_plus.monthly.slice(0, 8),
        elevenPlusAnnual: trackPriceIds.eleven_plus.annual.slice(0, 8),
      },
    });

    try {
      let result = { success: true, ignored: false };

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const subscriptionId = session.subscription as string | null;
          const customerId = resolveCustomerId(session.customer);
          const metadataUserId =
            session.metadata?.userId ??
            session.metadata?.user_id ??
            session.metadata?.supabase_user_id ??
            null;
          const clientReferenceId = session.client_reference_id ?? null;

          logStep('Processing checkout session completed', {
            sessionId: session.id,
            customerId,
            clientReferenceId,
            metadataUserId,
          });

          if (!customerId || !subscriptionId) {
            throw new Error('Customer or subscription missing from checkout session');
          }

          // Stripe track-aware premium assignment: read purchased price directly from checkout line items.
          const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items.data.price'],
          });
          const checkoutPriceId =
            expandedSession.line_items?.data?.[0]?.price?.id ??
            session.metadata?.price_id ??
            null;

          const subscription = await fetchSubscription(stripe, subscriptionId);
          const priceIdList = gatherPriceIds(subscription);
          const premiumTrack =
            getPremiumTrackFromPriceId(mode, checkoutPriceId) ??
            resolvePremiumTrackFromPriceIds(mode, priceIdList) ??
            normalizePremiumTrack(session.metadata?.premium_track) ??
            null;
          const billingInterval = determineBillingInterval(subscription, priceIds);
          const currentPeriodEnd = toIso(subscription.current_period_end);
          const computedPlan = getPlanFromPriceId(mode, checkoutPriceId ?? priceIdList[0]);
          result = await updateProfile({
            mode,
            stripeCustomerId: customerId,
            subscriptionId,
            status: subscription.status,
            plan: computedPlan,
            billingInterval,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            metadataUserId,
            clientReferenceId,
            email: session.customer_details?.email ?? session.customer_email ?? null,
            priceIds: priceIdList,
            premiumTrack,
            eventType: event.type,
            eventId: event.id,
          });
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = resolveCustomerId(subscription.customer);
          const metadataUserId =
            subscription.metadata?.userId ??
            subscription.metadata?.user_id ??
            subscription.metadata?.supabase_user_id ??
            null;
          const clientReferenceId = subscription.metadata?.client_reference_id ?? null;
          const priceIdList = gatherPriceIds(subscription);
          const premiumTrack =
            resolvePremiumTrackFromPriceIds(mode, priceIdList) ??
            normalizePremiumTrack(subscription.metadata?.premium_track) ??
            null;
          const billingInterval = determineBillingInterval(subscription, priceIds);
          const currentPeriodEnd = toIso(subscription.current_period_end);
          const computedPlan = getPlanFromPriceId(mode, priceIdList[0]);
          logStep('Processing subscription update', {
            subscriptionId: subscription.id,
            customerId,
            status: subscription.status,
            billingInterval,
          });

          if (!customerId) {
            throw new Error('Subscription missing customer reference');
          }

          result = await updateProfile({
            mode,
            stripeCustomerId: customerId,
            subscriptionId: subscription.id,
            status: subscription.status,
            plan: computedPlan,
            billingInterval,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            metadataUserId,
            clientReferenceId,
            email: subscription.metadata?.email ?? null,
            priceIds: priceIdList,
            premiumTrack,
            eventType: event.type,
            eventId: event.id,
          });
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = resolveCustomerId(subscription.customer);
          const billingInterval = determineBillingInterval(subscription, priceIds);
          const currentPeriodEnd = toIso(subscription.current_period_end);

          logStep('Processing subscription deleted', {
            subscriptionId: subscription.id,
            customerId,
            billingInterval,
          });

          if (!customerId) {
            throw new Error('Subscription deleted payload missing customer');
          }
          const computedPlan = getPlanFromPriceId(mode, gatherPriceIds(subscription)[0]);

          result = await updateProfile({
            mode,
            stripeCustomerId: customerId,
            subscriptionId: subscription.id,
            status: 'canceled',
            plan: computedPlan,
            billingInterval,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            metadataUserId:
              subscription.metadata?.userId ??
              subscription.metadata?.user_id ??
              subscription.metadata?.supabase_user_id ??
              null,
            clientReferenceId: subscription.metadata?.client_reference_id ?? null,
            email: subscription.metadata?.email ?? null,
            priceIds: gatherPriceIds(subscription),
            premiumTrack:
              resolvePremiumTrackFromPriceIds(mode, gatherPriceIds(subscription)) ??
              normalizePremiumTrack(subscription.metadata?.premium_track) ??
              null,
            eventType: event.type,
            eventId: event.id,
          });
          break;
        }

        case 'invoice.paid':
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string | null;
          const customerId = resolveCustomerId(invoice.customer);
          if (!customerId || !subscriptionId) {
            throw new Error('Invoice payload missing customer or subscription');
          }

          const subscription = await fetchSubscription(stripe, subscriptionId);
          const priceIdList = gatherPriceIds(subscription);
          const premiumTrack =
            resolvePremiumTrackFromPriceIds(mode, priceIdList) ??
            normalizePremiumTrack(invoice.metadata?.premium_track) ??
            null;
          const billingInterval = determineBillingInterval(subscription, priceIds);
          const currentPeriodEnd = toIso(subscription.current_period_end);
          const computedPlan = getPlanFromPriceId(mode, priceIdList[0]);
          logStep('Processing invoice paid', { invoiceId: invoice.id, customerId, billingInterval });

          result = await updateProfile({
            mode,
            stripeCustomerId: customerId,
            subscriptionId,
            status: subscription.status,
            plan: computedPlan,
            billingInterval,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            metadataUserId:
              invoice.metadata?.userId ??
              invoice.metadata?.user_id ??
              invoice.metadata?.supabase_user_id ??
              null,
            clientReferenceId: invoice.metadata?.client_reference_id ?? null,
            email: invoice.customer_email ?? invoice.metadata?.email ?? null,
            priceIds: priceIdList,
            premiumTrack,
            eventType: event.type,
            eventId: event.id,
          });
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string | null;
          const customerId = resolveCustomerId(invoice.customer);
          if (!customerId || !subscriptionId) {
            throw new Error('Invoice payment failed payload missing customer or subscription');
          }

          const subscription = await fetchSubscription(stripe, subscriptionId);
          const priceIdList = gatherPriceIds(subscription);
          const premiumTrack =
            resolvePremiumTrackFromPriceIds(mode, priceIdList) ??
            normalizePremiumTrack(invoice.metadata?.premium_track) ??
            null;
          const billingInterval = determineBillingInterval(subscription, priceIds);
          const currentPeriodEnd = toIso(subscription.current_period_end);
          const computedPlan = getPlanFromPriceId(mode, priceIdList[0]);
          logStep('Processing invoice payment failed', { invoiceId: invoice.id, customerId, billingInterval });

          result = await updateProfile({
            mode,
            stripeCustomerId: customerId,
            subscriptionId,
            status: 'past_due',
            plan: computedPlan,
            billingInterval,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            metadataUserId:
              invoice.metadata?.userId ??
              invoice.metadata?.user_id ??
              invoice.metadata?.supabase_user_id ??
              null,
            clientReferenceId: invoice.metadata?.client_reference_id ?? null,
            email: invoice.customer_email ?? invoice.metadata?.email ?? null,
            priceIds: priceIdList,
            premiumTrack,
            eventType: event.type,
            eventId: event.id,
          });
          break;
        }

        default:
          logStep('Unhandled Stripe event type', { type: event.type });
      }

      if (result.ignored) {
        logStep('Event ignored - no matching profile', { type: event.type });
        return new Response(
          JSON.stringify({ received: true, ignored: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      logStep('Handler error (returning 200 to stop retries)', { message: (err as Error)?.message ?? String(err) });
      return new Response(
        JSON.stringify({ received: true, ignored: true, error: String((err as Error).message) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Unexpected error', { message: errorMessage });
    return new Response(`Unexpected error: ${errorMessage}`, { status: 500, headers: corsHeaders });
  }
});
