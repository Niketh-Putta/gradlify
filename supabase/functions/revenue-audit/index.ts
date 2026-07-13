import Stripe from 'https://esm.sh/stripe@14.18.0?target=deno';
import { getStripeTrackPriceIdsForMode, getStripeModeFromLivemode } from '../shared/stripeConfig.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_PAGE_SIZE = 100;
const BOTH_SUBJECTS_LIVE_MOCK_SLUG = 'both_subjects_live_mock';

const monthlyEquivalentGbp = (subscription: Stripe.Subscription) => {
  const price = subscription.items.data[0]?.price;
  if (!price?.unit_amount) return 0;
  const amount = price.unit_amount / 100;
  if (price.recurring?.interval === 'year') return amount / 12;
  return amount;
};

const fetchStripeSubscriptionsByPrices = async (stripe: Stripe, priceIds: string[]) => {
  const rows: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const subscriptions = await stripe.subscriptions.list({
      limit: STRIPE_PAGE_SIZE,
      status: 'all',
      ...(startingAfter ? { starting_after: startingAfter } : {}),
      expand: ['data.customer', 'data.items.data.price'],
    });

    const matched = subscriptions.data.filter((subscription) =>
      subscription.items.data.some((item) => priceIds.includes(item.price.id)),
    );
    rows.push(...matched);

    if (!subscriptions.has_more || subscriptions.data.length === 0) break;
    startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
  }

  return rows;
};

const fetchLiveMockCheckoutRevenue = async (stripe: Stripe) => {
  const sessions: Array<{
    id: string;
    email: string | null;
    amountGbp: number;
    created: string | null;
    promo: boolean;
  }> = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const result = await stripe.checkout.sessions.list({
      limit: STRIPE_PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const session of result.data) {
      const isLiveMock =
        session.metadata?.mock_slug === BOTH_SUBJECTS_LIVE_MOCK_SLUG ||
        session.metadata?.mock_type === BOTH_SUBJECTS_LIVE_MOCK_SLUG;
      if (!isLiveMock || session.payment_status !== 'paid') continue;

      sessions.push({
        id: session.id,
        email: session.customer_details?.email ?? session.customer_email ?? null,
        amountGbp: (session.amount_total ?? 0) / 100,
        created: session.created ? new Date(session.created * 1000).toISOString() : null,
        promo: (session.total_details?.amount_discount ?? 0) > 0,
      });
    }

    if (!result.has_more || result.data.length === 0) break;
    startingAfter = result.data[result.data.length - 1].id;
  }

  const totalGbp = sessions.reduce((sum, row) => sum + row.amountGbp, 0);
  return { sessions, totalGbp, paidSessions: sessions.length };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      return new Response(
        JSON.stringify({ ok: false, code: 'MISSING_STRIPE', message: 'Stripe secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(stripeSecret, { httpClient: Stripe.createFetchHttpClient() });
    const mode = getStripeModeFromLivemode(stripeSecret.startsWith('sk_live_'));
    const priceIds = getStripeTrackPriceIdsForMode(mode);
    const attributedPrices = [
      priceIds.eleven_plus.monthly,
      priceIds.eleven_plus.annual,
      priceIds.eleven_plus.ultra,
      priceIds.eleven_plus.ultra_annual,
      priceIds.gcse.monthly,
      priceIds.gcse.annual,
    ].filter((priceId): priceId is string => Boolean(priceId));

    const subscriptions = await fetchStripeSubscriptionsByPrices(stripe, attributedPrices);
    const activeSubs = subscriptions.filter((sub) => sub.status === 'active' && !sub.cancel_at_period_end);
    const trialingSubs = subscriptions.filter((sub) => sub.status === 'trialing');

    const subscriptionRows = [...activeSubs, ...trialingSubs].map((sub) => {
      const price = sub.items.data[0]?.price;
      const interval = price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
      const cashGbp = (price?.unit_amount ?? 0) / 100;
      const customer = sub.customer as Stripe.Customer | string | null;
      const email = typeof customer !== 'string' ? customer?.email ?? null : null;
      return {
        subscription_id: sub.id,
        email,
        status: sub.status,
        interval,
        cash_gbp: cashGbp,
        mrr_gbp: sub.status === 'active' && !sub.cancel_at_period_end ? monthlyEquivalentGbp(sub) : 0,
        cancel_at_period_end: sub.cancel_at_period_end,
      };
    });

    const subscriptionMrrGbp = activeSubs.reduce((sum, sub) => sum + monthlyEquivalentGbp(sub), 0);
    const mock = await fetchLiveMockCheckoutRevenue(stripe);

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          subscriptions: {
            activePaying: activeSubs.length,
            trialing: trialingSubs.length,
            mrrGbp: Math.round(subscriptionMrrGbp * 100) / 100,
            rows: subscriptionRows,
          },
          liveMock: {
            slug: BOTH_SUBJECTS_LIVE_MOCK_SLUG,
            paidSessions: mock.paidSessions,
            totalCashGbp: Math.round(mock.totalGbp * 100) / 100,
            sessions: mock.sessions,
            note: 'One-off ticket sales only. Enrollments include free Premium seats.',
          },
          totals: {
            subscriptionMrrGbp: Math.round(subscriptionMrrGbp * 100) / 100,
            mockCashGbp: Math.round(mock.totalGbp * 100) / 100,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'revenue_audit_failed';
    return new Response(
      JSON.stringify({ ok: false, message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
