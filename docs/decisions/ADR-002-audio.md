# ADR-002: Audio Strategy — EveryAyah CDN + HTML5 `#t=` Fragments

**Status:** Accepted  
**Date:** 2025-01-01

## Context

Each lesson contains multiple audio clips — typically 5–20 per lesson. The clips are of two types:

1. **Qur'anic verses:** A specific phrase within an ayah (often 4–8 seconds of a 20–40 second file)
2. **Non-Qur'anic content:** Adhān recordings, duʿā, phrases not from the Qur'an

We needed a solution that:
- Requires no audio editing per phrase
- Has no hosting cost for the Qur'anic audio (there are 6,236 ayahs, hundreds of reciters)
- Works in any browser without plugins
- Keeps the lesson source files readable (audio references should be human-understandable)

## Decision

### Qur'anic verses: EveryAyah CDN + HTML5 Media Fragments

```html
<audio controls preload="none"
  src="https://everyayah.com/data/Husary_128kbps/SSSAAA.mp3#t=START,END">
</audio>
```

- **EveryAyah** hosts the complete Qur'an in MP3 format for every major reciter, free of charge, with stable URLs.
- **HTML5 Media Fragment** (`#t=start,end`) is a W3C standard supported by all modern browsers. It instructs the browser to play only the specified time range — no audio editing required.
- Reciter chosen: **Ḥusary 128kbps** — clear, measured, classical tajwīd. Well-known to students.

**CDN cache behaviour:** EveryAyah sets `Cache-Control: max-age=25574400` (~296 days). A student who loads a lesson once has the audio cached locally for months. Bandwidth is only consumed once per student per file.

### Non-Qur'anic content: Local MP3s in `assets/audio/`

```liquid
<audio controls preload="none"
  src="{{ '/assets/audio/filename.mp3' | relative_url }}">
</audio>
```

For adhān recordings, duʿā, and other content we host directly. The `relative_url` Liquid filter handles the `baseurl` prefix correctly in both local dev and production.

## Consequences

**Enables:**
- Zero audio editing workflow — write start/end seconds directly in the source file
- No hosting cost for Qur'anic audio
- Long cache lifetime → fast repeat visits, works well on slow connections
- Human-readable audio references (surah/ayah visible in the URL)

**Constrains:**
- Depends on EveryAyah availability (no SLA). If the service goes down, Qur'anic audio breaks.
- `#t=` fragment precision is browser-dependent — tested across Chrome, Firefox, Safari. Works reliably but can drift by ~0.5s on some platforms.
- The cached CDN files cannot be updated/corrected once cached in a student's browser for ~296 days — choose time ranges carefully.

**Mitigation for EveryAyah dependency:**  
The URL format is stable and other CDNs (e.g., quran.com's API) use compatible MP3 structures. Migration to an alternative CDN is a find-and-replace operation.
