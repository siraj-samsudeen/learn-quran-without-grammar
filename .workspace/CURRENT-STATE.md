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

The `picker_generator.md` and `lesson_authoring_workflow.md` prompts in `docs/prompts/` were written assuming:

- Lesson 3 (rasul, 429 null-scored candidates) was the primary use case for the new picker
- Lesson 2 was a "regression test" with 20 scored shahida candidates already done
- "The new workflow applies to Lesson 3 onwards; Lessons 1 and 2 stay where they are"

**That framing is wrong for the actual state.** Lesson 2 is the lesson the tooling needs to unblock first. The new `.workspace/lesson-02/` is the directory that matters, not `.workspace/lesson-03/`. Any "historical record" framing of `.claude/tmp/lesson-02-picker.html` also needs revisiting — it's the teacher's in-progress picker, not an archival file.

## Status of the prompts themselves

Neither prompt has been executed. No `.workspace/`, no `tools/lesson-workflow.py`, no template upgrades have happened yet. The architecture is still on paper.

## Next

The teacher is rethinking the architecture one step at a time. This file is a scratch pad for that session — update as decisions land. Nothing here is committed yet.
