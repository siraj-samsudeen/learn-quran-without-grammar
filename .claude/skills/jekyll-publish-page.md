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

## Unicode caution

Hand-written files often contain curly quotes (`'` `"` `"`), em dashes (`—`), and other Unicode. If `EditFile` fails on a string that looks correct, diagnose with `cat -v filename | head` and use a shell workaround (e.g. `cat` with prepend) or `WriteFile` instead.

## Content ownership rule

Never delete, move, or archive the original file without asking the user. Hand-written content may have authorial value. Always offer "keep it as a published page and link to it" as an option alongside merge/archive proposals.
