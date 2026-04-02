#!/bin/bash
# generate-tts.sh — Generate English TTS audio using edge-tts (Microsoft Neural voices)
#
# Usage:
#   ./generate-tts.sh "Text to speak" output.mp3           # random voice from pool
#   ./generate-tts.sh "Text to speak" output.mp3 en-US-AndrewNeural  # specific voice
#
# Requirements: pip3 install edge-tts
#
# Voice pool (rotated randomly when no voice specified):
#   en-US-AndrewNeural       — Male, warm, confident
#   en-US-BrianNeural        — Male, approachable, casual
#   en-US-ChristopherNeural  — Male, reliable, authoritative

set -euo pipefail

TEXT="${1:?Usage: $0 \"text\" output.mp3 [voice]}"
OUTPUT="${2:?Usage: $0 \"text\" output.mp3 [voice]}"

# Voice pool — pick randomly if no voice specified
VOICES=(en-US-AndrewNeural en-US-BrianNeural en-US-ChristopherNeural)
if [ -n "${3:-}" ]; then
    VOICE="$3"
else
    VOICE="${VOICES[$((RANDOM % ${#VOICES[@]}))]}"
fi

# Check edge-tts is installed
if ! command -v edge-tts &>/dev/null; then
    echo "ERROR: edge-tts not found. Install with: pip3 install edge-tts" >&2
    exit 1
fi

echo "Generating: \"${TEXT}\""
echo "Voice: ${VOICE}"
echo "Output: ${OUTPUT}"

edge-tts --voice "${VOICE}" --text "${TEXT}" --write-media "${OUTPUT}" 2>/dev/null

if [ -f "${OUTPUT}" ]; then
    SIZE=$(ls -la "${OUTPUT}" | awk '{print $5}')
    DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${OUTPUT}" 2>/dev/null || echo "unknown")
    echo "✓ Generated ${OUTPUT} (${SIZE} bytes, ${DURATION}s)"
else
    echo "ERROR: Failed to generate audio" >&2
    exit 1
fi
