#!/usr/bin/env python3
"""
check-text-audio-sync.py — Detect text/audio fragment mismatches in lesson markdown.

The core problem this catches: when Arabic text is cut (trimmed to a shorter
phrase), the <audio #t=> fragment is not automatically updated. This tool
compares the word count of the displayed Arabic text against the duration of
the audio fragment and flags suspicious mismatches.

It also catches:
  - Fragment end/start times that exceed the actual ayah duration
  - Multiple <audio> tags on one line (like the An-Nās 3-player issue)
  - Missing fragments on partial-verse displays

Usage:
    python tools/check-text-audio-sync.py lessons/lesson-01-allahu-akbar.md
    python tools/check-text-audio-sync.py lessons/lesson-01-allahu-akbar.md --download
    python tools/check-text-audio-sync.py lessons/lesson-01-allahu-akbar.md --verbose
"""

import argparse
import re
import subprocess
import sys
import urllib.request
from pathlib import Path


# ── Constants ───────────────────────────────────────────────────────────────

CACHE_DIR = Path(".cache/fragment-analysis/Husary_128kbps")

# Rough Arabic recitation rate (words per second).
# Husary murattal is ~2.5–3.5 wps. We use a wide tolerance band.
WPS_LOW  = 1.5   # slower than normal = text is probably too long for the fragment
WPS_HIGH = 5.0   # faster than normal = fragment is probably too long for the text

# Minimum fragment duration below which we skip the rate check (too short to be meaningful)
MIN_FRAG_SECONDS = 2.0


# ── Helpers ─────────────────────────────────────────────────────────────────

ARABIC_RANGE = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+')

def count_arabic_words(text: str) -> int:
    """Count whitespace-separated Arabic word tokens (ignores tatweel markers · etc.)."""
    # Strip the · separators used in multi-ayah displays
    text = text.replace('·', ' ')
    return len([t for t in text.split() if ARABIC_RANGE.search(t)])


def download_ayah(surah: int, ayah: int) -> Path | None:
    """Download an ayah from everyayah.com (Husary) to cache. Return local path or None."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{surah:03d}{ayah:03d}.mp3"
    local = CACHE_DIR / filename
    if local.exists() and local.stat().st_size > 0:
        return local
    url = f"https://everyayah.com/data/Husary_128kbps/{filename}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            local.write_bytes(resp.read())
        return local
    except Exception as e:
        print(f"    ⚠  Download failed for {surah}:{ayah}: {e}", file=sys.stderr)
        return None


def get_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


# ── Parsing ─────────────────────────────────────────────────────────────────

# Matches a verse block (h3 + content until next h3/h2/hr)
H3_PATTERN = re.compile(r'^### (\d+)\s*·\s*(.+)$')

# Matches an everyayah <audio> tag with optional #t= fragment
AUDIO_PATTERN = re.compile(
    r'<audio[^>]+src="https://everyayah\.com/data/([^/]+)/(\d{3})(\d{3})\.mp3'
    r'(?:#t=([^"]*))?"'
)

ARABIC_DIACRITICS = re.compile(
    r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]'
)

def parse_verses(md_text: str) -> list[dict]:
    """
    Parse the lesson markdown into verse blocks.

    Each block:
      num         - verse number (int)
      arabic_text - the raw Arabic paragraph text
      word_count  - number of Arabic words in that text
      audios      - list of {surah, ayah, reciter, start, end, raw_frag}
      line_num    - line number of the h3 heading
    """
    verses = []
    lines = md_text.split('\n')

    current = None
    in_verse = False
    arabic_captured = False

    for lineno, line in enumerate(lines, 1):
        # H3 heading → start new verse block
        m = H3_PATTERN.match(line)
        if m:
            if current:
                verses.append(current)
            current = {
                "num": int(m.group(1)),
                "form": m.group(2).strip(),
                "arabic_text": "",
                "word_count": 0,
                "audios": [],
                "line_num": lineno,
            }
            arabic_captured = False
            in_verse = True
            continue

        # Section boundary
        if re.match(r'^#{1,2} ', line) and not re.match(r'^### ', line):
            if current:
                verses.append(current)
                current = None
            in_verse = False
            continue

        if not in_verse or current is None:
            continue

        # Capture the first non-empty paragraph as Arabic text
        stripped = line.strip()
        if not arabic_captured and stripped and not stripped.startswith('<'):
            # Check it's actually Arabic (contains Arabic Unicode)
            if ARABIC_RANGE.search(stripped):
                # Remove markdown bold markers for word counting
                text_clean = re.sub(r'\*\*([^*]+)\*\*', r'\1', stripped)
                current["arabic_text"] = text_clean
                current["word_count"] = count_arabic_words(text_clean)
                arabic_captured = True

        # Collect audio tags
        for am in AUDIO_PATTERN.finditer(line):
            reciter = am.group(1)
            surah   = int(am.group(2))
            ayah    = int(am.group(3))
            raw_frag = am.group(4) or ""

            start = end = None
            if raw_frag:
                parts = raw_frag.split(',')
                try:
                    start = float(parts[0]) if parts[0] else None
                except ValueError:
                    pass
                if len(parts) > 1:
                    try:
                        end = float(parts[1]) if parts[1] else None
                    except ValueError:
                        pass

            current["audios"].append({
                "surah": surah,
                "ayah": ayah,
                "reciter": reciter,
                "start": start,
                "end": end,
                "raw_frag": raw_frag,
                "line_num": lineno,
            })

    if current:
        verses.append(current)

    return verses


# ── Checks ───────────────────────────────────────────────────────────────────

def check_verse(verse: dict, download: bool, verbose: bool) -> list[str]:
    """Run all checks for one verse. Returns list of issue strings (empty = clean)."""
    issues = []
    num = verse["num"]
    word_count = verse["word_count"]

    # Check 1: Multiple audio tags on one line
    # Group audios by line number
    from collections import Counter
    line_counts = Counter(a["line_num"] for a in verse["audios"])
    for lineno, count in line_counts.items():
        if count > 1:
            issues.append(
                f"[{num}] Line {lineno}: {count} <audio> tags on one line "
                f"(should be 1 per card header)"
            )

    for audio in verse["audios"]:
        surah, ayah = audio["surah"], audio["ayah"]
        start = audio["start"]
        end   = audio["end"]
        frag  = audio["raw_frag"]

        # Check 2: Fragment bounds vs actual duration (requires download)
        if download:
            local = download_ayah(surah, ayah)
            if local:
                total_dur = get_duration(local)

                if start is not None and start > total_dur:
                    issues.append(
                        f"[{num}] {surah}:{ayah} — start={start}s exceeds "
                        f"ayah duration {total_dur:.1f}s"
                    )
                if end is not None and end > total_dur + 0.5:
                    issues.append(
                        f"[{num}] {surah}:{ayah} — end={end}s exceeds "
                        f"ayah duration {total_dur:.1f}s"
                    )

                # Check 3: Text/audio rate plausibility
                frag_start = start if start else 0.0
                frag_end   = end   if end   else total_dur
                frag_dur   = frag_end - frag_start

                if frag_dur >= MIN_FRAG_SECONDS and word_count > 0:
                    wps = word_count / frag_dur
                    if wps < WPS_LOW:
                        issues.append(
                            f"[{num}] {surah}:{ayah} — POSSIBLE MISMATCH: "
                            f"{word_count} words over {frag_dur:.1f}s = {wps:.1f} wps "
                            f"(too slow — fragment may be too long for the displayed text)"
                        )
                    elif wps > WPS_HIGH:
                        issues.append(
                            f"[{num}] {surah}:{ayah} — POSSIBLE MISMATCH: "
                            f"{word_count} words over {frag_dur:.1f}s = {wps:.1f} wps "
                            f"(too fast — text may be too long for the audio fragment)"
                        )
                    elif verbose:
                        print(f"  [{num}] {surah}:{ayah}  {word_count}w / {frag_dur:.1f}s = "
                              f"{wps:.1f} wps  #t={frag or 'full'}  ✓")

        # Check 4: No fragment on a verse that looks like a partial display
        # Heuristic: if word count is < 8 and no fragment, might be a cut verse
        if not frag and word_count < 8 and word_count > 0:
            issues.append(
                f"[{num}] {surah}:{ayah} — short text ({word_count} words) "
                f"but no #t= fragment (verify this is a full-ayah display)"
            )

    return issues


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Check that audio fragments match displayed Arabic text.",
        epilog=(
            "Examples:\n"
            "  %(prog)s lessons/lesson-01-allahu-akbar.md\n"
            "  %(prog)s lessons/lesson-01-allahu-akbar.md --download\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("lesson", help="Path to lesson markdown file")
    parser.add_argument(
        "--download", action="store_true",
        help="Download each ayah to verify fragment bounds and word rate (slower)",
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Print passing checks too, not just issues",
    )
    args = parser.parse_args()

    md_path = Path(args.lesson)
    if not md_path.exists():
        print(f"Error: file not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    # Check ffprobe if download mode
    if args.download:
        if subprocess.run(["which", "ffprobe"], capture_output=True).returncode != 0:
            print("Error: ffprobe not found. Install ffmpeg.", file=sys.stderr)
            sys.exit(1)

    md_text = md_path.read_text(encoding="utf-8")
    verses = parse_verses(md_text)

    print(f"\nChecking {len(verses)} verse(s) in {md_path.name}")
    if args.download:
        print("(download mode — checking fragment bounds and word rate)")
    print("=" * 60)

    all_issues = []
    for verse in verses:
        issues = check_verse(verse, args.download, args.verbose)
        all_issues.extend(issues)

    print()
    if all_issues:
        print(f"⚠  {len(all_issues)} issue(s) found:\n")
        for issue in all_issues:
            print(f"  • {issue}")
        print()
        sys.exit(1)
    else:
        if not args.verbose:
            print(f"✅ No issues found across {len(verses)} verses.")
            if not args.download:
                print("   (Run with --download to also verify fragment bounds and word rate)")
        print()


if __name__ == "__main__":
    main()
