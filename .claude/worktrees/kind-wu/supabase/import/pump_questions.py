#!/usr/bin/env python3
"""One command to generate lots of questions and (optionally) push to Supabase.

Examples:
  python3 supabase/import/pump_questions.py --tier foundation --count 2000
  python3 supabase/import/pump_questions.py --tier higher --count 2000 --push
    python3 supabase/import/pump_questions.py --tier higher --count 2000 --push --images all

If --push is used, you must set:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from generate_bulk_questions import generate_questions, TOPICS


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate and optionally upload+insert questions")
    p.add_argument("--count", type=int, default=2000)
    p.add_argument("--tier", choices=["foundation", "higher"], required=True)
    p.add_argument("--topics", default="all", help="Comma-separated topics, or 'all'")
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--out-dir", default=str(Path("supabase") / "data" / "generated"))
    p.add_argument("--bucket", default="questions")
    p.add_argument("--push", action="store_true", help="Upload images + insert rows into Supabase")
    p.add_argument("--skip-images", action="store_true", help="When pushing, skip image uploads")
    p.add_argument(
        "--images",
        choices=["none", "auto", "all"],
        default="auto",
        help="Image mode: none (no images), auto (only diagram-needed), all",
    )
    p.add_argument(
        "--batch-id",
        default=None,
        help="Optional batch id (use with --append to combine multiple runs into one CSV)",
    )
    p.add_argument(
        "--append",
        action="store_true",
        help="Append to existing batch CSV (use with --batch-id)",
    )
    p.add_argument("--chunk-size", type=int, default=500)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    topics = TOPICS if args.topics.strip().lower() == "all" else [t.strip() for t in args.topics.split(",") if t.strip()]
    unknown = [t for t in topics if t not in TOPICS]
    if unknown:
        raise SystemExit(f"Unknown topics: {unknown}. Allowed: {TOPICS}")

    csv_path, images_dir, batch_id = generate_questions(
        count=args.count,
        tier=args.tier,
        topics=topics,
        seed=args.seed,
        images=args.images,
        batch_id=args.batch_id,
        append=args.append,
        out_dir=Path(args.out_dir),
    )

    print("\nBatch generated:")
    print("  batch_id:", batch_id)
    print("  csv:", csv_path)
    print("  images_dir:", images_dir)

    if not args.push:
        print("\nNot pushing (use --push to upload+insert)")
        return

    # Lazy import so generation-only users need nothing else.
    from upload_and_insert import upload_images, insert_rows, read_csv_rows

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    rows = read_csv_rows(Path(csv_path))
    has_images = any((r.get("image_url") or "").strip() for r in rows)
    if has_images and not args.skip_images:
        upload_images(
            supabase_url=supabase_url,
            service_key=service_key,
            bucket=args.bucket,
            rows=rows,
            images_dir=Path(images_dir),
            upsert=True,
        )
    else:
        print("Skipping image uploads")

    insert_rows(
        supabase_url=supabase_url,
        service_key=service_key,
        rows=rows,
        upsert=True,
        chunk_size=args.chunk_size,
    )

    print("\nPush complete.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        sys.exit(130)
