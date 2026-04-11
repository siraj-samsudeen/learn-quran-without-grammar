# Lesson Authoring Glossary

_Shared vocabulary for talking about lesson structure. Established 2026-04-11._

## Hierarchy

```
[Level 0]   Target phrase                    ← daily-prayer phrase the lesson is built around
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
| **Target phrase** | The daily-prayer / adhān / ṣalāh phrase the lesson is built around. Level 0. Exactly one per lesson. | `target_phrase` |
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

## Alignment with existing code

The section names (`learn`, `practice`, `recall`, `pipeline`, `none`) already match the picker's `LESSON_CONFIG.verses[].defaultSection` enum in `tools/selection-picker/template.html`. No rename work needed. The only net-new field in the data model is `is_anchor: true` on learn-section entries.
