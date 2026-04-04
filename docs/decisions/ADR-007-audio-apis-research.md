# ADR-007: Audio API Research — Alternatives Evaluated

## Status: Research Complete (2025-07-04)

## Purpose

During the development of `tools/auto-timestamps.py`, we evaluated multiple APIs and tools for obtaining word-level audio timestamps for Qur'anic recitations. This document logs all findings so future sessions can reference them without re-researching.

---

## 1. Quran Foundation API ✅ ADOPTED

**URL:** `https://api.quran.com/api/v4/`  
**Docs:** `https://api-docs.quran.foundation`  
**Auth:** No authentication required for content APIs  
**Rate limits:** Not documented; observed intermittent 503 errors (Varnish cache)

### Key endpoints used

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `GET /chapter_recitations/{reciter_id}/{chapter}?segments=true` | Word-level timestamps for all ayahs in a chapter | `/chapter_recitations/2/29?segments=true` |
| `GET /verses/by_key/{verse_key}?words=true&word_fields=text_uthmani` | Word-by-word text, translation, transliteration | `/verses/by_key/29:45?words=true&word_fields=text_uthmani` |
| `GET /resources/recitations` | List all available reciters with IDs | `/resources/recitations` |
| `GET /resources/chapter_reciters` | List reciters with chapter-level audio | `/resources/chapter_reciters` |

### Segment data format

```json
{
  "verse_key": "29:45",
  "timestamp_from": 949680,        // ms — ayah start in chapter audio
  "timestamp_to": 979070,          // ms — ayah end in chapter audio
  "segments": [
    [1, 949680.0, 951810.0],       // [word_index, start_ms, end_ms]
    [2, 951810.0, 953239.0],
    ...
  ]
}
```

**Critical note:** Timestamps are relative to the **full chapter audio file** (downloadable from `audio_url`), NOT per-ayah EveryAyah files. To convert to per-ayah offsets:
```
per_ayah_start = (word_start_ms - timestamp_from) / 1000.0
```

### Available reciters (12 total, segment data for all 12)

| API ID | Reciter | EveryAyah Folder | Notes |
|--------|---------|-----------------|-------|
| 1 | AbdulBaset AbdulSamad (Mujawwad) | `Abdul_Basit_Mujawwad_128kbps` | ✅ Segment data |
| 2 | AbdulBaset AbdulSamad (Murattal) | `Abdul_Basit_Murattal_192kbps` | ✅ Segment data |
| 3 | Abdur-Rahman as-Sudais | `Abdurrahmaan_As-Sudais_192kbps` | ✅ Segment data |
| 4 | Abu Bakr al-Shatri | `Abu_Bakr_Ash-Shaatree_128kbps` | ✅ Segment data |
| 5 | Hani ar-Rifai | `Hani_Rifai_192kbps` | ✅ Segment data |
| 6 | Mahmoud Khalil Al-Husary | `Husary_128kbps` | ✅ Segment data |
| 7 | Mishari Rashid al-Afasy | `Alafasy_128kbps` | ✅ Segment data |
| 8 | Mohamed Siddiq al-Minshawi (Mujawwad) | — | Not in our reciter pool |
| 9 | Mohamed Siddiq al-Minshawi (Murattal) | — | Not in our reciter pool |
| 10 | Sa'ud ash-Shuraym | — | Not in our reciter pool |
| 11 | Mohamed al-Tablawi | — | Not in our reciter pool |
| 12 | Mahmoud Khalil Al-Husary (Muallim) | — | Teaching style, not in our pool |

### Reciters in our pool WITHOUT API data

| Reciter | EveryAyah Folder | Fallback method |
|---------|-----------------|-----------------|
| Ali Al-Hudhaifi | `Hudhaify_128kbps` | `find-audio-fragment.py` (silence detection) |
| Abdullaah Al-Juhainy | `Abdullaah_3awwaad_Al-Juhaynee_128kbps` | Silence detection |
| Maher Al-Muaiqly | `MaherAlMuaiqly128kbps` | Silence detection |
| Saad Al-Ghamdi | `Ghamadi_40kbps` | Silence detection |
| **Yasser Ad-Dussary** ⭐ | `Yasser_Ad-Dussary_128kbps` | Silence detection (teacher's favourite) |

### Validation results

| Verse | Reciter | Words | Manual `#t=` | API `#t=` | Δ start | Δ end |
|-------|---------|-------|-------------|-----------|---------|-------|
| 29:45 | Abdul Basit Murattal | 15-17 | `20.2,24` | `20.0,23.9` | 0.2s | 0.1s |
| 59:22 | Hani Rifai | 1-8 | `0,7` | `0.0,6.4` | 0.0s | 0.6s |

### Known issues
- **Intermittent 503 errors** — Varnish cache server sometimes returns 503. Retry usually works.
- **urllib blocked** — Python's `urllib.request` gets 403 Forbidden. Use `curl` or add browser-like User-Agent.
- **Chapter audio timestamps vs per-ayah** — Must subtract `timestamp_from` to get EveryAyah-compatible offsets.

### Other useful endpoints (not yet used)

| Endpoint | Potential use |
|----------|--------------|
| `GET /audio/reciters/{id}/timestamp?verse_key=X&word_from=N&word_to=M` | Direct word-range timestamp query (documented but returned 404 during testing — may be v4.0.0 only or require auth) |
| `GET /audio/reciters/{id}/lookup?chapter_number=N&timestamp=MS` | Reverse lookup: "which verse is at this timestamp?" |
| `GET /verses/by_key/{key}?translations=131` | Get specific translation (131 = Sahih International) |

---

## 2. quran-align (GitHub: cpfair/quran-align) ⏸️ NOT ADOPTED

**URL:** `https://github.com/cpfair/quran-align`  
**Stars:** 242 | **License:** MIT  
**Last release:** 2016-11-24  
**Language:** C++ (94.6%), Python (2.2%)

### What it does
Produces word-accurate timestamps for any EveryAyah-style audio recording using CMU Sphinx speech recognition. Trains a speaker-specific acoustic model, then aligns recognized words to reference text.

### Pre-generated data
A single release (2016-11-24) contains pre-generated timing data. The download link returned "Not Found" during testing — may need to be regenerated.

### Data format
```json
[
  {
    "surah": 1,
    "ayah": 1,
    "segments": {
      [word_start_index, word_end_index, start_msec, end_msec],
      ...
    },
    "stats": {
      "insertions": 123,
      "deletions": 456,
      "transpositions": 789
    }
  }
]
```

Note: `word_start_index` and `word_end_index` are 0-based (unlike the Quran Foundation API which is 1-based).

### Accuracy
The author reports: word timestamps fall < 73ms from reference data on average, with 98.5-99.9% of words individually segmented.

### Why not adopted
- **Pre-generated data unavailable** (download link broken)
- **Would require running the tool from source** — needs CMU Sphinx, SphinxTrain, cmuclmtk, a C++11 compiler, EveryAyah audio downloads
- **Heavy setup** for a problem the Quran Foundation API already solves for 7/12 reciters
- **Could be valuable for unsupported reciters** (Yasser Ad-Dussary, etc.) if we ever need word-level data for them — would require downloading their full EveryAyah corpus and running alignment

### Future consideration
If we need word-level timestamps for Yasser Ad-Dussary (teacher's favourite, not in Quran Foundation API), quran-align could be the path — but it's a significant setup effort.

---

## 3. lafzize (SourceHut: ~rehandaphedar/lafzize) ⏸️ NOT EVALUATED

**URL:** `https://sr.ht/~rehandaphedar/lafzize/`  
**Description:** "A program to generate word level timestamps of Qurʾān recitations"

### Status
Could not access README or documentation — SourceHut required login to view the repository tree. The project appears to be an alternative to quran-align with a similar purpose.

### Future consideration
Worth revisiting if quran-align proves insufficient and we need another approach to generating timestamps for unsupported reciters.

---

## 4. QuranJS (quranjs.com) ❌ NOT AN API

**URL:** `https://quranjs.com`  
**What it appeared to be:** A REST API for Qur'an audio with reciter IDs  
**What it actually is:** A frontend web application (Next.js) — the `/api/audio` URL returns HTML, not JSON. Not a usable data API.

---

## 5. EveryAyah CDN (existing approach) ✅ CONTINUES

**URL:** `https://everyayah.com/data/{RECITER}/{SSSAAA}.mp3`

### What it provides
- Per-ayah MP3 files for 40+ reciters
- Stable URLs with ~296-day cache
- No API, no authentication, no rate limits

### What it does NOT provide
- No word-level timestamps
- No metadata (word positions, translations, transliteration)
- No search or query capabilities

### Role in current workflow
Remains the **audio source** for all lesson content. The Quran Foundation API provides timing data; EveryAyah provides the actual audio files that students hear.

---

## 6. Islamic Network API (api.alquran.cloud) ✅ CONTINUES (verification)

**URL:** `https://api.alquran.cloud/v1/ayah/{surah}:{ayah}`  
**Current use:** Verse text verification (confirming Arabic text matches the reference)  
**No timestamp data:** This API provides text, translation, and audio URLs but no word-level timing.

### Community discussion
A community post (2025-11) discusses implementing word-by-word highlighting for Quranic audio — the page failed to load during research, but suggests the community is interested in word-level timing features.

---

## Decision Summary

| Source | Use case | Status |
|--------|----------|--------|
| **Quran Foundation API** | Word-level timestamps (primary) | ✅ Adopted |
| **EveryAyah CDN** | Audio files for playback | ✅ Continues |
| **alquran.cloud API** | Verse text verification | ✅ Continues |
| **find-audio-fragment.py** | Silence detection (fallback for 5 reciters) | ✅ Continues |
| **quran-align** | Potential future use for unsupported reciters | ⏸️ On hold |
| **lafzize** | Unknown — could not evaluate | ⏸️ On hold |
| **QuranJS** | Not a usable API | ❌ Rejected |
