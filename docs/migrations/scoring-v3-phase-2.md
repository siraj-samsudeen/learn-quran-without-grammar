# Scoring v3 Migration — Current State

**Created:** 2026-04-12
**Status:** Phase 2 COMPLETE — Terminology cleanup + audio renaming

---

## Context

Phase 1 (the main v3 migration) is complete. A second sweep found residual v2 terminology in student-facing pages, internal docs, prompt files, and audio IDs/filenames. This file tracks the cleanup.

---

## Phase 2 — Cleanup Plan

### Work Package A: Student-facing pages (HIGH PRIORITY)

#### A1. `how-to-study.md`
- Line 23: "Practice phrases" → "Learning phrases" (with updated description)
- Line 24: Remove "(coming in future lessons)" from Recall — Recall is live in L2
- Lines 42-49: Rename "In the Practice Section" → "In the Learning Section" and update body text
- Line 58: "Add the practice phrases" → remove Level 3 entirely (no separate practice level)

#### A2. `docs/LESSON-PLAN.md`
- Line 145: "free Learn slot" → "free learning slot"
- Line 146: "Practice sections of later lessons" → "Recall sections of later lessons"
- Line 209: Lesson map `Practice → Review` → `Learning → Recall → Review`
- Line 213: Back-to-top reference "after Practice" → "after Learning"
- Lines 221-225: Rename "Practice Section" subsection → "Learning Section"; update conventions 6-7 to describe the merged Learning section (not a separate Practice section)

#### A3. `teacher/lesson-01.md`
- Line 50: Remove learn/practice target split → single `learning` target
- Line 199: "2 anchors + 5 learn + 5 practice = 12" → "2 anchors + 10 learning = 12"

### Work Package B: Internal docs / prompts (MEDIUM PRIORITY)

#### B1. `docs/prompts/picker_generator.md`
- Lines 88, 94, 125, 248: `--targets learn:5,practice:5` → `--targets learning:10`
- Line 169: Target logic `targets.learn + targets.practice` → `targets.learning`

#### B2. `docs/prompts/lesson_authoring_workflow.md`
- Line 308: "8-dimension rubric" → "7-dimension rubric"
- Line 130: "Learn/Practice defaults" → "Learning defaults"

#### B3. `docs/app/research-platform-design.md`
- Line 208: Comment `# anchor | learn | practice` → `# anchor | learning | recall | pipeline`
- Line 229: `role: learn` → `role: learning`
- Line 447: SQL comment → update role enum
- Line 710: Validation rule → update role list
- Line 847: Structure `anchor → learn → practice` → `anchor → learning → recall`

#### B4. `docs/app/HACKATHON-AGENT-PROMPT.md`
- Line 40: "Learning cards → Practice cards" → "Learning cards"

#### B5. `tools/selection-picker/README.md`
- Lines 9-66: All references to learn/practice slots, targets, defaults → learning

#### B6. `docs/app/LESSON-TO-APP-WALKTHROUGH.md`
- Any learn/practice references → learning

### Work Package C: Audio ID renaming (CAREFUL — affects live audio)

#### C1. File renaming scheme

**Lesson 01** — 20 MP3 files to rename:
```
learn-ilah-01.mp3       → learning-ilah-01.mp3       (+ta variant)
learn-ilah-02.mp3       → learning-ilah-02.mp3       (+ta variant)
learn-kabura-01.mp3     → learning-kabura-01.mp3     (+ta variant)
learn-kabura-02.mp3     → learning-kabura-02.mp3     (+ta variant)
learn-kabura-03.mp3     → learning-kabura-03.mp3     (+ta variant)
practice-01.mp3         → learning-01.mp3            (+ta variant)
practice-02.mp3         → learning-02.mp3            (+ta variant)
practice-03.mp3         → learning-03.mp3            (+ta variant)
practice-04.mp3         → learning-04.mp3            (+ta variant)
practice-05.mp3         → learning-05.mp3            (+ta variant)
```

**Lesson 02** — 10 MP3 files to rename:
```
learn-shahida-01.mp3    → learning-shahida-01.mp3
learn-shahida-02.mp3    → learning-shahida-02.mp3
learn-shahida-03.mp3    → learning-shahida-03.mp3
learn-shahida-04.mp3    → learning-shahida-04.mp3
learn-shahida-05.mp3    → learning-shahida-05.mp3
practice-01.mp3         → learning-01.mp3
practice-02.mp3         → learning-02.mp3
practice-03.mp3         → learning-03.mp3
practice-04.mp3         → learning-04.mp3
practice-05.mp3         → learning-05.mp3
```

#### C2. Files that reference audio IDs (must update after rename)

Each file below contains `learn-ilah-`, `learn-kabura-`, `learn-shahida-`, or `practice-0N` patterns:

| File | What to update |
|------|----------------|
| `assets/audio/lessons/lesson-01/manifest.json` | id, file, file_tamil fields |
| `assets/audio/lessons/lesson-02/manifest.json` | id, file fields |
| `_data/audio/lesson-01.json` | id, file, file_tamil fields |
| `_data/audio/lesson-02.json` | id, file fields |
| `tools/lesson-audio/lesson-01.yaml` | id fields + comments |
| `tools/lesson-audio/lesson-02.yaml` | id fields + comments |
| `tools/lesson-content/lesson-01.yaml` | section key `learning_practice` → `learning`, id fields |
| `lessons/lesson-01-allahu-akbar/index.md` | audio src paths (if any inline) |
| `lessons/lesson-02-shahida/index.md` | audio src paths |
| `_data/verses/*.json` | audio_file references |
| `playground-app/assets/lesson-01.json` | section key + id fields |

#### C3. Section anchor cleanup
- `lessons/lesson-01-allahu-akbar/index.md`: `#learning-practice` → `#learning` (section ID + nav link)
- `lessons/lesson-02-shahida/index.md`: `#learning-practice` → `#learning` (section ID + nav link)

### Work Package D: YAML comment cleanup
- `tools/lesson-audio/lesson-01.yaml` line 7: "learn/practice pool" → "learning pool"
- `tools/lesson-audio/lesson-02.yaml` lines 7, 225: same

---

## Execution Order

1. **A (docs)** — safe, no runtime impact
2. **B (internal docs)** — safe, no runtime impact
3. **C (audio)** — careful, rename MP3 files first via `git mv`, then update all references
4. **D (comments)** — trivial, do alongside C

---

## Verification Protocol

After all changes, run these verification steps (can be delegated to a separate agent):

### V1. Grep sweep — zero remaining old terms in active files
```bash
# Should return ZERO matches (excluding docs/current_state.md and session-history)
grep -rn '"learn"' --include='*.json' --include='*.yaml' --include='*.yml' --include='*.py' --include='*.js' --include='*.html' . | grep -v current_state | grep -v session-history
grep -rn '"practice"' --include='*.json' --include='*.yaml' --include='*.yml' --include='*.py' --include='*.js' --include='*.html' . | grep -v current_state | grep -v session-history
grep -rn 'practice' --include='*.md' . | grep -v current_state | grep -v session-history | grep -v SCORING.md
grep -rn 'fit_learn\|fit_practice\|total_learn\|total_practice' . | grep -v current_state | grep -v session-history
```

### V2. Audio file existence check
```bash
# Every MP3 referenced in manifest/data must exist on disk
python3 -c "
import json, os
for lesson in ['lesson-01', 'lesson-02']:
    manifest = json.load(open(f'assets/audio/lessons/{lesson}/manifest.json'))
    for sid, entry in manifest['sentences'].items():
        for key in ['file', 'file_tamil']:
            if key in entry and entry[key]:
                path = f'assets/audio/lessons/{lesson}/{entry[key]}'
                exists = os.path.exists(path)
                if not exists:
                    print(f'MISSING: {path}')
print('Audio check complete')
"
```

### V3. No broken anchor links
```bash
# Check that #learning-practice is gone and #learning exists
grep -rn 'learning-practice' lessons/ docs/ how-to-study.md
# Should return zero
```

### V4. Section heading consistency
```bash
# All lesson index.md files should have ## Learning, not ## Practice
grep -n '## Practice' lessons/*/index.md
# Should return zero

grep -n '## Learning' lessons/*/index.md
# Should return the learning section headers
```

### V5. Lesson validator
```bash
python tools/validate-lesson-consistency.py lesson-01
python tools/validate-lesson-consistency.py lesson-02
```

### V6. Manual browser check
- Load lesson-01 and lesson-02 locally
- Click every audio play button (learning phrases + practice-renamed phrases)
- Verify shuffle player works
- Verify all nav links (#learning anchor) work

---

## What Changed in Phase 1 (completed — reference only)

See git commit `40a861d` for full diff. Summary:
- Role simplification: learn/practice → learning
- 7 scoring dimensions (was 8), all 0–10
- Fragment penalty ×0.7, teacher star +5
- Lesson budgets: 10 phrases/100 words new, 5/50 recall
- Automated role assignment
- 73 files updated across docs, tools, data, UI, lessons
