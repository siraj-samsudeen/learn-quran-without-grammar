# Skill: Publish a Draft/Excluded File as a Jekyll Page

## When to Use

Activate when a file that was previously excluded from the Jekyll build (listed in `_config.yml` `exclude:`, or lacking front matter) needs to become a published page on the live site.

## Checklist

### 1. Add front matter

The file must have YAML front matter for Jekyll to process it:

```yaml
---
layout: default
title: Page Title
description: One-sentence description for SEO/social sharing
---
```

### 2. Remove from `_config.yml` exclude list

Delete the filename from the `exclude:` array. If the file is inside a directory that's already excluded (e.g. `docs/`), move it out first.

### 3. Find and update all references project-wide

```bash
grep -r "filename" --include="*.md" --include="*.yml" --include="*.html" .
```

Every match needs reviewing. Common locations:
- **`CLAUDE.md`** — file tree and description
- **`docs/ARCHITECTURE.md`** — file/URL table and "excluded from build" section
- **`docs/decisions/ADR-*.md`** — any ADR that mentions the file
- **`_config.yml`** — the exclude list (already handled in step 2)

Update each reference to reflect the file's new role (e.g. "draft prose, not a page" → "published page, linked from homepage").

### 4. Add the file to the ARCHITECTURE.md URL table

```markdown
| `new-page.md` | `/new-page/` |
```

### 5. Link from existing pages

Typically add a link from `index.md` or another relevant page:

```liquid
[Link text]({{ '/new-page' | relative_url }})
```

### 6. Verify before committing

```bash
git diff --stat          # check which files changed
grep -r "old description" .  # confirm no stale references remain
```

## HTML block containers — always `<div>`, never `<a>`

Kramdown classifies HTML elements as block-level or inline based on the HTML spec. `<a>` is an **inline** element, so kramdown does not treat it as an HTML block — it processes the inner content as markdown, causing inner `</div>` closing tags to render as literal text on the page.

**Wrong** — inner `</div>` tags appear as text, all subsequent content falls inside the element:
```html
<a class="lesson-card" href="/lessons/lesson-01/">
  <div class="lesson-card-title">Lesson 1</div>
  <div class="lesson-card-arabic">اللَّهُ أَكْبَرُ</div>
</a>
```

**Correct** — use `<div>` as outer container, link only on the title or via `onclick`:
```html
<div class="lesson-card" markdown="0" onclick="location.href='/lessons/lesson-01/';">
<div class="lesson-card-title"><a href="/lessons/lesson-01/">Lesson 1</a></div>
<div class="lesson-card-arabic">اللَّهُ أَكْبَرُ</div>
</div>
```

`markdown="0"` is still required on the outer `<div>` to prevent inner content being parsed as markdown.

## Unicode caution

Hand-written files often contain curly quotes (`'` `"` `"`), em dashes (`—`), and other Unicode. If `EditFile` fails on a string that looks correct, diagnose with `cat -v filename | head` and use a shell workaround (e.g. `cat` with prepend) or `WriteFile` instead.

## Content ownership rule

Never delete, move, or archive the original file without asking the user. Hand-written content may have authorial value. Always offer "keep it as a published page and link to it" as an option alongside merge/archive proposals.
