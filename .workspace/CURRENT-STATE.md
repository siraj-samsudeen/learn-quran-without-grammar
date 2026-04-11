# Current State — Lesson Authoring

_Last updated: 2026-04-11. Captured during an architecture rethink session._

## Lesson status (ground truth)

- **Lesson 1** — ✅ complete, published, live. Students are actively using it. Not touched by the new workflow.
- **Lesson 2** — 🚧 **in progress right now**. Currently at the **phrase-picking stage** and not even that is finished. Remaining work:
  1. Finish picking phrases
  2. Edit the explanation text for each picked phrase
  3. Run the audio pipeline
- **Lesson 3** — ⏳ not started.

## Implications for the in-flight architecture work

The `picker_generator.md` and `lesson_authoring_workflow.md` prompts (drafts pasted in chat, not yet committed to `docs/prompts/`) were written assuming:

- Lesson 3 (rasul, 429 null-scored candidates) was the primary use case for the new picker
- Lesson 2 was a "regression test" with 20 scored shahida candidates already done
- "The new workflow applies to Lesson 3 onwards; Lessons 1 and 2 stay where they are"
- `.workspace/**/*.html` would be gitignored (HTML treated as derived artifact)

**That framing is wrong for the actual state.** See decisions D1 and D2 below.

## Status of the prompts themselves

Neither prompt exists as a file. They were pasted into chat as drafts and have not yet been saved to `docs/prompts/`. No `.workspace/` work has been executed. No `tools/lesson-workflow.py`. No template upgrades. The architecture is still on paper — decisions made during this rethink will shape the prompts when they get written.

## Architectural decisions (rolling log)

### D1 — Lesson 2 is the priority, not Lesson 3 _(2026-04-11)_

Lesson 2 is mid-flight at phrase-picking. The new tooling needs to unblock Lesson 2 first. The new `.workspace/lesson-02/` is the directory that matters. Any "historical record" framing of `.claude/tmp/lesson-02-picker.html` must be revisited — it's the teacher's in-progress picker, not an archival file.

### D2 — Nothing in `.workspace/` is gitignored _(2026-04-11)_

Earlier drafts proposed `.gitignore` rules like `.workspace/**/*.html` because HTML was considered a derived artifact. **Overridden.** Every file in `.workspace/` — HTML, JSON, Markdown, YAML, backups, everything — is committed to git.

**Rationale:**
1. **Multi-device work.** The teacher works on lessons from multiple computers. Git is the sync layer; anything not committed is unavailable on the other machine.
2. **Phone workflow.** On a phone, the teacher can't run the Python generator that produces the HTML from JSON. On a phone, the HTML *is* the source, not a derived artifact. Gitignoring it would break the phone pathway that the whole architecture exists to enable.
3. **Lesson 2 in particular** must be visible everywhere. Half-finished picker state sitting on one laptop is exactly the failure mode this decision prevents.

**Revisit when:** a lesson is fully done. At that point we can consider what (if anything) to gitignore for archival cleanup. Until then: commit everything.

**Implications for the pending prompts:**
- The `.gitignore` step in the draft `picker_generator.md` must be inverted (or removed). Do NOT add `.workspace/**/*.html` to `.gitignore`.
- The `lesson_authoring_workflow.md` line "HTML files are gitignored (generated from JSONs)" is wrong and must be corrected when the prompt is saved to disk.

**Additional constraint — do NOT modify `.gitignore` in this session.** The teacher's other computer has unpushed `.workspace/` changes. Any `.gitignore` edit from this session could collide with those changes when they get pushed. The `.gitignore` file stays untouched until the multi-device state converges. Decisions about what (if anything) to ignore inside `.workspace/` can only be made after everything is on the same branch.

### D3 — Lesson authoring glossary established _(2026-04-11)_

See `docs/GLOSSARY.md`. Key terms: **target phrase** (Level 0), **root**, **form**, **anchor phrase** (flag `is_anchor: true` on a learn entry), **learn / practice / recall / pipeline** sections. Hard constraints: exactly one anchor per form, exactly 5 learn phrases per lesson regardless of form count.

## Next

The teacher is rethinking the architecture one step at a time. This file is the rolling log — append new decisions below D3 as they land.
