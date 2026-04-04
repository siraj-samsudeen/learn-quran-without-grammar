#!/usr/bin/env python3
"""
auto-timestamps.py — Word-level timestamp extraction using the Quran Foundation API.

Instead of manually listening to audio and guessing silence boundaries, this tool
queries the Quran Foundation API for word-level timing data and calculates precise
#t= fragments for any word range within an ayah.

Usage:
    # Show all words with timestamps for a verse + reciter
    python tools/auto-timestamps.py 29:45 --reciter Abdul_Basit_Murattal_192kbps

    # Extract fragment for specific word range
    python tools/auto-timestamps.py 29:45 --reciter Abdul_Basit_Murattal_192kbps --words 15-17

    # Multiple verses at once
    python tools/auto-timestamps.py 59:22 6:74 3:26 --reciter Alafasy_128kbps

    # Write the calculated fragment directly to a lesson file
    python tools/auto-timestamps.py 29:45 --reciter Abdul_Basit_Murattal_192kbps --words 15-17 --write lessons/lesson-01-allahu-akbar.md

    # Try all supported reciters to compare timing options
    python tools/auto-timestamps.py 29:45 --words 15-17 --all-reciters

How it works:
    1. Calls api.quran.com to get chapter audio with word-level segments
    2. Extracts per-word timestamps: [word_index, start_ms, end_ms]
    3. Converts chapter-level timestamps to per-ayah offsets (for EveryAyah files)
    4. Outputs #t= fragments ready for use in <audio> tags

Limitations:
    - Only 7 of 12 reciters have API segment data (see RECITER_MAP below)
    - For unsupported reciters, use find-audio-fragment.py (silence detection fallback)

See also:
    - docs/decisions/ADR-006-auto-timestamps.md — design rationale
    - tools/find-audio-fragment.py — silence-based fallback for unsupported reciters
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Reciter mapping: EveryAyah folder → Quran Foundation API reciter ID
# ---------------------------------------------------------------------------

RECITER_MAP = {
    # Reciters WITH word-level segment data in the Quran Foundation API
    "Abdul_Basit_Mujawwad_128kbps": 1,
    "Abdul_Basit_Murattal_192kbps": 2,
    "Abdurrahmaan_As-Sudais_192kbps": 3,
    "Abu_Bakr_Ash-Shaatree_128kbps": 4,
    "Hani_Rifai_192kbps": 5,
    "Husary_128kbps": 6,
    "Alafasy_128kbps": 7,
}

# Reciters WITHOUT segment data — must use find-audio-fragment.py instead
UNSUPPORTED_RECITERS = [
    "Hudhaify_128kbps",
    "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
    "MaherAlMuaiqly128kbps",
    "Ghamadi_40kbps",
    "Yasser_Ad-Dussary_128kbps",
]

ALL_RECITERS = list(RECITER_MAP.keys()) + UNSUPPORTED_RECITERS

CACHE_DIR = Path(".cache/api-segments")

# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def fetch_chapter_segments(reciter_id: int, surah: int) -> dict:
    """Fetch chapter audio with word-level segments from Quran Foundation API.
    
    Caches results locally to avoid repeated API calls.
    Returns the full API response dict.
    """
    cache_file = CACHE_DIR / f"reciter-{reciter_id}" / f"chapter-{surah:03d}.json"
    
    if cache_file.exists():
        with open(cache_file) as f:
            return json.load(f)
    
    url = f"https://api.quran.com/api/v4/chapter_recitations/{reciter_id}/{surah}?segments=true"
    
    result = subprocess.run(
        ["curl", "-s", url],
        capture_output=True, text=True, timeout=30
    )
    
    if result.returncode != 0:
        print(f"  ✗ curl failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        print(f"  ✗ Invalid JSON response from API. The API may be temporarily unavailable.", file=sys.stderr)
        print(f"    URL: {url}", file=sys.stderr)
        sys.exit(1)
    
    if "audio_file" not in data:
        print(f"  ✗ Unexpected API response (no audio_file). Check reciter ID {reciter_id}.", file=sys.stderr)
        sys.exit(1)
    
    # Cache the response
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_file, "w") as f:
        json.dump(data, f)
    
    return data


def fetch_verse_words(surah: int, ayah: int) -> list[dict]:
    """Fetch word-by-word data for a verse (text, translation, transliteration)."""
    verse_key = f"{surah}:{ayah}"
    
    cache_file = CACHE_DIR / "words" / f"{surah:03d}{ayah:03d}.json"
    if cache_file.exists():
        with open(cache_file) as f:
            return json.load(f)
    
    url = f"https://api.quran.com/api/v4/verses/by_key/{verse_key}?words=true&word_fields=text_uthmani"
    
    result = subprocess.run(
        ["curl", "-s", url],
        capture_output=True, text=True, timeout=30
    )
    
    try:
        data = json.loads(result.stdout)
        words = data["verse"]["words"]
    except (json.JSONDecodeError, KeyError):
        print(f"  ✗ Failed to fetch words for {verse_key}", file=sys.stderr)
        return []
    
    # Cache
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_file, "w") as f:
        json.dump(words, f)
    
    return words


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def get_ayah_word_timestamps(surah: int, ayah: int, reciter_folder: str) -> dict | None:
    """Get word-level timestamps for an ayah with a specific reciter.
    
    Returns dict with:
        - verse_key: str
        - reciter: str
        - ayah_duration: float (seconds)
        - words: list of {index, arabic, english, start, end}
    
    Or None if the reciter is not supported.
    """
    reciter_id = RECITER_MAP.get(reciter_folder)
    if reciter_id is None:
        return None
    
    # Fetch chapter segments
    data = fetch_chapter_segments(reciter_id, surah)
    
    # Fetch word text data
    words_data = fetch_verse_words(surah, ayah)
    
    # Find the target verse
    verse_key = f"{surah}:{ayah}"
    for ts in data["audio_file"]["timestamps"]:
        if ts["verse_key"] == verse_key:
            ayah_start_ms = ts["timestamp_from"]
            ayah_end_ms = ts["timestamp_to"]
            segments = ts["segments"]
            
            word_list = []
            for seg in segments:
                word_idx = int(seg[0])
                per_ayah_start = (seg[1] - ayah_start_ms) / 1000.0
                per_ayah_end = (seg[2] - ayah_start_ms) / 1000.0
                
                # Find matching word text
                arabic = ""
                english = ""
                for w in words_data:
                    if w.get("position") == word_idx:
                        arabic = w.get("text_uthmani") or w.get("text", "?")
                        english = w.get("translation", {}).get("text", "")
                        break
                
                word_list.append({
                    "index": word_idx,
                    "arabic": arabic,
                    "english": english,
                    "start": round(per_ayah_start, 2),
                    "end": round(per_ayah_end, 2),
                })
            
            return {
                "verse_key": verse_key,
                "reciter": reciter_folder,
                "ayah_duration": round((ayah_end_ms - ayah_start_ms) / 1000.0, 1),
                "words": word_list,
            }
    
    print(f"  ✗ Verse {verse_key} not found in API data", file=sys.stderr)
    return None


def calculate_fragment(word_timestamps: dict, word_from: int, word_to: int) -> dict | None:
    """Calculate #t= fragment for a word range.
    
    Returns dict with t_start, t_end, fragment string.
    """
    start = None
    end = None
    
    for w in word_timestamps["words"]:
        if w["index"] == word_from:
            start = w["start"]
        if w["index"] == word_to:
            end = w["end"]
    
    if start is None or end is None:
        return None
    
    # Round to 1 decimal for cleaner URLs
    t_start = round(start, 1)
    t_end = round(end, 1)
    
    # Build fragment string
    if t_start == 0:
        fragment = f"#t=0,{t_end}"
    else:
        fragment = f"#t={t_start},{t_end}"
    
    return {
        "t_start": t_start,
        "t_end": t_end,
        "fragment": fragment,
        "word_from": word_from,
        "word_to": word_to,
    }


# ---------------------------------------------------------------------------
# Ayah reference parsing (shared with find-audio-fragment.py)
# ---------------------------------------------------------------------------

def parse_ref(ref: str) -> tuple[int, int]:
    """Parse '59:22' or '059022' into (surah, ayah)."""
    m = re.match(r"^(\d{1,3}):(\d{1,3})$", ref)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.match(r"^(\d{3})(\d{3})$", ref)
    if m:
        return int(m.group(1)), int(m.group(2))
    raise ValueError(f"Invalid ayah reference: '{ref}'. Use 'surah:ayah' (e.g. 59:22)")


def parse_word_range(word_range: str) -> tuple[int, int]:
    """Parse '15-17' or '15' into (word_from, word_to)."""
    if "-" in word_range:
        parts = word_range.split("-")
        return int(parts[0]), int(parts[1])
    else:
        n = int(word_range)
        return n, n


# ---------------------------------------------------------------------------
# Display
# ---------------------------------------------------------------------------

def print_word_table(ts: dict, word_from: int = None, word_to: int = None):
    """Print a formatted word-by-word timestamp table."""
    print(f"\n{'#':>3s}  {'Arabic':<20s}  {'English':<30s}  {'Start':>8s}  {'End':>8s}")
    print("-" * 80)
    
    for w in ts["words"]:
        marker = ""
        if word_from and word_to:
            if word_from <= w["index"] <= word_to:
                marker = "  ◄"
        
        # Skip the verse number marker (last "word")
        if w["arabic"] and not re.match(r"^[\u0660-\u0669\u06F0-\u06F9٠-٩0-9]+$", w["arabic"].strip()):
            print(f"{w['index']:3d}  {w['arabic']:<20s}  {w['english']:<30s}  {w['start']:7.1f}s  {w['end']:7.1f}s{marker}")


def patch_lesson_file(md_path: Path, surah: int, ayah: int, fragment: str) -> bool:
    """Update the #t= fragment for a given ayah in a lesson markdown file."""
    filename = f"{surah:03d}{ayah:03d}"
    content = md_path.read_text(encoding="utf-8")
    
    pattern = re.compile(
        r'(<audio[^>]+src="https://everyayah\.com/data/[^/]+/'
        + re.escape(filename) + r'\.mp3)'
        r'(?:#t=[^"]*)?(")'
    )
    new_content, count = pattern.subn(rf'\g<1>{fragment}\g<2>', content)
    
    if count == 0:
        print(f"  ✗ No <audio> tag found for {surah}:{ayah} in {md_path.name}")
        return False
    else:
        md_path.write_text(new_content, encoding="utf-8")
        print(f"  ✅ Updated {count} tag(s) → {fragment}")
        return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def process_ayah(surah: int, ayah: int, reciter: str,
                 word_range: tuple[int, int] = None,
                 write_path: Path = None,
                 all_reciters: bool = False):
    """Process one ayah: show word timestamps, calculate fragment."""
    
    ref = f"{surah}:{ayah}"
    
    if all_reciters:
        # Show fragment for all supported reciters
        print(f"\n=== {ref} — All Supported Reciters ===")
        if not word_range:
            print("  (specify --words to see fragments for each reciter)")
            return
        
        word_from, word_to = word_range
        print(f"  Words {word_from}-{word_to}:\n")
        
        for folder, rid in RECITER_MAP.items():
            ts = get_ayah_word_timestamps(surah, ayah, folder)
            if ts:
                frag = calculate_fragment(ts, word_from, word_to)
                if frag:
                    # Show the Arabic words being extracted
                    arabic_text = " ".join(
                        w["arabic"] for w in ts["words"]
                        if word_from <= w["index"] <= word_to
                    )
                    print(f"  {folder:<45s} {frag['fragment']:<16s}  ({frag['t_start']:.1f}s → {frag['t_end']:.1f}s)  {arabic_text}")
                else:
                    print(f"  {folder:<45s} (words not found)")
        
        print(f"\n  ❌ Not available: {', '.join(UNSUPPORTED_RECITERS)}")
        print(f"     Use find-audio-fragment.py for these reciters.\n")
        return
    
    # Check if reciter is supported
    if reciter not in RECITER_MAP:
        print(f"\n=== {ref} — {reciter} ===")
        print(f"  ❌ Reciter '{reciter}' does not have word-level timing data in the API.")
        print(f"  → Use find-audio-fragment.py instead (silence-based detection).")
        print(f"  → Supported reciters: {', '.join(RECITER_MAP.keys())}")
        return
    
    print(f"\n=== {ref} — {reciter} ===")
    
    # Get word timestamps
    ts = get_ayah_word_timestamps(surah, ayah, reciter)
    if not ts:
        return
    
    print(f"Duration: {ts['ayah_duration']}s")
    
    word_from = word_range[0] if word_range else None
    word_to = word_range[1] if word_range else None
    
    # Print word table
    print_word_table(ts, word_from, word_to)
    
    # Calculate fragment if word range specified
    if word_from and word_to:
        frag = calculate_fragment(ts, word_from, word_to)
        if frag:
            print(f"\n  Fragment: {frag['fragment']}")
            print(f"  Words {frag['word_from']}-{frag['word_to']}: {frag['t_start']}s → {frag['t_end']}s")
            
            # Write to file if requested
            if write_path:
                patch_lesson_file(write_path, surah, ayah, frag['fragment'])
        else:
            print(f"\n  ✗ Could not find words {word_from}-{word_to} in segments")
    
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Word-level timestamp extraction using the Quran Foundation API.",
        epilog=(
            "Examples:\n"
            "  %(prog)s 29:45 --reciter Abdul_Basit_Murattal_192kbps\n"
            "  %(prog)s 29:45 --reciter Abdul_Basit_Murattal_192kbps --words 15-17\n"
            "  %(prog)s 29:45 --words 15-17 --all-reciters\n"
            "  %(prog)s 59:22 6:74 --reciter Alafasy_128kbps\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "refs", nargs="+", metavar="AYAH",
        help="Ayah reference(s) in surah:ayah format (e.g. 59:22)",
    )
    parser.add_argument(
        "--reciter", default="Husary_128kbps", metavar="NAME",
        help=f"EveryAyah reciter folder name (default: Husary_128kbps). "
             f"Supported: {', '.join(RECITER_MAP.keys())}",
    )
    parser.add_argument(
        "--words", metavar="FROM-TO",
        help="Word range to extract (e.g. 15-17). Shows all words if not specified.",
    )
    parser.add_argument(
        "--write", metavar="LESSON_MD",
        help="Lesson markdown file to patch with the calculated fragment.",
    )
    parser.add_argument(
        "--all-reciters", action="store_true",
        help="Show fragments for all supported reciters (requires --words).",
    )
    
    args = parser.parse_args()
    
    word_range = parse_word_range(args.words) if args.words else None
    write_path = Path(args.write) if args.write else None
    
    if write_path and not write_path.exists():
        print(f"Error: --write path not found: {write_path}", file=sys.stderr)
        sys.exit(1)
    
    for ref in args.refs:
        try:
            surah, ayah = parse_ref(ref)
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            continue
        
        process_ayah(
            surah, ayah, args.reciter,
            word_range=word_range,
            write_path=write_path,
            all_reciters=args.all_reciters,
        )


if __name__ == "__main__":
    main()
