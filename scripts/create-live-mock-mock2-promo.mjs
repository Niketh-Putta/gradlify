#!/usr/bin/env node
/**
 * Creates Stripe MOCK2 promotion code for live mock 2 (£5 off, 7 uses).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
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

async function ensureMock2Promo(key, mode) {
  const existing = await stripeGet(key, "/promotion_codes?code=MOCK2&limit=5");
  const active = existing?.data?.find((row) => row.code === "MOCK2" && row.active);
  if (active) {
    return { mode, status: "exists", promotionCodeId: active.id, timesRedeemed: active.times_redeemed };
  }

  const coupon = await stripePost(key, "/coupons", {
    duration: "once",
    amount_off: "500",
    currency: "gbp",
    name: "MOCK2 £5 off live mock 2",
    max_redemptions: "7",
    "metadata[code]": "MOCK2",
    "metadata[mock_slug]": "both_subjects_live_mock_2",
  });

  const promotionCode = await stripePost(key, "/promotion_codes", {
    coupon: coupon.id,
    code: "MOCK2",
    max_redemptions: "7",
    "metadata[mock_slug]": "both_subjects_live_mock_2",
    "metadata[remaining_target]": "7",
  });

  return { mode, status: "created", promotionCodeId: promotionCode.id, couponId: coupon.id };
}

const env = loadEnv();
const liveKey = env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY;
const testKey = env.STRIPE_SECRET_KEY_TEST;

const results = {};
if (liveKey) results.LIVE = await ensureMock2Promo(liveKey, "LIVE");
if (testKey) results.TEST = await ensureMock2Promo(testKey, "TEST");

console.log(JSON.stringify(results, null, 2));
