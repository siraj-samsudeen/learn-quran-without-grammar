# ADR-003: File Naming Conventions and the `lessons/` Folder

**Status:** Accepted  
**Date:** 2025-01-01

## Context

The initial project had lesson files in the repository root with mixed-case names and spaces:

- `Lesson-01-Allahu-Akbar.md` — mixed case
- `Course Intro.md` — spaces in filename

Problems this caused:
- **Case sensitivity:** GitHub Pages is served from Linux. URLs are case-sensitive. A link to `/lesson-01-allahu-akbar/` would 404 if the file is `Lesson-01-Allahu-Akbar.md`.
- **Spaces in filenames:** Unreliable in shell, URLs require encoding (`%20`), Jekyll may exclude them.
- **No grouping:** As the course grows, root-level lesson files create clutter and make the structure unclear.
- **URL cleanliness:** Mixed-case URLs are fragile — a human typing the URL might not know to capitalise the `L`.

## Decision

**All lesson files go in `lessons/` with lowercase kebab-case names:**

```
lessons/lesson-NN-slug.md
```

Rules:
- `NN` = zero-padded two-digit lesson number (01, 02, … 10, 11, …)
- `slug` = lowercase, hyphens only, no spaces, no special characters
- Transliteration uses ASCII-safe approximations (e.g., `allahu-akbar` not `allāhu-akbar`)

**Resulting URLs:** `/lessons/lesson-01-allahu-akbar/` — clean, lowercase, unambiguous.

**Non-lesson files in root** also follow lowercase-with-underscores:
- `course_intro.md` — published page (full course introduction, linked from homepage)
- `CLAUDE.md`, `README.md` — all-caps for convention files (excluded from build)

## Consequences

**Enables:**
- Case-insensitive-safe URLs (same result on Linux, macOS, Windows)
- Clear grouping — all lesson content in one folder
- Tab-completion and shell-scripting friendly
- Predictable URL pattern for all future lessons

**Constrains:**
- Old URLs (`/Lesson-01-Allahu-Akbar/`) are now 404. Mitigated by: this happened before the site had any external links or indexed URLs. No redirects needed.
- Transliteration in slugs loses diacritics — `allahu-akbar` vs. `allāhu-akbar`. Acceptable; the `title` front matter carries the proper transliteration.

**Going forward:**  
Any contributor adding a new lesson must follow this pattern. The rule is stated in `CLAUDE.md` and `README.md` so it's visible in both AI and human workflows.
