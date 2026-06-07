import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import Stripe from 'https://esm.sh/stripe@14.18.0?target=deno';
import { getPlanFromPriceId, getStripeTrackPriceIdsForMode, getStripeModeFromLivemode } from '../shared/stripeConfig.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TimelinePoint = {
  date: string;
  visits: number;
  visitors: number;
  newVisitors: number;
  signups: number;
  minutes: number;
};

type ActivityRow = {
  activity_date?: string | null;
  minutes?: number | string | null;
  user_id?: string | null;
  visitor_id?: string | null;
  created_at?: string | null;
};

type SignupRow = {
  created_at?: string | null;
};

type PracticeRow = {
  attempts?: number | string | null;
  correct?: number | string | null;
};

type QuestionEventRow = {
  question_count?: number | string | null;
};

const PAGE_SIZE = 1000;
const STRIPE_PAGE_SIZE = 100;

const clampDays = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 14;
  const rounded = Math.round(parsed);
  if (rounded < 1) return 1;
  if (rounded > 60) return 60;
  return rounded;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const daysAgoIsoDate = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toIsoDate(date);
};

async function fetchAllRows<T>(
  queryFactory: (from: number, to: number) => unknown,
  maxPages = 25,
) {
  const rows: T[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await (queryFactory(from, to) as PromiseLike<{ data: T[] | null; error: unknown }>);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

const toIsoFromStripeSeconds = (value?: number | null) =>
  value ? new Date(value * 1000).toISOString() : null;

const hasDefaultPaymentMethod = (subscription: Stripe.Subscription) => {
  if (subscription.default_payment_method) return true;
  const customer = subscription.customer as Stripe.Customer | string | null;
  return typeof customer !== 'string' && Boolean(customer?.invoice_settings?.default_payment_method);
};

const describePaymentMethod = (subscription: Stripe.Subscription) => {
  const method =
    typeof subscription.default_payment_method !== 'string'
      ? subscription.default_payment_method
      : null;

  if (method?.type === 'card' && method.card?.last4) {
    const brand = method.card.brand ? method.card.brand.replace(/_/g, ' ') : 'Card';
    return `${brand} •••• ${method.card.last4}`;
  }

  if (method?.type === 'link') return 'Link';
  if (method?.type === 'bacs_debit') return 'Bacs debit';
  if (method?.type === 'sepa_debit') return 'SEPA debit';
  if (method?.type === 'us_bank_account') return 'Bank account';
  if (method?.type) return method.type.replace(/_/g, ' ');

  return hasDefaultPaymentMethod(subscription) ? 'Payment method saved' : 'Unknown';
};

const getCustomerEmail = (subscription: Stripe.Subscription) => {
  const customer = subscription.customer as Stripe.Customer | string | null;
  return typeof customer !== 'string' ? customer?.email ?? null : null;
};

const getCustomerName = (subscription: Stripe.Subscription) => {
  const customer = subscription.customer as Stripe.Customer | string | null;
  return typeof customer !== 'string' ? customer?.name ?? null : null;
};

const getProfileName = (profile: { full_name?: string | null; onboarding?: Record<string, unknown> | null } | null | undefined) => {
  const onboarding = profile?.onboarding ?? {};
  const preferredName = typeof onboarding.preferredName === 'string' ? onboarding.preferredName.trim() : '';
  const onboardingName = typeof onboarding.name === 'string' ? onboarding.name.trim() : '';
  return profile?.full_name?.trim() || preferredName || onboardingName || null;
};

const getAuthUserName = (user: { user_metadata?: Record<string, unknown> } | null | undefined) => {
  const metadata = user?.user_metadata ?? {};
  for (const key of ['full_name', 'name', 'preferredName']) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const nameFromEmail = (email: string | null | undefined) => {
  const localPart = email?.split('@')[0]?.trim();
  if (!localPart) return 'Unknown';
  const cleaned = localPart
    .replace(/[0-9]+/g, ' ')
    .replace(/[._-]+/g, ' ')
    .trim();
  if (!cleaned) return 'Unknown';
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const fetchStripeSubscriptionsByPrices = async (stripe: Stripe, priceIds: string[]) => {
  const rows: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const subscriptions = await stripe.subscriptions.list({
      limit: STRIPE_PAGE_SIZE,
      status: 'all',
      ...(startingAfter ? { starting_after: startingAfter } : {}),
      expand: ['data.customer', 'data.default_payment_method', 'data.items.data.price'],
    });

    const matched = subscriptions.data.filter((subscription: Stripe.Subscription) =>
      subscription.items.data.some((item: Stripe.SubscriptionItem) => priceIds.includes(item.price.id))
    );
    rows.push(...matched);

    if (!subscriptions.has_more || subscriptions.data.length === 0) break;
    startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
  }

  return rows;
};

const isElevenPlusAttributedPrice = (
  priceId: string | undefined,
  elevenPlusPrices: string[],
  legacyOtherPrices: string[],
) => Boolean(priceId && (elevenPlusPrices.includes(priceId) || legacyOtherPrices.includes(priceId)));

const BOTH_SUBJECTS_LIVE_MOCK_SLUG = 'both_subjects_live_mock';

const monthlyEquivalentGbp = (subscription: Stripe.Subscription) => {
  const price = subscription.items.data[0]?.price;
  if (!price?.unit_amount) return 0;
  const amount = price.unit_amount / 100;
  const interval = price.recurring?.interval;
  if (interval === 'year') return amount / 12;
  return amount;
};

const fetchLiveMockCheckoutRevenue = async (stripe: Stripe) => {
  let totalGbp = 0;
  let paidSessions = 0;
  let startingAfter: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const sessions = await stripe.checkout.sessions.list({
      limit: STRIPE_PAGE_SIZE,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const session of sessions.data) {
      const isLiveMock =
        session.metadata?.mock_slug === BOTH_SUBJECTS_LIVE_MOCK_SLUG ||
        session.metadata?.mock_type === BOTH_SUBJECTS_LIVE_MOCK_SLUG;
      if (!isLiveMock || session.payment_status !== 'paid') continue;
      totalGbp += (session.amount_total ?? 0) / 100;
      paidSessions += 1;
    }

    if (!sessions.has_more || sessions.data.length === 0) break;
    startingAfter = sessions.data[sessions.data.length - 1].id;
  }

  return { totalGbp, paidSessions };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ ok: false, code: 'MISSING_ENV', message: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const days = clampDays(body?.days);

    const lookbackStart = new Date();
    lookbackStart.setUTCDate(lookbackStart.getUTCDate() - (days - 1));
    const startDate = toIsoDate(lookbackStart);
    const startDateIso = `${startDate}T00:00:00.000Z`;
    const start7dIso = `${daysAgoIsoDate(6)}T00:00:00.000Z`;
    const start14dIso = `${daysAgoIsoDate(13)}T00:00:00.000Z`;
    const start30dIso = `${daysAgoIsoDate(29)}T00:00:00.000Z`;

    const [
      profileSummary,
      premiumSummary,
      allElevenPlusProfiles,
      sessionSummary,
      mockSummary,
      signup14dCount,
      signup7dCount,
      signup30dCount,
      mock14dCount,
      mock7dCount,
      mock30dCount,
      sessions14dCount,
      sessions7dCount,
      sessions30dCount,
      practice14dCount,
      practice7dCount,
      practice30dCount,
      priceResponse,
      liveMockSignupSummary,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('track', '11plus'),
      supabase.from('profiles').select('id, user_id, full_name, plan, premium_track, track, onboarding, created_at, stripe_customer_id_live, stripe_subscription_id_live, stripe_subscription_status, cancel_at_period_end, current_period_end', { count: 'exact' })
        .not('stripe_subscription_id_live', 'is', null)
        .eq('track', '11plus'),
      supabase.from('profiles').select('id, user_id, full_name, onboarding, created_at, stripe_customer_id_live, stripe_customer_id_test, premium_track, track').eq('track', '11plus').limit(2000),
      supabase.from('study_sessions').select('id, profiles!inner(track)', { count: 'exact', head: true }).eq('profiles.track', '11plus'),
      supabase.from('mock_attempts').select('id', { count: 'exact', head: true }).eq('status', 'completed').eq('track', '11plus'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', start14dIso).eq('track', '11plus'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', start7dIso).eq('track', '11plus'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', start30dIso).eq('track', '11plus'),
      supabase.from('mock_attempts').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', start14dIso).eq('track', '11plus'),
      supabase.from('mock_attempts').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', start7dIso).eq('track', '11plus'),
      supabase.from('mock_attempts').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', start30dIso).eq('track', '11plus'),
      supabase.from('study_sessions').select('id, profiles!inner(track)', { count: 'exact', head: true }).gte('created_at', start14dIso).eq('profiles.track', '11plus'),
      supabase.from('study_sessions').select('id, profiles!inner(track)', { count: 'exact', head: true }).gte('created_at', start7dIso).eq('profiles.track', '11plus'),
      supabase.from('study_sessions').select('id, profiles!inner(track)', { count: 'exact', head: true }).gte('created_at', start30dIso).eq('profiles.track', '11plus'),
      supabase.from('practice_results').select('id', { count: 'exact', head: true }).gte('created_at', start14dIso).eq('track', '11plus'),
      supabase.from('practice_results').select('id', { count: 'exact', head: true }).gte('created_at', start7dIso).eq('track', '11plus'),
      supabase.from('practice_results').select('id', { count: 'exact', head: true }).gte('created_at', start30dIso).eq('track', '11plus'),
      supabase.functions.invoke('stripe-price'),
      supabase
        .from('live_mock_exam_signups')
        .select('id', { count: 'exact', head: true })
        .eq('mock_slug', BOTH_SUBJECTS_LIVE_MOCK_SLUG),
    ]);

    const [activityRows, signupRows, practiceRows, questionEvents] = await Promise.all([
      fetchAllRows<ActivityRow>(
        (from, to) =>
          supabase
            .from('study_activity')
            .select('activity_date, minutes, user_id, visitor_id, created_at')
            .gte('created_at', startDateIso)
            .order('created_at', { ascending: true })
            .range(from, to),
        50,
      ),
      fetchAllRows<SignupRow>(
        (from, to) =>
          supabase
            .from('profiles')
            .select('created_at')
            .gte('created_at', startDateIso)
            .eq('track', '11plus')
            .order('created_at', { ascending: true })
            .range(from, to),
        50,
        ),
      fetchAllRows<PracticeRow>(
        (from, to) =>
          supabase
            .from('practice_results')
            .select('attempts, correct, created_at')
            .gte('created_at', startDateIso)
            .eq('track', '11plus')
            .order('created_at', { ascending: true })
            .range(from, to),
        50,
      ),
      fetchAllRows<QuestionEventRow>(
        (from, to) =>
          supabase
            .from('question_events_all')
            .select('question_count, created_at')
            .gte('created_at', startDateIso)
            .order('created_at', { ascending: true })
            .range(from, to),
        50,
      ),
    ]);

    const activityByDay = new Map<string, { visitors: Set<string>; minutes: number; visits: number }>();
    const newVisitorsByDay = new Map<string, number>();
    const firstSeenVisitorDate = new Map<string, string>();
    const uniqueVisitors14d = new Set<string>();
    const uniqueVisitors7d = new Set<string>();
    const uniqueVisitorsPrev7d = new Set<string>();
    const start7Date = daysAgoIsoDate(6);
    const startPrev7Date = daysAgoIsoDate(13);
    const endPrev7Date = daysAgoIsoDate(7);

    for (const row of activityRows ?? []) {
      const bucketDate = row.created_at?.slice(0, 10) ?? row.activity_date?.slice(0, 10);
      if (!bucketDate) continue;
      const existing = activityByDay.get(bucketDate) ?? { visitors: new Set<string>(), minutes: 0, visits: 0 };
      const visitorKey = row.user_id ?? row.visitor_id ?? null;
      if (visitorKey) {
        const visitorId = String(visitorKey);
        existing.visitors.add(visitorId);
        if (!firstSeenVisitorDate.has(visitorId)) {
          firstSeenVisitorDate.set(visitorId, bucketDate);
          newVisitorsByDay.set(bucketDate, (newVisitorsByDay.get(bucketDate) ?? 0) + 1);
        }
      }
      existing.minutes += Number(row.minutes ?? 0);
      existing.visits += 1;
      activityByDay.set(bucketDate, existing);

      if (visitorKey) {
        uniqueVisitors14d.add(String(visitorKey));
        if (bucketDate >= start7Date) {
          uniqueVisitors7d.add(String(visitorKey));
        } else if (bucketDate >= startPrev7Date && bucketDate <= endPrev7Date) {
          uniqueVisitorsPrev7d.add(String(visitorKey));
        }
      }
    }

    const signupsByDay = new Map<string, number>();
    for (const row of signupRows ?? []) {
      const bucketDate = row.created_at?.slice(0, 10);
      if (!bucketDate) continue;
      signupsByDay.set(bucketDate, (signupsByDay.get(bucketDate) ?? 0) + 1);
    }

    let practiceAttempts14d = 0;
    let practiceCorrect14d = 0;
    for (const row of practiceRows ?? []) {
      practiceAttempts14d += Number(row.attempts ?? 0);
      practiceCorrect14d += Number(row.correct ?? 0);
    }

    const questionsAttempted14d = (questionEvents ?? []).reduce(
      (sum, row) => sum + Number(row.question_count ?? 0),
      0
    );

    const timeline: TimelinePoint[] = [];
    for (let index = 0; index < days; index += 1) {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() - (days - 1 - index));
      const isoDate = toIsoDate(day);
      const bucket = activityByDay.get(isoDate);
      timeline.push({
        date: isoDate,
        visits: bucket?.visits ?? 0,
        visitors: bucket?.visitors.size ?? 0,
        newVisitors: newVisitorsByDay.get(isoDate) ?? 0,
        minutes: bucket?.minutes ?? 0,
        signups: signupsByDay.get(isoDate) ?? 0,
      });
    }

    const visitorDays14d = timeline.reduce((sum, point) => sum + point.visitors, 0);
    const minutes14d = timeline.reduce((sum, point) => sum + point.minutes, 0);
    const signups14d = timeline.reduce((sum, point) => sum + point.signups, 0);

    const last7 = timeline.slice(-7);
    const prev7 = timeline.slice(-14, -7);
    const visitorDays7d = last7.reduce((sum, point) => sum + point.visitors, 0);
    const visitorDaysPrev7d = prev7.reduce((sum, point) => sum + point.visitors, 0);
    const signups7d = last7.reduce((sum, point) => sum + point.signups, 0);
    const signupsPrev7d = prev7.reduce((sum, point) => sum + point.signups, 0);
    const minutes7d = last7.reduce((sum, point) => sum + point.minutes, 0);
    const minutesPrev7d = prev7.reduce((sum, point) => sum + point.minutes, 0);

    const stripeSubscriptionsById = new Map<string, Stripe.Subscription>();
    const legacyOtherPriceIds = new Set<string>();
    let exactMrr = 0;
    let liveMockRevenueGbp = 0;
    let liveMockPaidSessions = 0;
    try {
      const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeSecret) {
        const stripe = new Stripe(stripeSecret, { httpClient: Stripe.createFetchHttpClient() });
        const mode = getStripeModeFromLivemode(stripeSecret.startsWith('sk_live_'));
        const priceIds = getStripeTrackPriceIdsForMode(mode);
        const elevenPlusPrices = [
          priceIds.eleven_plus.monthly,
          priceIds.eleven_plus.annual,
          priceIds.eleven_plus.ultra,
          priceIds.eleven_plus.ultra_annual
        ].filter((priceId): priceId is string => Boolean(priceId));
        const legacyOtherPrices = [
          priceIds.gcse.monthly,
          priceIds.gcse.annual,
        ].filter((priceId): priceId is string => Boolean(priceId));
        legacyOtherPrices.forEach((priceId) => legacyOtherPriceIds.add(priceId));
        const attributedPrices = [...new Set([...elevenPlusPrices, ...legacyOtherPrices])];
        const subs = await fetchStripeSubscriptionsByPrices(stripe, attributedPrices);

        subs.forEach(sub => {
          stripeSubscriptionsById.set(sub.id, sub);
          if (sub.status === 'active' && !sub.cancel_at_period_end && sub.items.data.length > 0) {
            const priceId = sub.items.data[0].price.id;
            if (isElevenPlusAttributedPrice(priceId, elevenPlusPrices, legacyOtherPrices)) {
              exactMrr += monthlyEquivalentGbp(sub);
            }
          }
        });

        const mockRevenue = await fetchLiveMockCheckoutRevenue(stripe);
        liveMockRevenueGbp = mockRevenue.totalGbp;
        liveMockPaidSessions = mockRevenue.paidSessions;
      }
    } catch (err) {
      console.error('Stripe exact MRR match failed', err);
    }

    const profileRows = premiumSummary.data ?? [];
    const allProfileRows = allElevenPlusProfiles.data ?? [];
    const { data: authUsersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 2000 });
    const authUsers = authUsersPage?.users ?? [];
    const authUserById = new Map(authUsers.map((user) => [user.id, user]));
    const authUserByEmail = new Map(
      authUsers
        .filter((user) => user.email)
        .map((user) => [user.email!.toLowerCase(), user])
    );
    const profileByUserId = new Map(allProfileRows.map((profile) => [profile.user_id, profile]));
    const profileByCustomerId = new Map(
      allProfileRows
        .flatMap((profile) => [profile.stripe_customer_id_live, profile.stripe_customer_id_test].map((customerId) => ({ customerId, profile })))
        .filter((entry) => entry.customerId)
        .map((entry) => [entry.customerId!, entry.profile])
    );

    const profileBySubscriptionId = new Map(
      profileRows
        .filter((profile) => profile.stripe_subscription_id_live)
        .map((profile) => [profile.stripe_subscription_id_live, profile])
    );

    const profileDetails = await Promise.all(profileRows.map(async (p) => {
      let email = "unknown";
      const stripeSubscription = p.stripe_subscription_id_live
        ? stripeSubscriptionsById.get(p.stripe_subscription_id_live)
        : null;
      const stripeEmail = stripeSubscription ? getCustomerEmail(stripeSubscription) : null;
      if (stripeEmail) {
         email = stripeEmail;
      } else {
        try {
          const uId = p.user_id;
          if (uId) {
            const { data: userData } = await supabase.auth.admin.getUserById(uId);
            if (userData?.user?.email) email = userData.user.email;
          }
        } catch (err) { /* intentionally left empty */ }
      }

      const stripePriceId = stripeSubscription?.items.data[0]?.price?.id;
      const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY') || '';
      const stripePlan = stripePriceId
        ? getPlanFromPriceId(getStripeModeFromLivemode(stripeSecret.startsWith('sk_live_')), stripePriceId)
        : null;
      const monthlyAmountGbp = stripeSubscription ? monthlyEquivalentGbp(stripeSubscription) : null;
      const billingTier =
        stripePlan === 'ultra' || (monthlyAmountGbp !== null && monthlyAmountGbp >= 200)
          ? 'ultra_250'
          : p.plan === 'premium_monthly' || (monthlyAmountGbp !== null && monthlyAmountGbp < 50)
          ? 'monthly_20'
          : 'other';
      
      return {
        id: p.id,
        name: getProfileName(p) || getAuthUserName(authUserById.get(p.user_id)) || nameFromEmail(email),
        email,
        plan: stripePlan === 'ultra' ? 'ultra' : (p.plan || "premium"),
        track: p.premium_track === 'gcse' ? 'eleven_plus_legacy' : (p.premium_track || p.track || "unknown"),
        billing_tier: billingTier,
        monthly_amount_gbp: monthlyAmountGbp,
        created_at: p.created_at,
        subscription_id: p.stripe_subscription_id_live,
        status: stripeSubscription?.status || p.stripe_subscription_status || 'unknown',
        cancel_at_period_end: stripeSubscription?.cancel_at_period_end || p.cancel_at_period_end || false,
        current_period_end: toIsoFromStripeSeconds(stripeSubscription?.current_period_end) || p.current_period_end || null,
        payment_method: stripeSubscription ? describePaymentMethod(stripeSubscription) : 'Saved in Stripe',
        stripe_customer_id: stripeSubscription
          ? (typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer?.id ?? null)
          : p.stripe_customer_id_live,
        source: 'profile'
      };
    }));

    const stripeOnlyDetails = Array.from(stripeSubscriptionsById.values())
      .filter((subscription) => !profileBySubscriptionId.has(subscription.id))
      .filter((subscription) => hasDefaultPaymentMethod(subscription))
      .map((subscription) => {
        const price = subscription.items.data[0]?.price;
        const priceId = price?.id;
        const interval = price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
        const customer = subscription.customer as Stripe.Customer | string | null;
        const customerId = typeof customer === 'string' ? customer : customer?.id ?? null;
        const email = getCustomerEmail(subscription);
        const authUser = email ? authUserByEmail.get(email.toLowerCase()) : null;
        const matchedProfile =
          (customerId ? profileByCustomerId.get(customerId) : null) ||
          (authUser ? profileByUserId.get(authUser.id) : null) ||
          null;
        const isLegacyOther = Boolean(priceId && legacyOtherPriceIds.has(priceId));

        return {
          id: subscription.id,
          name: getCustomerName(subscription) || getProfileName(matchedProfile) || getAuthUserName(authUser) || nameFromEmail(email),
          email: email || "unknown",
          plan: price?.metadata?.plan || (interval === 'annual' ? 'premium annual' : 'premium'),
          track: isLegacyOther ? 'eleven_plus_legacy' : 'eleven_plus',
          created_at: toIsoFromStripeSeconds(subscription.start_date) || toIsoFromStripeSeconds(subscription.created) || new Date().toISOString(),
          subscription_id: subscription.id,
          status: subscription.status || 'unknown',
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          current_period_end: toIsoFromStripeSeconds(subscription.current_period_end),
          payment_method: describePaymentMethod(subscription),
          stripe_customer_id: customerId,
          source: 'stripe'
        };
      });

    const payingUsersDetails = [...profileDetails, ...stripeOnlyDetails].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const activeElevenPlusSubscribers = payingUsersDetails.filter(
      (user) => user.status === 'active' && !user.cancel_at_period_end
    ).length;
    const trialingElevenPlusSubscribers = payingUsersDetails.filter(
      (user) => user.status === 'trialing'
    ).length;
    const monthlyPaying = payingUsersDetails.filter(
      (user) =>
        user.status === 'active' &&
        !user.cancel_at_period_end &&
        (user.billing_tier === 'monthly_20' || user.plan === 'premium_monthly')
    ).length;
    const ultraPaying = payingUsersDetails.filter(
      (user) =>
        user.status === 'active' &&
        !user.cancel_at_period_end &&
        (user.billing_tier === 'ultra_250' || user.plan === 'ultra')
    ).length;
    const legacyOtherPaying = payingUsersDetails.filter(
      (user) =>
        user.status === 'active' &&
        !user.cancel_at_period_end &&
        user.track === 'eleven_plus_legacy'
    ).length;
    const liveMockEnrolled = liveMockSignupSummary.count ?? 0;
    const liveMockSignupDisplayOffset = Number(Deno.env.get('LIVE_MOCK_SIGNUP_DISPLAY_OFFSET') || '49');
    const liveMockMinDisplayed = Number(Deno.env.get('LIVE_MOCK_MIN_DISPLAYED_SIGNUPS') || '68');
    const liveMockDisplayedEnrolled = Math.max(liveMockMinDisplayed, liveMockEnrolled + liveMockSignupDisplayOffset);

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          timeline,
          kpis: {
            visitors: {
              unique14d: uniqueVisitors14d.size,
              unique7d: uniqueVisitors7d.size,
              uniquePrev7d: uniqueVisitorsPrev7d.size,
              visitorDays14d,
              visitorDays7d,
              visitorDaysPrev7d,
            },
            signups: {
              total: profileSummary.count ?? 0,
              premiumTotal: payingUsersDetails.length,
              last14d: signup14dCount.count ?? 0,
              last7d: signup7dCount.count ?? 0,
              last30d: signup30dCount.count ?? 0,
              period14d: signups14d,
              period7d: signups7d,
              periodPrev7d: signupsPrev7d,
            },
            engagement: {
              minutes14d,
              minutes7d,
              minutesPrev7d,
              avgDailyMinutes14d: minutes14d / days,
              minutesPerVisitorDay14d: visitorDays14d === 0 ? 0 : minutes14d / visitorDays14d,
              practiceAttempts14d,
              practiceCorrect14d,
              practiceAccuracy14d: practiceAttempts14d === 0 ? 0 : (practiceCorrect14d / practiceAttempts14d) * 100,
            },
            questions: {
              attempted14d: questionsAttempted14d,
              practiceAttempts14d,
              mockAttempts14d: mock14dCount.count ?? 0,
            },
            activity: {
              sessionsTotal: sessionSummary.count ?? 0,
              sessions14d: sessions14dCount.count ?? 0,
              sessions7d: sessions7dCount.count ?? 0,
              sessions30d: sessions30dCount.count ?? 0,
              mocksTotal: mockSummary.count ?? 0,
              mocks14d: mock14dCount.count ?? 0,
              mocks7d: mock7dCount.count ?? 0,
              mocks30d: mock30dCount.count ?? 0,
              practiceSessions14d: practice14dCount.count ?? 0,
              practiceSessions7d: practice7dCount.count ?? 0,
              practiceSessions30d: practice30dCount.count ?? 0,
            },
            growth: {
              visitorDaysWoW: visitorDaysPrev7d === 0 ? (visitorDays7d === 0 ? 0 : 100) : ((visitorDays7d - visitorDaysPrev7d) / visitorDaysPrev7d) * 100,
              signupsWoW: signupsPrev7d === 0 ? (signups7d === 0 ? 0 : 100) : ((signups7d - signupsPrev7d) / signupsPrev7d) * 100,
              minutesWoW: minutesPrev7d === 0 ? (minutes7d === 0 ? 0 : 100) : ((minutes7d - minutesPrev7d) / minutesPrev7d) * 100,
            },
            earnings: {
              monthly: exactMrr,
              currency: 'gbp',
              interval: 'month',
            },
            subscriptions: {
              activePaying: activeElevenPlusSubscribers,
              trialing: trialingElevenPlusSubscribers,
              premiumFunnel: activeElevenPlusSubscribers + trialingElevenPlusSubscribers,
              monthlyPaying,
              ultraPaying,
              legacyOtherPaying,
              stripeLinkedTotal: payingUsersDetails.length,
            },
            liveMock: {
              slug: BOTH_SUBJECTS_LIVE_MOCK_SLUG,
              enrolledReal: liveMockEnrolled,
              enrolledDisplayed: liveMockDisplayedEnrolled,
              paidCheckoutSessions: liveMockPaidSessions,
              revenueGbp: Math.round(liveMockRevenueGbp * 100) / 100,
              currentPriceGbp: 19.99,
              promoCode: 'LEVELFIELD',
            },
          },
          totals: {
            totalSignups: profileSummary.count ?? 0,
            premiumSignups: activeElevenPlusSubscribers,
            trialingSubscribers: trialingElevenPlusSubscribers,
            sessionCount: sessionSummary.count ?? 0,
            mockAttempts: mockSummary.count ?? 0,
            liveMockEnrolled,
          },
          payingUsers: payingUsersDetails,
          startDate,
          days,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('admin-analytics error:', error);
    return new Response(
      JSON.stringify({ ok: false, code: 'UNEXPECTED', message: 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
