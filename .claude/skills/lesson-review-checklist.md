# Skill: Lesson Review Checklist

## When to Use

Run this checklist **before every commit** of a new or modified lesson. It catches the drift and consistency issues that have bitten us before.

## Checklist

### 1. Audio manifest matches page sections
- [ ] Count sentences in `manifest.json` — must equal the number of verse card sections on the page
- [ ] Every `ref` in the manifest has a matching section on the page (and vice versa)
- [ ] The manifest sentence order matches the lesson section order (1 → N)
- **Why**: The manifest drifted to 21 sentences while the page had 12 — the shuffle player showed the wrong count with phantom entries.

### 2. YAML matches page timings
- [ ] Every `#t=start,end` fragment in the lesson `.md` audio tags matches the corresponding `start:`/`end:` in the YAML
- [ ] If a timing was edited on the page, the YAML was updated too (and vice versa)
- **Why**: Page timings and YAML timings are maintained separately and can silently drift.

### 3. Summary tables match lesson body
- [ ] **Words table** order matches root table order in the lesson body (Root 1 first, then Root 2)
- [ ] **Phrases table** order matches lesson section order (1 → N)
- [ ] Phrase references use `(surah:ayah)` format — no surah names
- [ ] Every phrase on the page appears in the summary (and no extras)
- **Why**: Summary was out of order and used inconsistent reference formats.

### 4. Audio files are clean
- [ ] No stale MP3 files from a previous build sitting in `assets/audio/lessons/lesson-NN/`
- [ ] Every file referenced in `manifest.json` exists on disk
- [ ] `lesson-NN-full.mp3` was regenerated if any individual sentence changed
- **Why**: Old files from a 21-sentence build were left alongside new 12-sentence build files.

### 5. Reciter-timing consistency
- [ ] Each sentence's `#t=` fragment was calibrated for the specific reciter in the URL
- [ ] If a reciter was changed, timings were re-calibrated (reciters have different pacing)
- **Why**: A timing of `start: 24.2` for Abdul Basit points to a completely different word in Husary.

### 6. Translation consistency
- [ ] Check `docs/LESSON-PLAN.md` → Translation Style for established conventions
- [ ] Same Arabic term uses same English translation everywhere in the lesson
- **Why**: Inconsistent translations confuse students who are building recognition through repetition.

## How to Run

Quick manual check: read through each item above against the lesson files.

Automated (where available):
```bash
python tools/validate-lesson-consistency.py lesson-NN
```
This catches timing mismatches and reciter inconsistencies but not ordering or summary issues (those are manual checks).
