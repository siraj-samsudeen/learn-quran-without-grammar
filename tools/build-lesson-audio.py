#!/usr/bin/env python3
"""
build-lesson-audio.py — Build audio assets for a Quranic Arabic lesson.

Downloads Arabic audio from EveryAyah CDN (with optional time-fragment extraction),
generates English TTS via edge-tts, and produces:
  1. Individual sentence-pair MP3s (Arabic + 2s pause + English) for the web player
  2. A single sequential MP3 of all sentences for downloading and car playback
  3. A manifest.json describing all assets for the JavaScript shuffle player

Usage:
    python tools/build-lesson-audio.py tools/lesson-audio/lesson-01.yaml
    python tools/build-lesson-audio.py tools/lesson-audio/lesson-01.yaml -o assets/audio/lessons/lesson-01

Requirements:
    - ffmpeg (for audio processing)
    - edge-tts (pip install edge-tts)
    - PyYAML (pip install pyyaml)
"""

import argparse
import json
import os
import random
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import yaml

# ── Configuration ──────────────────────────────────────────────────────────

EVERYAYAH_BASE = "https://everyayah.com/data/Husary_128kbps"

# Male English TTS voice pool — randomly rotated per sentence
EDGE_TTS_VOICES = [
    "en-US-AndrewNeural",       # warm, confident
    "en-US-BrianNeural",        # approachable, casual
    "en-US-ChristopherNeural",  # reliable, authoritative
]

# Tamil TTS voice pool
TAMIL_TTS_VOICES = [
    "ta-IN-ValluvarNeural",     # male Tamil voice
]

# Approved Quranic reciters — see docs/decisions/ADR-005-reciters.md
RECITER_POOL = [
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
]
ARABIC_ENGLISH_PAUSE = 0.5  # seconds of silence between Arabic and English
SENTENCE_GAP = 1            # seconds of silence between sentence pairs
SAMPLE_RATE = 44100
CHANNELS = 1                # mono — keeps file sizes small
MP3_QUALITY = 2             # lame VBR quality (2 ≈ 190kbps, excellent)


# ── Helper Functions ───────────────────────────────────────────────────────

def everyayah_url(surah: int, ayah: int, reciter: str = None) -> str:
    """Build EveryAyah CDN URL for a surah/ayah, optionally with a specific reciter."""
    if reciter:
        base = f"https://everyayah.com/data/{reciter}"
    else:
        base = EVERYAYAH_BASE
    return f"{base}/{surah:03d}{ayah:03d}.mp3"


def download_file(url: str, dest: str) -> None:
    """Download a file if not already cached."""
    print(f"    ↓ Downloading: {url}")
    urllib.request.urlretrieve(url, dest)


def run_ffmpeg(args: list, desc: str = "") -> None:
    """Run ffmpeg, suppressing output unless there's an error."""
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ✗ ffmpeg error ({desc}):\n    {result.stderr.strip()}", file=sys.stderr)
        raise RuntimeError(f"ffmpeg failed: {desc}")


def get_duration(path: str) -> float:
    """Get audio file duration in seconds."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True,
    )
    return float(result.stdout.strip())


def generate_silence(path: str, duration: float) -> None:
    """Generate a silent MP3 of the given duration."""
    run_ffmpeg([
        "-f", "lavfi", "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono",
        "-t", str(duration),
        "-c:a", "libmp3lame", "-q:a", str(MP3_QUALITY),
        path,
    ], f"silence {duration}s")


def normalize_audio(input_path: str, output_path: str) -> None:
    """Re-encode audio to a consistent format (sample rate, channels, codec)."""
    run_ffmpeg([
        "-i", input_path,
        "-ar", str(SAMPLE_RATE), "-ac", str(CHANNELS),
        "-c:a", "libmp3lame", "-q:a", str(MP3_QUALITY),
        output_path,
    ], f"normalize {Path(input_path).name}")


def extract_fragment(input_path: str, output_path: str,
                     start: float = None, end: float = None) -> None:
    """Extract a time range from an audio file, normalizing the output."""
    args = []
    if start is not None:
        args += ["-ss", str(start)]
    if end is not None:
        args += ["-to", str(end)]
    args += [
        "-i", input_path,
        "-ar", str(SAMPLE_RATE), "-ac", str(CHANNELS),
        "-c:a", "libmp3lame", "-q:a", str(MP3_QUALITY),
        output_path,
    ]
    run_ffmpeg(args, f"fragment {Path(input_path).name} [{start}→{end}]")


def generate_tts(text: str, output_path: str) -> None:
    """Generate English TTS audio using edge-tts with random male voice."""
    voice = random.choice(EDGE_TTS_VOICES)
    display = text[:70] + ("…" if len(text) > 70 else "")
    print(f"    🗣 TTS ({voice.split('-')[2].replace('Neural','')}): \"{display}\"")
    for attempt in range(1, 4):
        result = subprocess.run(
            ["edge-tts", "--voice", voice,
             "--text", text, "--write-media", output_path],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            return
        if attempt < 3:
            import time
            print(f"    ⚠ edge-tts attempt {attempt} failed, retrying in 3s…", file=sys.stderr)
            time.sleep(3)
    print(f"  ✗ edge-tts error:\n    {result.stderr.strip()}", file=sys.stderr)
    raise RuntimeError(f"edge-tts failed for: {text[:50]}")


def generate_tamil_tts(text: str, output_path: str) -> None:
    """Generate Tamil TTS audio using edge-tts with male Tamil voice."""
    voice = random.choice(TAMIL_TTS_VOICES)
    display = text[:70] + ("…" if len(text) > 70 else "")
    print(f"    🗣 Tamil TTS ({voice.split('-')[2]}): \"{display}\"")
    for attempt in range(1, 4):
        result = subprocess.run(
            ["edge-tts", "--voice", voice,
             "--text", text, "--write-media", output_path],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            return
        if attempt < 3:
            import time
            print(f"    ⚠ edge-tts (Tamil) attempt {attempt} failed, retrying in 3s…", file=sys.stderr)
            time.sleep(3)
    print(f"  ✗ edge-tts error (Tamil):\n    {result.stderr.strip()}", file=sys.stderr)
    raise RuntimeError(f"edge-tts (Tamil) failed for: {text[:50]}")


def generate_arabic_tts(text: str, output_path: str) -> None:
    """Generate Arabic TTS audio using edge-tts (for hadith/non-Quranic text)."""
    display = text[:70] + ("…" if len(text) > 70 else "")
    print(f"    🗣 Arabic TTS: \"{display}\"")
    for attempt in range(1, 4):
        result = subprocess.run(
            ["edge-tts", "--voice", "ar-SA-HamedNeural",
             "--text", text, "--write-media", output_path],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            return
        if attempt < 3:
            import time
            print(f"    ⚠ edge-tts (Arabic) attempt {attempt} failed, retrying in 3s…", file=sys.stderr)
            time.sleep(3)
    print(f"  ✗ edge-tts error:\n    {result.stderr.strip()}", file=sys.stderr)
    raise RuntimeError(f"edge-tts (Arabic) failed for: {text[:50]}")


def concat_files(file_list: list, output_path: str, tmpdir: str) -> None:
    """Concatenate MP3 files using ffmpeg's concat demuxer."""
    list_path = os.path.join(tmpdir, "concat_list.txt")
    with open(list_path, "w") as f:
        for fpath in file_list:
            f.write(f"file '{os.path.abspath(fpath)}'\n")

    run_ffmpeg([
        "-f", "concat", "-safe", "0", "-i", list_path,
        "-c:a", "libmp3lame", "-q:a", str(MP3_QUALITY),
        output_path,
    ], f"concat → {Path(output_path).name}")


# ── Arabic Audio Processing ───────────────────────────────────────────────

def download_ayah(surah: int, ayah: int, cache_dir: str,
                   reciter: str = None) -> str:
    """Download an ayah MP3 (using cache). Returns the file path.

    Cache key includes reciter name to avoid collisions when the same
    ayah is downloaded from different reciters.
    """
    # Organise cache by reciter so different reciters don't overwrite each other
    effective_reciter = reciter or "Husary_128kbps"
    reciter_cache = os.path.join(cache_dir, effective_reciter)
    os.makedirs(reciter_cache, exist_ok=True)

    filename = f"{surah:03d}{ayah:03d}.mp3"
    cache_path = os.path.join(reciter_cache, filename)
    if not os.path.exists(cache_path):
        download_file(everyayah_url(surah, ayah, reciter=effective_reciter), cache_path)
    else:
        print(f"    ✓ Cached: {effective_reciter}/{filename}")
    return cache_path


def process_single_source(source: dict, tmpdir: str, cache_dir: str,
                          idx: int, reciter: str = None) -> str:
    """Process one Arabic audio source entry → normalized MP3 clip."""
    surah = source["surah"]
    ayah = source["ayah"]
    start = source.get("start")
    end = source.get("end")

    raw_path = download_ayah(surah, ayah, cache_dir, reciter=reciter)
    output_path = os.path.join(tmpdir, f"arabic_{idx}.mp3")

    if start is not None or end is not None:
        extract_fragment(raw_path, output_path, start, end)
    else:
        normalize_audio(raw_path, output_path)

    return output_path


def process_arabic_audio(sentence: dict, tmpdir: str, cache_dir: str,
                         sentence_idx: int) -> str:
    """Process the arabic_source field (single or list) → one normalized MP3."""
    source = sentence["arabic_source"]
    reciter = sentence.get("reciter")  # per-sentence reciter from YAML

    # Handle Arabic TTS for hadith / non-Quranic content
    if isinstance(source, dict) and source.get("use_arabic_tts"):
        output_path = os.path.join(tmpdir, f"arabic_tts_{sentence_idx}.mp3")
        raw_path = os.path.join(tmpdir, f"arabic_tts_raw_{sentence_idx}.mp3")
        generate_arabic_tts(sentence["arabic_text"], raw_path)
        normalize_audio(raw_path, output_path)
        return output_path

    # Single source
    if isinstance(source, dict):
        return process_single_source(source, tmpdir, cache_dir, sentence_idx,
                                     reciter=reciter)

    # Multiple sources (e.g., multi-ayah like 114:1-3) — concat them
    if isinstance(source, list):
        parts = []
        for i, src in enumerate(source):
            sub_idx = sentence_idx * 100 + i  # unique index
            part = process_single_source(src, tmpdir, cache_dir, sub_idx,
                                         reciter=reciter)
            parts.append(part)

        combined = os.path.join(tmpdir, f"arabic_multi_{sentence_idx}.mp3")
        concat_files(parts, combined, tmpdir)
        return combined

    raise ValueError(f"Invalid arabic_source format in sentence {sentence_idx}")


# ── Main Build Function ──────────────────────────────────────────────────

def build_lesson(yaml_path: str, output_dir: str, lang: str = "en") -> None:
    """Build all audio assets for a lesson from its YAML definition.

    Args:
        yaml_path: Path to the lesson YAML definition.
        output_dir: Where to write the MP3s and manifest.
        lang: 'en' (English only), 'ta' (Tamil only), or 'all' (both).
    """

    with open(yaml_path, "r") as f:
        lesson = yaml.safe_load(f)

    lesson_id = lesson["lesson_id"]
    title = lesson["title"]
    sentences = lesson["sentences"]

    build_langs = []
    if lang in ("en", "all"):
        build_langs.append("en")
    if lang in ("ta", "all"):
        # Check if any sentence has Tamil text
        has_tamil = any(s.get("tamil") for s in sentences)
        if has_tamil:
            build_langs.append("ta")
        else:
            print("  ⚠ No tamil: fields found in YAML — skipping Tamil build")

    print(f"\n{'='*60}")
    print(f"  Building: {title}")
    print(f"  Sentences: {len(sentences)}")
    print(f"  Languages: {', '.join(build_langs)}")
    print(f"  Output: {output_dir}")
    print(f"{'='*60}")

    os.makedirs(output_dir, exist_ok=True)

    # Cache directory for raw EveryAyah downloads
    cache_dir = os.path.join(output_dir, ".cache")
    os.makedirs(cache_dir, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="lesson-audio-") as tmpdir:

        # Pre-generate silence files
        silence_2s = os.path.join(tmpdir, "silence_2s.mp3")
        silence_3s = os.path.join(tmpdir, "silence_3s.mp3")
        generate_silence(silence_2s, ARABIC_ENGLISH_PAUSE)
        generate_silence(silence_3s, SENTENCE_GAP)

        pair_paths_en = []     # English sentence-pair MP3 paths
        pair_paths_ta = []     # Tamil sentence-pair MP3 paths
        manifest_entries = []  # metadata for each sentence
        all_parts_en = []      # all files for the English full sequential
        all_parts_ta = []      # all files for the Tamil full sequential

        for i, sentence in enumerate(sentences):
            num = i + 1
            sid = sentence.get("id", f"sentence-{num:02d}")
            ref = sentence.get("ref", "")
            print(f"\n  [{num:2d}/{len(sentences)}] {sid} ({ref})")

            # ── Arabic audio ──
            arabic_path = process_arabic_audio(sentence, tmpdir, cache_dir, i)
            ar_dur = get_duration(arabic_path)

            entry = {
                "id": sid,
                "role": sentence.get("role", "learn"),
                "root": sentence.get("root", ""),
                "form": sentence.get("form", ""),
                "ref": ref,
                "arabic_text": sentence.get("arabic_text", ""),
                "english": sentence["english"],
            }

            # ── English pair ──
            if "en" in build_langs:
                english_raw = os.path.join(tmpdir, f"english_raw_{i}.mp3")
                generate_tts(sentence["english"], english_raw)
                english_path = os.path.join(tmpdir, f"english_norm_{i}.mp3")
                normalize_audio(english_raw, english_path)

                pair_path = os.path.join(output_dir, f"{sid}.mp3")
                concat_files([arabic_path, silence_2s, english_path], pair_path, tmpdir)

                en_dur = get_duration(english_path)
                pair_dur = get_duration(pair_path)
                print(f"    ✓ EN — Arabic: {ar_dur:.1f}s  English: {en_dur:.1f}s  "
                      f"Pair: {pair_dur:.1f}s → {sid}.mp3")

                pair_paths_en.append(pair_path)
                entry["file"] = f"{sid}.mp3"
                entry["duration"] = round(pair_dur, 1)

                if all_parts_en:
                    all_parts_en.append(silence_3s)
                all_parts_en.append(pair_path)

            # ── Tamil pair ──
            if "ta" in build_langs and sentence.get("tamil"):
                tamil_raw = os.path.join(tmpdir, f"tamil_raw_{i}.mp3")
                generate_tamil_tts(sentence["tamil"], tamil_raw)
                tamil_path = os.path.join(tmpdir, f"tamil_norm_{i}.mp3")
                normalize_audio(tamil_raw, tamil_path)

                ta_pair_path = os.path.join(output_dir, f"{sid}-ta.mp3")
                concat_files([arabic_path, silence_2s, tamil_path], ta_pair_path, tmpdir)

                ta_dur = get_duration(tamil_path)
                ta_pair_dur = get_duration(ta_pair_path)
                print(f"    ✓ TA — Arabic: {ar_dur:.1f}s  Tamil: {ta_dur:.1f}s  "
                      f"Pair: {ta_pair_dur:.1f}s → {sid}-ta.mp3")

                pair_paths_ta.append(ta_pair_path)
                entry["file_tamil"] = f"{sid}-ta.mp3"
                entry["tamil"] = sentence["tamil"]
                entry["duration_tamil"] = round(ta_pair_dur, 1)

                if all_parts_ta:
                    all_parts_ta.append(silence_3s)
                all_parts_ta.append(ta_pair_path)

            manifest_entries.append(entry)

        # ── Full sequential MP3 (English) ──
        full_dur = 0
        if all_parts_en:
            full_path = os.path.join(output_dir, f"{lesson_id}-full.mp3")
            print(f"\n  Building full sequential MP3 (English)…")
            concat_files(all_parts_en, full_path, tmpdir)
            full_dur = get_duration(full_path)
            print(f"  ✓ {lesson_id}-full.mp3 — {full_dur:.1f}s ({full_dur/60:.1f} min)")

        # ── Full sequential MP3 (Tamil) ──
        full_dur_ta = 0
        if all_parts_ta:
            full_ta_path = os.path.join(output_dir, f"{lesson_id}-full-ta.mp3")
            print(f"\n  Building full sequential MP3 (Tamil)…")
            concat_files(all_parts_ta, full_ta_path, tmpdir)
            full_dur_ta = get_duration(full_ta_path)
            print(f"  ✓ {lesson_id}-full-ta.mp3 — {full_dur_ta:.1f}s ({full_dur_ta/60:.1f} min)")

        # ── Manifest ──
        manifest = {
            "lesson_id": lesson_id,
            "title": title,
            "slug": lesson.get("slug", lesson_id),
            "full_audio": f"{lesson_id}-full.mp3",
            "full_duration": round(full_dur, 1),
            "sentences": manifest_entries,
        }
        if all_parts_ta:
            manifest["full_audio_tamil"] = f"{lesson_id}-full-ta.mp3"
            manifest["full_duration_tamil"] = round(full_dur_ta, 1)

        manifest_path = os.path.join(output_dir, "manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f"  ✓ manifest.json")

    # Summary
    print(f"\n{'='*60}")
    print(f"  ✅ Build complete!")
    if pair_paths_en:
        print(f"     {len(pair_paths_en)} English sentence-pair MP3s")
        print(f"     1 English full sequential MP3 ({full_dur:.0f}s)")
    if pair_paths_ta:
        print(f"     {len(pair_paths_ta)} Tamil sentence-pair MP3s")
        print(f"     1 Tamil full sequential MP3 ({full_dur_ta:.0f}s)")
    print(f"     1 manifest.json")
    print(f"     Output: {output_dir}")
    print(f"{'='*60}\n")


# ── CLI ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Build audio assets for a Quranic Arabic lesson.",
        epilog="Example: python tools/build-lesson-audio.py tools/lesson-audio/lesson-01.yaml",
    )
    parser.add_argument(
        "definition",
        help="Path to lesson audio definition YAML file",
    )
    parser.add_argument(
        "-o", "--output-dir",
        help="Output directory (default: assets/audio/lessons/<lesson-id>/)",
    )
    parser.add_argument(
        "--lang",
        choices=["en", "ta", "all"],
        default="en",
        help="Language(s) to build TTS for: 'en' (English only, default), "
             "'ta' (Tamil only), 'all' (both English and Tamil)",
    )

    args = parser.parse_args()

    # Resolve output directory
    with open(args.definition, "r") as f:
        lesson = yaml.safe_load(f)

    output_dir = args.output_dir or os.path.join(
        "assets", "audio", "lessons", lesson["lesson_id"]
    )

    build_lesson(args.definition, output_dir, lang=args.lang)


if __name__ == "__main__":
    main()
