# Lesson Authoring Glossary

_Shared vocabulary for talking about lesson structure. Established 2026-04-11._

## Hierarchy

```
[Level 0]   Seed phrase                      ← daily-prayer phrase the lesson grows from
              ↓ contains words with
            Root                              ← triliteral root (e.g., أ ل ه)
              ↓ expressed as
            Form                              ← a specific word from the root (e.g., إِلَٰه)
              ↓ demonstrated via
[Level 1]   Anchor phrase                    ← one per form, iconic Qur'anic example (flagged)
              ↓
            Learn phrases (exactly 5)         ← anchors are a subset
              +
            Practice phrases                  ← varied exposure to the same forms
              +
            Recall phrases                    ← forms from EARLIER lessons (spaced retrieval)
```

## Terms

| Term | Meaning | Code field |
|---|---|---|
| **Seed phrase** | The daily-prayer / adhān / ṣalāh phrase the lesson grows from. Level 0. Exactly one per lesson. The whole lesson is sprouted from this phrase — roots identified in it drive form selection, which drives verse selection. | `seed_phrase` |
| **Root** | Triliteral Arabic root (e.g., أ ل ه). | `root` |
| **Form** | A specific word derived from a root (e.g., إِلَٰه). One or more per root per lesson. | `form` |
| **Anchor phrase** | The iconic Qur'anic verse chosen to introduce a form. Exactly one per form being taught. Level 1. Displayed with ⭐. | `is_anchor: true` on a learn phrase |
| **Learn phrases** | Phrases students actively learn this lesson. Anchors are a subset. | section: `learn` |
| **Practice phrases** | Additional phrases reinforcing the same forms in varied contexts. | section: `practice` |
| **Recall phrases** | Phrases in this lesson using forms from *earlier* lessons. | section: `recall` |
| **Pipeline phrases** | Verses considered but deferred to a future lesson. | section: `pipeline` |

## Constraints

1. **Exactly one anchor phrase per form** being taught in a lesson. The picker UI must enforce this (e.g., radio-style selection within a form group).
2. **Exactly 5 learn phrases per lesson**, regardless of how many forms are being taught. No flexibility. So if a lesson teaches 2 forms → 2 anchors + 3 more learn phrases. If 3 forms → 3 anchors + 2 more. Etc.
3. **Anchor is a flag, not a section.** An anchor phrase is a learn phrase with `is_anchor: true`. The picker section list stays: `learn` / `practice` / `recall` / `pipeline` / `none`.

## Where things live (per D4 + D5, 2026-04-11)

**Root JSON (`docs/roots/{root}.json`) is the single source of truth for:**
- Root metadata (letters, transliteration, forms list)
- **Root-level explanation** (teacher prose, English, authored once, reused by every lesson that teaches or recalls this root)
- **Form-level explanation** per form (teacher prose, English, on each entry in the `forms` array)
- All verses of the root with Arabic + English translation + scores
- **`lesson_uses`** per verse — which lessons have touched this verse, in what section (learn/practice/recall/pipeline), with `is_anchor`, teacher remark, teacher priority

All explanations are **English-only** in the JSON. Tamil (and any future language) is auto-generated downstream, reviewer-approved, stored elsewhere.

**Per-lesson folder (`lessons/lesson-NN-slug/`) holds only non-verse-state artifacts:**
- `index.md` — the published lesson page (Jekyll-idiomatic)
- `sentence.md` — the seed phrase for this lesson
- `picker.html` — the verse selection UI
- `state.json` — stage tracker (picker-generated, selection-complete, audio-built, published)
- `audio-plan.yaml` — reciter + voice choices
- `audio-state.json` — audio introspection output
- `build-report.json` — audio build result

There is NO `selection.json` as a source of truth. The picker writes verse-state changes directly back to the root JSONs.

## Alignment with existing code

The section names (`learn`, `practice`, `recall`, `pipeline`, `none`) already match the picker's `LESSON_CONFIG.verses[].defaultSection` enum in `tools/selection-picker/template.html`. No rename work needed. The net-new fields in the data model are `is_anchor: true` on learn-section entries and the root-JSON schema additions above.
