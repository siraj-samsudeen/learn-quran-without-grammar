# ADR-009: Local Root Inventory Pipeline (replaces live corpus scraping)

## Status: Adopted (2026-04-11)

## Context

Until today, building a root inventory JSON (`docs/roots/{root}.json`) required a live two-service pipeline, codified in [docs/prompts/batch_completion.md](../prompts/batch_completion.md):

1. **`WebFetch` on `corpus.quran.com/qurandictionary.jsp?q=<buckwalter-key>`** — HTML-scrape the form list and every per-form occurrence page to collect `(surah:ayah)` refs.
2. **`tools/fetch-verses.py REF REF ...`** — hit `api.alquran.cloud/v1/ayah/<ref>` **once per ref** (no real batching — the script just loops `urllib.request.urlopen`).
3. Teacher or session hand-stitches the results into a JSON, preserving existing scored entries.

Problems with this pipeline:

- **Runtime**: 30–60 minutes per root batch.
- **Fragility**: HTML scraping is brittle; one layout change on corpus.quran.com breaks everything.
- **Two moving parts**: morphology and ayah text come from different services, so any schema drift requires stitching logic updates.
- **Rate limits**: both services are intermittent; retries are part of the normal flow.
- **Can't run offline or in a restricted sub-agent sandbox** (the batch_completion.md prompt explicitly warns against delegating to sub-agents because `WebFetch` is blocked).
- **Fundamentally redundant**: the data we were scraping already exists as a single 6 MB file authored by Kais Dukes in 2011.

## Research Summary

Two parallel research agents evaluated every reasonable alternative. Full notes condensed to a table:

| Rank | Source | Morphology | Full ayah text | Translation | Format | Size | License |
|------|--------|-----------|----------------|-------------|--------|------|---------|
| ★★★★★ | **mustafa0x/quran-morphology** (GPL derivative of Kais Dukes v0.4) | ✅ root + lemma per content word, Arabic script already | ❌ segment-level only | ❌ | TSV | 6.3 MB | GPL |
| ★★★★★ | **QUL / Tarteel** `qul.tarteel.ai/resources` | ✅ SQLite: Word Root, Word Lemma, Word Stem | ✅ SQLite Uthmani | ✅ 198 translations | SQLite | per-file | MIT CMS, varies per resource |
| ★★★☆☆ | **Tanzil.net** | ❌ | ✅ full Uthmani, Simple etc. | ✅ 18 English + many languages as plain-text | TXT / XML / SQL | ~1.3 MB Arabic, ~900 KB per translation | per-file (non-commercial) |
| ★★☆☆☆ | fawazahmed0/quran-api (jsDelivr CDN) | ❌ | ✅ per-verse JSON | ✅ 440+ editions | JSON on CDN | per-verse | CC |
| ★★☆☆☆ | Quran Foundation v4 (what we use for audio) | ⚠️ `word_fields` returns text/translit but **not** root/lemma | ✅ | ✅ | REST | live only | OAuth |
| ★☆☆☆☆ | `corpus.quran.com/download/` SQL dump | — | — | — | **does not exist** | — | — |

### Verified root counts from the mustafa0x morphology file (6.0 MB, 130,030 segments, 1,651 unique roots)

- `أله` (ilah) → **2,851** rows — matches corpus exactly
- `كبر` (kabura) → **161** rows — matches batch_completion.md target
- `شهد` (shahida) → **160** rows — matches exactly
- `رسل` (rasul) → **513** rows — matches Lesson 3 expectation

Every root we need is present, with root + lemma + POS tagged per segment.

### Key finding: the corpus download page has no SQL dump

`corpus.quran.com/download/` only ships one file — the single morphology TSV — behind an email gate. The Kais Dukes v0.4 release is frozen at 2011. All public "SQL dumps" you find are third-party derivatives. The **mustafa0x fork** is the cleanest — it pre-converts everything from Buckwalter ASCII to Arabic Unicode, so the ROOT/LEM fields already match what our `docs/roots/*.json` files use natively.

## Decision

**Adopt Option C: vendor the morphology TSV + Tanzil Uthmani + one English translation, and build root inventories locally.**

This kills both network dependencies from the batch_completion.md workflow. New files committed to the repo:

- `tools/data/quran-morphology.txt` — 6.0 MB, GPL, from mustafa0x/quran-morphology (Arabic-script derivative of Kais Dukes v0.4)
- `tools/data/quran-uthmani.txt` — 1.3 MB, Tanzil.net full Uthmani (`quranType=uthmani`, with ۥ / ٱ / ۚ marks) — byte-for-byte matches the `arabic_full` field in existing scored entries (verified on 3:18)
- `tools/data/quran-trans-en-sahih.txt` — 898 KB, Tanzil.net `en.sahih` (Saheeh International)
- `tools/build-root-inventory.py` — new builder script, ~240 lines

## The New Process

### One-time setup (already done)

```bash
mkdir -p tools/data
curl -sSL -o tools/data/quran-morphology.txt \
  https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt
curl -sSL -o tools/data/quran-uthmani.txt \
  "https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&marks=true&sajdah=true" \
  -A "Mozilla/5.0"
curl -sSL -o tools/data/quran-trans-en-sahih.txt \
  "https://tanzil.net/trans/en.sahih" -A "Mozilla/5.0"
```

### Per-root run (replaces the ~30–60 minute batch_completion.md session)

```bash
python3 tools/build-root-inventory.py \
  --root رسل \
  --root-word رَسُول \
  --root-transliteration rasul \
  --three-letter "ر س ل" \
  --three-letter-en "ra sin lam" \
  --corpus-key rsl \
  --introduced-in-lesson 3 \
  --output docs/roots/rasul.json
```

Runtime on this machine: **well under 1 second**. Output for the Lesson 3 root:

```
rasul.json: 429 verses (0 existing + 429 new), 7 unique lemmas, 513 total occurrences
```

All 513 root occurrences across 429 unique verses, 7 distinct lemmas (رَسُول 332, أَرْسَلَ 130, مُرْسَل 35, رِسالة 10, مُرْسِل 4, مُرْسِلَة 1, مُرْسَلَة 1), and all 429 verses have `translation` pre-filled from Saheeh International — all from local files with zero HTTP calls.

### What the builder produces

Each new verse entry conforms to the existing schema and is marked `status: "candidate"`. Teacher-assigned fields are left null (`arabic_fragment`, `pattern`, `scores`, `score_notes`, `lesson`, `role`). Verses that contain multiple lemmas of the same root get a `notes` field listing the additional forms. Primary `form` for such verses is the lemma with the most surface occurrences in that ayah.

The root-level `forms` array is auto-generated from the morphology file (ranked by count), with `form_transliteration`, `category`, `gloss` left null for the teacher to fill in. The top-level `translation_source` field records where the translations came from (e.g. `"Saheeh International (via Tanzil.net)"`).

### Incremental / idempotent mode

When `--output` points at an existing JSON, the builder **preserves all existing verse entries byte-for-byte** and only appends new candidate refs it discovers. Scored / `status: "used"` entries from past lessons are never touched. `forms` are merged by `form_arabic`, existing form metadata is preserved.

## Findings

1. **The mustafa0x fork already stores roots and lemmas in Arabic script**, not Buckwalter. So the Buckwalter→Arabic mapping — which I initially thought we'd need — is entirely unnecessary. The only place the Buckwalter key (`rsl`, `$hd`, etc.) still appears is in the `corpus_url` field we keep in the JSON for human reference.
2. **Tanzil Uthmani matches our existing `arabic_full` byte-for-byte.** On 3:18, the Tanzil `uthmani` variant (with `marks=true&sajdah=true`) produced exactly the string already in `shahida.json`. So the switch is transparent to downstream consumers (the picker HTML, the JS layer, audio sync tools).
3. **Translation drafts are useful but not perfect.** Saheeh International is formal; teacher style per `docs/LESSON-PLAN.md` is "simple everyday English". Pre-filling `translation:` gives the teacher a starting point to paraphrase from rather than translate from scratch. It is explicitly a *draft*, not a final value.
4. **Multi-lemma verses are common.** 41 of 429 `rasul.json` verses contain more than one form of ر س ل (e.g. `2:151` has both `أَرْسَلَ` and `رَسُول`). The builder picks the most-frequent-in-this-verse lemma as primary and records the rest in `notes`. This is stricter than the old manual flow, which sometimes missed the secondary form.
5. **Total runtime delta.** Old: 30–60 minutes with human babysitting and retries. New: < 1 second, fully local, works in restricted sandboxes, no rate limits. This is the kind of 1000× win that was hiding in plain sight for months.
6. **License posture**: the morphology TSV is GPL with "verbatim only" language, but we vendor it unmodified with a `SOURCE.md` credit. Derivative JSON (`docs/roots/*.json`) is our own work built on top of the unmodified file — explicitly allowed. Tanzil text and translations are redistributed non-commercially, which matches this project's usage.

## Consequences

### Good

- `docs/prompts/batch_completion.md` is effectively obsolete. Kept as historical reference, but **the new workflow is one local command per root**.
- The entire root-fetching flow works offline, works in sub-agent sandboxes, and has no CDN-cache risk (there's no per-verse cache to invalidate — Arabic text is vendored).
- Future roots can be added in bulk: one shell loop covers all 1,651 roots in the Qur'an in minutes if we ever want a full pre-built index.
- `tools/fetch-verses.py` is still useful for ad-hoc verification (it hits the live `alquran.cloud` API) but is no longer on the critical path.

### Watch out for

- **Diacritic normalization**: the morphology file writes `رِسالَة` (one variant) where the teacher might prefer `رِسَالَة` (another). Both are correct; just be aware that the auto-generated `forms[].form_arabic` may differ by a mark or two from hand-typed text.
- **Translation source is a draft, not a fact**: always pass `translation:` through teacher review before committing. The `translation_source` top-level field records the provenance so future sessions know it's machine-drafted.
- **Morphology is frozen at v0.4 (2011)**: if a future scholarly update lands, we'd need to re-vendor and re-run. Very unlikely; the v0.4 dataset has been stable for 14 years.

## Related

- [ADR-007: Audio API Research](ADR-007-audio-apis-research.md) — sister ADR for the audio pipeline
- [docs/prompts/batch_completion.md](../prompts/batch_completion.md) — the old workflow this replaces
- [.claude/skills/verse-selection.md](../../.claude/skills/verse-selection.md) — updated to reference the new builder
- [.claude/skills/lesson-pipeline.md](../../.claude/skills/lesson-pipeline.md) — updated Phase 1a to use the local builder
- [tools/build-root-inventory.py](../../tools/build-root-inventory.py) — the new builder script
