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

## TTS voice preferences

| Language | Voice | ID | Notes |
|----------|-------|----|-------|
| English | Andrew, Brian, Christopher | `en-US-AndrewNeural`, `en-US-BrianNeural`, `en-US-ChristopherNeural` | Randomly rotated per sentence by build script |
| Arabic | Hamed (Saudi) | `ar-SA-HamedNeural` | Preferred male Arabic voice for teaching phrases and non-Qur'anic content |

Other Arabic male voices available but not preferred: `ar-AE-HamdanNeural` (Emirati), `ar-EG-ShakirNeural` (Egyptian).

To generate Arabic TTS manually:
```bash
edge-tts --voice ar-SA-HamedNeural --text "Arabic text here" --write-media output.mp3
```

## Inline audio on the lesson page

The lesson `.md` file contains its own `<audio>` tags separate from the build pipeline. These are **always** EveryAyah CDN URLs — the pipeline MP3s are for the sequential/shuffle players, not inline cards.

### URL construction

```
https://everyayah.com/data/{RECITER_FOLDER}/SSSAAA.mp3#t=START,END
```

- `SSS` = surah number, zero-padded to **3 digits** (e.g., surah 7 → `007`)
- `AAA` = ayah number, zero-padded to **3 digits** (e.g., ayah 12 → `012`)
- `#t=START,END` = HTML5 Media Fragment — seconds, decimals OK (e.g., `#t=8,21`)
- `RECITER_FOLDER` must match the YAML `reciter:` for that sentence — timings are reciter-specific

### Required conventions

Every inline audio block must follow this exact structure:

```html
<p class="audio-label">🔊 Description · Arabic phrase</p>
<audio controls preload="none" src="https://everyayah.com/data/Husary_128kbps/007012.mp3#t=8,21"></audio>
```

- `preload="none"` — always. Never omit. Prevents the browser loading all audio on page load.
- `<p class="audio-label">` — always immediately above the `<audio>` tag. Never audio without a label.
- The label describes what the clip is: recitation reference, Arabic phrase or translation hint.

### ⚠️ 296-day CDN cache warning

EveryAyah sets `Cache-Control: max-age=25574400` (~296 days). Once a student's browser loads an audio file, it is cached locally for almost a year.

**This means:** a wrong `#t=` fragment pushed to production **cannot be corrected** in students' browsers until the cache expires. There is no way to invalidate it remotely.

**Before pushing any audio timestamp change:**
1. Use `tools/find-audio-fragment.py` (or listen manually) to verify start/end seconds
2. Test in an incognito window (no cache) to confirm the clip
3. Only push when confident — treat timestamps as near-irreversible once live

**Existing timestamps:** do not adjust them without a clear reason. A ±0.5s drift is acceptable — browsers have ~0.5s tolerance variance anyway. Only change timestamps if a clip is audibly wrong (wrong word, cut off, missing context).

### Fragment precision

HTML5 Media Fragments (`#t=`) are a W3C standard but browser playback has ~0.5s variance. This is expected behaviour, not a bug. Choose start/end times with a small buffer:
- Start: 0.2–0.5s **before** the target word
- End: 0.5–1.0s **after** the target word ends

## Audio build internals

- **Arabic audio**: downloaded from EveryAyah CDN per reciter, cached at `.cache/{reciter}/{SSSAAA}.mp3`
- **English TTS**: edge-tts with random male voice from pool (Andrew, Brian, Christopher)
- **Pair MP3**: Arabic + 0.5s silence + English
- **Full MP3**: all pairs concatenated with 1s silence between sentences
- **Cache**: use `--clean` flag to clear: `tools/rebuild-lesson-audio.sh lesson-NN --clean`
