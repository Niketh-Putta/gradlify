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

MONTHLY_PREMIUM_GBP = 19.99
ULTRA_MONTHLY_GBP = 249.99


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
        "select": "id,user_id,plan,premium_track,track,stripe_subscription_status,cancel_at_period_end,stripe_subscription_id_live",
        "track": "eq.11plus",
        "stripe_subscription_id_live": "not.is.null",
        "stripe_subscription_status": "in.(active,trialing)",
        "order": "stripe_subscription_status.asc",
    }
    rows = get_json("/rest/v1/profiles", params)
    return rows if isinstance(rows, list) else []


def classify_billing_tier(profile: dict) -> str:
    plan = profile.get("plan") or ""
    premium_track = profile.get("premium_track") or ""
    if plan == "premium_monthly":
        return "monthly_20"
    if plan == "ultra":
        return "ultra_250"
    # vineela pattern: premium + eleven_plus = ultra £250
    if plan == "premium" and premium_track == "eleven_plus":
        return "ultra_250"
    # gcse-price / legacy checkout still counts as £20/mo for 11+
    return "monthly_20"


def monthly_mrr_for_profile(profile: dict) -> float:
    tier = classify_billing_tier(profile)
    if tier == "ultra_250":
        return ULTRA_MONTHLY_GBP
    return MONTHLY_PREMIUM_GBP


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
    subs_api = kpis.get("subscriptions") or {}
    live_mock_api = kpis.get("liveMock") or {}

    # Ground truth from profiles (admin-analytics deploy may lag)
    profile_rows = fetch_profile_subscriptions()
    sub_emails = email_by_subscription(paying_users)

    active_profiles = [
        p for p in profile_rows if p.get("stripe_subscription_status") == "active"
    ]
    trialing_profiles = [
        p for p in profile_rows if p.get("stripe_subscription_status") == "trialing"
    ]

    monthly_paying = sum(
        1 for p in active_profiles if classify_billing_tier(p) == "monthly_20"
    )
    ultra_paying = sum(
        1 for p in active_profiles if classify_billing_tier(p) == "ultra_250"
    )
    legacy_other = sum(
        1
        for p in active_profiles
        if p.get("premium_track") == "gcse" and classify_billing_tier(p) == "monthly_20"
    )

    active_paying = len(active_profiles)
    trialing_count = len(trialing_profiles)
    mrr_gbp = round(
        sum(monthly_mrr_for_profile(p) for p in active_profiles),
        2,
    )

    active_details = []
    for p in active_profiles:
        sub_id = p.get("stripe_subscription_id_live")
        active_details.append(
            {
                "email": sub_emails.get(sub_id, "?"),
                "plan": p.get("plan"),
                "premium_track": p.get("premium_track"),
                "billing_tier": classify_billing_tier(p),
                "monthly_gbp": monthly_mrr_for_profile(p),
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

    snapshot = {
        "fetchedAt": fetched_at,
        "source": "profiles REST + live-mock-signup-count + admin-analytics",
        "warning": "Do not use stale docs — re-run this script before marketing decisions",
        "subscriptions": {
            "activePaying": active_paying,
            "trialing": trialing_count,
            "premiumFunnel": active_paying + trialing_count,
            "monthlyPaying": monthly_paying,
            "ultraPaying": ultra_paying,
            "legacyOtherPaying": legacy_other,
            "mrrGbp": mrr_gbp,
        },
        "liveMock": {
            "slug": MOCK_SLUG,
            "enrolledReal": live_mock_api.get("enrolledReal")
            or mock.get("count")
            or totals.get("liveMockEnrolled"),
            "enrolledDisplayed": live_mock_api.get("enrolledDisplayed")
            or mock.get("displayedCount"),
            "revenueGbp": live_mock_api.get("revenueGbp"),
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
