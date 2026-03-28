export type StripeEnvironment = 'development' | 'preview' | 'production';

const ENVIRONMENT_VAR = 'ENVIRONMENT';
const ALLOWED_ENVIRONMENTS: StripeEnvironment[] = ['development', 'preview', 'production'];

const KEY_MODES: Record<StripeEnvironment, 'TEST' | 'LIVE'> = {
  development: 'TEST',
  preview: 'TEST',
  production: 'LIVE',
};

const KEY_PREFIXES: Record<'TEST' | 'LIVE', 'sk_test_' | 'sk_live_'> = {
  TEST: 'sk_test_',
  LIVE: 'sk_live_',
};

const MASKED_PREFIXES: Record<'TEST' | 'LIVE', 'sk_test' | 'sk_live'> = {
  TEST: 'sk_test',
  LIVE: 'sk_live',
};

const safeTrim = (value: string | undefined) => value?.trim() ?? '';

const readEnv = (name: string) => safeTrim(Deno.env.get(name));
const requireEnvVar = (name: string): string => {
  const raw = readEnv(name);
  if (!raw) {
    throw new Error(`${name} is required but not set`);
  }
  return raw;
};

const shortenId = (value: string) => (value.length <= 8 ? value : value.slice(0, 8));

export interface StripeConfig {
  environment: StripeEnvironment;
  stripeKey: string;
  stripeKeyPrefix: 'sk_test' | 'sk_live';
  webhookSecret: string;
  monthlyPriceId: string;
  annualPriceId: string;
}

export type StripeMode = 'TEST' | 'LIVE';

export const getStripeModeFromLivemode = (livemode: boolean): StripeMode =>
  livemode ? 'LIVE' : 'TEST';

export const getStripeSecretForMode = (mode: StripeMode): string =>
  (() => {
    const modeKey = readEnv(`STRIPE_SECRET_KEY_${mode}`);
    if (modeKey) return modeKey;

    const fallback = readEnv('STRIPE_SECRET_KEY');
    if (!fallback) {
      throw new Error(`STRIPE_SECRET_KEY_${mode} is required but not set`);
    }
    if (mode === 'LIVE' && !fallback.startsWith('sk_live_')) {
      throw new Error('STRIPE_SECRET_KEY fallback must be a live key for LIVE mode');
    }
    if (mode === 'TEST' && !fallback.startsWith('sk_test_')) {
      throw new Error('STRIPE_SECRET_KEY fallback must be a test key for TEST mode');
    }
    return fallback;
  })();

export const getStripeWebhookSecretForMode = (mode: StripeMode): string =>
  readEnv(`STRIPE_WEBHOOK_SECRET_${mode}`) || requireEnvVar('STRIPE_WEBHOOK_SECRET');

export interface StripePriceIds {
  monthly: string;
  annual: string;
}

export const getStripePriceIdsForMode = (mode: StripeMode): StripePriceIds => ({
  monthly: requireEnvVar(`STRIPE_PRICE_MONTHLY_${mode}`),
  annual: requireEnvVar(`STRIPE_PRICE_ANNUAL_${mode}`),
});

export type PremiumTrack = 'gcse' | 'eleven_plus';

export interface StripeTrackPriceIds {
  gcse: StripePriceIds;
  eleven_plus: StripePriceIds;
}

const readModeAware = (base: string, mode: StripeMode) =>
  readEnv(`${base}_${mode}`) || readEnv(base);

export const normalizePremiumTrack = (value: string | null | undefined): PremiumTrack | null => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'gcse') return 'gcse';
  if (normalized === '11plus' || normalized === '11_plus' || normalized === 'eleven_plus') {
    return 'eleven_plus';
  }
  return null;
};

export const getStripeTrackPriceIdsForMode = (mode: StripeMode): StripeTrackPriceIds => {
  const gcseMonthly = readModeAware('STRIPE_PRICE_MONTHLY', mode);
  const gcseAnnual = readModeAware('STRIPE_PRICE_ANNUAL', mode);
  const elevenPlusMonthly =
    readModeAware('STRIPE_PRICE_11PLUS_MONTHLY', mode) ||
    readModeAware('STRIPE_PRICE_ELEVEN_PLUS_MONTHLY', mode);
  const elevenPlusAnnual =
    readModeAware('STRIPE_PRICE_11PLUS_ANNUAL', mode) ||
    readModeAware('STRIPE_PRICE_ELEVEN_PLUS_ANNUAL', mode);

  if (!gcseMonthly || !gcseAnnual) {
    throw new Error(`Missing GCSE Stripe price IDs for mode ${mode}`);
  }
  if (!elevenPlusMonthly || !elevenPlusAnnual) {
    throw new Error(`Missing 11+ Stripe price IDs for mode ${mode}`);
  }
  if (gcseMonthly === elevenPlusMonthly || gcseAnnual === elevenPlusAnnual) {
    throw new Error(`GCSE and 11+ Stripe price IDs must be different for mode ${mode}`);
  }

  return {
    gcse: { monthly: gcseMonthly, annual: gcseAnnual },
    eleven_plus: { monthly: elevenPlusMonthly, annual: elevenPlusAnnual },
  };
};

export const getPremiumTrackFromPriceId = (
  mode: StripeMode,
  priceId: string | null | undefined,
): PremiumTrack | null => {
  if (!priceId) return null;
  const priceIds = getStripeTrackPriceIdsForMode(mode);
  if (priceId === priceIds.gcse.monthly || priceId === priceIds.gcse.annual) return 'gcse';
  if (priceId === priceIds.eleven_plus.monthly || priceId === priceIds.eleven_plus.annual) return 'eleven_plus';
  return null;
};

export const getStripeConfig = (): StripeConfig => {
  const envValue = readEnv(ENVIRONMENT_VAR);
  let environment: StripeEnvironment | undefined;
  if (envValue) {
    const normalized = envValue.toLowerCase();
    if (!ALLOWED_ENVIRONMENTS.includes(normalized as StripeEnvironment)) {
      throw new Error(`${ENVIRONMENT_VAR} value "${envValue}" is invalid. Allowed values: ${ALLOWED_ENVIRONMENTS.join(', ')}`);
    }
    environment = normalized as StripeEnvironment;
  }

  const fallbackKey = readEnv('STRIPE_SECRET_KEY');
  let mode: 'TEST' | 'LIVE' | undefined;
  let stripeKey: string | undefined;
  let usedLegacyKey = false;

  if (environment) {
    const candidate = readEnv(`STRIPE_SECRET_KEY_${KEY_MODES[environment]}`);
    if (candidate) {
      stripeKey = candidate;
      mode = KEY_MODES[environment];
    }
  }

  if (!stripeKey && fallbackKey) {
    stripeKey = fallbackKey;
    usedLegacyKey = true;
  }

  if (!stripeKey) {
    throw new Error(`Stripe key not configured for ${environment ?? 'default'} environment`);
  }

  const normalizedPrefix = stripeKey.startsWith('sk_live_')
    ? 'LIVE'
    : stripeKey.startsWith('sk_test_')
      ? 'TEST'
      : null;

  if (!normalizedPrefix) {
    throw new Error('Stripe key must begin with "sk_test_" or "sk_live_"');
  }

  if (mode && mode !== normalizedPrefix) {
    throw new Error(`Stripe key prefix mismatch: expected ${KEY_PREFIXES[mode]} for ${environment} environment`);
  }

  const resolvedMode: 'TEST' | 'LIVE' = normalizedPrefix;
  const resolvedEnvironment = environment ?? (resolvedMode === 'LIVE' ? 'production' : 'development');

  const monthlyPriceId =
    readEnv(`STRIPE_PRICE_MONTHLY_${resolvedMode}`) ||
    readEnv('STRIPE_PRICE_MONTHLY');
  const annualPriceId =
    readEnv(`STRIPE_PRICE_ANNUAL_${resolvedMode}`) ||
    readEnv('STRIPE_PRICE_ANNUAL');
  const webhookSecret =
    readEnv(`STRIPE_WEBHOOK_SECRET_${resolvedMode}`) ||
    readEnv('STRIPE_WEBHOOK_SECRET');

  if (!monthlyPriceId) {
    throw new Error('Monthly price ID is not configured');
  }
  if (!annualPriceId) {
    throw new Error('Annual price ID is not configured');
  }
  if (!webhookSecret) {
    throw new Error('Stripe webhook secret is not configured');
  }

  const stripeKeyPrefix = MASKED_PREFIXES[resolvedMode];

  if (usedLegacyKey) {
    console.warn(`[StripeConfig] using legacy env variables for ${resolvedEnvironment} (logging only prefixes)`);
  }

  if (resolvedEnvironment !== 'production') {
    console.debug(
      `[StripeConfig] env=${resolvedEnvironment} stripeKeyPrefix=${stripeKeyPrefix} monthly=${shortenId(monthlyPriceId)} annual=${shortenId(annualPriceId)}`,
    );
  }

  return {
    environment: resolvedEnvironment,
    stripeKey,
    stripeKeyPrefix,
    webhookSecret,
    monthlyPriceId,
    annualPriceId,
  };
};
