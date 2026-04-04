#!/usr/bin/env bash
# rebuild-lesson-audio.sh — Build lesson audio and sync to _site for local dev
#
# Usage:
#   tools/rebuild-lesson-audio.sh lesson-01
#   tools/rebuild-lesson-audio.sh lesson-01 --clean   # clear cache first
#
# What it does:
#   1. Runs build-lesson-audio.py with the lesson YAML
#   2. Copies all output files to _site/ (avoids Jekyll live-reload corruption)
#   3. Verifies file integrity (no 0-byte files)
#   4. Reports file sizes and total duration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Parse arguments ──────────────────────────────────────────────────

if [ $# -lt 1 ]; then
    echo "Usage: $0 <lesson-id> [--clean]"
    echo "  e.g.: $0 lesson-01"
    echo "        $0 lesson-01 --clean   # clear audio cache first"
    exit 1
fi

LESSON_ID="$1"
CLEAN=false
if [ "${2:-}" = "--clean" ]; then
    CLEAN=true
fi

YAML_PATH="$PROJECT_ROOT/tools/lesson-audio/${LESSON_ID}.yaml"
OUTPUT_DIR="$PROJECT_ROOT/assets/audio/lessons/${LESSON_ID}"
SITE_DIR="$PROJECT_ROOT/_site/assets/audio/lessons/${LESSON_ID}"

if [ ! -f "$YAML_PATH" ]; then
    echo "✗ YAML not found: $YAML_PATH"
    exit 1
fi

# ── Optional: clear cache ───────────────────────────────────────────

if [ "$CLEAN" = true ]; then
    echo "🗑  Clearing cache: ${OUTPUT_DIR}/.cache/"
    rm -rf "${OUTPUT_DIR}/.cache/"
fi

# ── Build ────────────────────────────────────────────────────────────

echo ""
echo "🔨 Building audio for ${LESSON_ID}..."
echo ""
python3 "$PROJECT_ROOT/tools/build-lesson-audio.py" "$YAML_PATH" -o "$OUTPUT_DIR"

# ── Copy to _site ───────────────────────────────────────────────────

if [ -d "$SITE_DIR" ]; then
    echo ""
    echo "📋 Copying to _site/ (prevents Jekyll live-reload corruption)..."
    for f in "$OUTPUT_DIR"/*.mp3 "$OUTPUT_DIR"/manifest.json; do
        if [ -f "$f" ]; then
            cp "$f" "$SITE_DIR/$(basename "$f")"
        fi
    done
    echo "   ✓ All files copied to _site/"
else
    echo ""
    echo "⚠  _site/ directory not found — skipping copy (Jekyll not running?)"
fi

# ── Verify integrity ────────────────────────────────────────────────

echo ""
echo "🔍 Verifying file integrity..."
ERRORS=0

for f in "$OUTPUT_DIR"/*.mp3; do
    SIZE=$(stat -f%z "$f" 2>/dev/null || stat --format=%s "$f" 2>/dev/null)
    NAME=$(basename "$f")
    if [ "$SIZE" = "0" ]; then
        echo "   ✗ $NAME — 0 bytes (CORRUPT)"
        ERRORS=$((ERRORS + 1))
    else
        # Get duration via ffprobe
        DUR=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$f" 2>/dev/null || echo "?")
        if [ "$DUR" != "?" ]; then
            DUR=$(printf "%.1f" "$DUR")
        fi
        SIZE_KB=$((SIZE / 1024))
        echo "   ✓ $NAME — ${SIZE_KB}KB, ${DUR}s"
    fi
done

# Also check _site copies
if [ -d "$SITE_DIR" ]; then
    for f in "$SITE_DIR"/*.mp3; do
        SIZE=$(stat -f%z "$f" 2>/dev/null || stat --format=%s "$f" 2>/dev/null)
        NAME=$(basename "$f")
        if [ "$SIZE" = "0" ]; then
            echo "   ✗ _site/$NAME — 0 bytes (CORRUPT — Jekyll live-reload issue)"
            ERRORS=$((ERRORS + 1))
        fi
    done
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
    echo "⚠  $ERRORS file(s) have issues — check above"
    exit 1
else
    echo "✅ All files OK. Hard-refresh browser (⌘+Shift+R) to test."
fi
