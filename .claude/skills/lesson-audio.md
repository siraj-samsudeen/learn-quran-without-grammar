# Skill: Working with Lesson Audio

## Overview

Each lesson has audio assets built from a YAML definition. The pipeline:
`YAML → build-lesson-audio.py → MP3s + manifest.json → Jekyll serves to browser`

## Key files per lesson

| File | Purpose |
|------|---------|
| `tools/lesson-audio/lesson-NN.yaml` | Source of truth — sentences, reciters, timings, English text |
| `tools/build-lesson-audio.py` | Build script — downloads Arabic, generates English TTS, concatenates |
| `assets/audio/lessons/lesson-NN/*.mp3` | Built output — individual pairs + full sequential |
| `assets/audio/lessons/lesson-NN/manifest.json` | Metadata for the shuffle player |
| `lessons/lesson-NN-slug.md` | Lesson page — has inline `<audio>` tags with EveryAyah CDN URLs |

## Common tasks

### Changing a translation, timing, or reciter

1. Edit the YAML (`tools/lesson-audio/lesson-NN.yaml`)
2. If timing changed, also update the lesson `.md` file's `<audio>` tag `#t=` fragment
3. Run validation: `python tools/validate-lesson-consistency.py lesson-NN`
4. Rebuild: `tools/rebuild-lesson-audio.sh lesson-NN`
5. Hard-refresh browser (`⌘+Shift+R`)

### Changing reciter for a sentence

Update **both** files:
- YAML: change `reciter:` field AND update `start:`/`end:` if the new reciter has different pacing
- Lesson MD: change the EveryAyah URL reciter folder AND the `#t=` fragment

**Critical**: timings are reciter-specific. A `start: 20.2` for Abdul Basit points to a completely different word in Husary.

### Adding a new sentence

1. Add entry to YAML with: id, role, root, form, ref, reciter, arabic_source, arabic_text, english
2. Add the verse card to the lesson `.md` (follow existing heading pattern)
3. Validate + rebuild

### Reordering practice sentences

The YAML order determines the audio playback order (both full sequential and shuffle manifest). It **must match** the lesson page order. Always validate after reordering.

## Debugging Jekyll audio issues

### Problem: `WEBrick::HTTPStatus::RequestRangeNotSatisfiable`
**Cause**: Browser cached the old file size and sends a byte-range request that exceeds the new file's size.
**Fix**: Restart Jekyll server + hard-refresh browser.

### Problem: 0-byte MP3 in `_site/`
**Cause**: Jekyll's live-reload detects a changed MP3 but writes a 0-byte copy to `_site/`. This is a known WEBrick bug with large binary files during incremental regeneration.
**Fix**: The `rebuild-lesson-audio.sh` script handles this — it copies all files to `_site/` after building. If you rebuild manually, always copy:
```bash
cp assets/audio/lessons/lesson-NN/*.mp3 _site/assets/audio/lessons/lesson-NN/
cp assets/audio/lessons/lesson-NN/manifest.json _site/assets/audio/lessons/lesson-NN/
```

### Problem: Shuffle player shows wrong sentence count
**Cause**: Browser cached old manifest.json.
**Fix**: Hard-refresh (`⌘+Shift+R`) or open incognito window.

### Problem: Audio plays wrong part of the ayah
**Cause**: Almost certainly a reciter mismatch — the YAML specifies timings calibrated for one reciter but the audio was downloaded from a different reciter. Run:
```bash
python tools/validate-lesson-consistency.py lesson-NN
```

### Problem: TTS produces gibberish for a word
**Cause**: Special transliteration characters (ʿ ā ī ū ṣ ḍ ṭ ẓ ḥ) in the YAML `english:` field. Edge-tts can't pronounce them.
**Fix**: Use plain ASCII in YAML `english:` (e.g., `Aad` not `ʿĀd`). The lesson page `.md` can still use proper transliteration. The validator catches this:
```bash
python tools/validate-lesson-consistency.py lesson-NN
```

## Audio build internals

- **Arabic audio**: downloaded from EveryAyah CDN per reciter, cached at `.cache/{reciter}/{SSSAAA}.mp3`
- **English TTS**: edge-tts with random male voice from pool (Andrew, Brian, Christopher)
- **Pair MP3**: Arabic + 0.5s silence + English
- **Full MP3**: all pairs concatenated with 1s silence between sentences
- **Cache**: use `--clean` flag to clear: `tools/rebuild-lesson-audio.sh lesson-NN --clean`
