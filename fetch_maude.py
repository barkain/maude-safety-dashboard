#!/usr/bin/env python3
"""
fetch_maude.py — Download new MAUDE event data from openFDA for a given month.

Usage:
    python3 fetch_maude.py 2026 03          # fetch March 2026
    python3 fetch_maude.py --since 2026-01  # fetch all months from Jan 2026 to today

Saves pages to:
    /workspace/extra/maude/data/raw/events/YYYY/MM/page_XXXX.json
Skips months that already have data unless --force is passed.
"""

import argparse
import json
import os
import sys
import time
from datetime import date, datetime
from pathlib import Path

import urllib.request
import urllib.error

RAW_DATA_DIR = Path("/workspace/extra/maude/data/raw/events")
FDA_BASE     = "https://api.fda.gov/device/event.json"
PAGE_SIZE    = 500     # openFDA max per request
MAX_RECORDS  = 25000   # openFDA hard cap per search (50 pages × 500)
SLEEP_S      = 0.5     # be polite to FDA servers


def fetch_page(date_from: str, date_to: str, skip: int) -> dict:
    url = (
        f"{FDA_BASE}?search=date_received:[{date_from}+TO+{date_to}]"
        f"&limit={PAGE_SIZE}&skip={skip}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "MAUDE-Dashboard/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"meta": {"results": {"total": 0}}, "results": []}
        raise


def month_dir(year: int, month: int) -> Path:
    return RAW_DATA_DIR / str(year) / f"{month:02d}"


def fetch_month(year: int, month: int, force: bool = False) -> int:
    out_dir = month_dir(year, month)

    # Skip if data already exists and not forcing
    if out_dir.exists() and any(out_dir.glob("page_*.json")) and not force:
        existing = len(list(out_dir.glob("page_*.json")))
        print(f"  [{year}-{month:02d}] Already have {existing} pages — skipping (use --force to re-fetch)")
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)

    # Date range for the month
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1).replace(day=1)
        import calendar
        last_day = date(year, month, calendar.monthrange(year, month)[1])
    else:
        import calendar
        last_day = date(year, month, calendar.monthrange(year, month)[1])

    date_from = first_day.strftime("%Y%m%d")
    date_to   = last_day.strftime("%Y%m%d")

    print(f"  [{year}-{month:02d}] Fetching {date_from}→{date_to} ...", flush=True)

    # First request to get total
    first = fetch_page(date_from, date_to, skip=0)
    total = first["meta"]["results"]["total"]
    print(f"  [{year}-{month:02d}] Total records: {total:,}", flush=True)

    pages_written = 0

    # Save page 0
    out_path = out_dir / "page_0000.json"
    out_path.write_text(json.dumps(first, separators=(",", ":")))
    pages_written += 1

    # Fetch remaining pages (capped at openFDA's 25k limit)
    fetched = len(first.get("results", []))
    page_num = 1
    while fetched < min(total, MAX_RECORDS):
        time.sleep(SLEEP_S)
        data = fetch_page(date_from, date_to, skip=fetched)
        results = data.get("results", [])
        if not results:
            break

        out_path = out_dir / f"page_{page_num:04d}.json"
        out_path.write_text(json.dumps(data, separators=(",", ":")))
        pages_written += 1
        page_num += 1
        fetched += len(results)
        print(f"  [{year}-{month:02d}] {fetched:,}/{min(total, MAX_RECORDS):,} records saved", end="\r", flush=True)

    print(f"\n  [{year}-{month:02d}] Done — {pages_written} pages, {fetched:,} records")
    return pages_written


def months_since(since_str: str):
    """Yield (year, month) tuples from since_str ('YYYY-MM') up to current month."""
    start = datetime.strptime(since_str, "%Y-%m")
    now   = date.today()
    y, m  = start.year, start.month
    while (y, m) <= (now.year, now.month):
        yield y, m
        m += 1
        if m > 12:
            m, y = 1, y + 1


def main():
    p = argparse.ArgumentParser(description="Fetch MAUDE event data from openFDA")
    p.add_argument("year",  type=int, nargs="?", help="Year (e.g. 2026)")
    p.add_argument("month", type=int, nargs="?", help="Month (e.g. 3)")
    p.add_argument("--since", metavar="YYYY-MM", help="Fetch all months from this date to today")
    p.add_argument("--force", action="store_true", help="Re-fetch even if data already exists")
    args = p.parse_args()

    if args.since:
        pairs = list(months_since(args.since))
    elif args.year and args.month:
        pairs = [(args.year, args.month)]
    else:
        # Default: fetch current month
        today = date.today()
        pairs = [(today.year, today.month)]

    total_pages = 0
    for year, month in pairs:
        total_pages += fetch_month(year, month, force=args.force)

    print(f"\nDone. {total_pages} pages written total.")


if __name__ == "__main__":
    main()
