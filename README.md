# Learn Qur'an Without Grammar

A root-based Qur'anic Arabic course — learn to recognise the language of your ṣalāh without memorisation pressure or grammar terminology.

**Live site:** https://siraj-samsudeen.github.io/learn-quran-without-grammar/

---

## What This Is

Most Qur'anic Arabic courses start with grammar rules and vocabulary tables. This course takes a different path:

- Start from phrases you already know — *Allāhu Akbar*, bismillāh, phrases from the adhān
- Expand through root-word families (every Arabic word comes from a 3-letter root)
- Build recognition through repeated listening, not memorisation
- No grammar terms. No pressure. Just familiarity, growing naturally.

---

## Project Structure

```
lessons/lesson-NN-slug.md   ← Lesson files (one per root/anchor)
index.md                    ← Home page with lesson cards
_layouts/default.html       ← Single Jekyll layout
assets/audio/               ← Local MP3s (non-Quranic: adhān, duʿā, etc.)
assets/css/style.css        ← Stylesheet
_config.yml                 ← Jekyll configuration
```

For AI assistant context and full conventions, see [`CLAUDE.md`](CLAUDE.md).  
For architecture decisions, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Running Locally

Requires Ruby + Bundler. Install Jekyll dependencies once:

```bash
bundle install
```

Serve the site:

```bash
bundle exec jekyll serve
```

Then open http://localhost:4000/learn-quran-without-grammar/

---

## Adding a New Lesson

1. Create `lessons/lesson-NN-slug.md` — copy the front matter from an existing lesson:
   ```yaml
   ---
   layout: default
   title: 'Lesson N: English Title'
   description: One-sentence SEO description.
   ---
   ```

2. Add a lesson card to `index.md`:
   ```html
   <div class="lesson-card" markdown="0" onclick="location.href='{{ '/lessons/lesson-NN-slug' | relative_url }}';">
   <div class="lesson-card-title"><a href="{{ '/lessons/lesson-NN-slug' | relative_url }}">Lesson N — Title</a></div>
   <div class="lesson-card-arabic">Arabic phrase here</div>
   <div class="lesson-card-meta">Root: ر و ت · Theme · Anchor</div>
   </div>
   ```

3. Deploy:
   ```bash
   git add . && git commit -m "Add lesson N: topic" && git push
   ```
   GitHub Pages rebuilds automatically — live in ~1 minute.

---

## Conventions

- **File names:** `lessons/lesson-NN-slug.md` — lowercase kebab-case, zero-padded number
- **Audio (Qur'anic):** EveryAyah CDN with `#t=start,end` time fragments
- **Audio (non-Qur'anic):** Local MP3 in `assets/audio/`
- **HTML in Markdown:** Use `markdown="0"` on wrapper divs

See [`CLAUDE.md`](CLAUDE.md) for full details.
