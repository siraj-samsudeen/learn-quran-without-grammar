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
            Learn phrases (1 anchor +         ← anchors are a subset
                           2–3 per root)
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
| **Anchor phrase** | The iconic phrase chosen to introduce a **root** (not a form). Exactly one per root being taught. Level 1. Displayed with ⭐. | `is_anchor: true` on a learn phrase |
| **Learn phrases** | Phrases students actively learn this lesson. Anchors are a subset. | section: `learn` |
| **Practice phrases** | Additional phrases reinforcing the same forms in varied contexts. | section: `practice` |
| **Recall phrases** | Phrases in this lesson using forms from *earlier* lessons. | section: `recall` |
| **Pipeline phrases** | Verses considered but deferred to a future lesson. | section: `pipeline` |

## Constraints

1. **Exactly one anchor phrase per root** being taught in a lesson. Amended 2026-04-11 (was previously "per form" — that was wrong, Lesson 1 actually uses per-root). The picker UI must enforce this (e.g., radio-style selection within a root group).

2. **Per-root density, not fixed per-lesson total.** Each root taught gets **1 anchor + 2–3 learn phrases** (so 3–4 learn items per root). **Practice** is **5 phrases** mixed across the lesson's roots. **Recall** is **0–3 phrases** from earlier lessons (Lesson 2 onwards). **Target total: 10–15 items per lesson. Hard cap: 15.** If a lesson would exceed 15 items, teach one fewer root and push the dropped root to a future lesson.

   *Rationale (2026-04-11):* Adults on phones have ~15-minute focused windows. Per-root consistency matters more than per-lesson consistency for building a stable mental model. Fixing the per-lesson total at a single number (e.g. 10 or 12) makes 1-root lessons feel padded and 3-root lessons feel cramped; scaling by root count keeps every lesson naturally sized. Check against Lesson 1: 2 roots × (1 anchor + 2–3 learn) + 5 practice = 11–12 items ✓.

3. **Anchor is a flag, not a section.** An anchor phrase is a learn phrase with `is_anchor: true`. The picker section list stays: `learn` / `practice` / `recall` / `pipeline` / `rejected`.

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
