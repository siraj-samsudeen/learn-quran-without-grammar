#!/usr/bin/env python3
"""Validate InstantDB seed parity with quran.db.

Calls InstantDB's admin REST query API (no SDK to avoid pulling Node into
the Python tooling). Asserts row counts and a sample byte-match.

Usage:
  tools/.venv/bin/python tools/validate-instantdb.py
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
QURAN_DB = REPO_ROOT / "tools" / "data" / "quran.db"

APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233"
ADMIN_TOKEN = os.environ.get("INSTANT_APP_ADMIN_TOKEN")
if not ADMIN_TOKEN:
    print("Set INSTANT_APP_ADMIN_TOKEN before running admin scripts.", file=sys.stderr)
    sys.exit(1)

QUERY_URL = f"https://api.instantdb.com/admin/query"


def query(q: dict) -> dict:
    """POST a query to InstantDB admin API and return data."""
    req = urllib.request.Request(
        QUERY_URL,
        method="POST",
        data=json.dumps({"query": q}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_TOKEN}",
            "App-Id": APP_ID,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def count(entity: str) -> int:
    return len(query({entity: {}}).get(entity, []))


def main() -> int:
    if not QURAN_DB.exists():
        print(f"ERROR: {QURAN_DB} missing — run build-quran-db.py", file=sys.stderr)
        return 2

    sqlite_conn = sqlite3.connect(QURAN_DB)
    sqlite_conn.row_factory = sqlite3.Row

    checks = []

    def check(name: str, ok: bool, detail: str) -> None:
        checks.append((name, ok, detail))
        print(f"[{'PASS' if ok else 'FAIL'}]  {name:<32}  {detail}")

    # Counts
    n_verses = count("verses")
    check("verses_count", n_verses == 6236, f"InstantDB verses={n_verses} (expected 6236)")
    n_sentences = count("sentences")
    check("sentences_count", n_sentences == 10493, f"InstantDB sentences={n_sentences} (expected 10493)")
    n_translations = count("translations")
    check("translations_count", n_translations == 6236, f"InstantDB translations={n_translations} (expected 6236)")
    n_roots = count("roots")
    check("roots_count", n_roots == 10, f"InstantDB roots={n_roots} (expected 10)")
    n_members = count("courseMembers")
    check("siraj_owner", n_members == 1, f"InstantDB courseMembers={n_members} (expected 1: Siraj as owner)")
    n_seeds = count("seedPhrases")
    check("seedPhrases_count", n_seeds == 7, f"InstantDB seedPhrases={n_seeds} (expected 7 Adhān phrases)")

    # Byte-match sample: pick verse 1:1 (al-Fatiha first), compare with quran.db.
    cur = sqlite_conn.execute("SELECT arabic FROM verses WHERE ref='1:1'")
    sqlite_arabic = cur.fetchone()["arabic"]
    db_verse = query({"verses": {"$": {"where": {"ref": "1:1"}}}}).get("verses", [])
    if db_verse:
        ok = db_verse[0]["arabic"] == sqlite_arabic
        check("verse_1_1_byte_match", ok, "verse 1:1 Arabic matches quran.db" if ok else "MISMATCH")
    else:
        check("verse_1_1_byte_match", False, "verse 1:1 not found in InstantDB")

    failed = [c for c in checks if not c[1]]
    print()
    if failed:
        print(f"FAIL ({len(failed)}/{len(checks)} failed)")
        return 1
    print(f"ALL PASS ({len(checks)} checks)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
