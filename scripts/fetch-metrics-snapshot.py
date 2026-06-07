#!/usr/bin/env python3
"""Fetch live Gradlify metrics from production APIs → progress/metrics-snapshot.js"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "progress" / "metrics-snapshot.js"

SUPABASE_URL = "https://gknnfbalijxykqycopic.supabase.co"
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MzgxMzEsImV4cCI6MjA3MjIxNDEzMX0."
    "nbJ6GgZmJ5ZPiTkYa_Y5C2G6Sep9IF8juXv4uU_CMDU"
)
MOCK_SLUG = "both_subjects_live_mock"

# Gradlify Premium subscription pricing (not mock tickets)
PREMIUM_MONTHLY_GBP = 19.99
PREMIUM_ANNUAL_LEGACY_GBP = 250.0  # older annual checkout
PREMIUM_ANNUAL_CURRENT_GBP = 199.99  # stripe-price yearly today (£200 list)


def post_json(path: str, body: dict) -> dict:
    url = f"{SUPABASE_URL}/functions/v1/{path}"
    payload = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ANON_KEY}",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def get_json(path: str, params: dict | None = None) -> list | dict:
    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    url = f"{SUPABASE_URL}{path}{query}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {ANON_KEY}",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def fetch_profile_subscriptions() -> list[dict]:
    params = {
        "select": (
            "id,user_id,plan,premium_track,track,stripe_subscription_status,"
            "cancel_at_period_end,stripe_subscription_id_live,subscription_interval"
        ),
        "track": "eq.11plus",
        "stripe_subscription_id_live": "not.is.null",
        "stripe_subscription_status": "in.(active,trialing)",
        "order": "stripe_subscription_status.asc",
    }
    rows = get_json("/rest/v1/profiles", params)
    return rows if isinstance(rows, list) else []


def subscription_kind(profile: dict) -> str:
    """premium_monthly | premium_annual — uses Stripe-synced interval, not guessed tiers."""
    interval = (profile.get("subscription_interval") or "").lower()
    if interval == "annual" or profile.get("plan") == "premium_annual":
        return "premium_annual"
    return "premium_monthly"


def annual_cash_gbp(profile: dict, email: str) -> float:
    """Best-effort annual ticket price. Legacy £250 annual; new list ~£200."""
    # vivek.botcha is the known £250/yr annual subscriber in production
    if email == "vivek.botcha@gmail.com":
        return PREMIUM_ANNUAL_LEGACY_GBP
    return PREMIUM_ANNUAL_CURRENT_GBP


def mrr_for_active_profile(profile: dict, email: str) -> tuple[float, float | None]:
    """Return (mrr_monthly_equivalent, annual_cash_if_annual). Trialing → 0."""
    if profile.get("stripe_subscription_status") != "active":
        return 0.0, None
    if subscription_kind(profile) == "premium_annual":
        cash = annual_cash_gbp(profile, email)
        return round(cash / 12, 2), cash
    return PREMIUM_MONTHLY_GBP, None


def email_by_subscription(paying_users: list[dict]) -> dict[str, str]:
    return {
        u["subscription_id"]: u.get("email", "?")
        for u in paying_users
        if u.get("subscription_id")
    }


def main() -> int:
    fetched_at = datetime.now(timezone.utc).isoformat()

    mock = post_json("live-mock-signup-count", {"mockSlug": MOCK_SLUG})
    analytics = post_json("admin-analytics", {"days": 14})

    if not analytics.get("ok"):
        raise SystemExit(f"admin-analytics failed: {analytics}")

    data = analytics["data"]
    kpis = data.get("kpis", {})
    totals = data.get("totals", {})
    paying_users = data.get("payingUsers", [])
    live_mock_api = kpis.get("liveMock") or {}

    profile_rows = fetch_profile_subscriptions()
    sub_emails = email_by_subscription(paying_users)

    active_profiles = [
        p for p in profile_rows if p.get("stripe_subscription_status") == "active"
    ]
    trialing_profiles = [
        p for p in profile_rows if p.get("stripe_subscription_status") == "trialing"
    ]

    active_details = []
    subscription_mrr = 0.0
    monthly_paying = 0
    annual_paying = 0

    for p in active_profiles:
        sub_id = p.get("stripe_subscription_id_live")
        email = sub_emails.get(sub_id, "?")
        kind = subscription_kind(p)
        mrr, annual_cash = mrr_for_active_profile(p, email)
        subscription_mrr += mrr
        if kind == "premium_annual":
            annual_paying += 1
        else:
            monthly_paying += 1
        active_details.append(
            {
                "email": email,
                "plan": p.get("plan"),
                "kind": kind,
                "subscription_interval": p.get("subscription_interval"),
                "premium_track": p.get("premium_track"),
                "mrr_gbp": mrr,
                "annual_cash_gbp": annual_cash,
            }
        )

    trialing_details = []
    for p in trialing_profiles:
        sub_id = p.get("stripe_subscription_id_live")
        trialing_details.append(
            {
                "email": sub_emails.get(sub_id, "?"),
                "cancel_at_period_end": p.get("cancel_at_period_end"),
            }
        )

    legacy_other = sum(
        1 for p in active_profiles if p.get("premium_track") == "gcse"
    )

    snapshot = {
        "fetchedAt": fetched_at,
        "source": "profiles REST + live-mock-signup-count + admin-analytics",
        "warning": "Do not use stale docs — re-run this script before marketing decisions",
        "pricingNote": (
            "Premium £19.99/mo or annual (~£200–250/yr, annualized for MRR). "
            "Mock tickets are one-off (£9.99–£19.99 promos) — never added to MRR."
        ),
        "subscriptions": {
            "activePaying": len(active_profiles),
            "trialing": len(trialing_profiles),
            "premiumFunnel": len(active_profiles) + len(trialing_profiles),
            "monthlyPaying": monthly_paying,
            "annualPaying": annual_paying,
            "legacyOtherPaying": legacy_other,
            "mrrGbp": round(subscription_mrr, 2),
        },
        "liveMock": {
            "slug": MOCK_SLUG,
            "enrolledReal": live_mock_api.get("enrolledReal")
            or mock.get("count")
            or totals.get("liveMockEnrolled"),
            "enrolledDisplayed": live_mock_api.get("enrolledDisplayed")
            or mock.get("displayedCount"),
            "revenueGbp": live_mock_api.get("revenueGbp"),
            "revenueNote": "One-off ticket sales (various promo prices) — not subscription MRR",
            "paidCheckoutSessions": live_mock_api.get("paidCheckoutSessions"),
            "currentPriceGbp": mock.get("currentPriceGbp") or mock.get("standardPriceGbp"),
            "promoCode": mock.get("promoCode", "LEVELFIELD"),
            "promoSpotsRemaining": mock.get("promoSpotsRemaining"),
        },
        "profiles": {
            "totalSignups11plus": totals.get("totalSignups"),
            "signupsLast7d": kpis.get("signups", {}).get("last7d"),
        },
        "activePaying": active_details,
        "trialing": trialing_details,
        "activePayingEmails": [d["email"] for d in active_details],
        "trialingEmails": [d["email"] for d in trialing_details],
    }

    OUT_PATH.write_text(
        "/** Auto-generated by scripts/fetch-metrics-snapshot.py — do not edit */\n"
        f"window.GRADLIFY_METRICS = {json.dumps(snapshot, indent=2)};\n"
    )
    print(json.dumps(snapshot, indent=2))
    print(f"\nWrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
