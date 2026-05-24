#!/usr/bin/env bash
# Push Ultra Stripe price IDs from .env to Supabase edge-function secrets (remote).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

vars=(
  STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_LIVE
  STRIPE_PRICE_11PLUS_ULTRA_ANNUAL_LIVE
  STRIPE_PRICE_ELEVEN_PLUS_ULTRA_ANNUAL_LIVE
  STRIPE_PRICE_11PLUS_ULTRA_MONTHLY_TEST
  STRIPE_PRICE_11PLUS_ULTRA_ANNUAL_TEST
  STRIPE_PRICE_ELEVEN_PLUS_ULTRA_ANNUAL_TEST
)

for name in "${vars[@]}"; do
  val="${!name:-}"
  if [[ -z "$val" ]]; then
    echo "Skip $name (empty)" >&2
    continue
  fi
  echo "Setting $name"
  supabase secrets set "${name}=${val}"
done

echo "Done. Redeploy create-checkout-11plus / stripe-webhook-11plus if needed."
