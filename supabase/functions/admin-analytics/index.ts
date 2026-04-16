import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import Stripe from 'https://esm.sh/stripe@14.18.0?target=deno';
import { getStripeTrackPriceIdsForMode, getStripeModeFromLivemode } from '../shared/stripeConfig.ts';

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

const PAGE_SIZE = 1000;

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
  queryFactory: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
  maxPages = 25,
) {
  const rows: T[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

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
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('track', '11plus'),
      supabase.from('profiles').select('id, full_name, plan, premium_track, onboarding, created_at, stripe_subscription_id_live, stripe_subscription_status, cancel_at_period_end, current_period_end', { count: 'exact' })
        .not('stripe_subscription_id_live', 'is', null)
        .in('premium_track', ['eleven_plus', '11plus']),
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
    ]);

    const [activityRows, signupRows, practiceRows, questionEvents] = await Promise.all([
      fetchAllRows(
        (from, to) =>
          supabase
            .from('study_activity')
            .select('activity_date, minutes, user_id, visitor_id, created_at')
            .gte('created_at', startDateIso)
            .order('created_at', { ascending: true })
            .range(from, to),
        50,
      ),
      fetchAllRows(
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
      fetchAllRows(
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
      fetchAllRows(
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

    const stripeEmails = new Map<string, string>();
    let exactMrr = 0;
    try {
      const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeSecret) {
        const stripe = new Stripe(stripeSecret, { httpClient: Stripe.createFetchHttpClient() });
        const subs = await stripe.subscriptions.list({ limit: 100, status: 'all', expand: ['data.customer'] });
        const mode = getStripeModeFromLivemode(stripeSecret.startsWith('sk_live_'));
        const priceIds = getStripeTrackPriceIdsForMode(mode);
        const elevenPlusPrices = [
          priceIds.eleven_plus.monthly,
          priceIds.eleven_plus.annual,
          priceIds.eleven_plus.ultra,
          priceIds.eleven_plus.ultra_annual
        ].filter(Boolean);

        subs.data.forEach(sub => {
          if (sub.status === 'active' && !sub.cancel_at_period_end && sub.items.data.length > 0) {
            const priceId = sub.items.data[0].price.id;
            if (elevenPlusPrices.includes(priceId)) {
              exactMrr += (sub.items.data[0].price.unit_amount || 0) / 100;
            }
          }
          if (sub.customer && typeof sub.customer !== 'string' && sub.customer.email) {
             stripeEmails.set(sub.id, sub.customer.email);
          }
        });
      }
    } catch (err) {
      console.error('Stripe exact MRR match failed', err);
    }

    const payingUsersDetails = await Promise.all((premiumSummary.data ?? []).map(async (p) => {
      let email = "unknown";
      if (p.stripe_subscription_id_live && stripeEmails.has(p.stripe_subscription_id_live)) {
         email = stripeEmails.get(p.stripe_subscription_id_live)!;
      } else {
        try {
          const uId = p.user_id || p.id;
          if (uId) {
            const { data: userData } = await supabase.auth.admin.getUserById(uId);
            if (userData?.user?.email) email = userData.user.email;
          }
        } catch (err) { /* intentionally left empty */ }
      }
      
      return {
        id: p.id,
        name: p.full_name || p.onboarding?.preferredName || "Unknown",
        email,
        plan: p.plan || "premium",
        track: p.premium_track || "unknown",
        created_at: p.created_at,
        subscription_id: p.stripe_subscription_id_live,
        status: p.stripe_subscription_status || 'unknown',
        cancel_at_period_end: p.cancel_at_period_end || false,
        current_period_end: p.current_period_end || null
      };
    }));

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
              premiumTotal: premiumSummary.count ?? 0,
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
          },
          totals: {
            totalSignups: profileSummary.count ?? 0,
            premiumSignups: premiumSummary.count ?? 0,
            sessionCount: sessionSummary.count ?? 0,
            mockAttempts: mockSummary.count ?? 0,
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
