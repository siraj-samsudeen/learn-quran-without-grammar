#!/usr/bin/env python3
"""
find-audio-fragment.py — Find silence boundaries in Quranic ayah audio.

Downloads audio from everyayah.com, runs ffmpeg silencedetect to find
pause/silence points, and prints a report with suggested time fragments
for use with HTML5 audio #t= parameters.

Usage:
    python tools/find-audio-fragment.py 59:22 --reciter Alafasy_128kbps
    python tools/find-audio-fragment.py 2:34 --reciter Husary_128kbps
    python tools/find-audio-fragment.py 29:45              # defaults to Husary_128kbps
    python tools/find-audio-fragment.py 59:22 6:74 3:26    # multiple ayahs

Output includes silence points and suggested clause fragments.

    # Write the chosen fragment back to a lesson markdown file:
    python tools/find-audio-fragment.py 21:87 --write lessons/lesson-01-allahu-akbar.md
    python tools/find-audio-fragment.py 41:15 --write lessons/lesson-01-allahu-akbar.md --play
"""

import argparse
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CACHE_DIR = Path(".cache/fragment-analysis")

RECITERS = [
    "Husary_128kbps",
    "Abdul_Basit_Mujawwad_128kbps",
    "Abdul_Basit_Murattal_192kbps",
    "Alafasy_128kbps",
    "Hudhaify_128kbps",
    "Ghamadi_40kbps",
    "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
    "MaherAlMuaiqly128kbps",
    "Hani_Rifai_192kbps",
    "Abdurrahmaan_As-Sudais_192kbps",
    "Abu_Bakr_Ash-Shaatree_128kbps",
    "Yasser_Ad-Dussary_128kbps",
]

DEFAULT_RECITER = "Husary_128kbps"

# silencedetect parameters: two passes from normal to sensitive
SILENCE_PROFILES = [
    {"noise": "-30dB", "duration": "0.3", "label": "normal"},
    {"noise": "-35dB", "duration": "0.2", "label": "sensitive"},
]

ORDINALS = [
    "First", "Second", "Third", "Fourth", "Fifth",
    "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
    "11th", "12th", "13th", "14th", "15th",
]

# ---------------------------------------------------------------------------
# Ayah reference parsing
# ---------------------------------------------------------------------------

def parse_ref(ref: str) -> tuple[int, int]:
    """Parse an ayah reference like '59:22' or '059022' into (surah, ayah)."""
    # Format: S:A or SS:AA or SSS:AAA
    m = re.match(r"^(\d{1,3}):(\d{1,3})$", ref)
    if m:
        return int(m.group(1)), int(m.group(2))

    # Format: SSSAAA (exactly 6 digits)
    m = re.match(r"^(\d{3})(\d{3})$", ref)
    if m:
        return int(m.group(1)), int(m.group(2))

    raise ValueError(
        f"Invalid ayah reference: '{ref}'. "
        f"Use 'surah:ayah' (e.g. 59:22) or 6-digit code (e.g. 059022)."
    )


def format_filename(surah: int, ayah: int) -> str:
    """Return the 6-digit filename stem like '059022'."""
    return f"{surah:03d}{ayah:03d}"


def build_url(reciter: str, surah: int, ayah: int) -> str:
    """Build the everyayah.com URL for a given reciter and ayah."""
    return f"https://everyayah.com/data/{reciter}/{format_filename(surah, ayah)}.mp3"


# ---------------------------------------------------------------------------
# Download / cache
# ---------------------------------------------------------------------------

def ensure_cached(url: str, reciter: str, surah: int, ayah: int) -> Path:
    """Download the MP3 if not already cached. Return the local path."""
    cache_subdir = CACHE_DIR / reciter
    cache_subdir.mkdir(parents=True, exist_ok=True)
    local_path = cache_subdir / f"{format_filename(surah, ayah)}.mp3"

    if local_path.exists() and local_path.stat().st_size > 0:
        return local_path

    print(f"  Downloading {url} …", file=sys.stderr)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            local_path.write_bytes(resp.read())
    except Exception as e:
        print(f"  ✗ Download failed: {e}", file=sys.stderr)
        if local_path.exists():
            local_path.unlink()
        raise

    return local_path


# ---------------------------------------------------------------------------
# ffmpeg helpers
# ---------------------------------------------------------------------------

def get_duration(path: Path) -> float:
    """Get the total duration of an audio file in seconds via ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True, text=True,
    )
    return float(result.stdout.strip())


def detect_silences(path: Path, noise: str, duration: str) -> list[dict]:
    """
    Run ffmpeg silencedetect and return a list of silence intervals.

    Each item: {"start": float, "end": float, "duration": float}
    """
    result = subprocess.run(
        [
            "ffmpeg", "-i", str(path),
            "-af", f"silencedetect=noise={noise}:d={duration}",
            "-f", "null", "-",
        ],
        capture_output=True, text=True,
    )
    stderr = result.stderr

    # Parse silence_start / silence_end pairs from ffmpeg stderr
    starts = [float(m) for m in re.findall(r"silence_start:\s*([\d.]+)", stderr)]
    ends_durations = re.findall(
        r"silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)", stderr
    )

    silences = []
    for i, start in enumerate(starts):
        if i < len(ends_durations):
            end = float(ends_durations[i][0])
            dur = float(ends_durations[i][1])
        else:
            # Last silence may not have an end (runs to EOF)
            end = start + 0.3  # estimate
            dur = 0.3
        silences.append({"start": round(start, 2), "end": round(end, 2), "duration": round(dur, 2)})

    return silences


# ---------------------------------------------------------------------------
# Analysis & reporting
# ---------------------------------------------------------------------------

def analyse_ayah(surah: int, ayah: int, reciter: str,
                 write_path: Path = None, play: bool = False) -> None:
    """Download, analyse, and print a full report for one ayah."""
    ref = f"{surah}:{ayah}"
    url = build_url(reciter, surah, ayah)

    print(f"\n=== {ref} — {reciter} ===")

    # Download
    try:
        local_path = ensure_cached(url, reciter, surah, ayah)
    except Exception:
        print(f"  Skipping {ref} due to download error.\n")
        return

    # Duration
    total_dur = get_duration(local_path)
    print(f"Duration: {total_dur:.1f}s")
    print(f"URL: {url}")

    # Silence detection — try normal profile first
    profile = SILENCE_PROFILES[0]
    silences = detect_silences(local_path, profile["noise"], profile["duration"])

    # If too few internal silences found, try the sensitive profile
    # "Internal" = not at the very start or very end of the file
    internal = [s for s in silences if s["start"] > 0.5 and s["end"] < total_dur - 0.3]
    if len(internal) < 1:
        profile = SILENCE_PROFILES[1]
        silences = detect_silences(local_path, profile["noise"], profile["duration"])
        internal = [s for s in silences if s["start"] > 0.5 and s["end"] < total_dur - 0.3]
        if silences:
            print(f"  (used sensitive profile: noise={profile['noise']}, d={profile['duration']})")

    # Print silence points
    print(f"\nSilence points:")
    if not silences:
        print("  (none detected)")
    else:
        for s in silences:
            tag = ""
            if s["start"] < 0.5:
                tag = "  ← opening silence"
            elif s["end"] >= total_dur - 0.3:
                tag = "  ← trailing silence"
            else:
                tag = "  ← likely waqf pause"
            print(f"  {s['start']:6.2f} - {s['end']:<6.2f} [{s['duration']:.2f}s silence]{tag}")

    # Build suggested fragments using midpoints of internal silences
    cut_points = [round((s["start"] + s["end"]) / 2, 1) for s in internal]
    total_rounded = round(total_dur)

    print(f"\nSuggested fragments:")
    boundaries: list = []
    if not cut_points:
        print(f"  Full ayah:     #t=0,{total_rounded}  (no internal pauses found)")
        boundaries = [0, total_rounded]
    else:
        boundaries = [0] + cut_points + [total_rounded]
        for i in range(len(boundaries) - 1):
            t_s = boundaries[i]
            t_e = boundaries[i + 1]
            label = ORDINALS[i] if i < len(ORDINALS) else f"{i+1}th"
            print(f"  [{i+1}] {label} clause:{' ' * max(1, 8 - len(label))}#t={t_s},{t_e}")
        print(f"  [f] Full ayah:     (no fragment needed)")

    # ── --play: play each clause before prompting ──
    if play and len(boundaries) >= 2:
        import tempfile
        print()
        for i in range(len(boundaries) - 1):
            label = ORDINALS[i] if i < len(ORDINALS) else f"{i+1}th"
            input(f"  Press Enter to play {label} clause ({boundaries[i]}–{boundaries[i+1]}s) …")
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                tmp_path = tmp.name
            subprocess.run(
                ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                 "-ss", str(boundaries[i]), "-to", str(boundaries[i+1]),
                 "-i", str(local_path), "-c", "copy", tmp_path], check=True)
            subprocess.run(["afplay", tmp_path])
            Path(tmp_path).unlink(missing_ok=True)

    # ── --write: ask which clause and patch the markdown file ──
    if write_path and len(boundaries) >= 2:
        n_clauses = len(boundaries) - 1
        prompt = f"\n  Write to {write_path.name} — which clause? "
        prompt += f"[1–{n_clauses} / f=full / s=start-only / skip]: " if n_clauses > 1 \
                  else "[f=full / 1=only clause / s=start-only / skip]: "
        choice = input(prompt).strip().lower()

        if choice in ("skip", ""):
            print("  Skipped.")
        elif choice == "f":
            _patch(write_path, surah, ayah, None, None)
        elif choice == "s":
            try:
                t = float(input("  Start time (seconds): ").strip())
                _patch(write_path, surah, ayah, t, None)
            except ValueError:
                print("  Invalid time, skipped.")
        elif choice.isdigit() and 0 <= int(choice) - 1 < n_clauses:
            idx = int(choice) - 1
            _patch(write_path, surah, ayah, boundaries[idx], boundaries[idx + 1])
        else:
            print("  Unrecognised choice, skipped.")

    print()


def _patch(md_path: Path, surah: int, ayah: int, t_start, t_end) -> None:
    """Update the #t= fragment for a given ayah in a lesson markdown file."""
    filename = f"{surah:03d}{ayah:03d}"
    if t_start is None:
        frag = ""
    elif t_end is None:
        frag = f"#t={t_start}"
    elif t_start == 0:
        frag = f"#t=0,{t_end}"
    else:
        frag = f"#t={t_start},{t_end}"

    content = md_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'(<audio[^>]+src="https://everyayah\.com/data/[^/]+/'
        + re.escape(filename) + r'\.mp3)'
        r'(?:#t=[^"]*)?(")'
    )
    new_content, count = pattern.subn(rf'\g<1>{frag}\g<2>', content)
    if count == 0:
        print(f"  ✗ No <audio> tag found for {surah}:{ayah} in {md_path.name}")
    else:
        md_path.write_text(new_content, encoding="utf-8")
        print(f"  ✅ Updated {count} tag(s) → {frag or '(full ayah)'}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Find silence boundaries in Quranic ayah audio from everyayah.com.",
        epilog="Examples:\n"
               "  %(prog)s 59:22 --reciter Alafasy_128kbps\n"
               "  %(prog)s 2:34\n"
               "  %(prog)s 59:22 6:74 3:26 --reciter Alafasy_128kbps\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "refs",
        nargs="+",
        metavar="AYAH",
        help="Ayah reference(s) in surah:ayah format (e.g. 59:22) or 6-digit code (e.g. 059022).",
    )
    parser.add_argument(
        "--reciter",
        default=DEFAULT_RECITER,
        metavar="NAME",
        help=f"Reciter folder name on everyayah.com (default: {DEFAULT_RECITER}). "
             f"Available: {', '.join(RECITERS)}",
    )
    parser.add_argument(
        "--write", metavar="LESSON_MD",
        help="Lesson markdown file to patch. After analysis, prompts which clause "
             "to write, then updates the <audio #t=> tag in-place.",
    )
    parser.add_argument(
        "--play", action="store_true",
        help="Play each detected clause with afplay (macOS) before prompting.",
    )

    args = parser.parse_args()

    write_path = Path(args.write) if args.write else None
    if write_path and not write_path.exists():
        print(f"Error: --write path not found: {write_path}", file=sys.stderr)
        sys.exit(1)

    # Verify ffmpeg/ffprobe are available
    for cmd in ("ffmpeg", "ffprobe"):
        if subprocess.run(["which", cmd], capture_output=True).returncode != 0:
            print(f"Error: '{cmd}' not found. Please install ffmpeg.", file=sys.stderr)
            sys.exit(1)

    # Process each ayah reference
    for ref in args.refs:
        try:
            surah, ayah = parse_ref(ref)
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            continue
        analyse_ayah(surah, ayah, args.reciter, write_path=write_path, play=args.play)


if __name__ == "__main__":
    main()
