#!/usr/bin/env python3
"""Build a root-inventory JSON from local morphology + Uthmani text.

Replaces the live HTML-scrape + alquran.cloud pipeline described in
docs/prompts/batch_completion.md. Reads:

  tools/data/quran-morphology.txt  (mustafa0x/quran-morphology, GPL)
  tools/data/quran-uthmani.txt     (Tanzil Uthmani plain text)

and emits a JSON matching the schema of docs/roots/*.json. When an
existing JSON is passed, scored/used entries are preserved byte-for-byte
and only new candidate entries are appended.

Usage example (Lesson 3, rasul):

  python3 tools/build-root-inventory.py \
      --root رسل \
      --root-word رَسُول \
      --root-transliteration rasul \
      --three-letter "ر س ل" \
      --three-letter-en "ra sin lam" \
      --corpus-key rsl \
      --introduced-in-lesson 3 \
      --output docs/roots/rasul.json
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MORPH_PATH = REPO_ROOT / "tools" / "data" / "quran-morphology.txt"
UTHMANI_PATH = REPO_ROOT / "tools" / "data" / "quran-uthmani.txt"
DEFAULT_TRANSLATION_PATH = REPO_ROOT / "tools" / "data" / "quran-trans-en-sahih.txt"

SURAH_NAMES = [
    "Al-Fatihah", "Al-Baqarah", "Aal-e-Imran", "An-Nisa'", "Al-Ma'idah",
    "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
    "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
    "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Ta-Ha",
    "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
    "Ash-Shu'ara'", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
    "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir",
    "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
    "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
    "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
    "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
    "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah",
    "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
    "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
    "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah",
    "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa",
    "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj",
    "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
    "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
    "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat",
    "Al-Qari'ah", "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil",
    "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
    "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
]


def load_pipe_file(path: Path) -> dict[tuple[int, int], str]:
    """Load a Tanzil-style `surah|ayah|text` file into {(surah, ayah): text}.
    Blank lines and `#`-prefixed comment lines are skipped."""
    result: dict[tuple[int, int], str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "|" not in line:
            continue
        parts = line.split("|", 2)
        if len(parts) != 3 or not parts[0].isdigit():
            continue
        result[(int(parts[0]), int(parts[1]))] = parts[2]
    return result


def load_root_index(root: str) -> dict[tuple[int, int], dict[str, list[str]]]:
    """Return {(surah, ayah): {lemma: [surface_forms]}} for every verse
    containing the given root. Only segments whose FEATURES include
    ROOT:<root> are considered."""
    wanted_tag = f"ROOT:{root}"
    verse_map: dict[tuple[int, int], dict[str, list[str]]] = defaultdict(
        lambda: defaultdict(list)
    )
    with MORPH_PATH.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\n")
            if not line or line.startswith("#") or line.startswith("LOCATION"):
                continue
            parts = line.split("\t")
            if len(parts) != 4:
                continue
            loc, form, _tag, feats = parts
            if wanted_tag not in feats:
                continue
            feat_dict = {}
            for item in feats.split("|"):
                if ":" in item:
                    k, v = item.split(":", 1)
                    feat_dict[k] = v
            lemma = feat_dict.get("LEM", form)
            loc_parts = loc.split(":")
            surah, ayah = int(loc_parts[0]), int(loc_parts[1])
            verse_map[(surah, ayah)][lemma].append(form)
    return verse_map


def build_forms(root_index: dict[tuple[int, int], dict[str, list[str]]]) -> list[dict]:
    lemma_counts: dict[str, int] = defaultdict(int)
    for lemmas in root_index.values():
        for lemma, surfaces in lemmas.items():
            lemma_counts[lemma] += len(surfaces)
    return [
        {
            "form_arabic": lemma,
            "form_transliteration": None,
            "category": None,
            "gloss": None,
            "count": count,
            "taught_in_lesson": None,
            "taught_role": None,
        }
        for lemma, count in sorted(lemma_counts.items(), key=lambda kv: -kv[1])
    ]


def build_verse_entry(
    surah: int,
    ayah: int,
    lemmas: dict[str, list[str]],
    uthmani: dict[tuple[int, int], str],
    translations: dict[tuple[int, int], str] | None,
) -> dict:
    ref = f"{surah}:{ayah}"
    arabic_full = uthmani.get((surah, ayah), "")
    primary_lemma = max(lemmas.items(), key=lambda kv: len(kv[1]))[0]
    translation_draft = translations.get((surah, ayah)) if translations else None
    entry = {
        "ref": ref,
        "arabic_full": arabic_full,
        "arabic_fragment": None,
        "translation": translation_draft,
        "form": primary_lemma,
        "pattern": None,
        "type": "quran",
        "verified": True,
        "word_count": len(arabic_full.split()) if arabic_full else None,
        "surah_name": SURAH_NAMES[surah - 1] if 1 <= surah <= 114 else None,
        "juz": None,
        "status": "candidate",
        "lesson": None,
        "role": None,
        "scores": None,
        "score_notes": None,
    }
    if len(lemmas) > 1:
        others = [l for l in lemmas if l != primary_lemma]
        entry["notes"] = (
            f"Verse also contains other forms of this root: {', '.join(others)}"
        )
    return entry


def merge_with_existing(
    existing: dict, new_verses: list[dict], new_forms: list[dict]
) -> dict:
    kept_refs: set[str] = set()
    merged_verses: list[dict] = []
    for v in existing.get("verses", []):
        merged_verses.append(v)
        kept_refs.add(v["ref"])
    appended = 0
    for v in new_verses:
        if v["ref"] in kept_refs:
            continue
        merged_verses.append(v)
        appended += 1
    merged_verses.sort(
        key=lambda v: tuple(int(x) for x in v["ref"].split(":"))
    )

    existing_form_keys = {f["form_arabic"] for f in existing.get("forms", [])}
    merged_forms = list(existing.get("forms", []))
    for f in new_forms:
        if f["form_arabic"] not in existing_form_keys:
            merged_forms.append(f)

    out = dict(existing)
    out["verses"] = merged_verses
    out["forms"] = merged_forms
    out["_build_summary"] = {
        "existing_verses": len(existing.get("verses", [])),
        "appended_verses": appended,
        "total_verses": len(merged_verses),
    }
    return out


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--root", required=True, help="Arabic root key as used in morphology file (e.g. رسل)")
    p.add_argument("--root-word", required=True, help="Representative form word (e.g. رَسُول)")
    p.add_argument("--root-transliteration", required=True)
    p.add_argument("--three-letter", required=True, help='e.g. "ر س ل"')
    p.add_argument("--three-letter-en", required=True, help='e.g. "ra sin lam"')
    p.add_argument("--corpus-key", required=True, help="Buckwalter key for corpus.quran.com URL (e.g. rsl)")
    p.add_argument("--introduced-in-lesson", type=int, required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--fetched-date", default=None)
    p.add_argument(
        "--translation",
        default=str(DEFAULT_TRANSLATION_PATH),
        help="Optional Tanzil-format translation file. Pass empty string to disable.",
    )
    p.add_argument(
        "--translation-source",
        default="Saheeh International (via Tanzil.net)",
        help="Human-readable source label stored in the JSON under translation_source.",
    )
    args = p.parse_args()

    if not MORPH_PATH.exists():
        print(f"error: {MORPH_PATH} missing. Run the data vendor step.", file=sys.stderr)
        return 2
    if not UTHMANI_PATH.exists():
        print(f"error: {UTHMANI_PATH} missing.", file=sys.stderr)
        return 2

    uthmani = load_pipe_file(UTHMANI_PATH)

    translations: dict[tuple[int, int], str] | None = None
    if args.translation:
        trans_path = Path(args.translation)
        if not trans_path.is_absolute():
            trans_path = REPO_ROOT / trans_path
        if not trans_path.exists():
            print(f"error: translation file {trans_path} missing.", file=sys.stderr)
            return 2
        translations = load_pipe_file(trans_path)

    root_index = load_root_index(args.root)
    if not root_index:
        print(f"error: root {args.root!r} not found in morphology file.", file=sys.stderr)
        return 1

    new_verses = [
        build_verse_entry(s, a, lemmas, uthmani, translations)
        for (s, a), lemmas in sorted(root_index.items())
    ]
    new_forms = build_forms(root_index)
    total_occurrences = sum(f["count"] for f in new_forms)

    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = REPO_ROOT / out_path

    if out_path.exists():
        existing = json.loads(out_path.read_text(encoding="utf-8"))
        merged = merge_with_existing(existing, new_verses, new_forms)
        summary = merged.pop("_build_summary")
        payload = merged
    else:
        from datetime import date
        payload = {
            "root_word": args.root_word,
            "root_word_transliteration": args.root_transliteration,
            "three_letter_root": args.three_letter,
            "three_letter_root_english": args.three_letter_en,
            "corpus_url": f"https://corpus.quran.com/qurandictionary.jsp?q={args.corpus_key}",
            "fetched_date": args.fetched_date or date.today().isoformat(),
            "total_occurrences_in_quran": total_occurrences,
            "introduced_in_lesson": args.introduced_in_lesson,
            "translation_source": args.translation_source if translations else None,
            "forms": new_forms,
            "sentence_patterns": [],
            "verses": new_verses,
        }
        summary = {
            "existing_verses": 0,
            "appended_verses": len(new_verses),
            "total_verses": len(new_verses),
        }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"{out_path.name}: {summary['total_verses']} verses "
        f"({summary['existing_verses']} existing + {summary['appended_verses']} new), "
        f"{len(payload['forms'])} unique lemmas, "
        f"{payload['total_occurrences_in_quran']} total occurrences"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
