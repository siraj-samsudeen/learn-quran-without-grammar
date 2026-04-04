---
globs: ["_layouts/**", "**/*.md", "**/*.html"]
---
# Jekyll / HTML Rules

- **`markdown="0"` on divs with Arabic text** — Kramdown wraps Arabic in incorrect `<p>` tags and breaks RTL layout. This is the single most common silent bug.
- **Markdown tables with IAL** — use `{: .root-table}` after tables, never HTML `<table>` tags.
- **`relative_url` filter** — all internal links and asset paths must use `{{ '...' | relative_url }}` for GitHub Pages baseurl.
- **Back-to-top links** — place AFTER `---` separator, not before it. `lesson-cards.js` scans for extras before `---` and will delete the link.
- **`layout: lesson`** — lessons use the `lesson` layout, not `default`.
- **Front matter** — every page needs `layout`, `title`, and `description` fields.
- **Lesson card headings** — `lesson-cards.js` processes `### N · form-name (english)` headings. Anchor headings use `### ⭐ ·` prefix to skip JS processing.
