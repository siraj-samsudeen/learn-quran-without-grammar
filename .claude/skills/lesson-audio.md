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

---

## Reciter assignment — one per phrase

Every Qur'anic phrase must use a **different reciter** from the approved pool. Never repeat the same reciter twice in one lesson. Match reciter speed to segment length:

| Speed | Reciters | Use for |
|---|---|---|
| 🐢 Slow | Husary, Abdul Basit (both), Hani Rifai | Short segments (≤5 words) |
| 🚶 Moderate | Al-Hudhaifi, Alafasy, Abu Bakr Ash-Shatri | Medium segments (6–10 words) |
| 🏃 Faster | Yasser Ad-Dussary ⭐, As-Sudais, Maher Al-Muaiqly, Al-Juhainy, Saad Al-Ghamdi | Longer segments (11+ words) |

Full reciter pool with folder names: see `docs/decisions/ADR-005-reciters.md`.

**Yasser Ad-Dussary is the teacher's favourite** — prefer him for longer, emotionally resonant phrases.

---

## Two audio sources per sentence

Each trimmed sentence has **two audio definitions**:

```yaml
arabic_source:
  surah: 59
  ayah: 22
  end: 5.5                  # trimmed fragment — used for the learning card inline player
arabic_source_full:
  surah: 59
  ayah: 22                  # full ayah — used for Review in Order / Review Shuffled
```

- `arabic_source` — the precise clip shown on the lesson page (may be trimmed for precision)
- `arabic_source_full` — the complete ayah for the review audio build
- If `arabic_source_full` is omitted, the build script falls back to `arabic_source` for both
- Sentences that already use the full ayah (no trimming) only need `arabic_source`

**Why**: Learning cards train with precision (isolated target word). Review audio trains recognition in context — the student hears the full ayah and must spot the word, which mirrors real ṣalāh experience.

---

## Finding correct time fragments

Use `tools/find-audio-fragment.py` to detect natural pause points:

```bash
python tools/find-audio-fragment.py 59:22 --reciter Hani_Rifai_192kbps
python tools/find-audio-fragment.py 2:34 29:45 --reciter Husary_128kbps
```

Output shows silence start/end times and suggested `#t=` fragments. Use the midpoint of a natural pause as your cut point.

If no natural pause exists in any reciter:
1. Try a different reciter (some have waqf pauses others don't)
2. Use a hard cut — estimate based on word count proportion
3. Or extend the displayed text to the next natural pause boundary

**Fragment precision**: HTML5 `#t=` has ~0.5s browser variance. Buffer your cuts:
- Start: 0.2–0.5s **before** target word
- End: 0.5–1.0s **after** target word

**Confirmed working on Android Chrome**: HTML5 `#t=start,end` fragments work correctly on Android Chrome with EveryAyah CDN (verified April 2025). EveryAyah responds with `Accept-Ranges: bytes` which is required for seeking. The browser starts playback at the fragment start and stops at the end.

**Word-by-word audio (Quran Foundation CDN) — rejected for inline players**: `https://audio.qurancdn.com/wbw/SSS_AAA_WWW.mp3` has the same 296-day cache and correct individual word audio, but chaining words produces unnatural, broken-sounding recitation with audible gaps between words. Stick with `#t=` fragments from EveryAyah CDN for all inline players. Word-by-word may still be useful for truly isolated word teaching (e.g., vocabulary cards), but not for phrase-level audio.

---

## Common tasks

### Changing a translation, timing, or reciter

1. Edit the YAML (`tools/lesson-audio/lesson-NN.yaml`)
2. If timing changed, also update the lesson `.md` file's `<audio>` tag `#t=` fragment
3. Run validation: `python tools/validate-lesson-consistency.py lesson-NN`
4. Rebuild: `tools/rebuild-lesson-audio.sh lesson-NN`
5. Hard-refresh browser (`⌘+Shift+R`)

### Changing reciter for a sentence

Update **both** files:
- YAML: change `reciter:` field AND recalibrate `start:`/`end:` for the new reciter's pacing
- Lesson MD: change the EveryAyah URL reciter folder AND the `#t=` fragment

**Critical**: timings are reciter-specific. A `start: 24.2` for Abdul Basit points to a completely different word in Husary. Always re-run `find-audio-fragment.py` for the new reciter.

---

## Debugging Jekyll audio issues

### Problem: `WEBrick::HTTPStatus::RequestRangeNotSatisfiable`
**Cause**: Browser cached the old file size and sends a byte-range request that exceeds the new file's size.
**Fix**: Restart Jekyll server + hard-refresh browser.

### Problem: 0-byte MP3 in `_site/`
**Cause**: Jekyll's live-reload detects a changed MP3 but writes a 0-byte copy to `_site/`.
**Fix**: The `rebuild-lesson-audio.sh` script handles this. If rebuilding manually:
```bash
cp assets/audio/lessons/lesson-NN/*.mp3 _site/assets/audio/lessons/lesson-NN/
cp assets/audio/lessons/lesson-NN/manifest.json _site/assets/audio/lessons/lesson-NN/
```

### Problem: Shuffle player shows wrong sentence count
**Cause**: Browser cached old manifest.json.
**Fix**: Hard-refresh (`⌘+Shift+R`) or open incognito window.

### Problem: Audio plays wrong part of the ayah
**Cause**: Reciter mismatch — timings calibrated for a different reciter than the URL uses.
**Fix**: Run `python tools/validate-lesson-consistency.py lesson-NN`

### Problem: TTS produces gibberish for a word
**Cause**: Special transliteration characters (ʿ ā ī ū ṣ ḍ ṭ ẓ ḥ) in the YAML `english:` field.
**Fix**: Use plain ASCII in YAML `english:` (e.g., `Aad` not `ʿĀd`). The lesson `.md` page can use proper transliteration; the YAML cannot.

---

## TTS voice preferences

| Language | Voice | ID | Notes |
|----------|-------|----|-------|
| English | Andrew, Brian, Christopher | `en-US-AndrewNeural`, `en-US-BrianNeural`, `en-US-ChristopherNeural` | Randomly rotated per sentence by build script |
| Tamil | Valluvar | `ta-IN-ValluvarNeural` | Male Tamil voice — used for all Tamil TTS |
| Arabic | Hamed (Saudi) | `ar-SA-HamedNeural` | For teaching phrases and non-Qur'anic content |

## Multi-language audio build

The build script supports `--lang` flag for building audio in multiple languages:

```bash
# English only (default, backward-compatible)
python tools/build-lesson-audio.py tools/lesson-audio/lesson-NN.yaml

# Tamil only
python tools/build-lesson-audio.py tools/lesson-audio/lesson-NN.yaml --lang ta

# Both English and Tamil
python tools/build-lesson-audio.py tools/lesson-audio/lesson-NN.yaml --lang all
```

### YAML format for Tamil

Add `tamil:` field alongside `english:` for each sentence:

```yaml
- id: anchor-ilah
  english: "He is Allah — there is no god but He"
  tamil: "அவன் அல்லாஹ் — அவனைத் தவிர வேறு இறைவன் இல்லை"
```

### Output files

| File | Content |
|------|---------|
| `{id}.mp3` | Arabic + English TTS pair |
| `{id}-ta.mp3` | Arabic + Tamil TTS pair |
| `lesson-NN-full.mp3` | All EN pairs concatenated |
| `lesson-NN-full-ta.mp3` | All TA pairs concatenated |
| `manifest.json` | Includes `file_tamil`, `tamil`, `duration_tamil` per sentence |

---

## Inline audio on the lesson page

The lesson `.md` file contains its own `<audio>` tags separate from the build pipeline. These are **always** EveryAyah CDN URLs — the pipeline MP3s are for the sequential/shuffle players only.

### URL construction

```
https://everyayah.com/data/{RECITER_FOLDER}/SSSAAA.mp3#t=START,END
```

- `SSS` = surah number, zero-padded to 3 digits
- `AAA` = ayah number, zero-padded to 3 digits
- `RECITER_FOLDER` must match the YAML `reciter:` for that sentence

The reference line in markdown goes **after** the audio tag in the pattern:

```markdown
(Al-ʿAnkabūt 29:45) · <audio controls preload="none" src="..."></audio>
```

`lesson-cards.js` picks up the audio element and moves the reference to the bottom of the card.

### ⚠️ 296-day CDN cache warning

EveryAyah sets ~296-day cache. Once a student loads an audio file, it cannot be corrected remotely for nearly a year. **Verify timestamps before pushing** using `find-audio-fragment.py` and test in incognito.

---

## Review sections on the lesson page

Each lesson has two review sections after the practice cards:

```markdown
## Review in Order

<audio controls preload="none" src="{{ '/assets/audio/lessons/lesson-NN/lesson-NN-full.mp3' | relative_url }}"></audio>

<a class="download-link" href="{{ '/assets/audio/lessons/lesson-NN/lesson-NN-full.mp3' | relative_url }}" download>📥 Download full lesson audio</a>

---

## Review Shuffled

<div id="shuffle-player"></div>
```

- **Review in Order** — sequential MP3 with audio player + download link
- **Review Shuffled** — JavaScript shuffle player from manifest.json
- Both use **full ayahs** (not trimmed fragments) — trains recognition in context

---

## Audio build internals

- **Arabic audio**: downloaded from EveryAyah CDN per reciter, cached at `.cache/{reciter}/{SSSAAA}.mp3`
- **English TTS**: edge-tts with random male voice from pool (Andrew, Brian, Christopher)
- **Pair MP3**: Arabic + 2s silence + English
- **Full MP3**: all pairs concatenated with 3s silence between sentences
- **Cache**: use `--clean` flag to clear: `tools/rebuild-lesson-audio.sh lesson-NN --clean`
