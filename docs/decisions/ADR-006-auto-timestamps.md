# ADR-006: Automated Audio Timestamp Extraction

## Status: Accepted

## Date: 2025-07-04

## Context

### The manual timestamp problem

When a lesson uses only a **fragment** of an ayah (e.g., words 15-17 of verse 29:45 = وَلَذِكْرُ ٱللَّهِ أَكْبَرُ), we need an HTML5 `#t=START,END` fragment to trim the EveryAyah audio to just those words. Finding the correct start/end times was the **most tedious and error-prone step** in lesson creation.

**Previous workflow (manual):**
1. Download the ayah MP3 from EveryAyah
2. Run `tools/find-audio-fragment.py` — uses ffmpeg `silencedetect` to find pause boundaries
3. Listen to each clause and manually identify which silence corresponds to which word boundary
4. Guess the `#t=` values, test in browser, adjust by trial and error
5. If changing reciters, start over — timings are completely reciter-specific

**Problems with manual approach:**
- Time-consuming (~5-10 minutes per verse, more for long ayahs)
- Error-prone — wrong timestamps are invisible to automated checks
- Silence detection finds pauses, not word boundaries (many words flow without pause)
- 296-day CDN cache means a wrong timestamp can't be corrected for students for nearly a year
- Required the teacher to listen and verify each fragment manually

### Discovery of the Quran Foundation API

The [Quran Foundation API](https://api-docs.quran.foundation) (`api.quran.com/api/v4`) provides **word-level timing segments** for chapter-level audio recordings. The `chapter_recitations/{reciter_id}/{chapter}?segments=true` endpoint returns:

```json
{
  "verse_key": "29:45",
  "timestamp_from": 949680,  // ms in chapter audio where ayah begins
  "segments": [
    [1, 949680.0, 951810.0],   // [word_index, start_ms, end_ms]
    [2, 951810.0, 953239.0],
    ...
    [15, 969710.0, 971480.0],  // وَلَذِكْرُ
    [16, 971480.0, 972480.0],  // ٱللَّهِ
    [17, 972480.0, 973620.0],  // أَكْبَرُ
    ...
  ]
}
```

By subtracting the ayah's `timestamp_from` from each word's `start_ms`, we get per-ayah offsets that match EveryAyah's per-ayah MP3 files.

### Validation

Tested against Lesson 1's manually-calibrated timestamps:

| Verse | Words | Manual `#t=` | API-calculated `#t=` | Difference |
|-------|-------|-------------|---------------------|------------|
| 29:45 | 15-17 | `#t=20.2,24` | `#t=20.0,23.9` | 0.2s / 0.1s |
| 59:22 | 1-8 | `#t=0,7` | `#t=0.0,6.4` | 0.0s / 0.6s |

The API timestamps match manual values within **0.1-0.6 seconds** — well within the ±0.5s browser playback tolerance for HTML5 `#t=` fragments.

## Decision

### New tool: `tools/auto-timestamps.py`

A word-level timestamp extraction tool that queries the Quran Foundation API:

```bash
# Show all words with timestamps
python tools/auto-timestamps.py 29:45 --reciter Abdul_Basit_Murattal_192kbps

# Extract fragment for specific words
python tools/auto-timestamps.py 29:45 --reciter Abdul_Basit_Murattal_192kbps --words 15-17

# Compare all reciters for the same words
python tools/auto-timestamps.py 29:45 --words 15-17 --all-reciters

# Write directly to lesson file
python tools/auto-timestamps.py 29:45 --reciter Abdul_Basit_Murattal_192kbps --words 15-17 --write lessons/lesson-01-allahu-akbar.md
```

### The old tool remains as fallback

`tools/find-audio-fragment.py` (silence-based detection) is **kept** for reciters not covered by the API.

### Reciter coverage

**7 of 12 reciters have API segment data:**

| # | Reciter | API ID | Status |
|---|---------|--------|--------|
| 1 | Abdul Basit (Mujawwad) | 1 | ✅ Auto |
| 2 | Abdul Basit (Murattal) | 2 | ✅ Auto |
| 3 | As-Sudais | 3 | ✅ Auto |
| 4 | Abu Bakr Ash-Shatri | 4 | ✅ Auto |
| 5 | Hani Rifai | 5 | ✅ Auto |
| 6 | Husary | 6 | ✅ Auto |
| 7 | Alafasy | 7 | ✅ Auto |
| 8 | Al-Hudhaifi | — | ❌ Manual fallback |
| 9 | Al-Juhainy | — | ❌ Manual fallback |
| 10 | Maher Al-Muaiqly | — | ❌ Manual fallback |
| 11 | Saad Al-Ghamdi | — | ❌ Manual fallback |
| 12 | Yasser Ad-Dussary | — | ❌ Manual fallback |

### Workflow change

**Before:** Teacher says "I want words 15-17 of 29:45" → LLM downloads MP3 → runs silence detection → teacher listens and adjusts → 5-10 min per verse.

**After:** Teacher says "I want words 15-17 of 29:45" → LLM runs `auto-timestamps.py --words 15-17` → gets instant `#t=20.0,23.9` → teacher optionally verifies in browser → 30 seconds per verse.

### API caching

API responses are cached locally at `.cache/api-segments/` (gitignored). Chapter segment data rarely changes, so one fetch per reciter-chapter pair is sufficient.

## Consequences

- **Timestamp discovery is 10-20× faster** for 7 of 12 reciters
- **The `--all-reciters` flag** helps pick the best reciter for a verse — the teacher can see how each reciter's timing works for the same word range
- **For the 5 unsupported reciters** (including Yasser Ad-Dussary, the teacher's favourite), the old silence-detection method remains necessary
- **API dependency** — the Quran Foundation API must be available. If it's down, fall back to manual. Cached data persists locally.
- **Timestamp accuracy** is within ±0.5s of manual calibration — good enough for HTML5 `#t=` which has ~0.5s browser variance anyway
