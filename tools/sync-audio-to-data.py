#!/usr/bin/env python3
"""
sync-audio-to-data.py — copy per-lesson audio metadata from
tools/lesson-audio/lesson-NN.yaml + assets/audio/lessons/lesson-NN/manifest.json
into _data/audio/lesson-NN.json so Jekyll can read reciter,
timestamps, and duration via site.data.audio["lesson-NN"].

Jekyll's _data/ is build-time private, but neither the YAML
(in tools/) nor the manifest (in assets/) live under _data/,
so this script is the bridge. Run it whenever the YAML or
manifest changes.

Usage:
  tools/.venv/bin/python tools/sync-audio-to-data.py lesson-01
  tools/.venv/bin/python tools/sync-audio-to-data.py lesson-02
  tools/.venv/bin/python tools/sync-audio-to-data.py --all

Output shape (per lesson):
  {
    "lesson_id": "lesson-01",
    "title": "Lesson 1: Allahu Akbar",
    "slug": "lesson-01-allahu-akbar",
    "full_audio":       { "file": "lesson-01-full.mp3",    "duration": 180.5 },
    "full_audio_tamil": { "file": "lesson-01-full-ta.mp3", "duration": 185.2 },
    "sentences": {
      "anchor-ilah": {
        "id": "anchor-ilah",
        "role": "anchor",
        "ref": "59:22",
        "root": "...", "form": "...",
        "reciter": "Hani_Rifai_192kbps",
        "trim_start": null,
        "trim_end": 5.5,
        "has_full_ayah": true,
        "file": "anchor-ilah.mp3",
        "duration": 9.4,
        "file_tamil": "anchor-ilah-ta.mp3",
        "duration_tamil": 9.5
      },
      ...
    }
  }

Keyed by sentence `id` (not `ref`) because teaching phrases use
synthetic refs ("teaching-phrase" in yaml, "teaching:slug:anchor-N"
in _data/verses/teaching.json) which don't match. Downstream code
(e.g. prep dashboards) can look up by
  site.data.audio["lesson-NN"].sentences[lesson_use.audio_file | replace: ".mp3", ""]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit(
        "PyYAML not installed. Install it with:\n"
        "  tools/.venv/bin/pip install pyyaml"
    )

PROJECT = Path(__file__).resolve().parent.parent


def sync_lesson(lesson_id: str) -> bool:
    yaml_path = PROJECT / f"tools/lesson-audio/{lesson_id}.yaml"
    manifest_path = PROJECT / f"assets/audio/lessons/{lesson_id}/manifest.json"
    out_path = PROJECT / f"_data/audio/{lesson_id}.json"

    if not yaml_path.exists():
        print(f"SKIP {lesson_id}: {yaml_path.relative_to(PROJECT)} not found")
        return False
    if not manifest_path.exists():
        print(f"SKIP {lesson_id}: {manifest_path.relative_to(PROJECT)} not found")
        return False

    ydata = yaml.safe_load(yaml_path.read_text())
    mdata = json.loads(manifest_path.read_text())

    yaml_by_id = {s["id"]: s for s in ydata.get("sentences", [])}
    manifest_by_id = {s["id"]: s for s in mdata.get("sentences", [])}

    all_ids = list(yaml_by_id.keys())
    for mid in manifest_by_id:
        if mid not in all_ids:
            all_ids.append(mid)

    sentences = {}
    for sid in all_ids:
        y = yaml_by_id.get(sid, {})
        m = manifest_by_id.get(sid, {})
        arabic_source = y.get("arabic_source") or {}
        sentences[sid] = {
            "id": sid,
            "role": y.get("role") or m.get("role"),
            "ref": y.get("ref") or m.get("ref"),
            "root": y.get("root"),
            "form": y.get("form"),
            "reciter": y.get("reciter"),
            "trim_start": arabic_source.get("start"),
            "trim_end": arabic_source.get("end"),
            "has_full_ayah": y.get("arabic_source_full") is not None,
            "file": m.get("file"),
            "duration": m.get("duration"),
            "file_tamil": m.get("file_tamil"),
            "duration_tamil": m.get("duration_tamil"),
        }

    out = {
        "lesson_id": ydata.get("lesson_id") or lesson_id,
        "title": ydata.get("title"),
        "slug": ydata.get("slug"),
        "full_audio": {
            "file": mdata.get("full_audio"),
            "duration": mdata.get("full_duration"),
        },
        "full_audio_tamil": {
            "file": mdata.get("full_audio_tamil"),
            "duration": mdata.get("full_duration_tamil"),
        },
        "sentences": sentences,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(
        f"OK   {lesson_id}: wrote {out_path.relative_to(PROJECT)} "
        f"({len(sentences)} sentences)"
    )
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    parser.add_argument("lesson_id", nargs="?", help="e.g. lesson-01")
    parser.add_argument(
        "--all",
        action="store_true",
        help="sync every tools/lesson-audio/lesson-*.yaml file",
    )
    args = parser.parse_args()

    if args.all:
        yaml_dir = PROJECT / "tools/lesson-audio"
        found = sorted(yaml_dir.glob("lesson-*.yaml"))
        if not found:
            print("No lesson-*.yaml files found in tools/lesson-audio/")
            return 1
        for yp in found:
            sync_lesson(yp.stem)
        return 0

    if args.lesson_id:
        return 0 if sync_lesson(args.lesson_id) else 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
