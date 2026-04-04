#!/usr/bin/env python3
"""
verify-verse.py — Confirm that an Arabic word/root actually appears in a verse.

Catches hallucinations like "2:255 contains الكبير" when it actually has العظيم.

Usage:
    python3 tools/verify-verse.py 2:255 الكبير
    python3 tools/verify-verse.py 29:45 أكبر
    python3 tools/verify-verse.py --lesson lessons/lesson-01-allahu-akbar.md
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ARABIC_DIACRITICS = re.compile(
    r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]'
)
ARABIC_RANGE = re.compile(r'[\u0600-\u06FF]+')

def strip_diacritics(text):
    return ARABIC_DIACRITICS.sub('', text)

def fetch_verse(surah, ayah):
    url = f"https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/ar"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return data["data"]["text"]
    except Exception as e:
        print(f"  Error fetching {surah}:{ayah}: {e}", file=sys.stderr)
        return None

def verify(surah, ayah, search_term, strip=True):
    verse_text = fetch_verse(surah, ayah)
    if verse_text is None:
        return False
    haystack = strip_diacritics(verse_text) if strip else verse_text
    needle   = strip_diacritics(search_term) if strip else search_term
    found = needle in haystack
    ref = f"{surah}:{ayah}"
    if found:
        highlighted = haystack.replace(needle, f"[{needle}]")
        print(f"  OK  {ref} — '{search_term}' found")
        print(f"      {highlighted}")
    else:
        print(f"  FAIL {ref} — '{search_term}' NOT found")
        print(f"       Actual: {verse_text}")
    return found

AUDIO_PATTERN = re.compile(
    r'<audio[^>]+src="https://everyayah\.com/data/[^/]+/(\d{3})(\d{3})\.mp3'
)
BOLD_ARABIC = re.compile(r'\*\*([^\*\u0000-\u007F][^\*]*)\*\*')

def check_lesson(md_path, strip=True):
    content = md_path.read_text(encoding="utf-8")
    lines = content.split('\n')
    print(f"\nChecking: {md_path.name}")
    print("=" * 60)
    errors = 0
    checked = 0
    current_num = None
    bold_words = []
    audio_refs = []

    for lineno, line in enumerate(lines, 1):
        h3 = re.match(r'^### (\d+)\s*·', line)
        if h3:
            if current_num and bold_words and audio_refs:
                for s, a in audio_refs:
                    for w in bold_words:
                        checked += 1
                        print(f"\n[{current_num}] '{w}' in {s}:{a}")
                        if not verify(s, a, w, strip):
                            errors += 1
            current_num = int(h3.group(1))
            bold_words = []
            audio_refs = []
            continue

        if re.match(r'^## ', line) and current_num:
            if bold_words and audio_refs:
                for s, a in audio_refs:
                    for w in bold_words:
                        checked += 1
                        print(f"\n[{current_num}] '{w}' in {s}:{a}")
                        if not verify(s, a, w, strip):
                            errors += 1
            current_num = None
            bold_words = []
            audio_refs = []
            continue

        if current_num is None:
            continue

        for m in BOLD_ARABIC.finditer(line):
            w = m.group(1).strip()
            if ARABIC_RANGE.search(w):
                bold_words.append(w)

        for m in AUDIO_PATTERN.finditer(line):
            audio_refs.append((int(m.group(1)), int(m.group(2))))

    # flush last
    if current_num and bold_words and audio_refs:
        for s, a in audio_refs:
            for w in bold_words:
                checked += 1
                print(f"\n[{current_num}] '{w}' in {s}:{a}")
                if not verify(s, a, w, strip):
                    errors += 1

    print(f"\n{'=' * 60}")
    if errors:
        print(f"FAIL: {errors}/{checked} issue(s) found.")
        sys.exit(1)
    else:
        print(f"OK: all {checked} verified.")

def main():
    parser = argparse.ArgumentParser(
        description="Verify Arabic word appears in a Quranic verse.",
        epilog=(
            "Examples:\n"
            "  %(prog)s 2:255 الكبير\n"
            "  %(prog)s --lesson lessons/lesson-01-allahu-akbar.md\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("ref",  nargs="?", help="Verse ref (e.g. 2:255)")
    parser.add_argument("word", nargs="?", help="Arabic word to find")
    parser.add_argument("--lesson", metavar="FILE", help="Check all bolded words in lesson")
    parser.add_argument("--exact", action="store_true", help="Require exact diacritic match")
    args = parser.parse_args()
    strip = not args.exact

    if args.lesson:
        p = Path(args.lesson)
        if not p.exists():
            print(f"File not found: {p}", file=sys.stderr); sys.exit(1)
        check_lesson(p, strip)
    elif args.ref and args.word:
        m = re.match(r'^(\d+):(\d+)$', args.ref)
        if not m:
            print(f"Bad ref: {args.ref}", file=sys.stderr); sys.exit(1)
        ok = verify(int(m.group(1)), int(m.group(2)), args.word, strip)
        sys.exit(0 if ok else 1)
    else:
        parser.print_help(); sys.exit(1)

if __name__ == "__main__":
    main()
