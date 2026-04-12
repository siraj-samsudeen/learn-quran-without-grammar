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
[Level 1]   Anchor phrase                    ← one per root, iconic Qur'anic example (flagged)
              ↓
            Learning phrases (1 anchor +      ← anchors are a subset
                              up to 9)
              +
            Recall phrases                    ← forms from EARLIER lessons (spaced retrieval)
```

## Terms

| Term | Meaning | Code field |
|---|---|---|
| **Seed phrase** | The daily-prayer / adhān / ṣalāh phrase the lesson grows from. Level 0. Exactly one per lesson. The whole lesson is sprouted from this phrase — roots identified in it drive form selection, which drives verse selection. | `seed_phrase` |
| **Root** | Triliteral Arabic root (e.g., أ ل ه). | `root` |
| **Form** | A specific word derived from a root (e.g., إِلَٰه). One or more per root per lesson. | `form` |
| **Anchor phrase** | The iconic phrase chosen to introduce a **root** (not a form). Exactly one per root being taught. Level 1. Displayed with ⭐. | `is_anchor: true` on a learning phrase |
| **Learning phrases** | All new content phrases for this lesson, ordered shortest→longest. Anchors are a subset. Replaces old learn + practice sections. | section: `learning` |
| **Recall phrases** | Phrases in this lesson using forms from *earlier* lessons. | section: `recall` |
| **Pipeline phrases** | Verses considered but deferred to a future lesson. | section: `pipeline` |

## Constraints

1. **Exactly one anchor phrase per root** being taught in a lesson. Amended 2026-04-11 (was previously "per form" — that was wrong, Lesson 1 actually uses per-root). The picker UI must enforce this (e.g., radio-style selection within a root group).

2. **Dual-budget system (phrases and words).** New content budget: **10 phrases / 100 words** (whichever hits first), includes 1 anchor + up to 9 learning phrases. Recall budget: **5 phrases / 50 words** (50% of new content). **Total lesson ceiling: 15 phrases / 150 words.**

   *Rationale (2026-04-12):* Adults on phones have ~15-minute focused windows. The word cap prevents a few long verses from overwhelming the lesson even when phrase count is low. Check against Lesson 1: 2 roots, 7 learning phrases + 0 recall = 7 phrases ✓.

3. **Anchor is a flag, not a section.** An anchor phrase is a learning phrase with `is_anchor: true`. The picker section list: `learning` / `recall` / `pipeline` / `rejected`.

## Where things live (per D4 + D5, 2026-04-11)

**Root JSON (`docs/roots/{root}.json`) is the single source of truth for:**
- Root metadata (letters, transliteration, forms list)
- **Root-level explanation** (teacher prose, English, authored once, reused by every lesson that teaches or recalls this root)
- **Form-level explanation** per form (teacher prose, English, on each entry in the `forms` array)
- All verses of the root with Arabic + English translation + scores
- **`lesson_uses`** per verse — which lessons have touched this verse, in what section (learning/recall/pipeline), with `is_anchor`, teacher remark, teacher priority

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

The section names (`learning`, `recall`, `pipeline`, `none`) must match the picker's `LESSON_CONFIG.verses[].defaultSection` enum in `tools/selection-picker/template.html`. The net-new fields in the data model are `is_anchor: true` on learning-section entries and the root-JSON schema additions above.
