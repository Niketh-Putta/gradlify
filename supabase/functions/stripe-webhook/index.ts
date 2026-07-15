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
import {
  BOTH_SUBJECTS_LIVE_MOCK_SLUG,
  SECOND_LIVE_MOCK_SLUG,
} from "../shared/liveMockPromoConfig.ts";

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

type BillingInterval = 'weekly' | 'monthly' | 'annual' | 'lifetime';

type ProfileUpdatePayload = {
  mode: StripeMode;
  stripeCustomerId: string;
  subscriptionId: string | null;
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

// Tight allowlist of the live-mock slugs whose paid checkouts create a signup
// row. Keep this in sync with create-live-mock-payment; never match arbitrary
// slugs so an unrelated payment can't mint a live-mock registration.
const LIVE_MOCK_SLUGS = new Set([BOTH_SUBJECTS_LIVE_MOCK_SLUG, SECOND_LIVE_MOCK_SLUG]);
const isLiveMockSession = (session: Stripe.Checkout.Session) =>
  LIVE_MOCK_SLUGS.has(session.metadata?.mock_slug ?? '') ||
  LIVE_MOCK_SLUGS.has(session.metadata?.mock_type ?? '');

const resolveUsedPromotionCode = async (
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<string | null> => {
  const expanded = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['discounts', 'discounts.promotion_code'],
  });
  const discounts = expanded.discounts ?? [];
  for (const discount of discounts) {
    const promotionCode = discount.promotion_code;
    if (typeof promotionCode === 'string') {
      const promo = await stripe.promotionCodes.retrieve(promotionCode);
      if (promo?.code) return promo.code.toUpperCase();
      continue;
    }
    if (promotionCode && typeof promotionCode === 'object' && 'code' in promotionCode) {
      const code = (promotionCode as Stripe.PromotionCode).code;
      if (code) return code.toUpperCase();
    }
  }
  return null;
};

const assertLiveMockPromotionAllowed = async (
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) => {
  const usedCode = await resolveUsedPromotionCode(stripe, session);
  if (!usedCode) return;

  logStep('Live mock checkout used disallowed promotion code', {
    sessionId: session.id,
    mockSlug: session.metadata?.mock_slug ?? session.metadata?.mock_type,
    usedCode,
  });
  throw new Error(`Promotion codes are not available for live mock registration.`);
};

const recordPaidLiveMockSignup = async (session: Stripe.Checkout.Session) => {
  const userId =
    session.metadata?.user_id ??
    session.metadata?.userId ??
    session.metadata?.supabase_user_id ??
    session.client_reference_id ??
    null;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const mockSlug = session.metadata?.mock_slug ?? session.metadata?.mock_type ?? 'both_subjects_live_mock';
  const mockStartsAt = session.metadata?.mock_starts_at ?? new Date().toISOString();
  if (!userId || !email) {
    logStep('Live mock payment missing signup identity', {
      sessionId: session.id,
      hasUserId: Boolean(userId),
      hasEmail: Boolean(email),
    });
    return { success: true, ignored: true };
  }

  const allowedSlugs = new Set(['both_subjects_live_mock', 'both_subjects_live_mock_2']);
  if (!allowedSlugs.has(mockSlug)) {
    logStep('Ignored live mock payment for retired slug', { sessionId: session.id, mockSlug });
    return { success: true, ignored: true };
  }

  const supabase = getSupabaseClient();
  const { data: existingSignup, error: existingError } = await supabase
    .from('live_mock_exam_signups')
    .select('id, registered_at')
    .eq('user_id', userId)
    .eq('mock_slug', mockSlug)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingSignup) {
    logStep('Duplicate live mock payment - signup already exists', {
      sessionId: session.id,
      userId,
      mockSlug,
      existingSignupId: existingSignup.id,
      existingRegisteredAt: existingSignup.registered_at,
      amountTotal: session.amount_total,
    });
    return { success: true, ignored: true, duplicatePayment: true };
  }

  const { error } = await supabase
    .from('live_mock_exam_signups')
    .upsert(
      {
        user_id: userId,
        email: email.trim().toLowerCase(),
        mock_slug: mockSlug,
        mock_starts_at: mockStartsAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'mock_slug,user_id' },
    );

  if (error) {
    throw error;
  }

  logStep('Recorded paid live mock signup', {
    sessionId: session.id,
    userId,
    mockSlug,
  });
  return { success: true, ignored: false };
};

const recordProteinPremium = async (session: Stripe.Checkout.Session, active: boolean) => {
  const userId =
    session.metadata?.user_id ??
    session.metadata?.userId ??
    session.metadata?.supabase_user_id ??
    session.client_reference_id ??
    null;
  if (!userId) {
    logStep('Protein premium payment missing user id', { sessionId: session.id });
    return { success: true, ignored: true };
  }

  const { error } = await getSupabaseClient()
    .from('protein_profiles')
    .upsert(
      {
        user_id: userId,
        is_premium: active,
        unlimited_scans: active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) throw error;

  logStep('Updated protein premium profile', { sessionId: session.id, userId, active });
  return { success: true, ignored: false };
};

const determineBillingInterval = (
  subscription: Stripe.Subscription,
  priceIds: StripePriceIds
): BillingInterval => {
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId === priceIds.annual) return 'annual';
  if (priceId === priceIds.weekly) return 'weekly';
  if (priceId === priceIds.monthly) return 'monthly';
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  if (interval === 'year') return 'annual';
  if (interval === 'week') return 'weekly';
  if (interval === 'month') return 'monthly';
  return 'weekly';
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
  const isLifetime = billingInterval === 'lifetime';
  const isActive = isLifetime || (normalizedStatus ? ACTIVE_STATUSES.has(normalizedStatus) : false);
  const tier = isActive ? 'premium' : 'free';

  return {
    tier,
    plan: isActive ? (isLifetime ? 'premium_lifetime' : plan) : 'free',
    current_period_end: isLifetime ? null : currentPeriodEnd,
    premium_until: isLifetime ? null : currentPeriodEnd,
    is_premium: isActive,
    cancel_at_period_end: isLifetime ? false : cancelAtPeriodEnd,
    subscription_interval: isActive ? billingInterval : null,
    subscription_status: isLifetime ? 'lifetime' : normalizedStatus,
    stripe_subscription_status: isLifetime ? 'lifetime' : normalizedStatus,
  } as Record<string, unknown>;
};

const profileLooksLifetime = (profile: {
  plan?: string | null;
  subscription_interval?: string | null;
  stripe_subscription_status?: string | null;
  subscription_status?: string | null;
} | null | undefined) =>
  Boolean(
    profile &&
      (profile.plan === 'premium_lifetime' ||
        profile.subscription_interval === 'lifetime' ||
        profile.stripe_subscription_status === 'lifetime' ||
        profile.subscription_status === 'lifetime'),
  );

const updateProfile = async (payload: ProfileUpdatePayload): Promise<{ success: boolean; ignored: boolean }> => {
  const supabase = getSupabaseClient();
  const customerColumn = payload.mode === 'LIVE' ? 'stripe_customer_id_live' : 'stripe_customer_id_test';
  const subscriptionColumn = payload.mode === 'LIVE' ? 'stripe_subscription_id_live' : 'stripe_subscription_id_test';
  const incomingIsLifetime = payload.billingInterval === 'lifetime';
  let updateData: Record<string, unknown> = {
    ...buildUpdateData(payload),
    [customerColumn]: payload.stripeCustomerId,
  };
  if (payload.subscriptionId) {
    updateData[subscriptionColumn] = payload.subscriptionId;
  }
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

  const resolveExistingProfile = async () => {
    const lookupUserId = payload.metadataUserId ?? payload.clientReferenceId ?? null;
    const selectCols = `${customerColumn}, ${subscriptionColumn}, premium_track, plan, subscription_interval, stripe_subscription_status, subscription_status, is_premium`;
    if (lookupUserId) {
      const { data } = await supabase
        .from('profiles')
        .select(selectCols)
        .eq('user_id', lookupUserId)
        .maybeSingle();
      if (data) return { profile: data, lookupUserId };
    }
    if (payload.stripeCustomerId) {
      const { data } = await supabase
        .from('profiles')
        .select(selectCols)
        .eq(customerColumn, payload.stripeCustomerId)
        .maybeSingle();
      if (data) return { profile: data, lookupUserId: (data as { user_id?: string }).user_id ?? lookupUserId };
    }
    return { profile: null, lookupUserId };
  };

  const { profile: existingProfile, lookupUserId } = await resolveExistingProfile();

  // Lifetime one-time purchases must not be demoted by later subscription
  // cancel/delete/update events from a prior weekly/monthly/annual plan.
  if (!incomingIsLifetime && profileLooksLifetime(existingProfile as {
    plan?: string | null;
    subscription_interval?: string | null;
    stripe_subscription_status?: string | null;
    subscription_status?: string | null;
  })) {
    logStep('Preserving lifetime premium against non-lifetime Stripe event', {
      ...logContext,
      lookupUserId,
      existingPlan: (existingProfile as { plan?: string | null } | null)?.plan ?? null,
    });
    updateData = {
      [customerColumn]: payload.stripeCustomerId,
      is_premium: true,
      tier: 'premium',
      plan: 'premium_lifetime',
      subscription_interval: 'lifetime',
      subscription_status: 'lifetime',
      stripe_subscription_status: 'lifetime',
      cancel_at_period_end: false,
      current_period_end: null,
      premium_until: null,
    };
    if (
      payload.premiumTrack ||
      (existingProfile as { premium_track?: string | null } | null)?.premium_track
    ) {
      updateData.premium_track =
        payload.premiumTrack ??
        (existingProfile as { premium_track?: string | null }).premium_track;
    }
  } else if (lookupUserId || existingProfile) {
    if (payload.premiumTrack) {
      updateData.premium_track = payload.premiumTrack;
    } else if (existingProfile && (existingProfile as { premium_track?: string | null }).premium_track) {
      updateData.premium_track = (existingProfile as { premium_track?: string | null }).premium_track;
    }

    logStep('Profile id presence', {
      ...logContext,
      lookupUserId,
      hasCustomerId: Boolean(existingProfile?.[customerColumn as keyof typeof existingProfile]),
      hasSubscriptionId: Boolean(existingProfile?.[subscriptionColumn as keyof typeof existingProfile]),
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
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === 'payment' && isLiveMockSession(session)) {
            if (session.payment_status !== 'paid') {
              logStep('Ignoring unpaid live mock checkout session', {
                sessionId: session.id,
                paymentStatus: session.payment_status,
                eventType: event.type,
              });
              result = { success: true, ignored: true };
              break;
            }
            await assertLiveMockPromotionAllowed(stripe, session);
            result = await recordPaidLiveMockSignup(session);
            break;
          }

          if (session.metadata?.product_type === 'protein_premium') {
            if (session.payment_status !== 'paid') {
              logStep('Ignoring unpaid protein premium checkout session', {
                sessionId: session.id,
                paymentStatus: session.payment_status,
              });
              result = { success: true, ignored: true };
              break;
            }
            result = await recordProteinPremium(session, true);
            break;
          }

          const isLifetimePremium =
            session.mode === 'payment' &&
            (session.metadata?.product_type === 'premium_lifetime' ||
              session.metadata?.plan_interval === 'lifetime');

          if (isLifetimePremium) {
            if (session.payment_status !== 'paid') {
              logStep('Ignoring unpaid lifetime premium checkout session', {
                sessionId: session.id,
                paymentStatus: session.payment_status,
                eventType: event.type,
              });
              result = { success: true, ignored: true };
              break;
            }

            const customerId = resolveCustomerId(session.customer);
            const metadataUserId =
              session.metadata?.userId ??
              session.metadata?.user_id ??
              session.metadata?.supabase_user_id ??
              null;
            const clientReferenceId = session.client_reference_id ?? null;
            const premiumTrack =
              normalizePremiumTrack(session.metadata?.premium_track) ?? 'eleven_plus';

            if (!customerId) {
              throw new Error('Customer missing from lifetime premium checkout session');
            }

            logStep('Processing lifetime premium checkout', {
              sessionId: session.id,
              customerId,
              clientReferenceId,
              metadataUserId,
              eventType: event.type,
            });

            result = await updateProfile({
              mode,
              stripeCustomerId: customerId,
              subscriptionId: null,
              status: 'active',
              plan: 'premium',
              billingInterval: 'lifetime',
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
              metadataUserId,
              clientReferenceId,
              email: session.customer_details?.email ?? session.customer_email ?? null,
              priceIds: [],
              premiumTrack,
              eventType: event.type,
              eventId: event.id,
            });
            break;
          }

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

          // One-time payment sessions without a subscription are handled above
          // (lifetime / live mock / protein). Anything else without a sub is ignored.
          if (session.mode === 'payment' && !subscriptionId) {
            logStep('Ignoring non-lifetime payment checkout without subscription', {
              sessionId: session.id,
              productType: session.metadata?.product_type ?? null,
            });
            result = { success: true, ignored: true };
            break;
          }

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
          // One-time lifetime checkouts may emit invoices without a subscription.
          // Entitlement is granted via checkout.session.completed instead.
          if (!subscriptionId) {
            logStep('Ignoring invoice without subscription (likely one-time payment)', {
              invoiceId: invoice.id,
              customerId,
            });
            result = { success: true, ignored: true };
            break;
          }
          if (!customerId) {
            throw new Error('Invoice payload missing customer');
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
      // Return 500 so Stripe retries - silent 200 caused missed lifetime grants.
      logStep('Handler error (returning 500 for retry)', { message: (err as Error)?.message ?? String(err) });
      return new Response(
        JSON.stringify({ received: false, error: String((err as Error).message) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Unexpected error', { message: errorMessage });
    return new Response(`Unexpected error: ${errorMessage}`, { status: 500, headers: corsHeaders });
  }
});
