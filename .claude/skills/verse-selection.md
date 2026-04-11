# Skill: Verse Selection for a Lesson

## When to Use
When the teacher provides an anchor phrase and you need to find and present verse candidates. Also use independently when the teacher wants to explore a root or add verses to the pipeline.

## Step 0 — Check Existing Data
1. Read `docs/selections/pipeline.md` — pull any **Ready to Place** verses first
2. Check if `docs/roots/{root}.json` already exists — if so, use the cached inventory instead of re-fetching
3. If the root JSON exists, look at verses sorted by `total_learn` or `total_practice` score

## Step 1 — Extract Roots from Anchor
Extract root words from the anchor phrase in **word order**.
Use a representative root word (Form I verb or base noun), not the bare three-letter root:
- اللهُ أَكْبَرُ → root word 1: **إِلَٰه** (ilāh), root word 2: **كَبُرَ** (kabura)

## Step 2 — Build Root Inventory (local, offline)

**As of ADR-009, root inventories are built from local vendored data — no HTML scraping, no per-verse API calls.** Runtime is under one second per root.

Sources (already vendored in `tools/data/`):
- `quran-morphology.txt` — mustafa0x fork of Kais Dukes v0.4 (roots + lemmas in Arabic script)
- `quran-uthmani.txt` — Tanzil full Uthmani text
- `quran-trans-en-sahih.txt` — Saheeh International (draft translations)

Run the builder:
```bash
python3 tools/build-root-inventory.py \
  --root <arabic-root>          # e.g. رسل (Arabic, not Buckwalter)
  --root-word <root-word>       # e.g. رَسُول
  --root-transliteration <ascii>
  --three-letter "X Y Z"        # e.g. "ر س ل"
  --three-letter-en "a b c"     # e.g. "ra sin lam"
  --corpus-key <bw>             # e.g. rsl — used only for the human-reference corpus_url
  --introduced-in-lesson <N>
  --output docs/roots/<name>.json
```

The builder is idempotent: if `--output` already exists, it preserves every existing verse entry byte-for-byte and only appends new candidates it discovered. Scored / `status: "used"` entries are never touched.

What the builder fills in for each new verse:
- `ref`, `arabic_full`, `form` (primary lemma in this ayah), `word_count`, `surah_name`
- `translation` — **draft** from Saheeh International (paraphrase before committing to a lesson, per `docs/LESSON-PLAN.md` translation style)
- `notes` — listed when a verse contains multiple lemmas of the root
- `status: "candidate"`, all teacher fields (`scores`, `arabic_fragment`, `pattern`, `lesson`, `role`) left null

The root-level `forms` array is populated from the morphology file (Arabic lemma + count), ranked by count. `category` / `gloss` / `form_transliteration` are left null for the teacher.

**Do not use `WebFetch` on `corpus.quran.com` anymore** — the mustafa0x morphology file is a complete snapshot of what that page shows. The `corpus_url` field in the JSON is kept only as a human-reference link.

## Step 3 — Verify Every Verse
Verse text comes from the vendored Tanzil Uthmani file, which was verified byte-for-byte against the existing scored entry for 3:18. For ad-hoc sanity checks against a live source:
```bash
python tools/verify-verse.py SS:AA
```
but this is optional — the vendored file is authoritative for the pipeline.

## Step 4 — Score Each Verse
Apply the scoring algorithm from `docs/SCORING.md`:
- 8 dimensions: curriculum, length, story, worship, surah_familiarity, completeness, emotion, fit
- Compute `total_learn` and `total_practice` scores
- Sort candidates by score (highest first)

## Step 5 — Present Candidates
Format: table with **Ref | Arabic Context | Translation | Score | Why** columns.
- Target word **bolded** in Arabic context
- ≤ 10 occurrences: list all
- \> 10: list top 10 + corpus link
- Every candidate needs a **Why** column explaining the recommendation

## Step 6 — Record Decisions
After teacher selects:
1. **Update `docs/roots/{root}.json`** — set verse status, lesson assignment, scores
2. **Create `docs/selections/lesson-NN.md`** with the selection log
   - AI reasons: plain text
   - Teacher overrides: **bold text** (reveals teacher preferences for future agents)
3. **Update `docs/selections/pipeline.md`** with deferred items
4. For multi-root verses, add `cross_roots` field

## Anti-Patterns
| Mistake | Rule |
|---------|------|
| Hallucinating verse content | **Always verify against API before presenting** |
| Approximate counts | **Use exact corpus counts, never approximate** |
| Missing Why column | **Every candidate needs a reason** |
| Forgetting pipeline check | **Pipeline is Step 0, not an afterthought** |
| Not updating root JSON | **Write scores and status back to the JSON after decisions** |
| Not checking existing root JSON | **Don't re-fetch from corpus if JSON already exists** |
