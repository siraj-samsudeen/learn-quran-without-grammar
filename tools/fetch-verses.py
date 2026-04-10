#!/usr/bin/env python3
"""Batch-fetch Quran verses from alquran.cloud API.

Usage:
    python3 tools/fetch-verses.py 2:255 3:18 4:79 ...
"""
import sys
import json
import urllib.request


def fetch(ref: str) -> str:
    url = f"https://api.alquran.cloud/v1/ayah/{ref}"
    with urllib.request.urlopen(url, timeout=15) as r:
        data = json.load(r)
    return data["data"]["text"]


def main():
    refs = sys.argv[1:]
    if not refs:
        print("Usage: fetch-verses.py REF [REF ...]", file=sys.stderr)
        sys.exit(2)
    for ref in refs:
        try:
            text = fetch(ref)
            print(f"{ref}\t{text}")
        except Exception as e:
            print(f"{ref}\tERROR: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
