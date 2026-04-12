# Tier 2 Scoring Guidelines — LLM Scoring Pass

These rules apply whenever an LLM scores Qur'anic verses for story, familiarity, and teaching_fit.

## Tone & Standards

- **Be discreet.** This is Qur'anic content — every word you write should count. Do not fill in scores or reasons just to have something there.
- **Do not inflate.** A score of 3 is fine if the verse is genuinely a 3. Honest low scores are more useful than flattering high ones.
- **Only add notes that serve the student.** The reason string's purpose is to help the teacher decide whether this verse helps the student absorb the root meaning. If the note doesn't serve that purpose, leave it terse.
- **Multiple observations are welcome.** If you have more than one useful observation, number them (1. ... 2. ... 3. ...) so the teacher can review each point separately at runtime.
- **No filler phrases.** Skip "This verse is interesting because..." — go straight to the substance.

## Scoring Dimensions

### 5. Story, Memorability & Emotion (0–10)

| Range | Criteria |
|-------|----------|
| 0–2 | Abstract, no narrative, emotionally neutral |
| 3–4 | Some emotional weight but no clear story (ruling, warning) |
| 5–6 | Story hook (who said what to whom) |
| 7–8 | Strong story + emotional punch |
| 9–10 | Iconic story every Muslim knows (Ibrahim, Mūsā, Iblīs, Yūnus) with powerful emotion |

### 6. Familiarity & Worship Connection (0–10)

Anchored by surah tiers:

| Tier | Surahs | Base |
|------|--------|------|
| **A — Universal** | Last 10–15 surahs (Juz' 30), Al-Fatiha | 7–10 |
| **B — Very common** | Yasin, Al-Mulk, Al-Kahf, As-Sajdah, Qaf, Al-A'la, Al-Baqarah last 2 ayat | 5–8 |
| **C — Well-known** | Ar-Rahman, Al-Waqi'ah, Ad-Dukhan, Maryam | 3–6 |
| **D — Everything else** | Longer surahs, less commonly recited | 0–3 |

Famous specific ayat (Ayat al-Kursi, Surah Mulk opening, etc.) override their surah's default tier. Direct worship connection (adhān, shahādah, ṣalāh phrases) adds further weight.

### 7. Teaching Fit (0–10)

| Range | Criteria |
|-------|----------|
| 0–3 | Root is incidental, verse is a fragment, poor teaching value |
| 4–6 | Root is relevant, verse mostly works, decent teaching value |
| 7–10 | Root is central, verse is self-contained, excellent teaching value |

Key question: will the student understand the root's meaning from this verse alone? If they need context from surrounding ayat, score lower.

## Fragment & Word Count

- **fragment: false** for most verses. Set true ONLY if the verse is 15+ words and would need trimming to use.
- **word_count**: count Arabic words in the full ayah text.

## Output Format

Each scored verse produces:
```json
{
  "ref": "2:87",
  "story": {"score": 5, "reason": "Bani Israel rejecting messengers — familiar pattern but no single iconic moment."},
  "familiarity": {"score": 2, "reason": "Al-Baqarah Tier D — long surah, this ayah not individually famous."},
  "teaching_fit": {"score": 7, "reason": "Rasul is central — 'We gave Isa clear proofs and sent messengers before him.'"},
  "fragment": false,
  "word_count": 12
}
```

## Merge & Compute

After scoring, run:
```bash
python3 tools/merge-t2-scores.py --root <ROOT_KEY> --scores /tmp/<root>-scores.json
```

This merges Tier 2 into the root JSON and recomputes `base` and `final` scores using the formula:
```
base = length + form_freq + form_dominance + curriculum + story + familiarity + teaching_fit
final = (base + star_bonus) × fragment_multiplier
```
