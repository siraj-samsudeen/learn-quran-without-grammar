#!/usr/bin/env python3
"""
Batch TTS generator using edge-tts (Microsoft Neural voices).

Usage:
    # Single file:
    python3 generate-tts-batch.py "And the remembrance of Allah is greater" output.mp3

    # Batch from JSON file:
    python3 generate-tts-batch.py --batch sentences.json --outdir ./audio/

    # sentences.json format:
    # [
    #   {"text": "And the remembrance of Allah is greater", "filename": "remembrance.mp3"},
    #   {"text": "In the name of Allah", "filename": "bismillah-en.mp3"}
    # ]

Requirements: pip3 install edge-tts
"""

import asyncio
import argparse
import json
import os
import random
import sys

# Voice pool — randomly rotated per file for variety
VOICE_POOL = [
    "en-US-AndrewNeural",       # Male, warm, confident
    "en-US-BrianNeural",        # Male, approachable, casual
    "en-US-ChristopherNeural",  # Male, reliable, authoritative
]

def pick_voice(explicit_voice: str = None) -> str:
    """Return explicit voice if given, otherwise random from pool."""
    return explicit_voice or random.choice(VOICE_POOL)

async def generate_single(text: str, output: str, voice: str = None):
    """Generate a single TTS audio file."""
    import edge_tts
    voice = pick_voice(voice)
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output)
    size = os.path.getsize(output)
    print(f"  ✓ {output} ({size:,} bytes) [{voice}]")

async def generate_batch(items: list, outdir: str, voice: str = None):
    """Generate multiple TTS audio files. Each file gets a random voice from the pool."""
    os.makedirs(outdir, exist_ok=True)
    for i, item in enumerate(items, 1):
        text = item["text"]
        filename = item["filename"]
        output = os.path.join(outdir, filename)
        print(f"  [{i}/{len(items)}] \"{text[:50]}{'...' if len(text) > 50 else ''}\"")
        await generate_single(text, output, voice)

def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio files using edge-tts")
    parser.add_argument("text", nargs="?", help="Text to speak (for single file mode)")
    parser.add_argument("output", nargs="?", help="Output MP3 path (for single file mode)")
    parser.add_argument("--voice", default=None,
                        help=f"Voice name (default: random from {VOICE_POOL})")
    parser.add_argument("--batch", help="Path to JSON file with batch items")
    parser.add_argument("--outdir", default=".", help="Output directory for batch mode")
    args = parser.parse_args()

    if args.batch:
        with open(args.batch) as f:
            items = json.load(f)
        voice_label = args.voice or f"random from {VOICE_POOL}"
        print(f"Generating {len(items)} audio files with voice: {voice_label}")
        asyncio.run(generate_batch(items, args.outdir, args.voice))
        print(f"✓ Done! {len(items)} files generated in {args.outdir}/")
    elif args.text and args.output:
        print(f"Generating: \"{args.text}\"")
        print(f"Voice: {args.voice or 'random from pool'}")
        asyncio.run(generate_single(args.text, args.output, args.voice))
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
