---
globs: ["tools/**", "assets/audio/**"]
---
# Audio Rules

- **YAML `english:` field** — plain ASCII only. NO ʿ ā ī ū ṣ ḍ ṭ ẓ ḥ characters. TTS produces gibberish otherwise.
- **One reciter per phrase** — never repeat the same reciter twice in one lesson. See `docs/decisions/ADR-005-reciters.md` for the full pool.
- **Speed matching** — slow reciters (Husary, Abdul Basit) for short segments (≤5 words), faster reciters (Yasser, As-Sudais) for longer segments (11+ words).
- **Timings are reciter-specific** — if you change the reciter, you MUST recalculate timestamps. Run `python tools/auto-timestamps.py` (for 7 supported reciters) or `python tools/find-audio-fragment.py` (silence detection fallback).
- **All `<audio>` tags** — always include `preload="none"`.
- **296-day CDN cache** — EveryAyah cache is ~10 months. Wrong timestamps can't be corrected for students for nearly a year. Verify before pushing.
- **Review audio uses full ayahs** — learning cards use trimmed fragments, but Review in Order / Review Shuffled play the full ayah.
