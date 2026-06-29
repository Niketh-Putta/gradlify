#!/usr/bin/env node
/**
 * Creates Stripe promotion code for Premium annual (£50 off first year).
 * Restricted to checkout totals >= £200 so weekly plans cannot use it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROMO_CODE = "ANNUAL50";
const AMOUNT_OFF_PENCE = "5000";
const MIN_AMOUNT_PENCE = "20000";
const MAX_REDEMPTIONS = "25";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = {};
  for (const name of [".env.functions", ".env"]) {
    const envPath = path.join(root, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      if (env[key]) continue;
      env[key] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
  return env;
}

async function stripeGet(key, pathSuffix) {
  const res = await fetch(`https://api.stripe.com/v1${pathSuffix}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

async function stripePost(key, pathSuffix, body) {
  const res = await fetch(`https://api.stripe.com/v1${pathSuffix}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

async function ensureAnnualPromo(key, mode) {
  const existing = await stripeGet(
    key,
    `/promotion_codes?code=${encodeURIComponent(PROMO_CODE)}&limit=10`,
  );
  const active = existing?.data?.find((row) => row.code === PROMO_CODE && row.active);
  if (active) {
    const couponId = typeof active.coupon === "string" ? active.coupon : active.coupon?.id;
    const coupon = couponId ? await stripeGet(key, `/coupons/${couponId}`) : null;
    return {
      mode,
      status: "exists",
      code: PROMO_CODE,
      promotionCodeId: active.id,
      couponId,
      amountOff: coupon?.amount_off,
      timesRedeemed: active.times_redeemed,
      maxRedemptions: active.max_redemptions,
    };
  }

  const coupon = await stripePost(key, "/coupons", {
    duration: "once",
    amount_off: AMOUNT_OFF_PENCE,
    currency: "gbp",
    name: "Premium annual £50 off",
    "metadata[plan]": "premium_annual",
    "metadata[code]": PROMO_CODE,
  });

  const promotionCode = await stripePost(key, "/promotion_codes", {
    coupon: coupon.id,
    code: PROMO_CODE,
    max_redemptions: MAX_REDEMPTIONS,
    "restrictions[minimum_amount]": MIN_AMOUNT_PENCE,
    "restrictions[minimum_amount_currency]": "gbp",
    "metadata[plan]": "premium_annual",
  });

  return {
    mode,
    status: "created",
    code: PROMO_CODE,
    promotionCodeId: promotionCode.id,
    couponId: coupon.id,
    amountOff: Number(AMOUNT_OFF_PENCE),
    maxRedemptions: Number(MAX_REDEMPTIONS),
  };
}

const env = loadEnv();
const liveKey = env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY;
const testKey = env.STRIPE_SECRET_KEY_TEST;

const results = {};
if (liveKey?.startsWith("sk_live")) results.LIVE = await ensureAnnualPromo(liveKey, "LIVE");
if (testKey?.startsWith("sk_test")) results.TEST = await ensureAnnualPromo(testKey, "TEST");

console.log(JSON.stringify(results, null, 2));
