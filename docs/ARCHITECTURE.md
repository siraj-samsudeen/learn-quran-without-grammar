# Architecture

## Current Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Static site generator | Jekyll (GitHub Pages default) | Zero config, free hosting, Markdown-first |
| Hosting | GitHub Pages | Free, CDN-backed, auto-deploy on push |
| Layout engine | Liquid + single `default.html` layout | Simple — one layout handles everything |
| Markdown processor | Kramdown (GFM input) | GitHub Pages default; `parse_block_html: true` needed for HTML in Markdown |
| CSS | Hand-written in `assets/css/style.css` | No framework dependency |
| Arabic rendering | Google Fonts: Amiri | Correct Qur'anic script display |

## Deployment Flow

```
git push
  → GitHub Actions (pages build and deployment)
  → Jekyll build (~30 seconds)
  → GitHub Pages CDN
  → Live at https://siraj-samsudeen.github.io/learn-quran-without-grammar/
```

Total time from `git push` to live: ~1 minute.

No build scripts. No CI config to maintain. GitHub manages it all.

---

## Audio Strategy

Two audio sources are used — the choice depends on content type.

### 1. Qur'anic verses — EveryAyah CDN

```
https://everyayah.com/data/Husary_128kbps/SSSAAA.mp3#t=START,END
```

- `SSS` = surah number, zero-padded to 3 digits
- `AAA` = ayah number, zero-padded to 3 digits
- `#t=START,END` = HTML5 Media Fragment — browser plays only that time range (seconds, decimals OK)

**Why EveryAyah:** Complete Qur'an, multiple reciters, free, stable URLs, no hosting cost.

**CDN cache:** ~296 days (`Cache-Control: max-age=25574400`). Once a student has loaded a file, it's cached locally for months — no repeated downloads.

**Why `#t=` fragments:** A full ayah file may be 20–40 seconds. We often want just a 4–8 second phrase. Time fragments let us point directly to the relevant portion without creating hundreds of trimmed files.

### 2. Non-Qur'anic content — Local MP3s

Stored in `assets/audio/`. Used for:
- Adhān recordings
- Duʿā not from the Qur'an
- Any audio we have rights to host directly

```liquid
<audio controls preload="none" src="{{ '/assets/audio/filename.mp3' | relative_url }}"></audio>
```

The `relative_url` filter prepends the Jekyll `baseurl` (`/learn-quran-without-grammar`), making paths correct on both GitHub Pages and local dev.

---

## File & URL Structure

| File | Jekyll URL |
|------|-----------|
| `index.md` | `/` |
| `course_intro.md` | `/course_intro/` |
| `lessons/lesson-01-allahu-akbar.md` | `/lessons/lesson-01-allahu-akbar/` |
| `lessons/lesson-02-bismillah.md` | `/lessons/lesson-02-bismillah/` |

**Naming rule:** `lessons/lesson-NN-slug.md` — lowercase kebab-case. Zero-padded 2-digit number. No spaces, no capital letters. See ADR-003.

---

## What Is Excluded from the Jekyll Build

Files in `_config.yml`'s `exclude:` list are not processed or published:

- `README.md` — GitHub display only
- `CLAUDE.md` — AI assistant context only
- `docs/` — architecture docs, not course content
- `Gemfile`, `Gemfile.lock`, `vendor/` — Ruby tooling

---

## Roadmap

The content is designed to be **hosting-independent**. Each layer upgrade requires no content rewrites:

### Phase 1 — Current
GitHub Pages + Jekyll. Markdown files. Simple, zero cost.

### Phase 2 — PWA
Add a `manifest.json` and service worker. Same URLs, same content. Students can "install" the site and use it offline (critical for low-connectivity contexts).

### Phase 3 — Native App
Wrap the PWA in a native shell (Capacitor / React Native WebView), or rebuild with a mobile-first framework. Audio files and content structure remain the same.

**Design constraint:** Every decision is made to keep content portable across these phases. No vendor lock-in in the lesson files themselves.

---

## Related Decisions

- [ADR-001](decisions/ADR-001-hosting.md) — Why GitHub Pages + Jekyll
- [ADR-002](decisions/ADR-002-audio.md) — Why HTML5 `#t=` fragments + EveryAyah
- [ADR-003](decisions/ADR-003-file-structure.md) — Naming conventions + `lessons/` folder
- [ADR-004](decisions/ADR-004-jekyll-html.md) — `markdown="0"` for HTML blocks
