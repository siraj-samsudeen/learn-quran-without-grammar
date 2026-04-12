---
layout: default
title: "Teacher Tools"
description: "Index of all teacher tools — prep dashboards, pickers, and utilities."
permalink: /teacher/
---

# Teacher Tools

Not linked from student navigation. Bookmark this page.

<p><a href="{{ '/#lessons' | relative_url }}">← Home</a></p>

---

## Prep Dashboards

Review all lesson data — verses, roots, audio, metadata — in one place.

| Lesson | Link |
|--------|------|
| Lesson 1 | [Prep Dashboard]({{ '/teacher/lesson-01/' | relative_url }}) |

---

## Selection Pickers

Local HTML files — open from your computer. Not on the live site.

| Lesson | Command |
|--------|---------|
| Lesson 2 | `open lessons/lesson-02-shahida/picker.html` |
| Lesson 3 | `open lessons/lesson-03-rasul/picker.html` |

To regenerate a picker from root data:

```
python3 tools/generate-picker.py --lesson 3 \
  --anchor "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ" \
  --current-root rasul \
  --recall-root ilah --recall-root kabura --recall-root shahida \
  --output lessons/lesson-03-rasul/picker.html
```

---

## Utilities

| Tool | Command |
|------|---------|
| Sync picker configs | `python3 tools/sync-picker-configs-to-data.py` |
| Sync audio metadata | `python3 tools/sync-audio-to-data.py --all` |
| Validate lesson | `python3 tools/validate-lesson-consistency.py lesson-NN` |
| Build lesson audio | `tools/rebuild-lesson-audio.sh lesson-NN` |
