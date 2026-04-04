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

## Step 2 — Pull Form Inventory
**Source:** [corpus.quran.com/qurandictionary.jsp](https://corpus.quran.com/qurandictionary.jsp)

- Present in the **exact order the Corpus uses** (verbs by form, then nominals)
- Use **exact counts** — never approximate (~34)
- If root has < 5 morphological forms, select 5 **sentence patterns** instead

## Step 3 — Verify Every Verse
**Before presenting ANY verse to the teacher**, verify against the API:
```bash
python tools/verify-verse.py SS:AA
# or
curl -s "https://api.alquran.cloud/v1/ayah/SS:AA" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['text'])"
```

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
