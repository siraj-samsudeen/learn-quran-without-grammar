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

| Lesson | Seed Phrase | Command |
|--------|-----------|---------|
| Lesson 2 | أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ | `open lessons/lesson-02-shahida/picker.html` |
| Lesson 3 | أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ | `open lessons/lesson-03-rasul/picker.html` |
| Lesson 4 | حَيَّ عَلَى الصَّلَاةِ | `open lessons/lesson-04-salah/picker.html` |
| Lesson 5 | حَيَّ عَلَى الْفَلَاحِ | `open lessons/lesson-05-falaha/picker.html` |
| Lesson 6 | الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ | `open lessons/lesson-06-khayr/picker.html` |
| Lesson 7 | قَدْ قَامَتِ الصَّلَاةُ | `open lessons/lesson-07-qama/picker.html` |

---

## Utilities

| Tool | Command |
|------|---------|
| Sync picker configs | `python3 tools/sync-picker-configs-to-data.py` |
| Sync audio metadata | `python3 tools/sync-audio-to-data.py --all` |
| Validate lesson | `python3 tools/validate-lesson-consistency.py lesson-NN` |
| Build lesson audio | `tools/rebuild-lesson-audio.sh lesson-NN` |
