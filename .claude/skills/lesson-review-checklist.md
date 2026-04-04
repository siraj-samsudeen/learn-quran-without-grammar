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

### 7. No grammar jargon
- [ ] No "Form I", "Form II", "Form V", "Form X" etc. in student-facing content
- [ ] No Arabic morphological pattern names (فَعِيل, أَفْعَل, فُعْلَى, تَفَعَّلَ, اسْتَفْعَلَ) in student-facing content
- [ ] Explanations use natural language: "the prefix اسْتَ means to seek something for oneself" — not "Form X means..."
- **Why**: The course promises "no grammar." Technical terms like "Form X" or "فَعِيل pattern" break that promise and intimidate beginners. Caught and removed during Lesson 1 review.

### 8. Surah names present
- [ ] Every verse reference includes the **surah name** — not just the number (e.g., "Al-A'rāf 7:59" not just "7:59")
- [ ] No one memorizes surah numbers — names are how people recognize surahs
- **Why**: Students don't know that "7:59" is Al-A'rāf, but they recognize "Surah Al-A'rāf."

### 9. Memory hooks on all sentences
- [ ] Every Learn sentence has a context note / memory hook
- [ ] Every Practice sentence has a context note / memory hook (can be shorter than Learn)
- [ ] Hooks connect to: stories (prophets), daily practice (ṣalāh, Friday, Ramadan), emotional resonance, or word connections
- **Why**: Practice sentences were initially left bare with no hooks. Teacher feedback: "this is useful information that acts as memory hooks and most of which I would tell them anyway."

### 10. Verse text verified against API
- [ ] Each verse's Arabic text was checked against alquran.cloud API or corpus.quran.com
- [ ] The target root word actually appears in the cited verse
- [ ] Fragment text matches what the audio plays (especially for `#t=` fragments)
- **Why**: 2:255 was listed under كَبِير but actually ends with العظيم (wrong root). 7:77 was listed under اسْتَكْبَرَ but contains no ك ب ر word at all. Both were AI hallucinations caught only by corpus verification.

## How to Run

Quick manual check: read through each item above against the lesson files.

Automated (where available):
```bash
python tools/validate-lesson-consistency.py lesson-NN
```
This catches timing mismatches and reciter inconsistencies but not ordering or summary issues (those are manual checks).
