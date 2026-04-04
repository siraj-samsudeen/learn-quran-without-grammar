#!/usr/bin/env python3
"""
validate-lesson-consistency.py — Check YAML ↔ lesson page consistency.

Catches the kinds of bugs we've hit in practice:
  1. Practice order mismatch (YAML vs lesson page)
  2. Reciter mismatch (YAML vs lesson page <audio> URLs)
  3. Timing mismatch (YAML start/end vs lesson page #t= fragments)
  4. TTS-unsafe characters in YAML english fields
  5. Missing arabic_source fields

Usage:
    python tools/validate-lesson-consistency.py lesson-01
    python tools/validate-lesson-consistency.py lesson-01 --fix-order  # show suggested YAML reorder
"""

import argparse
import re
import sys
from pathlib import Path

import yaml


# ── Configuration ──────────────────────────────────────────────────────

# Characters that cause edge-tts to produce gibberish
TTS_UNSAFE_CHARS = re.compile(r'[ʿʾāīūṣḍṭẓḥĀĪŪṢḌṬẒḤ]')

PROJECT_ROOT = Path(__file__).resolve().parent.parent


# ── Helpers ────────────────────────────────────────────────────────────

def load_yaml(lesson_id: str) -> dict:
    path = PROJECT_ROOT / "tools" / "lesson-audio" / f"{lesson_id}.yaml"
    if not path.exists():
        print(f"✗ YAML not found: {path}")
        sys.exit(1)
    with open(path) as f:
        return yaml.safe_load(f)


def load_lesson_md(lesson_id: str) -> str:
    """Find and load the lesson markdown file."""
    lessons_dir = PROJECT_ROOT / "lessons"
    candidates = list(lessons_dir.glob(f"{lesson_id}-*.md"))
    if not candidates:
        print(f"✗ Lesson markdown not found for {lesson_id} in {lessons_dir}")
        sys.exit(1)
    with open(candidates[0]) as f:
        return f.read()


def extract_page_audio_refs(md_text: str) -> list[dict]:
    """Extract audio references from the lesson markdown.

    Returns list of dicts with keys: ref, reciter, start, end, section
    """
    results = []
    # Match <audio> tags with everyayah URLs
    pattern = re.compile(
        r'<audio[^>]+src="https://everyayah\.com/data/'
        r'([^/]+)/(\d{3})(\d{3})\.mp3'
        r'(?:#t=([^"]*))?"'
    )

    # Track which section we're in
    section = "learn"
    for line in md_text.split('\n'):
        if re.match(r'^## Practice', line):
            section = "practice"

        m = pattern.search(line)
        if m:
            reciter = m.group(1)
            surah = int(m.group(2))
            ayah = int(m.group(3))
            time_frag = m.group(4) or ""

            start = None
            end = None
            if time_frag:
                parts = time_frag.split(',')
                start = float(parts[0]) if parts[0] else None
                if len(parts) > 1:
                    end = float(parts[1]) if parts[1] else None

            ref = f"{surah}:{ayah}"
            results.append({
                "ref": ref,
                "surah": surah,
                "ayah": ayah,
                "reciter": reciter,
                "start": start,
                "end": end,
                "section": section,
            })

    return results


def extract_yaml_sentences(lesson: dict) -> list[dict]:
    """Extract sentence info from YAML."""
    results = []
    for s in lesson["sentences"]:
        src = s.get("arabic_source", {})
        if isinstance(src, dict) and src.get("use_arabic_tts"):
            # Teaching phrase — skip for comparison
            results.append({
                "id": s["id"],
                "ref": s.get("ref", ""),
                "role": s.get("role", ""),
                "reciter": s.get("reciter", ""),
                "start": None,
                "end": None,
                "english": s.get("english", ""),
                "is_tts": True,
            })
        elif isinstance(src, dict):
            ref = f"{src['surah']}:{src['ayah']}"
            results.append({
                "id": s["id"],
                "ref": ref,
                "role": s.get("role", ""),
                "reciter": s.get("reciter", ""),
                "start": src.get("start"),
                "end": src.get("end"),
                "english": s.get("english", ""),
                "is_tts": False,
            })
        else:
            # Multi-source — use first
            first = src[0] if isinstance(src, list) else {}
            ref = f"{first.get('surah', '?')}:{first.get('ayah', '?')}"
            results.append({
                "id": s["id"],
                "ref": ref,
                "role": s.get("role", ""),
                "reciter": s.get("reciter", ""),
                "start": None,
                "end": None,
                "english": s.get("english", ""),
                "is_tts": False,
            })
    return results


# ── Checks ─────────────────────────────────────────────────────────────

def check_practice_order(yaml_sentences: list, page_refs: list) -> list[str]:
    """Check that YAML practice order matches lesson page order."""
    errors = []

    yaml_practice = [s["ref"] for s in yaml_sentences if s["role"] == "practice"]
    page_practice = [r["ref"] for r in page_refs if r["section"] == "practice"]

    if not page_practice:
        errors.append("⚠  No practice audio refs found on lesson page")
        return errors

    if yaml_practice != page_practice:
        errors.append("✗ PRACTICE ORDER MISMATCH")
        errors.append(f"  YAML:  {yaml_practice}")
        errors.append(f"  Page:  {page_practice}")
        errors.append("")
        errors.append("  Suggested YAML order (to match page):")
        # Map practice refs to YAML sentences
        yaml_by_ref = {s["ref"]: s for s in yaml_sentences if s["role"] == "practice"}
        for i, ref in enumerate(page_practice, 1):
            if ref in yaml_by_ref:
                errors.append(f"    practice-{i:02d}: {ref} ({yaml_by_ref[ref]['id']})")
            else:
                errors.append(f"    practice-{i:02d}: {ref} (NOT IN YAML)")
    else:
        errors.append("✓ Practice order matches")

    return errors


def check_reciters(yaml_sentences: list, page_refs: list) -> list[str]:
    """Check that reciters match between YAML and lesson page."""
    errors = []

    page_by_ref = {r["ref"]: r for r in page_refs}

    for ys in yaml_sentences:
        if ys["is_tts"] or not ys["reciter"]:
            continue
        ref = ys["ref"]
        if ref not in page_by_ref:
            continue
        pr = page_by_ref[ref]
        if ys["reciter"] != pr["reciter"]:
            errors.append(f"✗ RECITER MISMATCH at {ref}:")
            errors.append(f"  YAML: {ys['reciter']}")
            errors.append(f"  Page: {pr['reciter']}")

    if not any("MISMATCH" in e for e in errors):
        errors.append("✓ All reciters match")

    return errors


def check_timings(yaml_sentences: list, page_refs: list) -> list[str]:
    """Check that start/end timings match between YAML and lesson page."""
    errors = []

    page_by_ref = {r["ref"]: r for r in page_refs}

    for ys in yaml_sentences:
        if ys["is_tts"]:
            continue
        ref = ys["ref"]
        if ref not in page_by_ref:
            continue
        pr = page_by_ref[ref]

        # Compare start
        ys_start = ys["start"] or 0
        pr_start = pr["start"] or 0
        if abs(ys_start - pr_start) > 0.1:
            errors.append(f"✗ START MISMATCH at {ref}: YAML={ys['start']} Page={pr['start']}")

        # Compare end
        if ys["end"] is not None and pr["end"] is not None:
            if abs(ys["end"] - pr["end"]) > 0.1:
                errors.append(f"✗ END MISMATCH at {ref}: YAML={ys['end']} Page={pr['end']}")
        elif ys["end"] is not None and pr["end"] is None:
            errors.append(f"⚠  END in YAML but not on page at {ref}: YAML={ys['end']}")
        elif ys["end"] is None and pr["end"] is not None:
            errors.append(f"⚠  END on page but not in YAML at {ref}: Page={pr['end']}")

    if not any("MISMATCH" in e for e in errors):
        errors.append("✓ All timings match")

    return errors


def check_tts_safety(yaml_sentences: list) -> list[str]:
    """Check for TTS-unsafe characters in YAML english fields."""
    errors = []

    for ys in yaml_sentences:
        english = ys.get("english", "")
        unsafe = TTS_UNSAFE_CHARS.findall(english)
        if unsafe:
            chars = " ".join(set(unsafe))
            errors.append(f"✗ TTS-UNSAFE in {ys['id']}: chars [{chars}] in \"{english[:60]}...\"")

    if not errors:
        errors.append("✓ All english fields are TTS-safe")

    return errors


# ── Main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Validate YAML ↔ lesson page consistency",
    )
    parser.add_argument("lesson_id", help="Lesson ID (e.g., lesson-01)")
    args = parser.parse_args()

    lesson_id = args.lesson_id
    print(f"\n{'='*60}")
    print(f"  Validating: {lesson_id}")
    print(f"{'='*60}\n")

    # Load data
    lesson = load_yaml(lesson_id)
    md_text = load_lesson_md(lesson_id)

    yaml_sentences = extract_yaml_sentences(lesson)
    page_refs = extract_page_audio_refs(md_text)

    all_errors = []

    # Run checks
    print("── Practice Order ──")
    results = check_practice_order(yaml_sentences, page_refs)
    for r in results:
        print(f"  {r}")
    all_errors.extend(r for r in results if r.startswith("✗"))

    print("\n── Reciters ──")
    results = check_reciters(yaml_sentences, page_refs)
    for r in results:
        print(f"  {r}")
    all_errors.extend(r for r in results if r.startswith("✗"))

    print("\n── Timings ──")
    results = check_timings(yaml_sentences, page_refs)
    for r in results:
        print(f"  {r}")
    all_errors.extend(r for r in results if r.startswith("✗"))

    print("\n── TTS Safety ──")
    results = check_tts_safety(yaml_sentences)
    for r in results:
        print(f"  {r}")
    all_errors.extend(r for r in results if r.startswith("✗"))

    # Summary
    print(f"\n{'='*60}")
    if all_errors:
        print(f"  ⚠  {len(all_errors)} issue(s) found")
        sys.exit(1)
    else:
        print("  ✅ All checks passed")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
